# ArtifyBharat Web Verification Portal

Public-facing Digital Heritage Passport Verification Portal for consumers, institutional buyers, and government procurement officers (GeM / ONDC).

## Key Features
- **Cryptographic Provenance Verification**: Verifies 64-character SHA-256 hash printed on product QR code.
- **Artisan Credential Validation**: Cross-checks TRIFED ID, Pehchan ID, and Geographical Indication (GI) certification.
- **Voice Story Player**: Streams original dialect audio recording made by the artisan during cataloging.
- **Financial Cost Transparency**: Displays exact raw material cost, fair wage days allocation, and artisan profit margin (eliminates middleman exploitation).

## Running the Web Portal
Can be served with any static web server or via Vite:
```bash
cd web-portal
npm install
npm run dev
```
Or open `web-portal/index.html` directly in any web browser.
