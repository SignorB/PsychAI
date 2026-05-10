"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Play } from "lucide-react";

export default function TrainingPage() {
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  const handleStartTraining = async () => {
    setIsTraining(true);
    // In a real implementation, this would trigger an API call to the backend to start the docker lora-trainer container
    setTimeout(() => {
      setIsTraining(false);
      alert("Training completed! Adapter saved to /models/lora.");
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-clinical-ink">Model Training</h1>
        <p className="text-sm text-[#848484] mt-1">Manage continuous LoRA fine-tuning</p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-emerald-600" /> AI Training Dashboard</CardTitle>
          <CardDescription>
            Train the AI to adopt your specific clinical writing style based on the manual edits you make to the generated session notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-lg bg-white border border-clinical-border shadow-sm">
            <div>
              <p className="text-sm font-medium text-clinical-ink">GPU Allocation Mode</p>
              <p className="text-xs text-[#848484] mt-1 max-w-md">
                Switch to Training mode to unload inference models from VRAM. This is required before starting the fine-tuning process.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${!isTrainingMode ? 'text-clinical-ink' : 'text-[#848484]'}`}>Inference</span>
              <button
                role="switch"
                aria-checked={isTrainingMode}
                onClick={() => setIsTrainingMode(!isTrainingMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isTrainingMode ? 'bg-emerald-600' : 'bg-[#e5e5e5]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isTrainingMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isTrainingMode ? 'text-emerald-600' : 'text-[#848484]'}`}>Training</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 rounded-lg bg-white border border-clinical-border shadow-sm">
            <div>
              <p className="text-sm font-medium text-clinical-ink">Approved Training Pairs</p>
              <p className="text-xs text-[#848484] mt-1 max-w-md">
                Number of confirmed sessions ready for fine-tuning. A minimum of 50 pairs is recommended for noticeable style adoption.
              </p>
            </div>
            <Badge variant="outline" className="text-sm font-medium px-4 py-1.5 border-emerald-200 text-emerald-700 bg-emerald-50">
              24 ready
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
            size="lg"
            disabled={!isTrainingMode || isTraining}
            onClick={handleStartTraining}
          >
            {isTraining ? (
              <span className="flex items-center animate-pulse">
                <BrainCircuit className="h-5 w-5 mr-2" />
                Running LoRA Fine-Tuning...
              </span>
            ) : (
              <span className="flex items-center">
                <Play className="h-5 w-5 mr-2" />
                Start Fine-Tuning
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
