# Web Verification Portal Bounded Context: ArtifyBharat

## Responsibilities
- Public-facing verification portal for consumers, institutional buyers, and government procurement officers on GeM and ONDC.
- Real-time cryptographic validation of SHA-256 provenance hashes against official registry.
- Presentation of verified artisan credentials, TRIFED registration, and GI certification.
- Embedded audio player for artisan dialect voice story.
- Financial cost transparency card showing exact breakdown: raw materials, fair wage allocation, and artisan profit (0% middleman markup).

## Invariants
- Hash verification must query the official verification endpoint (`/api/v1/passport/verify/{hash}`).
- Displays explicit non-repudiation and GI certificate status.
