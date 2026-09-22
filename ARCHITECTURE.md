# Artifact Architecture

## Folder Ownership

```text
backend/
  auth.ts       Authentication, sessions, OTP validation
  db.ts         Persistence adapter and backend data types
  http.ts       Shared API validation and errors
  ondc.ts       ONDC checkout, seller listing, and payment status adapters
  notifications.ts  Regional-language confirmation call adapter
  bhashini.ts   Server-only Bhashini translation adapter
  studio/       OpenCV/rembg/U2-Net service contract

app/api/        Next.js HTTP adapters for backend services
frontend/       Frontend ownership guide
app/            Next.js pages and layouts
components/     Reusable UI components
lib/            Client state and marketplace helpers
public/         Browser assets and PWA files
data/           Local development database, ignored by Git
```

## Request Flow

```text
Browser UI -> app/api route handler -> backend service -> data/artifact-db.json
```

Payment flow:

```text
Buyer -> Artifact checkout intent -> ONDC network -> ONDC webhook -> confirmation-call provider
                                                    \-> artisan's ONDC-linked settlement account
```

Artifact never handles card/UPI credentials or moves artisan settlement funds. ONDC owns payment processing and settlement.

Translation flow:

```text
Browser -> /api/translate -> backend/bhashini.ts -> Bhashini translation API
```

The Bhashini API key stays on the server. The browser never receives `BHASHINI_API_KEY`.

The route handlers are intentionally thin. Authentication, persistence, and product identity rules belong in `backend/`; screens and client state belong to the frontend surface.

## Production Migration

1. Replace `backend/db.ts` with a managed database adapter.
2. Connect an SMS provider to the OTP request route.
3. Move uploaded photos and recordings to object storage.
4. Keep API route contracts stable while changing infrastructure.