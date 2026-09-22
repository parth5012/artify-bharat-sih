# Backend

The backend domain and persistence layer lives here.

## Responsibilities

- Authentication and OTP session logic in `auth.ts`
- Development database access in `db.ts`
- Shared API response validation in `http.ts`
- Parent/child product persistence and hash registration
- Server-only Bhashini translation requests through `bhashini.ts`

Next.js route handlers in `app/api/` are the HTTP adapters for this backend. They stay under `app/api` because Next.js discovers route handlers from the application directory.

## Development Storage

The current adapter writes to `data/artifact-db.json`. The `data/` directory is ignored by Git. Replace this adapter with PostgreSQL, Supabase, or another production database before deployment.

## Bhashini Configuration

Set `BHASHINI_API_KEY`, `BHASHINI_USER_ID`, and either `BHASHINI_TRANSLATION_SERVICE_ID` or the existing `BHASHINI_TRANSLATION_MODEL_ID` in `.env`. If your Bhashini account provides a separate inference key, set `BHASHINI_INFERENCE_API_KEY`; the adapter also accepts a non-URL legacy value in `BHASHINI_INFERENCE_URL`. The model ID identifies the Bhashini translation service; it is not a model-provider API key. These values must never use a `NEXT_PUBLIC_` prefix or be sent to the browser.