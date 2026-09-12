# Domain Docs

How engineering skills consume ArtifyBharat's domain documentation when exploring the codebase.

## Before Exploring, Read

1. `CONTEXT-MAP.md` at repo root (Multi-context monorepo). Read the `CONTEXT.md` files corresponding to the area of work:
   - `backend/CONTEXT.md`: FastAPI, Celery, AI vision/NLP/pricing pipelines, MoSJE/e-Shram auth, GeM/ONDC/WhatsApp adapters.
   - `web-portal/CONTEXT.md`: Responsive Web client, Dual-role access, Public Heritage Passport verification, SHA-256 validation, MoSJE Admin Dashboard.
2. `docs/adr/`: Read system-wide architectural decision records before proposing changes to established invariants.

## File Structure

Multi-context monorepo layout:
```
/
├── CONTEXT.md               # System-wide ubiquitous language & domain concepts (MoSJE)
├── CONTEXT-MAP.md           # Context boundaries & relationships
├── docs/adr/                # System-wide Architecture Decision Records
├── backend/
│   └── CONTEXT.md           # Backend & AI microservices bounded context
└── web-portal/
    └── CONTEXT.md           # Responsive Web client & MoSJE admin bounded context
```

## Ubiquitous Language

Always use the terms defined in `CONTEXT.md`:
- `Digital Heritage Passport`: The tamper-evident cryptographic provenance certificate (SHA-256 + 6-Char shortcode).
- `Fair Wage Floor`: The statutory minimum non-negotiable labor allocation calculated from verified labor days.
- `Zero-Trust Peer Jury`: Randomized 3-artisan craft cluster quorum verification with anomaly detection.
- `Studio Enhancement`: The U²-Net background extraction, CLAHE lighting equalization, and 1:1 auto-crop.
- `Zero-Skill Interface`: The simplified, high-contrast UI designed for non-English, low-literacy artisans.

If a needed concept isn't in the glossary, note it for `/domain-modeling` instead of inventing synonyms. If output contradicts an ADR, surface it explicitly.
