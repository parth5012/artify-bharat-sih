# Learnings

> Key learnings, edge cases, and concepts worth remembering for this project.

## Project-Specific Learnings

_None yet — populate as the agent discovers patterns, edge cases, and gotchas._

- Canonical JSON (`sort_keys=True, separators=(',',':')`) before SHA-256 for Digital Heritage Passport (see ADR-0002).
- Fair Wage Floor is non-negotiable floor before premiums (see ADR-0004).
- Dual-layer AI: on-device preview + Celery cloud workers for 2G/3G zones.
- Hatchling: `packages=["app"]` when project name differs from package dir; Pydantic v2 schema (no `example`).
- Restored from backup 2026-09-12: prior learnings archived in `.tmp/harness-backup-2026-09-12/LEARNINGS.md.bak`.

## Decision Log

> Why decisions were made, alternatives considered, and consequences.

- **Multi-Channel Export Adapters (Phase 5)**: Implemented XML ElementTree generation for GeM B2G HSN-50072010 specifications, Beckn v1.0 schema validator for ONDC on_search catalog, WhatsApp Cloud API CTA card with NPCI-standard UPI deep-link and shortcode, and SHG tiered volume discount CSV generator. All adapters carry cryptographic Digital Heritage Passport hash.

## Edge Cases

> Known edge cases, gotchas, and non-obvious behaviors discovered during work.

- **Mocking CV enhance in export tests**: Rembg U2-Net model downloads over network (~170MB) if not cached locally, which stalls unit test suites. Fast export adapter suites mock enhance_image so tests run deterministically in <0.5s.
- **Deep copy for nested schema validation tests**: In Python, dict(payload) creates a shallow copy; mutating nested dictionary fields modifies the source object. Use copy.deepcopy when constructing negative schema test variants.
