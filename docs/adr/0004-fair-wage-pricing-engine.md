# ADR 0004: Statutory Fair Wage Floor in Dynamic Pricing

## Status
Accepted

## Context
Rural weavers frequently face distress sales and middleman exploitation, selling weeks of intricate craftsmanship below minimum statutory wage rates.

## Decision
Hardcode a non-negotiable Fair Wage Floor calculated as:
$$\text{Fair Wage Floor} = \text{Labor Days} \times \text{Daily Benchmark Wage Rate}$$
The XGBoost regression model layers visual complexity and market benchmark demand *above* this protected floor.

## Consequences
- Transparent cost breakdown displayed directly on the public Heritage Passport portal.
- Guaranteed economic protection for artisan labor investment.
