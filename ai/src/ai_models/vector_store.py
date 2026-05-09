from __future__ import annotations

from .schemas import RetrievedChunk, TextChunk


class InMemoryVectorStore:
    def __init__(self) -> None:
        self._items: list[tuple[TextChunk, list[float]]] = []

    def upsert(self, chunks: list[TextChunk], vectors: list[list[float]]) -> None:
        self._items.extend(zip(chunks, vectors))

    def search(self, *, patient_id: str, query_vector: list[float], top_k: int) -> list[RetrievedChunk]:
        matches = [
            RetrievedChunk(chunk=chunk, score=cosine_similarity(query_vector, vector))
            for chunk, vector in self._items
            if chunk.patient_id == patient_id
        ]
        return sorted(matches, key=lambda item: item.score, reverse=True)[:top_k]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    left_norm = sum(value * value for value in left) ** 0.5
    right_norm = sum(value * value for value in right) ** 0.5
    if left_norm == 0 or right_norm == 0:
        return 0.0
    dot = sum(left_value * right_value for left_value, right_value in zip(left, right))
    return dot / (left_norm * right_norm)
