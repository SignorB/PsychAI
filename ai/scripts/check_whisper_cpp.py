from __future__ import annotations

import os
import shutil
from pathlib import Path


def main() -> None:
    executable = os.getenv("WHISPER_CPP_EXECUTABLE", "whisper-cli")
    model_path = os.getenv("WHISPER_CPP_MODEL_PATH")
    resolved_executable = shutil.which(executable) or executable

    print(f"WHISPER_CPP_EXECUTABLE={executable}")
    print(f"resolved_executable={resolved_executable}")
    print(f"executable_found={Path(resolved_executable).exists() or shutil.which(executable) is not None}")
    print(f"WHISPER_CPP_MODEL_PATH={model_path or ''}")
    print(f"model_found={bool(model_path and Path(model_path).exists())}")


if __name__ == "__main__":
    main()
