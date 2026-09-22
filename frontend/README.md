# Frontend

The frontend is the existing Next.js application surface:

- `app/` contains pages, layouts, and API route adapters.
- `components/` contains reusable UI and capture/voice components.
- `lib/store.tsx` contains client draft state.
- `lib/market.tsx` contains marketplace client state.
- `public/` contains images, manifest, and service-worker assets.

The application currently keeps these directories at the project root because Next.js 14 discovers the `app` directory there. The `frontend/` folder is the ownership boundary for UI work, not a second runnable application.