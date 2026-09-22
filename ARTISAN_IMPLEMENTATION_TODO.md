# Artisan Implementation Todo

This checklist covers the artisan experience from login through product registration, publishing, and QR verification.

## 1. Foundation and Backend

- [x] Add a Next.js Node.js API route foundation.
- [x] Add development file-backed persistence outside the source tree.
- [ ] Choose production database, file storage, and authentication provider.
- [x] Add environment configuration template for ONDC, confirmation calls, and Studio services.
- [ ] Replace local-only state in `lib/store.tsx` and `lib/market.tsx` with API-backed persistence.
- [ ] Replace demo services in `lib/mock.ts` with production service adapters.
- [ ] Add server-side request validation and error handling.
- [ ] Add audit logging for profile, product, QR, and verification changes.

## 2. Artisan Login and Profile

- [x] Add mobile number login API.
- [x] Add hashed OTP verification with expiry and attempt limits.
- [x] Add authenticated HTTP-only session cookie and current-user API.
- [x] Connect onboarding to mobile OTP request and verification APIs.
- [x] New-artisan onboarding opens directly on voice profile capture.
- [x] Register the voice profile and create an authenticated session after confirmation.
- [x] Add server-side logout and session revocation.
- [x] Add artisan logout control and clear local draft state.
- [x] Redirect expired or revoked sessions from the artisan home to onboarding.
- [ ] Protect artisan routes from unauthenticated access.
- [ ] Verify Artisan ID against the authoritative source.
- [x] Save artisan profile fields through the protected profile API.
- [ ] Store artisan documents, profile photo, and workshop location securely.
- [ ] Add artisan document upload and verification status.
- [ ] Add bank or UPI details for payouts.
- [ ] Add profile edit and consent settings.

## 3. Voice Experience

- [ ] Integrate real speech-to-text, such as Bhashini or the approved voice provider.
- [x] Add a server-only Bhashini translation adapter using the Bhashini API key, not a model-provider key; it accepts the configured translation service/model ID.
- [x] Add `/api/translate` and a frontend `translateText` client helper.
- [x] Store the detected artisan language and synchronize the document language metadata.
- [ ] Use `translateText` for the complete visible UI and cache approved translations per language.
- [ ] Upload and securely store voice recordings when consent is given.
- [ ] Return transcription confidence and request confirmation for low-confidence results.
- [ ] Allow the artisan to edit extracted fields before saving.
- [ ] Add retry, timeout, offline, and upload-failure states.
- [ ] Keep text-to-speech instructions for onboarding and product creation.
- [ ] Test microphone permissions and voice flow on supported mobile browsers.

## 4. Product Draft and Creation

- [ ] Create a product draft before any photo or voice processing begins.
- [ ] Add product name, category, description, materials, dimensions, weight, price, stock, usage, care instructions, and making time.
- [ ] Support multiple product photos.
- [ ] Support work-in-progress photos.
- [ ] Capture photo timestamp and location with explicit consent.
- [ ] Add photo compression and secure media upload.
- [ ] Add required-field validation and draft autosave.
- [ ] Add edit, duplicate, archive, delete, and publish actions.
- [ ] Add inventory quantity and availability states.

## 5. AI Studio

- [x] Define the OpenCV/rembg/U²-Net processing service boundary and dependency list.
- [ ] Deploy the Studio worker and replace the placeholder enhancement flow in `components/EnhanceView.tsx`.
- [ ] Preserve the original image and store every generated version.
- [ ] Add background cleanup, lighting correction, crop, and quality checks.
- [ ] Generate product titles, short descriptions, detailed descriptions, tags, and categories.
- [ ] Generate translations into the selected marketplace languages.
- [ ] Suggest a price using materials, time, category, and artisan input.
- [ ] Show before and after previews.
- [ ] Require artisan approval before AI content is published.
- [ ] Show an explanation or source for AI-generated price and content suggestions.

## 6. Product Description Workflow

- [ ] Connect voice input to structured product fields.
- [ ] Show the original transcript and extracted values.
- [ ] Allow manual correction of every extracted value.
- [ ] Add a complete product-page preview.
- [ ] Add translation preview and language selection.
- [ ] Validate product title, description, price, photos, category, and materials before publishing.
- [ ] Save the approved description version in the product history.

## 7. Parent and Child Product Registration

- [x] Define a parent product as the design, craft, or batch record.
- [x] Define each physical item as a child product linked to one parent product.
- [x] Generate one immutable `parentHash` for each parent product.
- [x] Generate one unique immutable `childHash` for every physical item.
- [x] Generate a unique serial number for each child product.
- [ ] Reject duplicate hashes and reused serial numbers.
- [x] Store hash creation time, artisan, product, and registration event in the development API database.
- [ ] Add parent and child product status: draft, published, available, reserved, sold, archived.
- [ ] Add ownership and order events for child products.

Suggested model:

