# Digital Heritage Passport & Cryptographic Provenance Specification

## 1. Objective
Counterfeiting in the Indian handloom and handicraft industry causes severe economic distress to authentic weavers. The **Digital Heritage Passport** establishes mathematical and physical proof of origin, authenticity, and fair wage transparency.

---

## 2. Deterministic Hash Formula

The Heritage Passport hash is calculated using SHA-256 over a canonicalized JSON payload:

$$\text{Passport Hash} = \text{SHA-256}(\text{CanonicalJSON}(\mathcal{P}))$$

Where $\mathcal{P}$ consists of:
1. `artisan_id`: Unique system UUID
2. `trifed_id`: Government TRIFED registration number (or Pehchan ID)
3. `geo_lat`, `geo_lng`: Geocoordinates of artisan weaving cluster rounded to 6 decimals
4. `product_title`: Cleaned UTF-8 string title
5. `craft_category`: Canonicalized craft classification (e.g. `handloom`)
6. `timestamp`: ISO 8601 UTC timestamp of issue
7. `raw_material_cost`: Float rounded to 2 decimals
8. `labor_days`: Float rounded to 1 decimal

```python
canonical_json = json.dumps(payload_data, sort_keys=True, separators=(',', ':'))
hash_digest = hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
```

### Tamper Evidence
Any modification of:
- The artisan's identity or location
- The craft category or title
- The claimed labor days or raw material costs
produces a completely uncorrelated SHA-256 digest, immediately failing public verification.

---

## 3. High-Contrast QR Code Standard
- **Encoding**: Alphanumeric URI `https://verify.artifybharat.in/passport/{hash}`
- **Error Correction**: Level H (30% damage tolerance) to withstand fabric abrasion, dye exposure, or tag folding.
- **Physical Application**: Printable directly on woven fabric labels, hangtags, or packaging inserts.

---

## 4. Consumer / Procurement Verification Output
When scanned by a consumer or government procurement officer on GeM/ONDC:
1. **Government Identity**: Displays verified TRIFED ID and cluster location.
2. **GI Tag Registry**: Displays valid Geographical Indication certification details.
3. **Voice Recording Stream**: Direct playback of the artisan's voice describing the piece in their native dialect.
4. **Financial Transparency Card**:
   - Raw Material Cost
   - Fair Wage Floor (Labor Days $\times$ Benchmark Wage)
   - Artisan Direct Net Profit Margin
   - Total Fair Trade Price (Zero middleman markup)
