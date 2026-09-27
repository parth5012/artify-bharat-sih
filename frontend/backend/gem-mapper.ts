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
