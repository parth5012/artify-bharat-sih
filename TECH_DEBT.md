# Technical Debt

> Track tech debt separately to distinguish deliberate choices from bugs.
> When a decision is made for pragmatic reasons (deadline, scope), log it here.
> When a bug is actually a choice (not a mistake), log it here.

## Active Debt

| Date | Description | Rationale | Impact | Effort | Fix |
|------|-------------|-----------|--------|--------|-----|
| 2026-09-12 | pricing_service.calculate_pricing_for_product legacy wrapper | Maintained for backward compatibility with earlier draft endpoints | Low - delegates to canonical calculate_pricing with zero-division safeguard | Low | Migrate callers to unified schema in v2 |
| 2026-09-12 | pii_vault.py plaintext fallback when PII_VAULT_KEY unset | Facilitates zero-friction local development and CI testing without mandatory key provisioning | Low - in production, fail-closed guard prevents plaintext storage | Medium | Enforce key in staging/prod environments via Docker secret |
| 2026-09-12 | cv_service.enhance_image 2-tuple compatibility shim | Deprecated in favor of enhance_image_with_detail, kept for older callers | Low - internal delegate only | Low | Deprecate and remove in next major release |

## Resolved Debt

_None yet._

| ID | Date Resolved | Description | Resolution |
|----|---------------|-------------|------------|
| —  | —             | —           | —          |
