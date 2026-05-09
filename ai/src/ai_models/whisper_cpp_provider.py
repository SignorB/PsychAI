from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from .schemas import Transcript, TranscriptSegment


class WhisperCppError(RuntimeError):
    pass


class WhisperCppSpeechToTextProvider:
    def __init__(
        self,
        *,
        executable: str = "whisper-cli",
        model_path: str,
        language: str = "it",
        timeout_seconds: float = 600.0,
        extra_args: list[str] | None = None,
    ) -> None:
        self.executable = executable
        self.model_path = model_path
        self.language = language
        self.timeout_seconds = timeout_seconds
        self.extra_args = extra_args or []

    def transcribe(self, audio_path: str) -> Transcript:
        audio = Path(audio_path)
        if not audio.exists():
            raise WhisperCppError(f"Audio file not found: {audio_path}")

        with tempfile.TemporaryDirectory(prefix="whisper_cpp_") as temp_dir:
            output_base = Path(temp_dir) / "transcript"
            command = [
                self.executable,
                "-m",
                self.model_path,
                "-f",
                str(audio),
                "-l",
                self.language,
                "-oj",
                "-of",
                str(output_base),
                *self.extra_args,
            ]
            try:
                completed = subprocess.run(
                    command,
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                )
            except FileNotFoundError as exc:
                raise WhisperCppError(
                    f"whisper.cpp executable not found: {self.executable}"
                ) from exc
            except subprocess.TimeoutExpired as exc:
                raise WhisperCppError("whisper.cpp transcription timed out") from exc

            if completed.returncode != 0:
                stderr = completed.stderr.strip()
                raise WhisperCppError(
                    f"whisper.cpp failed with exit code {completed.returncode}: {stderr}"
                )

            json_path = output_base.with_suffix(".json")
            if not json_path.exists():
                raise WhisperCppError(f"whisper.cpp JSON output not found: {json_path}")

            return parse_whisper_cpp_json(
                json.loads(json_path.read_text(encoding="utf-8")),
                language=self.language,
                metadata={
                    "provider": "whisper_cpp",
                    "model_path": self.model_path,
                    "executable": self.executable,
                    "audio_path": str(audio),
                },
            )


def parse_whisper_cpp_json(
    payload: dict,
    *,
    language: str,
    metadata: dict,
) -> Transcript:
    raw_segments = payload.get("transcription") or payload.get("segments") or []
    segments = []
    for item in raw_segments:
        offsets = item.get("offsets") or {}
        start_ms = item.get("start")
        end_ms = item.get("end")
        if start_ms is None:
            start_ms = offsets.get("from", 0)
        if end_ms is None:
            end_ms = offsets.get("to", start_ms)
        text = item.get("text", "")
        segments.append(
            TranscriptSegment(
                start_seconds=float(start_ms) / 1000.0,
                end_seconds=float(end_ms) / 1000.0,
                text=text.strip(),
                speaker_label=item.get("speaker_label"),
            )
        )

    raw_text = payload.get("text")
    if raw_text is None:
        raw_text = " ".join(segment.text for segment in segments).strip()

    return Transcript(
        raw_text=raw_text.strip(),
        language=payload.get("language") or language,
        segments=segments,
        metadata=metadata,
    )
