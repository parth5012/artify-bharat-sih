# Architecture Decisions

> ADR-style log of significant decisions.

## Format

### [DATE]: [Title]

- **Status**: Proposed | Accepted | Superseded
- **Context**: Why this decision was needed
- **Decision**: What was decided
- **Consequences**: Trade-offs and implications

## Decisions

### 2026-09-18: PricingAI retrieval v1 — grill locks

- **Status**: Accepted
- **Context**: Scraped list-price regressor would learn seller aspirations + reproduce underpricing; need honest comps above Fair Wage Floor
- **Decision**:
  - Q1 v1 mandatory fields: material, technique, size, labor_hours, state, GI yes/no
  - Q2 strict retail/bulk split, never pooled (both floored)
  - Q3 snapshot now (ONDC + artisan entries); panel movie for 200 SKUs weekly as future thought
  - Q4 proof-only comps (sales counter / bought badge / co-op bill); rest flagged tag-only
  - Q5 win = artisan accepts + sells in 30 days above floor
- **Consequences**: Retrieval band UI over regressor; background panel pipeline + co-op ground-truth export needed; canonical schema blocks all above

_Future thought: weekly panel recrawl (same SKU IDs, diff storage, festival markdown tracking) for 200 items — 10x work, deferred to v2._

> **Proposed draft, not accepted (#195):** ADR 0006 "Local Beckn Sandbox Seller Loop" is still a draft at `.tmp/sessions/2026-09-26-ondc-sandbox-integration/adr-0006-draft.md` (session scratch, gitignored). Nothing from it is recorded as an accepted decision here — move the draft to `docs/adr/0006-*.md` and append an entry under **Decisions** only after a human accepts it.

_None yet — see `docs/adr/` for canonical records (0001 FastAPI+Celery, 0002 SHA-256 passports, 0003 responsive web, 0004 fair-wage engine). Append new significant choices here and as `docs/adr/NNNN-*.md`._
