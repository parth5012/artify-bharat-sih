/**
 * Artify product -> GeM approval-ready packet mapper (pure: no I/O, no env, no fetch).
 *
 * Ported field-for-field from the legacy GeM formatter
 * `legacy/backend/app/services/export_service.py` (`format_for_gem`,
 * `format_for_gem_xml`, `to_gem_csv` — read only, `legacy/` excluded from CI):
 * Wayfinder #202 / map #201. Output is the manual-upload packet (grill G1:
 * XML + CSV + manifest); GeM has no public seller catalog-upload API, so the
 * artisan pastes these into the dashboard's 5-stage form trail.
 *
 * Locked defaults (session grill, `.opencode/design/gem-packet-builder/grill.md`):
 * - G2: craft -> HSN table defaults to `50072010`, `category_code`
 *   `HANDLOOM_SAREE_7210`, `unit_of_measurement` `PIECE`, `country_of_origin` `India`.
 *
 * DEVIATION from the Python port (reported on the ticket, not silently resolved):
 * 1. Python `str(True)` serializes booleans as `True`/`False`; this mapper emits
 *    JSON-convention `true`/`false` in XML/CSV so GeM's dashboard importer does not
 *    receive Python-specific casing. Element/header names are unchanged.
 * 2. Legacy `verification_url` came from the passport row
 *    (`PASSPORT_VERIFICATION_BASE_URL/{shortcode}`); this mapper is pure, so the
 *    base URL is an optional *input* (`verificationBaseUrl`, default `''` ->
 *    site-relative `/verify/{shortcode}`) and the shortcode is normalized here.
 *
 * Server-only guard: never value-import this module from `frontend/lib/` or
 * `frontend/components/` — `frontend/tests/env-leak.test.ts` owns that invariant.
 */

import {normalizeShortcode} from './beckn-mapper';

/** Product + artisan + passport view fed to the mapper. */
export type GemProductInput = {
  /** Product id (`ProductRecord.id`) — becomes `product_id`. */
  id: string;
  title: string;
  /** Becomes `item_description`. */
  description: string;
  /** PricingAI retail price in INR rupees — becomes `base_price_inr`. */
  price: number;
  /** Digital Heritage Passport 6-char shortcode, any case/hyphenation. */
  shortcode: string;
  /** Digital Heritage Passport hash (`ProductRecord.childHash`) — `digital_passport_hash`. */
  passportHash: string;
  /** Artisan display name; organization_name is `<name> Handloom Enterprise` (legacy parity). */
  artisanName: string;
  /** TRIFED / Pehchan id for `trifed_artisan_id` (already display-safe). */
  trifedId?: string;
  /** `artisan_state`. */
  state?: string;
  /** `cluster_location`. */
  clusterName?: string;
  /** GI certification tag number/text; absent -> `gi_certification_tagged` false. */
  giTag?: string;
  /**
   * Absolute origin for `verification_url` (pure input — never environment reads).
   * Default `''` -> site-relative `/verify/{shortcode}`.
   */
  verificationBaseUrl?: string;
};

export type GemSellerDetails = {
  organization_name: string;
  trifed_artisan_id: string;
  artisan_state: string;
  cluster_location: string;
};

export type GemProductDetails = {
  title: string;
  item_description: string;
  gi_certification_tagged: boolean;
  gi_tag_number: string;
  country_of_origin: string;
  hsn_code: string;
  unit_of_measurement: string;
  base_price_inr: number;
};

export type GemAuthenticityVerification = {
  digital_passport_hash: string;
  verification_url: string;
};

/** GeM catalog dict — element parity with legacy `format_for_gem`. */
export type GemCatalog = {
  gem_catalog_version: string;
  category_code: string;
  seller_details: GemSellerDetails;
  product_details: GemProductDetails;
  authenticity_verification: GemAuthenticityVerification;
};

