# ADR 0002: Deterministic SHA-256 Hashes for Heritage Passports

## Status
Accepted

## Context
Authenticating handloom products requires a tamper-evident mechanism verifiable by any consumer or procurement officer without trusting an intermediary database or mutable record.

## Decision
Compute a deterministic SHA-256 cryptographic digest over canonicalized JSON containing artisan identity, TRIFED ID, geo-cluster coordinates, timestamp, and labor investment.

## Consequences
- Guarantees mathematical tamper-evidence.
- Provides immediate verifiable proof of origin and GI compliance on physical QR code scans.
