from __future__ import annotations

from .schemas import TextChunk


def chunk_text(
    *,
    patient_id: str,
    source_id: str,
    text: str,
    chunk_size_chars: int,
    overlap_chars: int,
) -> list[TextChunk]:
    if chunk_size_chars <= 0:
        raise ValueError("chunk_size_chars must be positive")
    if overlap_chars < 0:
        raise ValueError("overlap_chars cannot be negative")
    if overlap_chars >= chunk_size_chars:
        raise ValueError("overlap_chars must be smaller than chunk_size_chars")

    clean_text = " ".join(text.split())
    chunks: list[TextChunk] = []
    start = 0

    while start < len(clean_text):
        end = min(start + chunk_size_chars, len(clean_text))
        chunk_body = clean_text[start:end].strip()
        if chunk_body:
            chunks.append(
                TextChunk(
                    chunk_id=f"{source_id}:{len(chunks):04d}",
                    patient_id=patient_id,
                    source_id=source_id,
                    text=chunk_body,
                    metadata={"start_char": start, "end_char": end},
                )
            )
        if end == len(clean_text):
            break
        start = end - overlap_chars

    return chunks
