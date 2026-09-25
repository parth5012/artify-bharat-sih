# ArtifyBharat Release Checklist

This checklist defines the pre-release gates and verification steps required before cutting a release tag on `main`.

## Pre-Release Checklist Items

1. **`main` clean, release commit identified**
   Verify the working tree is clean and identify the specific commit SHA on `main` to be released.

2. **`merge-gate` green on that commit (frontend-ci + secret-scan)**
   Confirm that the GitHub Actions `merge-gate` aggregate check is green on the release commit, verifying both `frontend-ci` (typecheck, tests, build) and `secret-scan` (gitleaks).

3. **Parth review of any diff touching the CODEOWNERS creds surface**
   Mandatory review and sign-off by `@parth5012` for any diff touching protected credentials paths defined in `.github/CODEOWNERS`:
   - `.env*` and `**/.env*`
   - `docker-compose.yml`
   - `.github/workflows/`
   - `frontend/backend/bhashini.ts`
   - `frontend/tests/env-leak.test.ts`
   - `.gitleaks.toml`

4. **`.env.example` diff vs production `.env` — no new key shipped unset**
   Compare the keys in `.env.example` and `frontend/.env.example` against the target production environment to ensure no newly introduced configuration key remains unset or unconfigured.

5. **gitleaks clean over the release range**
   Confirm that secret scanning with Gitleaks produces zero findings over the range of commits included in this release.

6. **tag `vX.Y.Z` on the release commit**
   Tag the verified commit with the semantic version tag `vX.Y.Z`.

---

> **Deferred to #154**: Deploy execution (Parth only), post-deploy smoke (`/verify/{shortcode}` buyer flow + artisan login + voice E2E), and rollback procedure are deferred until production deployment infrastructure is provisioned.
