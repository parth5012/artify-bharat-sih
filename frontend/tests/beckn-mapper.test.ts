import {readFileSync} from 'node:fs';
import path from 'node:path';

import {
  BecknProductInput,
  mapProductToBecknCatalog,
} from '@/backend/beckn-mapper';

// Wayfinder #192 — Artify product -> Beckn retail catalog mapper.
// Pure contract test (grill A3: mocked data only, no live sandbox, no fetch).

const MAPPER_PATH = path.resolve(
  __dirname,
  '..',
  'backend',
  'beckn-mapper.ts',
);

const PASSPORT_GROUP_CODE = 'DIGITAL_HERITAGE_PASSPORT';

function baseProduct(overrides: Partial<BecknProductInput> = {}): BecknProductInput {
  return {
    id: 'prd_9f21',
    providerId: 'ART-2041',
    title: 'Banarasi Silk Saree',
    description: 'Handwoven on a pit loom with real zari.',
    price: 2500,
    shortcode: 'a7x9b2',
    parentHash: 'p'.repeat(64),
    childHash: 'c'.repeat(64),
    giRegistration: 'Banarasi Saree (GI-39)',
    cluster: 'Varanasi Handloom Cluster',
    wipImageUrls: ['/products/prd_9f21-wip-1.jpg'],
    studioImageUrls: ['/products/prd_9f21-studio-1.jpg'],
    artisanDisplayName: 'Ramesh Kumar',
    artisanDistrict: 'Varanasi',
    voiceStoryUrl: '/media/voice-story-ramesh-01.mp3',
    ...overrides,
  };
}

function itemOf(product: BecknProductInput) {
  const catalog = mapProductToBecknCatalog(product);
  const provider = catalog.providers[0];
  return {catalog, provider, item: provider.items[0]};
}

function passportGroup(product: BecknProductInput) {
  const {item} = itemOf(product);
  const group = item.tags.find((t) => t.descriptor.code === PASSPORT_GROUP_CODE);
  if (!group) throw new Error('missing Digital Heritage Passport tag group');
  return group;
}

function tagValue(product: BecknProductInput, name: string): string | undefined {
  return passportGroup(product).list.find((t) => t.descriptor.name === name)?.value;
}

