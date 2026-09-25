# Requirements Document

## Introduction

This specification defines the requirements for removing Gemini API quota warning messages from the artisan pricing flow in ArtifyBharat. The system currently exposes technical implementation details (Gemini API failures, quota exhaustion, authentication errors) to rural artisans who should only experience silent, deterministic pricing fallback. This requirement ensures that artisans receive pricing data without technical jargon about external service failures.

## Glossary

- **Market_Pricing_Service**: The backend pricing service at `legacy/backend/app/services/market_pricing.py` that orchestrates market research via Gemini API and calculates fair wage pricing
- **Gemini_API**: Google's Generative AI API used for market research (optional external service)
- **Artisan**: Rural weaver or handicraft creator using the pricing flow to determine product pricing
- **Deterministic_Pricing_Fallback**: Local offline pricing calculation using predefined material costs and state labour rates when external market research is unavailable
- **Warning_Message**: User-facing text string returned in pricing response indicating service degradation or technical issues
- **Pricing_Response**: JSON object returned by `research_market_data()` or `calculate_market_pricing()` containing pricing data and optional warning field
- **UI_Price**: Frontend component that displays pricing calculations to artisans

## Requirements

### Requirement 1: Silent Quota Exhaustion

**User Story:** As an artisan, I want to receive pricing estimates without seeing technical error messages, so that I can focus on my product pricing decisions without confusion about system internals.

#### Acceptance Criteria

1. WHEN the Gemini API returns HTTP status 429 (quota exhausted), THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
2. THE Market_Pricing_Service SHALL apply the Deterministic_Pricing_Fallback without exposing the quota exhaustion condition to the Artisan
3. THE Pricing_Response SHALL contain valid material_prices, labour_wage, and research_status fields when quota is exhausted
4. THE Market_Pricing_Service SHALL set research_status to "fallback" when the Deterministic_Pricing_Fallback is applied

### Requirement 2: Silent Authentication Failures

**User Story:** As an artisan, I want consistent pricing results regardless of API authentication issues, so that external service problems do not interrupt my workflow.

#### Acceptance Criteria

1. WHEN the Gemini API returns HTTP status 401 or 403 (authentication failure), THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
2. THE Market_Pricing_Service SHALL apply the Deterministic_Pricing_Fallback without exposing credential rejection to the Artisan
3. THE Pricing_Response SHALL contain deterministic material_prices based on FALLBACK_MATERIAL_PRICES constants when authentication fails

### Requirement 3: Silent General API Failures

**User Story:** As an artisan, I want to receive pricing estimates even when market research services are unavailable, so that I can continue cataloging products without technical disruptions.

#### Acceptance Criteria

1. WHEN the Gemini API returns any HTTP error status other than 429, 401, or 403, THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
2. WHEN the Gemini API response cannot be parsed as valid JSON, THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
3. WHEN the Gemini API request times out or raises httpx.HTTPError, THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
4. THE Market_Pricing_Service SHALL apply the Deterministic_Pricing_Fallback for all error conditions without user-facing warnings

### Requirement 4: Silent Missing API Key

**User Story:** As an artisan in a deployment without Gemini API configured, I want to receive pricing estimates using local data, so that I can use the system in offline or restricted environments.

#### Acceptance Criteria

1. WHEN the GEMINI_API_KEY configuration is missing or empty, THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
2. THE Market_Pricing_Service SHALL apply the Deterministic_Pricing_Fallback immediately without attempting external API calls
3. THE Pricing_Response SHALL contain research_status set to "fallback" when API key is unavailable

### Requirement 5: Remove Default Warning Parameter

**User Story:** As a developer, I want the fallback function to return no warnings by default, so that new error paths automatically follow the silent fallback pattern.

#### Acceptance Criteria

1. THE Market_Pricing_Service `_local_fallback_market_data()` method SHALL have a default warning parameter value of None
2. WHEN `_local_fallback_market_data()` is invoked without explicit warning parameter, THE Market_Pricing_Service SHALL return a Pricing_Response with warning field set to None
3. THE method signature SHALL allow optional warning override for backward compatibility during implementation

### Requirement 6: Preserve Business Logic Warnings

**User Story:** As an artisan, I want to see warnings about actual pricing concerns (like market prices below my costs), so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN market_average is less than estimated_cost, THE Market_Pricing_Service SHALL return a warning message explaining the pricing concern
2. THE Market_Pricing_Service SHALL distinguish between technical warnings (suppressed) and business logic warnings (preserved)
3. THE warning field SHALL contain text about market-vs-cost discrepancies when such conditions exist
4. THE business logic warning SHALL use plain language without technical terminology about APIs or services

### Requirement 7: Backend-Only Implementation

**User Story:** As a developer, I want warning suppression implemented entirely in the backend service, so that frontend components remain unchanged and maintainable.

#### Acceptance Criteria

1. THE Market_Pricing_Service SHALL remove all Gemini-related warning strings in `research_market_data()` method
2. THE Market_Pricing_Service SHALL return warning field as None for all technical failure paths
3. WHERE the UI_Price component exists, THE frontend SHALL require no code changes to support silent warnings
4. THE Pricing_Response schema SHALL maintain backward compatibility with existing warning field type (Optional[str])

### Requirement 8: Maintain Deterministic Fallback Data Quality

**User Story:** As an artisan, I want fallback pricing to provide meaningful estimates, so that I can still catalog products when market research is unavailable.

#### Acceptance Criteria

1. WHEN Deterministic_Pricing_Fallback is applied, THE Market_Pricing_Service SHALL return material_prices based on FALLBACK_MATERIAL_PRICES constants
2. WHEN Deterministic_Pricing_Fallback is applied, THE Market_Pricing_Service SHALL return labour_wage based on STATE_LABOUR_RATES constants
3. THE Pricing_Response SHALL include research_status field set to "fallback" to enable debugging without user-facing messages
4. THE Pricing_Response SHALL include product_understanding, estimated_material_cost, and estimated_making_time fields with fallback values

### Requirement 9: Testing and Verification

**User Story:** As a developer, I want comprehensive test coverage for warning suppression, so that the silent fallback behavior is verified and protected against regressions.

#### Acceptance Criteria

1. THE test suite SHALL verify warning field is None when Gemini API returns HTTP 429
2. THE test suite SHALL verify warning field is None when Gemini API returns HTTP 401 or 403
3. THE test suite SHALL verify warning field is None when Gemini API returns other HTTP errors
4. THE test suite SHALL verify warning field is None when GEMINI_API_KEY is missing
5. THE test suite SHALL verify business logic warnings are preserved when market_average is less than estimated_cost
6. THE test suite SHALL verify Deterministic_Pricing_Fallback returns valid pricing data structure with all required fields

