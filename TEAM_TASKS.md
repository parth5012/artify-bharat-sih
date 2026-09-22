# Artifact Team Tasks

## Task Distribution

### Parth: Voice, Bhashini, and Form Processing

Own the complete voice-to-form workflow for artisan onboarding and product creation.

- [ ] Integrate Bhashini speech recognition for recorded voice.
- [ ] Detect the language spoken by the artisan.
- [ ] Translate the transcript to English for structured processing.
- [ ] Extract artisan name, phone, Artisan ID, location, and craft.
- [ ] Extract product name, materials, making process, usage, and time required.
- [ ] Populate the artisan profile form from extracted voice data.
- [ ] Populate the product description form from extracted voice data.
- [ ] Show transcript and extracted fields for artisan confirmation.
- [ ] Add low-confidence, retry, timeout, and microphone-error states.
- [ ] Save approved artisan profile data through the backend API.
- [ ] Save approved product description data through the backend API.
- [ ] Keep Bhashini credentials server-side only.

Primary areas: `components/VoiceScreen.tsx`, `components/useVoice.ts`, `app/(artisan)/onboarding`, `app/(artisan)/describe`, `backend/bhashini.ts`, and voice API routes.

Done when: a real Hindi or regional-language recording produces a confirmed English transcript and fills the correct profile or product fields without fixed demo values.

### Yashit: AI Studio and Price Engine

Own product media enhancement and pricing recommendations.

- [ ] Build the AI Studio service integration.
- [ ] Use OpenCV for orientation, crop, lighting, framing, and image quality checks.
- [ ] Use `rembg` with U2-Net for background removal.
- [ ] Preserve the original image and every generated version.
- [ ] Show before/after comparison to the artisan.
- [ ] Require artisan approval before publishing enhanced images.
- [ ] Build the price engine using materials, time, category, size, and artisan input.
- [ ] Show price calculation factors and suggested price range.
- [ ] Allow the artisan to change the final price.
- [ ] Add image and price service error states.

Primary areas: `components/EnhanceView.tsx`, `backend/studio`, AI Studio API routes, and the price-engine service.

Done when: an artisan can enhance a real product image, approve the result, and receive an explainable price suggestion that is saved with the product.

### Mayank: QR and Product Hashes

Own product authenticity, parent/child identity, and QR verification.

- [ ] Generate one immutable parent hash for each product design or batch.
- [ ] Generate one unique child hash and serial number for every physical product.
- [ ] Reject duplicate hashes and serial numbers.
- [ ] Generate downloadable and printable parent QR codes.
- [ ] Generate downloadable and printable child QR codes.
- [ ] Update buyer verification for parent and child scans.
- [ ] Show artisan, product, serial number, registration date, and status.
- [ ] Add revoked, invalid, tampered, and already-used QR states.
- [ ] Add child ownership and sold-status history.
- [ ] Add automated tests for hash uniqueness and verification.

Primary areas: `backend/db.ts`, `app/api/products`, `app/api/products/verify`, `app/(artisan)/record`, and `app/buyer/q/[hash]`.

Done when: every physical product has a unique verifiable QR code linked to a parent product and the buyer sees the correct authenticity state.

### Anshika: User Interface and Experience

Own visual quality, responsive behavior, accessibility, and interaction polish.

- [ ] Improve artisan onboarding, profile, capture, describe, review, and record screens.
- [ ] Improve loading, success, empty, offline, error, and permission states.
- [ ] Make the interface comfortable for mobile-first artisan use.
- [ ] Add clear microphone, camera, GPS, and network permission guidance.
- [ ] Improve language-aware labels and layout behavior.
- [ ] Improve product preview and QR presentation.
- [ ] Improve buyer checkout and ONDC redirect messaging.
- [ ] Keep controls accessible with keyboard, screen reader, and touch support.
- [ ] Test narrow mobile, tablet, and desktop layouts.
- [ ] Add visual regression screenshots for major flows.

Primary areas: `app/(artisan)`, `components`, `app/buyer`, and `app/globals.css`.

Done when: the core flows are understandable without developer assistance and remain usable across supported mobile and desktop sizes.

### Yash: Integration, Backend, ONDC, and Release

Own the remaining platform work and coordinate integration across the team.

- [ ] Replace the development JSON database with PostgreSQL, Supabase, or the approved production database.
- [ ] Protect all artisan routes and APIs with server-side authentication.
- [ ] Connect production OTP delivery and session recovery.
- [ ] Connect ONDC seller listing when an artisan publishes a product.
- [ ] Connect ONDC buyer checkout redirect.
- [ ] Verify ONDC payment webhooks and idempotency.
- [ ] Ensure settlement is handled by the ONDC-linked artisan account.
- [ ] Connect regional-language confirmation calls after payment status updates.
- [ ] Add media storage for photos, audio, and processed images.
- [ ] Add product draft, inventory, order, and child-unit status persistence.
- [ ] Add offline sync and retry handling.
- [ ] Add API validation, rate limiting, audit logging, and privacy controls.
- [ ] Add integration, API, and end-to-end tests.
- [ ] Maintain `.env.example`, deployment configuration, and release checklist.
- [ ] Review and merge team branches without exposing credentials.

Primary areas: `backend`, `app/api`, `lib/store.tsx`, `lib/market.tsx`, ONDC adapters, and deployment configuration.

Done when: all team features work through authenticated backend APIs, payments remain on ONDC, secrets are protected, and the production build and test suite pass.

## Shared Rules

- Never commit `.env`, API keys, OTP secrets, or provider tokens.
- Use `.env.example` for variable names only.
- Keep provider credentials in server-side code and API routes.
- Do not process or store payment credentials in Artifact.
- ONDC owns buyer payment and artisan settlement.
- Preserve original media before applying AI Studio processing.
- Every product change must keep parent/child identity relationships intact.
- Add a focused test for every new API or business rule.
- Update `ARTISAN_IMPLEMENTATION_TODO.md` when a task is completed.

## Working Order

1. Parth defines voice output and form field contracts.
2. Yash implements or updates APIs for those contracts.
3. Yashit consumes approved product data for Studio and pricing.
4. Mayank registers parent/child hashes after product approval.
5. Anshika polishes the complete flow and error states.
6. Yash runs integration, security, and release validation.