describe('mapProductToBecknCatalog (#192 Beckn catalog mapper)', () => {
  it('normalizes the Heritage Passport shortcode in tags and in the verify link', () => {
    const product = baseProduct({shortcode: 'a7x9b2'});
    const {item} = itemOf(product);
    expect(tagValue(product, 'shortcode')).toBe('A7X-9B2');
    expect(item.descriptor.long_desc).toContain('/verify/A7X-9B2');
  });

  it('normalizes an already-hyphenated uppercase shortcode without double-hyphenating', () => {
    expect(tagValue(baseProduct({shortcode: 'A7X-9B2'}), 'shortcode')).toBe('A7X-9B2');
    expect(tagValue(baseProduct({shortcode: 'a7x-9b2'}), 'shortcode')).toBe('A7X-9B2');
    expect(tagValue(baseProduct({shortcode: ' a7x9b2 '}), 'shortcode')).toBe('A7X-9B2');
  });

  it('redacts PII: DPDP-sensitive values carried by the input never reach the output', () => {
    // Artisan rows carry contact/settlement/government identifiers upstream.
    // The mapper builds its output from an allow-list only, so none of these
    // values may survive serialization.
    const piiCarryingProduct = {
      ...baseProduct(),
      mobileNumber: '9876543210',
      settlementReference: '001122334455',
      governmentIdNumber: '1234 5678 9012',
      paymentHandle: 'ramesh@okhdfc',
      loginPasscode: '4821',
    } as unknown as BecknProductInput;

    const serialized = JSON.stringify(mapProductToBecknCatalog(piiCarryingProduct));
    for (const secret of [
      '9876543210',
      '001122334455',
      '1234 5678 9012',
      'ramesh@okhdfc',
      '4821',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('passes the GI registration through as a passport tag', () => {
    expect(tagValue(baseProduct(), 'GI')).toBe('Banarasi Saree (GI-39)');
  });

  it('emits price as an integer paise string in INR', () => {
    const {item} = itemOf(baseProduct({price: 2500}));
    expect(item.price.currency).toBe('INR');
    expect(item.price.value).toBe('250000');
    expect(item.price.value).toMatch(/^\d+$/);

    const fractional = itemOf(baseProduct({price: 1138.5})).item;
    expect(fractional.price.value).toBe('113850');

    // Non-finite or negative prices must never surface as a signed/degenerate value.
    expect(itemOf(baseProduct({price: Number.NaN})).item.price.value).toBe('0');
    expect(itemOf(baseProduct({price: -50})).item.price.value).toBe('0');
  });

  it('omits the verify link when the product carries no shortcode', () => {
    const {item} = itemOf(baseProduct({shortcode: ''}));
    expect(item.descriptor.long_desc).not.toContain('/verify/');
    expect(tagValue(baseProduct({shortcode: ''}), 'shortcode')).toBe('');
  });

  it('includes both WIP and studio images in descriptor.images', () => {
    const {item} = itemOf(baseProduct());
    const urls = (item.descriptor.images ?? []).map((image) => image.url);
    expect(urls).toEqual([
      '/products/prd_9f21-wip-1.jpg',
      '/products/prd_9f21-studio-1.jpg',
    ]);
  });

  it('shows the verify link and the artisan voice story URL in visible description (grill A2)', () => {
    const {item} = itemOf(baseProduct());
    const visible = `${item.descriptor.short_desc ?? ''}\n${item.descriptor.long_desc ?? ''}`;
    expect(visible).toContain('/verify/A7X-9B2');
    expect(visible).toContain('/media/voice-story-ramesh-01.mp3');

    const withoutVoice = itemOf(baseProduct({voiceStoryUrl: undefined})).item;
    expect(`${withoutVoice.descriptor.short_desc ?? ''}\n${withoutVoice.descriptor.long_desc ?? ''}`)
      .not.toContain('Artisan voice story:');
  });

  it('carries parentHash, childHash, cluster and the Fair Wage Floor flag as tags', () => {
    const product = baseProduct();
    expect(tagValue(product, 'parentHash')).toBe(product.parentHash);
    expect(tagValue(product, 'childHash')).toBe(product.childHash);
    expect(tagValue(product, 'cluster')).toBe('Varanasi Handloom Cluster');
    expect(tagValue(product, 'wage_floor_enforced')).toBe('true');
  });

  it('keeps the provider descriptor to artisan display name + district only', () => {
    const {provider} = itemOf(baseProduct());
    expect(Object.keys(provider.descriptor).sort()).toEqual(['name', 'short_desc']);
    expect(provider.descriptor.name).toBe('Ramesh Kumar');
    expect(provider.descriptor.short_desc).toBe('Varanasi');
  });

  it('mapper source stays pure: no process.env and no server-only env literal', () => {
    const source = readFileSync(MAPPER_PATH, 'utf8');
    expect(source).not.toContain('process.env');
    expect(source.includes('ONDC_')).toBe(false);
    expect(JSON.stringify(mapProductToBecknCatalog(baseProduct())).includes('ONDC_')).toBe(false);
  });

  it('mapper source has no I/O imports (ondc.ts / db.ts / fetch)', () => {
    const source = readFileSync(MAPPER_PATH, 'utf8');
    expect(source).not.toMatch(/from\s+['"]\.\.?\/(ondc|db)['"]/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it('mapper source carries the contract note citing the spec files (item/tags shapes)', () => {
    const source = readFileSync(MAPPER_PATH, 'utf8');
    expect(source).toContain('ONDC-Official/ONDC-Protocol-Specs');
    expect(source).toContain('protocol-specifications/core/v0/api/core.yaml');
    expect(source).toContain('schema/TagGroup.yaml');
  });
});
