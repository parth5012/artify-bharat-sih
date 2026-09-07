# Domain Docs

How engineering skills consume ArtifyBharat's domain documentation when exploring the codebase.

## Before Exploring, Read

1. `CONTEXT-MAP.md` at repo root (Multi-context monorepo). Read the `CONTEXT.md` files corresponding to the area of work:
   - `backend/CONTEXT.md`: FastAPI, Celery, AI vision/NLP/pricing pipelines, GeM/ONDC adapters.
   - `android/CONTEXT.md`: Kotlin Clean Architecture, Jetpack Compose 7-stage flow, Room offline sync.
   - `web-portal/CONTEXT.md`: Public Heritage Passport verification, SHA-256 validation, cost transparency.
2. `docs/adr/`: Read system-wide architectural decision records before proposing changes to established invariants.

## File Structure

Multi-context monorepo layout:
```
/
├── CONTEXT.md               # System-wide ubiquitous language & domain concepts
├── CONTEXT-MAP.md           # Context boundaries & relationships
├── docs/adr/                # System-wide Architecture Decision Records
├── backend/
│   └── CONTEXT.md           # Backend & ML pipeline bounded context
├── android/
│   └── CONTEXT.md           # Mobile client & offline queue bounded context
└── web-portal/
    └── CONTEXT.md           # Public verification & buyer portal bounded context
```

## Ubiquitous Language

Always use the terms defined in `CONTEXT.md`:
- `Digital Heritage Passport`: The tamper-evident cryptographic provenance certificate.
- `Fair Wage Floor`: The statutory minimum non-negotiable labor allocation calculated from verified labor days.
- `Studio Enhancement`: The U²-Net background extraction, CLAHE lighting equalization, and 1:1 auto-crop.
- `Zero-Skill Interface`: The simplified, high-contrast UI designed for non-English, low-literacy artisans.
