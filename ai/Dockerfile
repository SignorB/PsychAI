FROM python:3.10-slim AS whisper-builder

ARG WHISPER_CPP_REF=master

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        cmake \
        git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 --branch ${WHISPER_CPP_REF} https://github.com/ggml-org/whisper.cpp.git
WORKDIR /opt/whisper.cpp
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j

FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LD_LIBRARY_PATH=/opt/whisper.cpp/lib \
    OLLAMA_BASE_URL=http://ollama:11434 \
    WHISPER_CPP_EXECUTABLE=/opt/whisper.cpp/whisper-cli \
    WHISPER_CPP_MODEL_PATH=/models/whisper/ggml-base.bin \
    WHISPER_CPP_LANGUAGE=it

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-ai.txt /app/requirements-ai.txt
RUN pip install --no-cache-dir -r requirements-ai.txt

COPY --from=whisper-builder /opt/whisper.cpp/build/bin/whisper-cli /opt/whisper.cpp/whisper-cli
COPY --from=whisper-builder /opt/whisper.cpp/build/src/libwhisper.so* /opt/whisper.cpp/lib/
COPY --from=whisper-builder /opt/whisper.cpp/build/ggml/src/libggml*.so* /opt/whisper.cpp/lib/
COPY --from=whisper-builder /opt/whisper.cpp/models/download-ggml-model.sh /opt/whisper.cpp/models/download-ggml-model.sh
COPY src /app/src
COPY scripts /app/scripts

EXPOSE 8010

ENTRYPOINT ["python", "scripts/docker_entrypoint.py"]
CMD ["python", "scripts/run_ai_service.py", "--host", "0.0.0.0", "--port", "8010"]
