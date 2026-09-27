# Marketplace Publishing Flow

## Overview

The redesigned Step 6 "Ready" flow creates a professional publishing experience that shows artisans their products are being published to real digital marketplaces (ONDC and GeM).

## User Flow

### 1. Publishing Animation (`PublishingFlow` component)

When artisan clicks "Proceed" from the review page:

```
STEP 6 OF 6 · READY
[Animated spinner/check]
"Taking your craft to market"
"Your product is being published..."

✓ Product registered
✓ Photos & product details saved
✓ Publishing to ONDC Network   [Live sandbox]
  on_search ack · 1 attempt · catalog cat_…
→ GeM approval packet   [Packet ready (manual upload)]
○ Making your product available to buyers
```

**Duration**: follows the real publish pipeline — no simulated delays. Local record → photo thumbnails + passport hash → `POST /api/products` (the server pushes the Beckn `on_search` catalog) → durable local publish.
**Design**: Orange spinner, emerald checkmarks, clean checklist (unchanged)

**Source badge (grill A1)**: the ONDC row carries a visible badge — `Live sandbox` (emerald) when the sandbox answered, `Offline fallback` (orange) when the sandbox was unreachable/unset and the mocked intent ran (`ondc.fallback === true`). The proof line under the row shows the `on_search` ack, attempt count and sandbox catalog id.

**Listing failure**: if the sandbox rejects the listing (`ondc.listed === false`, e.g. a 4xx `reason`), the ONDC row turns red and a `role="alert"` panel shows the reason with a **Try Again** button. Retry re-runs the seller publish for the already-registered product (`POST /api/ondc/listing`) — it never registers a second copy. Success is never claimed for a rejected listing.

### 2. Success State (`MarketplaceSuccess` component)

After publishing completes:

```
[✓ Success icon]
"Your craft is now live!"
"Your product has been successfully published."

┌─────────────────────────────┐
│ [ONDC Logo]  ONDC Network   │
│ ✓ Published [Live sandbox]  │
│ on_search catalog cat_…     │
│ Ready for buyer orders      │
│ [View Listing]              │
└─────────────────────────────┘

┌─────────────────────────────┐
│ [GeM Logo]  Government      │
│ e-Marketplace               │
│ [Packet ready (manual       │
│  upload)]                   │
│ Manual upload · 5-stage form│
│ [Download GeM packet]       │
└─────────────────────────────┘

Product ID: ART-P-0001
Ready to receive orders

[Go to My Products]
[View Marketplace]
```

## Technical Implementation

### Components

#### `PublishingFlow.tsx`
- Renders the 5-step checklist from **real** publish status (no timers)
- Status derivation lives in `frontend/lib/publishing.ts` (`deriveChecklist`)
- Shows the Live sandbox / Offline fallback source badge + `on_search` proof line
- GeM step shows the **`Packet ready (manual upload)`** badge once `POST /api/gem/packet` returned a packet (XML + CSV + 5-stage manifest)
- Failure states with **Try Again**: `ondc.listed === false` relists; a failed packet re-runs `POST /api/gem/packet` (never re-registers the product)
- Keeps orange/emerald design, `role="status"` progress region, `role="alert"` failures
- Calls `onComplete()` when every step is done

#### `MarketplaceSuccess.tsx`
- Displays success state with marketplace cards
- ONDC card carries the same source badge + `on_search` catalog id
- GeM card carries the `Packet ready (manual upload)` badge + a **Download GeM packet** action (no listing link — GeM has no listing API)
- Shows ONDC and GeM logos (with fallbacks)
- Displays product ID
- Provides navigation to products or marketplace

### Integration Points

#### Record Page (`record/page.tsx`)
- Creates product record
- Runs the real publish pipeline and reports progress to `PublishingFlow`
- Photos + passport hash → `POST /api/products` → durable local publish
- After the ONDC listing succeeds → `POST /api/gem/packet` → the GeM packet step (block completion until ready)
- Surfaces the hard-failure screen and re-runs the pipeline on Try Again
- Handles offline queueing (queued on failure; dropped when a manual retry succeeds)
- Shows `MarketplaceSuccess` on completion

