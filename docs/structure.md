# Structure — ArtifyBharat File Layout (harness overview)

> Harness file-structure overview (frontend Next.js app layout; legacy backend and deleted web-portal archived). Canonical system spec lives in `docs/architecture.md` (restored 2026-09-12).

## Project Structure

```
/
├── frontend/              # Next.js 14.2 + React 18.3 + TS 5.5 + Tailwind 3.4 (active app & API routes)
├── legacy/                # Archived legacy FastAPI backend & artifacts (out of active codebase & CI)
├── harness/               # Python agent-eval harness (action_space/observation/evaluator — unrelated to agent harness files)
├── docs/adr/ (0001-0005), docs/api-specification.md, docs/agents/, docs/deployment-guide.md
├── CONTEXT.md, CONTEXT-MAP.md, docker-compose.yml, .github/workflows/ci.yml
└── graphify-out/ (to be built)
```

## Key Modules & Responsibilities

- **AuthService** (`frontend/app/api/auth/*`): Artisan OTP generation, verification, session tokens.
- **ImageAI & Studio:** Child-process OpenCV + rembg studio enhancement worker (`frontend/app/api/studio/enhance`).
- **LangAI / Bhashini:** Voice ASR & Indic translation via Dhruva pipeline (`frontend/backend/bhashini.ts` + `/api/voice`, `/api/translate`).
- **ExtractAI / LLM Form Extraction:** Transcript → structured-field extraction via bounded Groq/OpenRouter chain with regex enrichment floor (`frontend/app/api/extract/route.ts`, `frontend/lib/extract.ts`).
- **PricingAI:** Fair Wage Floor calculation (`frontend/app/api/pricing/calculate`).
- **VerifyService & Heritage Passport:** Deterministic SHA-256 heritage passport verification and shortcode lookup (`frontend/lib/hash.ts`, `/verify/[code]`).
- **Exports & ONDC:** ONDC buyer checkout redirect and seller webhook integration (`frontend/app/api/ondc/*`).
- **Web Client:** Dual-role artisan UI, voice capture, translation, camera studio integration, responsive verification portal.

## Entry Points

- Frontend: `frontend/` (`npm run dev/build`).
- Active Tests: `npm test` in `frontend/` (Jest test suites including `env-leak.test.ts`).
- Verification: `cd frontend && npm ci && npx tsc --noEmit && npm test && npm run build`.
