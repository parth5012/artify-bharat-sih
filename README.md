# Artifact Artisan Platform

Artifact helps artisans register their identity, create products, enhance product media, publish through ONDC, and provide verifiable product history to buyers.

See [TEAM_TASKS.md](TEAM_TASKS.md) for team ownership, task checklists, acceptance criteria, shared rules, and working order.

## Run Locally

From the project root:

```powershell
cd "C:\Users\yashi\Downloads\artifact-pwa(1)\artify-artisan"
npm install
npm run dev
```

Open `http://localhost:3000`.

Build verification:

```powershell
npm run build
```

## Project Structure

- `app/`: Next.js pages, layouts, and API route adapters
- `backend/`: server-side services and persistence boundaries
- `components/`: reusable frontend components
- `lib/`: client state and frontend helpers
- `public/`: PWA and media assets
- `ARCHITECTURE.md`: system boundaries and request flows
- `ARTISAN_IMPLEMENTATION_TODO.md`: detailed implementation checklist
- `TEAM_TASKS.md`: team task distribution and delivery plan