#### APIs
- `/api/products` - Product registration + ONDC listing (`{product, ondc}`)
- `/api/ondc/listing` - Listing retry for an already-registered product (Try Again)
- `/api/gem/packet` - GeM approval-ready packet generator (`{gem: {catalog, xml, csv, manifest, env}}`); manual-upload lane, GeM has no public seller catalog-upload API (Try Again re-runs this route only)

### Logo Assets

Logos should be placed in:
```
frontend/public/logos/
  ondc-logo.png  (256x256px, transparent PNG)
  gem-logo.png   (256x256px, transparent PNG)
```

If logos are missing, text fallbacks are shown.

## Design System

### Colors
- **Orange (#F97316)**: Primary action, ONDC accent
- **Blue (#3B82F6)**: GeM accent
- **Emerald (#059669)**: Success, published status
- **Stone**: Neutral text and backgrounds

### Animations
- `animate-pop`: Success icon entrance
- `animate-pulse`: Loading spinner
- `animate-ping`: Active step indicator
- `animate-spin`: Loading states

### Typography
- **Headings**: Extrabold (3xl/2xl)
- **Labels**: Bold uppercase (11px)
- **Body**: Regular/semibold (14px)

## Error Handling

### Publishing Failure
If the registration API call fails:
```
⚠️
"Could not publish product"
[Error message]
[Try again]
```

### ONDC Listing Rejected
If the sandbox accepts the product but rejects the listing (`ondc.listed === false`):
```
✗ Publishing to ONDC Network
"Could not publish to the ONDC Network"
[reason, e.g. ONDC listing rejected with 422]
[Try Again]   → POST /api/ondc/listing (re-publishes the registered product)
```

### Network Offline
Product is queued for retry when connection returns (existing offline handling preserved). If the artisan's manual Try Again reaches the server first, the queued copy of that record is dropped so only one product is registered.

## Accessibility

- Clear status indicators (✓ checkmarks, loading spinners)
- `role="status"` + `aria-live="polite"` progress region; `role="alert"` on the failure panel
- High contrast colors
- Large touch targets for buttons
- Simple language for low-literacy users
- Progress indication at each step

## Future Enhancements

### Real API Integration
- ONDC seller publish runs against the local beckn sandbox (`ONDC_SELLER_LISTING_URL`), with the Grill A1 offline fallback when it is down
- GeM: packet generator + manual upload (GeM exposes no seller catalog-upload API; a GeM API lane could replace manual upload when GeM publishes one)
- Product listing endpoints for GeM / other portals

### Enhanced Status
- Real-time order notifications
- Inventory tracking
- Sales analytics

### Multi-language
- Hindi/regional language support
- Voice announcements for publishing status

## Testing

### Manual Testing Checklist
- [ ] Publishing animation shows all 5 steps from real progress (no fixed delays)
- [ ] Checkmarks appear as each real step finishes
- [ ] ONDC step shows the Live sandbox / Offline fallback source badge
- [ ] ONDC step shows the `on_search` proof line (attempts + catalog id)
- [ ] Sandbox rejection shows the failure panel and Try Again re-publishes
- [ ] Success state shows both marketplace cards (with the source badge)
- [ ] Product ID is displayed correctly
- [ ] "Go to My Products" navigates to home
- [ ] "View Marketplace" navigates to product page
- [ ] Error state shows if API fails
- [ ] Offline queueing works
- [ ] Logos display (or fallback text shows)

### User Acceptance
Test with artisans to verify:
- Publishing status is clear
- Marketplace cards are understood
- Navigation makes sense
- No confusing technical terms

## Notes

- The checklist reads real publish progress (`frontend/lib/publishing.ts`); it is no longer simulated with delays
- ONDC publish requires a reachable sandbox (`docker compose up beckn_sandbox`); otherwise the A1 fallback lists the mocked intent and the badge says so
- GeM has no listing API: the flow generates an approval-ready packet (XML + CSV + manifest) and the artisan uploads it manually on the gem.gov.in 5-stage dashboard (GeM Admin approval, 3-day TAT)
- Product IDs follow format: `ART-P-####` for display, `u-{recordId}` internally
- Privacy: Artisan phone numbers are never published to marketplaces
