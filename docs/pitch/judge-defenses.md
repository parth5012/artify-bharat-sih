# SIH Judge Defenses — ArtifyBharat (PS 26090, MoSJE)

10-minute read. Each answer = one-line claim + code/test evidence. No invented metrics — counts and thresholds are copied from code.

---

## 1. How do you prove a product is genuinely handmade, not machine-made?

**Claim:** SHA-256 passport hash binds artisan + GPS (6dp) + timestamp + WIP photo digest; any tamper flips the 64-char hash.
**Evidence:**
- `backend/app/core/passport.py:generate_passport_hash`
- `backend/tests/test_passport_crypto.py::test_passport_hash_determinism`
- `backend/tests/test_shortcode_passport.py::test_hash_determinism_wip_sensitivity_gps_rounding`

## 2. What stops artisans from verifying their own products (collusion)?

**Claim:** Jury assignment excludes the product artisan and same-SHG peers; self-vote raises `Conflict of Interest`.
**Evidence:**
- `backend/app/services/verify_jury_service.py:assign_jury` (artisan_id + shg_id filter), `cast_vote` (self-review guard)
- `backend/tests/test_zero_trust_jury.py::test_anti_collusion_self_review_and_shg_exclusion`

## 3. What stops bribed / rubber-stamp approvals?

**Claim:** >20 votes/hour by one juror flags `FLAGGED_VELOCITY_ANOMALY` / `SUSPECTED_RUBBER_STAMP`; quorum is 2-of-3.
**Evidence:**
- `backend/app/services/verify_jury_service.py:cast_vote` (`velocity_last_hour > 20`)
- `backend/tests/test_zero_trust_jury.py::test_velocity_rubber_stamp_detection`
- `backend/tests/test_zero_trust_jury.py::test_peer_jury_assignment_and_voting_quorum`

## 4. How do you protect Aadhaar / bank / UAN privacy (DPDP Act)?

**Claim:** AES-256-GCM vault tokenizes govt IDs; public passport responses expose only an allowlist (no trifed/pehchan/phone/bank).
**Evidence:**
- `backend/app/core/pii_vault.py` (`AESGCM`, `PII_VAULT_KEY` env)
- `backend/tests/test_pii_vault.py` (10 tests incl. `test_aesgcm_backend_is_aes256`)
- `backend/tests/test_pii_vault_integration.py` (14 tests incl. `test_passport_snapshot_omits_govt_ids`)
- `backend/tests/test_passport_crypto.py::test_public_passport_allowlist_fields_omits_sensitive_pii`

## 5. How do you guarantee fair wages (no underpricing)?

**Claim:** Pricing enforces `calculated_fair_wage = labor_days × daily_wage_rate` (default ₹450/day, floor validated); predatory rates are clamped.
**Evidence:**
- `backend/app/services/pricing_service.py:calculate_pricing`
- `backend/app/schemas/pricing.py:PricingCalculateRequest` (`daily_wage_rate` default 450.0)
- `backend/tests/test_pricing_engine.py::test_statutory_wage_floor_enforcement`

## 6. How does a rural buyer with no app verify in seconds?

**Claim:** 6-char shortcode (e.g. `A7X-9B2`) resolves hyphen/case-insensitively; thermal tag prints QR + shortcode + price on 58mm (32 cols).
**Evidence:**
- `backend/app/services/passport_service.py:resolve_shortcode`, `generate_shortcode`, `generate_escpos_thermal_bytes`
- `backend/tests/test_shortcode_passport.py::test_shortcode_passport_resolution`
- `backend/tests/test_shortcode_passport.py::test_shortcode_resolve_case_hyphen_robustness`
- `backend/tests/test_shortcode_passport.py::test_escpos_bytes_58mm_layout`

## 7. What happens when the same 1-of-1 item sells on two channels at once?

**Claim:** `lock_inventory_on_sale` uses `SELECT … FOR UPDATE`, marks product `sold_out`, delists other channels as `delisted_sold`.
**Evidence:**
- `backend/app/services/export_service.py:lock_inventory_on_sale`
- `backend/tests/test_export_adapters.py::test_multi_channel_inventory_lock_on_sale`

## 8. Which marketplaces can an artisan publish to in one tap?

**Claim:** One `POST /api/v1/exports/sync` fans out to GeM XML/CSV, ONDC Beckn JSON, WhatsApp interactive card, SHG bulk CSV.
**Evidence:**
- `backend/app/api/v1/exports.py`, `backend/app/services/export_service.py`
- `backend/tests/test_export_adapters.py` (7 tests: gem, ondc, whatsapp, shg, multi-channel, end-to-end, inventory-lock)

## 9. How does the Ministry monitor impact (heatmap / audit / skilling)?

**Claim:** Admin APIs aggregate district heatmap, audit-log feed, PM-DAKSH metrics, demand forecast from the DB (with empty-DB fallback).
**Evidence:**
- `backend/app/services/admin_service.py`, `backend/app/api/v1/admin.py`
- `backend/tests/test_admin_dashboard.py` (8 tests)

## 10. How do we know the whole system actually works (not slides)?

**Claim:** 146 tests collected; fast suite 114 passed; full suite 145→146 passed after anti-collusion test; `ruff check` clean.
**Evidence:**
- `backend/tests/` (22 files; run `uv run pytest -q` → 146 passed)
- `backend/tests/test_ai_studio.py` (30 tests), `test_cv_enhancement.py` (2 tests) marked `slow`
- Upload guards: 20MB / 8000px / 4096px (`backend/app/config.py`, `backend/app/services/cv_service.py`)
- Journeys: `docs/journeys/artisan-journey.md`, `docs/journeys/buyer-journey.md` (10/10 paths MATCH via `app.openapi()`)
