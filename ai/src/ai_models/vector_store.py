from __future__ import annotations

import json
import sqlite3
from pathlib import Path

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


class SQLiteVectorStore:
    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def upsert(self, chunks: list[TextChunk], vectors: list[list[float]]) -> None:
        with self._connect() as connection:
            connection.executemany(
                """
                INSERT OR REPLACE INTO vector_chunks (
                    chunk_id,
                    patient_id,
                    source_id,
                    text,
                    metadata_json,
                    vector_json,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                [
                    (
                        chunk.chunk_id,
                        chunk.patient_id,
                        chunk.source_id,
                        chunk.text,
                        json.dumps(chunk.metadata, ensure_ascii=False),
                        json.dumps(vector),
                    )
                    for chunk, vector in zip(chunks, vectors)
                ],
            )

    def search(self, *, patient_id: str, query_vector: list[float], top_k: int) -> list[RetrievedChunk]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT chunk_id, patient_id, source_id, text, metadata_json, vector_json
                FROM vector_chunks
                WHERE patient_id = ?
                """,
                (patient_id,),
            ).fetchall()

        matches = []
        for row in rows:
            chunk = TextChunk(
                chunk_id=row["chunk_id"],
                patient_id=row["patient_id"],
                source_id=row["source_id"],
                text=row["text"],
                metadata=json.loads(row["metadata_json"] or "{}"),
            )
            matches.append(
                RetrievedChunk(
                    chunk=chunk,
                    score=cosine_similarity(query_vector, json.loads(row["vector_json"])),
                )
            )
        return sorted(matches, key=lambda item: item.score, reverse=True)[:top_k]

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_vector_chunks_patient ON vector_chunks(patient_id)"
            )


def cosine_similarity(left: list[float], right: list[float]) -> float:
    left_norm = sum(value * value for value in left) ** 0.5
    right_norm = sum(value * value for value in right) ** 0.5
    if left_norm == 0 or right_norm == 0:
        return 0.0
    dot = sum(left_value * right_value for left_value, right_value in zip(left, right))
    return dot / (left_norm * right_norm)
