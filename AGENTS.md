# AGENTS.md — ArtifyBharat (SIH PS 26090, MoSJE)

## Project Overview
ArtifyBharat is AI-powered Digital Business Manager & Digital Gatekeeper for rural weavers/artisans under Ministry of Social Justice and Empowerment (MoSJE), SIH PS 26090. Artisans catalog, price, verify (SHA-256 + 6-char shortcode), print thermal tags, publish to GeM/ONDC/WhatsApp/SHG portals. Buyers verify provenance. Ministry monitors via District Heatmap dashboard.

## Tech Stack
- **Backend:** Python >=3.11, `uv`, FastAPI >=0.115, Uvicorn, Pydantic v2 + pydantic-settings, SQLAlchemy 2.0 async (asyncpg + aiosqlite), Alembic, Celery 5.4 + Redis, python-jose, passlib, Pillow, opencv-headless, numpy, httpx, qrcode, XGBoost, scikit-learn, rembg[cpu], aiofiles. Build: hatchling (`packages=["app"]`).
- **Frontend (`frontend/`):** Next.js 14.2, React 18.3, TypeScript 5.5, Tailwind 3.4, PostCSS. Scripts: `dev/build/start/lint`.
- **Web Portal (`web-portal/`):** Vite 5.4 vanilla (public Heritage Passport verification portal + artisan web hub in `index.html`).
- **Infra:** Docker Compose, GitHub Actions (`.github/workflows/ci.yml`), PostgreSQL + S3/MinIO + PII Vault (DPDP-compliant).
- **AI/Services:** AuthService (MoSJE/e-Shram/Pehchan/TRIFED/PM-SURAJ/PM-DAKSH), PIIVault (AES-256-GCM tokenization), ImageAI (rembg U-2-Net + CLAHE), LangAI (Whisper + IndicTrans2 + Bhashini + 'Ask Dadi'), PricingAI (fair-wage floor + XGBoost), VerifyService (3-artisan zero-trust peer jury), QRService (SHA-256 + 6-char shortcode + ESC/POS 58mm), Logistics (India Post), Payout (Jan Dhan/UPI direct), Notify (SMS/IVR), ExportAdapters (GeM B2G XML/CSV, ONDC Beckn v1.0, WhatsApp Cloud API, SHG Bulk CSV, Atomic Inventory Lock), AdminService (District Heatmap, Audit Logs, PM-DAKSH metrics, Demand Forecast).

## Code & File Operations
- **Understand First:** Check graphify (`graphify-out/graph.json` if present, else `graphify query`) before reading files. Then read `CONTEXT.md` + `CONTEXT-MAP.md` + relevant `backend/CONTEXT.md` / `web-portal/CONTEXT.md` + `docs/adr/`. Never use `grep`; use `rg` (ripgrep). Use `Read`/`Glob` for files.
- **Minimal Changes:** Smallest diff to satisfy spec. Stay inside bounded context (backend vs frontend vs web-portal). Follow existing style (ruff line-length 100, py312; black; camelCase TS, snake_case Python).
- **Systematic Fixes:** Reproduce with failing test → locate root cause → fix → re-run verification. Never overwrite existing files unless asked; prefer `Edit` over `Write`.
- **Domain Purity:** Domain terms from `CONTEXT.md` only (Digital Heritage Passport, Fair Wage Floor, Zero-Trust Peer Jury, Studio Enhancement). Don't invent synonyms.

## Execution Guardrails
- **Plan-First:** 3+ step tasks → `Todowrite` plan with checkpoints. One `in_progress` at a time.
- **Safety Zones:** No `rm -rf`, `git reset --hard`, `git clean`, branch `-D` without explicit approval. No commit/push/PR unless explicitly asked. Verify parent with `Test-Path` before creating files.
- **Worktrees:** New feature/fix → fresh git worktree off base branch; remove after merge.
- **Parallel Agents:** Use `Task` for research/review; don't duplicate delegated work.

