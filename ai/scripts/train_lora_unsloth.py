import os
import requests
import json
from datasets import Dataset
from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
MODEL_NAME = "unsloth/llama-3-8b-Instruct-bnb-4bit"
MAX_SEQ_LENGTH = 4096
OUTPUT_DIR = "/models/lora"

def fetch_dataset():
    print(f"Fetching training data from {BACKEND_URL}/training/dataset.jsonl...")
    response = requests.get(f"{BACKEND_URL}/training/dataset.jsonl")
    response.raise_for_status()
    
    data = []
    for line in response.text.strip().split("\n"):
        if line:
            data.append(json.loads(line))
            
    print(f"Loaded {len(data)} training pairs.")
    return Dataset.from_list(data)

def format_prompt(examples):
    instruction = examples["instruction"]
    input_text = examples["input"]
    output_text = examples["output"]
    
    texts = []
    for inst, inp, out in zip(instruction, input_text, output_text):
        text = f"<|start_header_id|>system<|end_header_id|>\n{inst}<|eot_id|>\n<|start_header_id|>user<|end_header_id|>\n{inp}<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n{out}<|eot_id|>"
        texts.append(text)
    return {"text": texts}

def main():
    dataset = fetch_dataset()
    dataset = dataset.map(format_prompt, batched=True)
    
    print("Loading base model...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=None,
        load_in_4bit=True,
    )
    
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
        use_rslora=False,
        loftq_config=None,
    )
    
    print("Initializing trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        dataset_num_proc=2,
        args=TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            max_steps=60,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            output_dir="outputs",
        ),
    )
    
    print("Starting LoRA Fine-Tuning...")
    trainer.train()
    
    print(f"Saving adapter to {OUTPUT_DIR}...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("Training complete! Adapter saved.")

if __name__ == "__main__":
    main()