```ts
type ParentProduct = {
  id: string;
  parentHash: string;
  artisanId: string;
  name: string;
  craft: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
};

type ChildProduct = {
  id: string;
  parentProductId: string;
  childHash: string;
  serialNumber: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  qrUrl: string;
};
```

## 8. QR Code Generation and Verification

- [x] Generate a QR code for the parent product.
- [x] Generate a separate QR code for every child product.
- [x] Add server-resolved parent and child hash verification API.
- [ ] Use signed QR URLs and a production verification registry.
- [x] Update the artisan record screen to show parent and child QR codes.
- [ ] Add QR download, print, and share actions.
- [x] Update buyer verification to identify parent versus child scans.
- [x] Show artisan, product, registration date, serial number, and verification status.
- [ ] Show ownership and sold status for child-product scans.
- [ ] Handle invalid, revoked, duplicate, and tampered QR codes.
- [ ] Keep QR verification available without an artisan session.

## 9. Marketplace Integration

- [x] Register the approved artisan product through the authenticated product API before local marketplace publishing.
- [x] Add an ONDC seller-listing adapter invoked during product registration.
- [x] Add an ONDC checkout-intent adapter for buyer payment redirection.
- [x] Add a signed ONDC payment webhook contract.
- [x] Add a regional-language confirmation-call adapter after payment status updates.
- [ ] Configure and certify the ONDC buyer and seller network integrations.
- [ ] Configure the confirmation-call provider and voice templates.
- [ ] Link marketplace listings to the parent product and available child units.
- [ ] Decrease child inventory after a successful order.
- [ ] Mark the child unit as sold after payment confirmation.
- [ ] Connect buyer order history to the verified child product.
- [ ] Show the artisan story, making process, materials, and work-in-progress photos.

## 10. Offline PWA Support

- [x] Save artisan profile, photos, product drafts, and registration state locally between refreshes.
- [ ] Queue photos, voice recordings, and product changes while offline.
- [ ] Sync queued work when connectivity returns.
- [ ] Show pending, synced, and failed states.
- [ ] Prevent duplicate products when a request is retried.
- [ ] Test camera, microphone, GPS, storage, and service-worker permissions.

## 11. Security and Privacy

- [ ] Add OTP rate limiting and abuse protection.
- [ ] Use secure session tokens and server-side authorization.
- [ ] Use signed upload URLs for images and voice files.
- [ ] Protect phone number, exact workshop location, and documents from public exposure.
- [ ] Obtain consent before recording voice or location.
- [ ] Add data deletion and account recovery flows.
- [ ] Make QR registration and verification events tamper-evident.

## 12. Testing and Release

- [ ] Add unit tests for hash generation, parent-child linking, price calculations, and product validation.
- [ ] Add API tests for authentication, product creation, publishing, QR registration, and QR verification.
- [ ] Add mobile browser tests for camera, microphone, GPS, offline drafts, and QR scanning.
- [ ] Test low connectivity and interrupted uploads.
- [ ] Test duplicate submissions and refresh/reload recovery.
- [ ] Test unauthorized access to artisan and product data.
- [ ] Add production logging, monitoring, and error reporting.
- [ ] Replace all mock data and placeholder services before release.

## Suggested Delivery Order

1. [ ] Backend schema, authentication, and API foundation
2. [ ] Persistent artisan profile and product drafts
3. [ ] Parent-child product model and QR registry
4. [ ] Product publishing and marketplace inventory
5. [ ] Real voice transcription and structured descriptions
6. [ ] AI Studio services and artisan approval
7. [ ] Buyer verification and ownership history
8. [ ] Offline sync, security hardening, and release testing

## Current Prototype Gaps

- [x] Shared backend logic is separated into `backend/`; Next API route handlers remain in `app/api/` as framework adapters.
- [x] Added `frontend/` ownership documentation and `ARCHITECTURE.md`.
- [x] Backend API routes now exist for OTP auth, sessions, artisan profiles, product registration, and hash verification.
- [x] Artisan draft state now survives browser refreshes through local storage.
- [ ] `lib/mock.ts` currently returns fixed demo identity and product data.
- [ ] Local storage is only a browser-side prototype and must be replaced with authenticated backend persistence.
- [ ] Marketplace publishing currently uses local storage.
- [x] Buyer payment no longer completes locally; it creates an ONDC intent and redirects to the configured ONDC network.
- [ ] ONDC listing, payment redirect, webhook, settlement, and confirmation calls require real provider credentials and certification.
- [ ] `EnhanceView` currently simulates enhancement without changing the image.
- [x] The record flow now creates parent and child hashes; backend persistence and immutable registry are still required.
- [ ] Full logout/session recovery coverage for every protected screen is still missing.
- [ ] OTP delivery is not connected to an SMS provider; development responses expose `devCode` only outside production.
- [ ] The file-backed database is for local development only and must be replaced before deployment.
- [ ] The current QR verification depends on locally available marketplace data.