/** Stable CSV header set — byte-for-byte the legacy `to_gem_csv` header list. */
export const GEM_CSV_HEADERS = [
  'gem_catalog_version',
  'category_code',
  'organization_name',
  'trifed_artisan_id',
  'artisan_state',
  'cluster_location',
  'product_id',
  'title',
  'item_description',
  'gi_certification_tagged',
  'gi_tag_number',
  'country_of_origin',
  'hsn_code',
  'unit_of_measurement',
  'base_price_inr',
  'digital_passport_hash',
  'verification_url',
] as const;

const GEM_CATALOG_VERSION = '3.0';
const GEM_CATEGORY_CODE = 'HANDLOOM_SAREE_7210';
const GEM_HSN_CODE = '50072010';
const GEM_UNIT = 'PIECE';
const COUNTRY_OF_ORIGIN = 'India';

/** Site-relative (or `verificationBaseUrl`-rooted) buyer verification link. */
function verificationUrl(product: GemProductInput): string {
  const shortcode = normalizeShortcode(product.shortcode ?? '');
  if (!shortcode) return '';
  const base = (product.verificationBaseUrl ?? '').replace(/\/+$/, '');
  return `${base}/verify/${shortcode}`;
}

/** GeM product catalog dict (legacy `format_for_gem` field parity). */
export function mapProductToGemCatalog(product: GemProductInput): GemCatalog {
  const giTag = product.giTag ?? '';
  return {
    gem_catalog_version: GEM_CATALOG_VERSION,
    category_code: GEM_CATEGORY_CODE,
    seller_details: {
      organization_name: `${product.artisanName} Handloom Enterprise`,
      trifed_artisan_id: product.trifedId ?? '',
      artisan_state: product.state ?? '',
      cluster_location: product.clusterName ?? '',
    },
    product_details: {
      title: product.title,
      item_description: product.description,
      gi_certification_tagged: Boolean(giTag),
      gi_tag_number: giTag,
      country_of_origin: COUNTRY_OF_ORIGIN,
      hsn_code: GEM_HSN_CODE,
      unit_of_measurement: GEM_UNIT,
      base_price_inr: product.price,
    },
    authenticity_verification: {
      digital_passport_hash: product.passportHash,
      verification_url: verificationUrl(product),
    },
  };
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function element(name: string, value: unknown): string {
  return `<${name}>${escapeXmlText(value === null || value === undefined ? '' : String(value))}</${name}>`;
}

function section(name: string, values: Record<string, unknown>): string {
  const children = Object.entries(values)
    .map(([key, value]) => element(key, value))
    .join('');
  return `<${name}>${children}</${name}>`;
}

/**
 * GeM XML catalog (legacy `format_for_gem_xml` element parity):
 * `gem_catalog` root with `version` attribute, `category_code`,
 * `seller_details`, `product_details` (with `product_id` first),
 * `authenticity_verification`.
 */
export function mapProductToGemXml(product: GemProductInput): string {
  const catalog = mapProductToGemCatalog(product);
  const productDetails = {
    product_id: product.id,
    title: catalog.product_details.title,
    item_description: catalog.product_details.item_description,
    gi_certification_tagged: String(catalog.product_details.gi_certification_tagged),
    gi_tag_number: catalog.product_details.gi_tag_number,
    country_of_origin: catalog.product_details.country_of_origin,
    hsn_code: catalog.product_details.hsn_code,
    unit_of_measurement: catalog.product_details.unit_of_measurement,
    base_price_inr: catalog.product_details.base_price_inr,
  };
  const body =
    element('category_code', catalog.category_code) +
    section('seller_details', catalog.seller_details) +
    section('product_details', productDetails) +
    section('authenticity_verification', catalog.authenticity_verification);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<gem_catalog version="${escapeXmlText(catalog.gem_catalog_version)}">${body}</gem_catalog>`
  );
}

/** RFC4180 field: quote when the value contains a comma, quote, or line break. */
function csvField(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * GeM CSV bulk catalog (legacy `to_gem_csv` header parity). Accepts one
 * product or a list; a single header row is written for the whole block.
 */
export function mapProductToGemCsv(product: GemProductInput | GemProductInput[]): string {
  const items = Array.isArray(product) ? product : [product];
  const lines = [GEM_CSV_HEADERS.join(',')];
  for (const item of items) {
    const catalog = mapProductToGemCatalog(item);
    const row = {
      gem_catalog_version: catalog.gem_catalog_version,
      category_code: catalog.category_code,
      organization_name: catalog.seller_details.organization_name,
      trifed_artisan_id: catalog.seller_details.trifed_artisan_id,
      artisan_state: catalog.seller_details.artisan_state,
      cluster_location: catalog.seller_details.cluster_location,
      product_id: item.id,
      title: catalog.product_details.title,
      item_description: catalog.product_details.item_description,
      gi_certification_tagged: String(catalog.product_details.gi_certification_tagged),
      gi_tag_number: catalog.product_details.gi_tag_number,
      country_of_origin: catalog.product_details.country_of_origin,
      hsn_code: catalog.product_details.hsn_code,
      unit_of_measurement: catalog.product_details.unit_of_measurement,
      base_price_inr: catalog.product_details.base_price_inr,
      digital_passport_hash: catalog.authenticity_verification.digital_passport_hash,
      verification_url: catalog.authenticity_verification.verification_url,
    };
    lines.push(GEM_CSV_HEADERS.map((header) => csvField(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

// --- Wayfinder #203: human manifest (GeM 5-stage dashboard trail) -------------
//
// The manifest is the *human* half of the packet: a structured checklist that
// maps 1:1 onto GeM's real seller dashboard (5 stages + GeM Admin approval),
// so an artisan/SHG operator can paste the values in minutes. GeM has no
// public seller catalog-upload API (map #201), so nothing here is pushed.
//
// Locked session rules (grill G2 + G3, `.opencode/design/gem-packet-builder/grill.md`):
// - G3: the chosen fair-wage tier supplies the OFFER, and MRP is derived from
//   it (`MRP = ceil(offer / 0.9)`) so the offer is ALWAYS >= 10% below MRP.
//   `Math.ceil`, not `Math.round`: at offer=1000 round() gives 1111, which is
//   only 9.99% below MRP and violates the rule — 1112 gives 10.07%.
// - G2: craft -> (category, HSN) table seeded from CONTEXT.md clusters;
//   default `HANDLOOM_SAREE_7210` / `50072010`.
// - Golden parameters are GeM-controlled per category: the manifest always
//   carries an explicit `goldenParamsMustFillInDashboard` remainder and never
//   claims completeness.

/** Rule text carried verbatim in `stage3_price.rule` (grill G3). */
export const GEM_MRP_RULE = 'offer >= 10% below MRP';

export type GemCraftRule = {
  cluster: string;
  categoryCode: string;
  hsnCode: string;
};

/** Locked G2 table — CONTEXT.md craft clusters (Varanasi/Pashmina/Madhubani/Kutch). */
export const GEM_CRAFT_RULES: readonly GemCraftRule[] = [
  {cluster: 'Varanasi Handloom Cluster', categoryCode: 'HANDLOOM_SAREE_7210', hsnCode: '50072010'},
  {cluster: 'Kashmir Pashmina Cluster', categoryCode: 'HANDLOOM_SHAWL_6214', hsnCode: '621410'},
  {cluster: 'Madhubani Art Cluster', categoryCode: 'MADHUBANI_PAINTING_9701', hsnCode: '970190'},
  {cluster: 'Kutch Embroidery Cluster', categoryCode: 'HANDICRAFT_EMBROIDERY_5805', hsnCode: '580500'},
];

/** Locked G2 default — every unmapped craft falls back here (grill G2). */
export const GEM_DEFAULT_CRAFT_RULE: GemCraftRule = GEM_CRAFT_RULES[0];

const GEM_CRAFT_MATCHERS: {test: RegExp; rule: GemCraftRule}[] = [
  {test: /pashmina|wool/i, rule: GEM_CRAFT_RULES[1]},
  {test: /madhubani|mithila/i, rule: GEM_CRAFT_RULES[2]},
  {test: /kutch|kachchh/i, rule: GEM_CRAFT_RULES[3]},
  {test: /varanasi|banarasi|handloom|saree|silk/i, rule: GEM_CRAFT_RULES[0]},
];

/** Resolve a free-text craft/cluster name to the seeded (category, HSN) rule. */
export function resolveGemCraft(craftOrCluster: string): GemCraftRule {
  const value = (craftOrCluster ?? '').trim();
  if (!value) return GEM_DEFAULT_CRAFT_RULE;
  for (const {test, rule} of GEM_CRAFT_MATCHERS) {
    if (test.test(value)) return rule;
  }
  return GEM_DEFAULT_CRAFT_RULE;
}

/**
 * Derive MRP from the fair-wage-tier offer so the offer is always >= 10% below
 * MRP (grill G3). The offer is the ONLY price input to `buildGemManifest`, so
 * an invalid (mrp, offer) pair is unrepresentable in the manifest.
 * Throws on a non-positive / non-finite offer.
 */
export function deriveGemMrp(offerPrice: number): number {
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    throw new Error(`gem: offerPrice must be a positive finite number (got ${String(offerPrice)})`);
  }
  return Math.ceil(offerPrice / 0.9);
}

/** Validate an externally supplied (MRP, offer) pair against the 10% rule. */
export function validateGemPricePair(pair: {mrp: number; offerPrice: number}): {
  valid: boolean;
  /** Discount off MRP in percent, 2 decimals. */
  discountPercent: number;
  reason?: string;
} {
  const {mrp, offerPrice} = pair;
  const finite = Number.isFinite(mrp) && Number.isFinite(offerPrice) && mrp > 0 && offerPrice > 0;
  const discountPercent = finite ? Math.round(((mrp - offerPrice) / mrp) * 10000) / 100 : 0;
  if (!finite) return {valid: false, discountPercent: 0, reason: 'mrp and offerPrice must be positive numbers'};
  if (offerPrice >= mrp) return {valid: false, discountPercent, reason: 'offerPrice must be below mrp'};
  if ((mrp - offerPrice) / mrp < 0.1 - 1e-9) {
    return {valid: false, discountPercent, reason: GEM_MRP_RULE};
  }
  return {valid: true, discountPercent};
}

export type GemManifestStage1 = {
  sellerName: string;
  trifedArtisanId: string;
  state: string;
  cluster: string;
};

export type GemManifestStage2 = {
  categoryCode: string;
  brandNote: string;
  /** Known-good subset we can prefill (pure constants, never secrets). */
  goldenParams: Record<string, string>;
  /** Everything GeM still controls — always non-empty, never claimed filled. */
  goldenParamsMustFillInDashboard: string[];
};

export type GemManifestStage3 = {
  hsn: string;
  sku: string;
  /** Derived: `ceil(offer / 0.9)` (grill G3). */
  mrp: number;
  /** Fair-wage tier offer — the only price the human chooses. */
  offerPrice: number;
  /** Discount off MRP in percent, 2 decimals. */
  discount: number;
  deliveryLocation: string;
  stock: number;
  /** Lead time in days. */
  leadTime: number;
  rule: string;
};

export type GemManifestStage4 = {
  title: string;
  description: string;
  makeModel: string;
  certifications: string[];
  countryOfOrigin: string;
};

export type GemManifestStage5 = {
  /** Exactly the 3 media slots the GeM dashboard exposes. */
  imageSlots: number[];
  images: string[];
  termsAccepted: boolean;
};

export type GemManifestPassport = {
  shortcode: string;
  parentHash: string;
  childHash: string;
  giTag: string;
  verifyUrl: string;
};

export type GemManifest = {
  stage1_general: GemManifestStage1;
  stage2_category: GemManifestStage2;
  stage3_price: GemManifestStage3;
  stage4_spec: GemManifestStage4;
  stage5_media: GemManifestStage5;
  passport: GemManifestPassport;
  manual_upload_note: string;
};

export type GemManifestInput = GemProductInput & {
  /** Digital Heritage Passport parent hash. */
  parentHash: string;
  /** Free-text craft / cluster name — seeds the G2 (category, HSN) rule. */
  craft?: string;
  /** Fair-wage tier offer in INR rupees; MRP is derived from it (grill G3). */
  offerPrice: number;
  sku?: string;
  deliveryLocation?: string;
  stock?: number;
  leadTimeDays?: number;
  makeModel?: string;
  certifications?: string[];
  brandNote?: string;
  images?: string[];
  termsAccepted: boolean;
};

/** GeM-controlled golden parameters we cannot know — always ask the dashboard. */
const GOLDEN_PARAMS_MUST_FILL = [
  'brand',
  'model',
  'dimensions',
  'weight',
  'gst_rate',
  'warranty',
  'installation_service',
  'delivery_sla',
  'payment_terms',
];

export const GEM_MANUAL_UPLOAD_NOTE =
  'Packet is complete for MANUAL upload: sign in to the gem.gov.in seller dashboard, ' +
  'run the 5-stage catalogue form (General -> Category -> Price -> Specification -> Media), ' +
  'paste the matching fields from stage1..stage5, attach the 3 images, then download/upload ' +
  'gem-catalog.xml or gem-catalog.csv where the dashboard offers bulk upload. GeM Admin ' +
  'approval follows (3-day TAT). No API push is performed — GeM exposes no public seller ' +
  'catalog-upload API.';

/**
 * Build the human manifest: the 5-stage GeM dashboard checklist with the G3
 * price rule enforced by construction (offer in -> MRP derived).
 */
export function buildGemManifest(input: GemManifestInput): GemManifest {
  const catalog = mapProductToGemCatalog(input);
  // `??` alone is a bug here: a blank/whitespace craft string is NOT nullish,
  // so it would skip the cluster fallback and silently land on the default rule
  // (OCR medium finding). Trim first, then treat empty as "no craft given".
  const craft = resolveGemCraft(input.craft?.trim() || catalog.seller_details.cluster_location);
  const offerPrice = input.offerPrice;
  const mrp = deriveGemMrp(offerPrice);
  const price = validateGemPricePair({mrp, offerPrice});
  if (!price.valid) throw new Error(`gem: invalid price pair — ${price.reason ?? GEM_MRP_RULE}`);

  const shortcode = normalizeShortcode(input.shortcode ?? '');
  const goldenParams: Record<string, string> = {
    hsn_code: craft.hsnCode,
    country_of_origin: catalog.product_details.country_of_origin,
    unit_of_measurement: catalog.product_details.unit_of_measurement,
  };

  return {
    stage1_general: {
      sellerName: catalog.seller_details.organization_name,
      trifedArtisanId: catalog.seller_details.trifed_artisan_id,
      state: catalog.seller_details.artisan_state,
      cluster: catalog.seller_details.cluster_location,
    },
    stage2_category: {
      categoryCode: craft.categoryCode,
      brandNote: input.brandNote ?? `Handmade by ${input.artisanName} — ${craft.cluster}`,
      goldenParams,
      goldenParamsMustFillInDashboard: [...GOLDEN_PARAMS_MUST_FILL],
    },
    stage3_price: {
      hsn: craft.hsnCode,
      sku: input.sku ?? `GEM-${shortcode || input.id}`,
      mrp,
      offerPrice,
      discount: price.discountPercent,
      deliveryLocation: input.deliveryLocation ?? '',
      stock: input.stock ?? 1,
      leadTime: input.leadTimeDays ?? 0,
      rule: GEM_MRP_RULE,
    },
    stage4_spec: {
      title: input.title,
      description: input.description,
      makeModel: input.makeModel ?? '',
      certifications: input.certifications ?? (input.giTag ? [input.giTag] : []),
      countryOfOrigin: catalog.product_details.country_of_origin,
    },
    stage5_media: {
      imageSlots: [1, 2, 3],
      images: input.images ?? [],
      termsAccepted: Boolean(input.termsAccepted),
    },
    passport: {
      shortcode,
      parentHash: input.parentHash,
      childHash: input.passportHash,
      giTag: input.giTag ?? '',
      verifyUrl: catalog.authenticity_verification.verification_url,
    },
    manual_upload_note: GEM_MANUAL_UPLOAD_NOTE,
  };
}
