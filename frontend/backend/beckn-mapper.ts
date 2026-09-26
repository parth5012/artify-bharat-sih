/**
 * Artify product -> Beckn retail catalog mapper (pure: no I/O, no env, no fetch).
 *
 * Contract citation (Wayfinder #192):
 * - ONDC-Official/ONDC-Protocol-Specs, `protocol-specifications/core/v0/api/core.yaml`
 *   (info.version 1.0.1, "adaptation of Beckn Core version 0.9.3"):
 *   `paths./on_search` -> `message.catalog` (`components/schemas/Catalog`),
 *   `components/schemas/Provider`, `components/schemas/Item`,
 *   `components/schemas/Descriptor`, `components/schemas/Price`,
 *   `components/schemas/DecimalValue` (value is a decimal STRING), `components/schemas/Image`.
 * - beckn/protocol-specifications `schema/TagGroup.yaml` + `schema/Tag.yaml`
 *   (`Item.tags` is `TagGroup[]`; each group is `descriptor` + `list: Tag[]`,
 *   each tag is `descriptor` (name/code) + `value` string). This is the shape the
 *   pinned sandbox canned `on_search` uses:
 *   beckn/beckn-sandbox `src/local-retail/retail-1.1.0/response/response.search.json`.
 *
 * MISMATCH (reported on the ticket, not silently resolved):
 * 1. ONDC core.yaml declares `components/schemas/Tags` as a flat string map
 *    (`additionalProperties: type: string`), while the retail-1.1.0 sandbox canned
 *    response uses `TagGroup[]`. Implemented the sandbox-aligned `TagGroup[]` shape
 *    so #193 can post into the local sandbox.
 * 2. Sandbox canned `price.value` is a decimal rupee string (`"1200.0"`); this
 *    mapper emits integer paise (`"250000"`) per the ticket's locked contract.
 * 3. ONDC `Descriptor` has no `description` field — it has `short_desc`/`long_desc`.
 *    The visible trust text (verify link + voice story) lives in `long_desc`.
 */

/** Product + Digital Heritage Passport + artisan view fed to the mapper. */
export type BecknProductInput = {
  /** Product id (`ProductRecord.id`) — becomes the Beckn item id. */
  id: string;
  /** BPP provider id (`ProductRecord.artisanId`). */
  providerId: string;
  title: string;
  description: string;
  /** PricingAI retail price in INR rupees (`ProductRecord.price`). */
  price: number;
  /** Digital Heritage Passport 6-char shortcode, any case/hyphenation. */
  shortcode: string;
  parentHash: string;
  childHash: string;
  giRegistration?: string;
  cluster?: string;
  wipImageUrls?: string[];
  studioImageUrls?: string[];
  artisanDisplayName: string;
  artisanDistrict: string;
  /** Artisan voice story URL; omitted when the product carries none. */
  voiceStoryUrl?: string;
};

export type BecknDescriptor = {
  name?: string;
  code?: string;
  short_desc?: string;
  long_desc?: string;
  images?: {url: string}[];
};

export type BecknTag = {
  descriptor: {name: string; code: string};
  value: string;
  display: boolean;
};

export type BecknTagGroup = {
  descriptor: {name: string; code: string};
  display: boolean;
  list: BecknTag[];
};

export type BecknPrice = {currency: string; value: string};

export type BecknItem = {
  id: string;
  descriptor: BecknDescriptor;
  price: BecknPrice;
  tags: BecknTagGroup[];
};

export type BecknProvider = {
  id: string;
  descriptor: BecknDescriptor;
  items: BecknItem[];
};

export type BecknCatalog = {
  descriptor: BecknDescriptor;
  providers: BecknProvider[];
};

const CATALOG_NAME = 'ArtifyBharat';
const PASSPORT_GROUP_NAME = 'Digital Heritage Passport';
const PASSPORT_GROUP_CODE = 'DIGITAL_HERITAGE_PASSPORT';
const FAIR_WAGE_FLOOR_TAG = 'wage_floor_enforced';

/**
 * Normalize a 6-char Heritage Passport shortcode to the printed `A7X-9B2` form:
 * strip whitespace/underscores and hyphens, uppercase, re-insert the hyphen
 * after the third character when exactly 6 characters remain.
 */
export function normalizeShortcode(raw: string): string {
  const compact = (raw ?? '').trim().replace(/[\s_-]/g, '').toUpperCase();
  if (compact.length === 6) return `${compact.slice(0, 3)}-${compact.slice(3)}`;
  return compact;
}

function tag(name: string, code: string, value: string): BecknTag {
  return {descriptor: {name, code}, value, display: true};
}

/** Integer-paise string (no decimals, no currency symbol) from an INR rupee amount. */
function priceInPaise(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees < 0) return '0';
  return String(Math.round(rupees * 100));
}

export function mapProductToBecknCatalog(product: BecknProductInput): BecknCatalog {
  const shortcode = normalizeShortcode(product.shortcode ?? '');
  const verifyUrl = `/verify/${shortcode}`;

  const descriptionLines = [product.description.trim()];
  if (shortcode) descriptionLines.push(`Verify authenticity: ${verifyUrl}`);
  if (product.voiceStoryUrl) descriptionLines.push(`Artisan voice story: ${product.voiceStoryUrl}`);

  const images = [
    ...(product.wipImageUrls ?? []),
    ...(product.studioImageUrls ?? []),
  ].map((url) => ({url}));

  const passportList = [
    tag('parentHash', 'PARENT_HASH', product.parentHash),
    tag('childHash', 'CHILD_HASH', product.childHash),
    tag('shortcode', 'SHORTCODE', shortcode),
  ];
  if (product.giRegistration) passportList.push(tag('GI', 'GI_REGISTRATION', product.giRegistration));
  if (product.cluster) passportList.push(tag('cluster', 'CLUSTER', product.cluster));
  passportList.push(tag(FAIR_WAGE_FLOOR_TAG, 'WAGE_FLOOR_ENFORCED', 'true'));

  const item: BecknItem = {
    id: product.id,
    descriptor: {
      name: product.title,
      short_desc: product.description,
      long_desc: descriptionLines.filter(Boolean).join('\n\n'),
      images,
    },
    price: {currency: 'INR', value: priceInPaise(product.price)},
    tags: [
      {
        descriptor: {name: PASSPORT_GROUP_NAME, code: PASSPORT_GROUP_CODE},
        display: true,
        list: passportList,
      },
    ],
  };

  const provider: BecknProvider = {
    id: product.providerId,
    descriptor: {
      name: product.artisanDisplayName,
      short_desc: product.artisanDistrict,
    },
    items: [item],
  };

  return {
    descriptor: {name: CATALOG_NAME},
    providers: [provider],
  };
}