## How to use Harness Files
- `BLOCKED.md`: Write when stuck — table with ID/Date/Description/Attempted/Needs. Human resolves. Stop until unblocked if critical.
- `LEARNINGS.md`: Append patterns, gotchas, decisions (Project Learnings / Decision Log / Edge Cases) after every non-trivial task.
- `LOG.md`: Log every iteration — Date/Status/What/Verified/Notes table. Status: Done|Blocked|Budget|Compacted|Stuck|Outage|Review.
- `TECH_DEBT.md`: Log pragmatic shortcuts with Rationale/Impact/Effort. Distinguish choice vs bug.
- `docs/architecture.md`: Canonical MoSJE system spec — read before structural changes. Do not overwrite with file-structure notes.
- `docs/structure.md`: Harness file-structure overview (backend/frontend/web-portal layout). Update if you change modules/flows.
- `docs/decisions.md` + `docs/adr/`: Check ADRs before contradicting invariants; append new ADR on significant choice.
- `docs/patterns.md`: Follow naming/testing/import conventions; document new patterns discovered.
- `.tmp/`: All scratch, generated, backup files here. Never commit secrets.

## Verification (THIS project — run these)
- Backend fast suite: `uv run pytest -v -m "not slow"` from `backend/` (full: `uv run pytest -v`; 21 test files in `backend/tests/`).
- Lint: `uv run ruff check backend/app backend/tests` ; Format: `uv run black --check backend/app`.
- Types: `npx tsc --noEmit` in `frontend/` (if changed).
- Frontend: `npm run lint` + `npm run build` in `frontend/`; `npm run build` in `web-portal/`.
- E2E (user-facing flows): Playwright/manual verify — artisan catalog → pricing → passport/shortcode → GeM/ONDC publish; buyer `/verify/{shortcode}` + Report Fake; admin heatmap.
- Never declare done without green tests + verification stated plainly if skipped.

## Definition of Done
1. Tests green (`pytest` + relevant frontend build/lint).
2. Typecheck/lint clean (ruff + tsc where applicable).
3. User flows exercised E2E (or explicitly noted as skipped + why).
4. Committed only if asked, with detailed message (what/why/verified/decisions/refs).
5. `LEARNINGS.md` updated with new edge cases.
6. `LOG.md` appended with Status/Verified/Notes.

## TDD (mandatory)
Red → Green → Verify. Write failing test first (`backend/tests/test_*.py`, `asyncio_mode=auto`), watch fail, implement minimum, re-run suite + typecheck to green. Bug fixes: reproduce test first.

## Context Re-entry (multi-project juggling)
Cold re-entry every user-facing message: 2–3 sentence recap (project ArtifyBharat, branch, where stands, why). Plain language — restate, no callbacks like "earlier fix". Self-contained questions with background/options/tradeoffs/recommendation. One question at a time; state how many decisions await. Anchor: project/branch/PR. End with single next action or "nothing awaiting you".

## Harness Patterns
- Teach via docs; point live code comments at `docs/` decisions.
- One item per fresh chat; don't chain unrelated tasks.
- Close loop: verify → log (`LOG.md`) → self-feedback same session.
- Spawn helpers (researcher/reviewer) to keep main context clean.
- Never compact chat (data-loss risk). Recover via `git reset --hard` only on explicit approval then re-run loop.
- Loop repetitive work (features/tests/refactor/docs/audit) via `PROMPT.md` Ralph Loop.
- Fix old bugs by updating instructions (AGENTS.md/patterns), not just patching.
- Spec before code: blueprint/plan → tickets → implement.

## Exit Codes & Statuses
`Done` completed | `Blocked` document in BLOCKED.md + stop | `Budget` token/time exhausted | `Compacted` context compacted (data-loss risk) | `Stuck` needs human | `Outage` tool/service down | `Review` awaiting gate.

## Artifacts
`BLOCKED.md`, `LEARNINGS.md`, `LOG.md`, `TECH_DEBT.md`, `PROMPT.md`, `DECISIONS.md`, `RESUME.md`, `.tmp/`, `docs/architecture.md`, `docs/structure.md`, `docs/decisions.md`, `docs/patterns.md`, `docs/agents/`, `graphify-out/`.

## Commit Standards
Atomic (one logical change), detailed message: what+why, verified (tests/typecheck), decisions+rationale, refs (`#issue`). Stage only intended files; never commit secrets/`.env`. Inspect `git status/diff/log --oneline -10` first.

## Concision
Extremely concise. Sacrifice grammar for concision. Answer directly, no preamble/postamble. Long output → `visual-findings` skill HTML.

## Agent skills
- **Issue tracker**: GitHub Issues via `gh` CLI at `https://github.com/parth5012/artify-bharat-sih`. See `docs/agents/issue-tracker.md`.
- **Triage labels**: Five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.
- **Domain docs**: Multi-context monorepo (`CONTEXT.md`, `CONTEXT-MAP.md`, `backend/CONTEXT.md`, `web-portal/CONTEXT.md`, `docs/adr/`). See `docs/agents/domain.md`.
