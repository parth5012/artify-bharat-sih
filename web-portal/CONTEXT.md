# Web Verification Portal Bounded Context: ArtifyBharat (SIH PS 26090)

## Responsibilities
- Public-facing verification portal for consumers, institutional buyers, and government procurement officers on GeM and ONDC.
- Real-time cryptographic validation of SHA-256 provenance hashes against the official registry.
- Verified artisan profile display: TRIFED ID, Pehchan ID, and Geographical Indication (GI) certification.
- Embedded audio player for native dialect artisan voice story.
- Financial cost transparency card showing exact 0% middleman breakdown: raw materials, fair wage allocation, and direct artisan profit.
- Dual-mode portal including an interactive Artisan Mobile Client Simulator to test the complete 6-stage artisan journey and 'Ask Dadi' voice assistant in browser.

## Invariants
- Hash verification must query the official verification endpoint (`/api/v1/passport/verify/{hash}`).
- Displays explicit non-repudiation and GI certificate status.
