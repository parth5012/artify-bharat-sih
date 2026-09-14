# Patterns & Conventions

> Code patterns, naming conventions, and idioms specific to this project.

## Naming Conventions

- Python: `snake_case` vars/funcs, `PascalCase` classes/Pydantic schemas; test files `backend/tests/test_*.py`.
- TS/React: `camelCase` vars, `PascalCase` components; Next.js `frontend/components|hooks|utils`.
- Domain terms exactly as `CONTEXT.md` (Digital Heritage Passport, Fair Wage Floor, Zero-Trust Peer Jury, Studio Enhancement).
- Shortcode format `A7X-9B2` (6-char); routes `/api/v1/*`, `/verify/{shortcode}`.

## Code Patterns

- FastAPI routers per service (`app/api/*`), Pydantic v2 schemas, SQLAlchemy 2.0 async, Alembic migrations.
- Hatchling `packages=["app"]`; `asyncio_mode=auto` for tests.
- Dual-layer AI: on-device preview + Celery background workers.
- Canonical JSON before SHA-256; wage floor before premiums.
- Frontend: server/client separation, Tailwind utilities, IndexedDB + ServiceWorker offline sync.

## Testing Patterns

- `pytest -v -m "not slow"` fast suite (all 21 files in `backend/tests/`); `slow` marks CV/rembg inference.
- TDD Red→Green→Verify; reproduce bug with failing test first.
- Lint: `ruff check` (line-length 100, py312) + `black --check`; TS: `tsc --noEmit`, `next lint`, `vite build`.

## Import/Module Conventions

- Python absolute imports from `app.*`; no relative cross-service leaks; domain purity.
- TS absolute/barrel where present; follow existing per-folder style.
- Never `grep`; use `rg`. Never overwrite; prefer `Edit`.
