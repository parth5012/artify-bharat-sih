# ADR 0003: Native Android Kotlin with Jetpack Compose & Clean Architecture

## Status
Accepted

## Context
Rural artisans in India overwhelmingly use low-cost Android smartphones. The application requires direct access to hardware sensors (CameraX, audio microphone), on-device TFLite inference, and high-performance declarative UI without overhead.

## Decision
Develop the mobile client using native **Kotlin** and **Jetpack Compose** following **Clean Architecture** (Domain, Data, Presentation) and **Room** for offline queuing.

## Consequences
- Native CameraX and microphone API integration.
- Direct TFLite hardware acceleration support.
- Clean separation of business logic in pure Kotlin domain layer.
