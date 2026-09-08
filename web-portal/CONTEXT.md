# Web Verification Portal Bounded Context: ArtifyBharat (SIH PS 26090)

## Responsibilities
- Public-facing verification portal for consumers, institutional buyers, and government procurement officers on GeM and ONDC.
- Provenance validation authenticating the issuer via signed registry records verified against trusted keys, combined with real-time cryptographic validation of SHA-256 content hashes against the official registry.
- Public verification page displaying only masked or opaque values by default for TRIFED and Pehchan identifiers (avoiding raw identifier leaks into DOM), exposing full identifiers only after explicit user consent and successful access-control validation.
- Embedded audio player for native dialect artisan voice story.
- Financial cost transparency card showing exact 0% middleman breakdown: raw materials, fair wage allocation, and direct artisan profit.
- Dual-mode portal including an interactive Artisan Mobile Client Simulator to test the complete 6-stage artisan journey and 'Ask Dadi' voice assistant in browser.

## Invariants
- Hash verification must query the official verification endpoint (`/api/v1/passport/verify/{hash}`).
- Displays explicit content-hash validation and GI certificate status; non-repudiation is asserted only when cryptographic issuer signature validation succeeds.
