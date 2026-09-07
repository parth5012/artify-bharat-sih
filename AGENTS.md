# AGENTS.md: ArtifyBharat Agent Instructions & Skill Registry

## Framework & Environment
- Backend: Python 3.12+, `uv`, FastAPI, Celery, SQLAlchemy 2.0 async, Pytest.
- Mobile: Android Kotlin 2.0, Jetpack Compose Material 3, Clean Architecture, Room.
- Web: HTML5 / JavaScript / Vite.
- Orchestration & Automation: Docker Compose, Celery workers, GitHub Actions.

## Code Style & Guardrails
- **Understand First**: Always check `CONTEXT-MAP.md` and context-specific `CONTEXT.md` before exploring code.
- **Pure Domain**: Domain layer in Kotlin or Python must remain pure without UI or framework leaks.
- **Minimal Changes**: Avoid modifying files outside the bounded context of the active task.
- **TDD Enforcement**: Write failing tests before implementing features. Ensure `uv run pytest -v` passes cleanly.

## Agent skills

### Issue tracker
GitHub issues at `https://github.com/parth5012/artify-bharat-sih`. See `docs/agents/issue-tracker.md`.

### Triage labels
Canonical five-role triage mapping (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs
Multi-context monorepo layout with root `CONTEXT.md`, `CONTEXT-MAP.md`, and context-specific docs in `backend/`, `android/`, and `web-portal/`. See `docs/agents/domain.md`.
