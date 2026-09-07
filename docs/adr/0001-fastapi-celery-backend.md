# ADR 0001: Selection of FastAPI and Celery for Backend & Inference Decoupling

## Status
Accepted

## Context
ArtifyBharat requires handling concurrent media uploads (photos, audio streams) from rural smartphone clients alongside CPU/GPU-intensive AI inference (U²-Net segmentation, CLAHE, Whisper STT, IndicTrans2, Mistral-7B).

## Decision
- Use **FastAPI** with asynchronous request handling for the core REST gateway.
- Use **Celery** backed by **Redis** to decouple heavy background processing.

## Consequences
- Fast sub-100ms API response times for mobile clients.
- Fault-tolerant background processing where failed inferences can be retried independently without hanging client HTTP connections.
