import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {
  GemProductInput,
  mapProductToGemCatalog,
  mapProductToGemCsv,
  mapProductToGemXml,
} from '@/backend/gem-mapper';

// Wayfinder #202 — Artify product -> GeM approval-ready packet mapper.
// Pure contract test (TDD red first): HSN, GI passthrough, shortcode
// normalization, XML well-formedness, CSV header stability.

const REPO = path.resolve(__dirname, '..', '..');
const MAPPER_PATH = path.resolve(__dirname, '..', 'backend', 'gem-mapper.ts');

const CSV_HEADERS = [
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
];

function baseProduct(overrides: Partial<GemProductInput> = {}): GemProductInput {
  return {
    id: 'prd_9f21',
    title: 'Banarasi Silk Saree',
    description: 'Handwoven on a pit loom with real zari.',
    price: 2500,
    shortcode: 'a7x9b2',
    passportHash: 'c'.repeat(64),
    artisanName: 'Ramesh Kumar',
    trifedId: 'TRF-2041',
    state: 'Uttar Pradesh',
    clusterName: 'Varanasi Handloom Cluster',
    giTag: 'Banarasi Saree (GI-39)',
    ...overrides,
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Minimal stack-based XML parser: returns dotted path -> text for elements with text. */
function parseXml(xml: string): {root: string; attrs: Record<string, string>; leaves: Record<string, string>} {
  const withoutDecl = xml.replace(/^<\?xml[^?]*\?>\s*/i, '');
  const tagRe = /<(\/)?([A-Za-z_][\w.-]*)((?:\s+[\w.-]+\s*=\s*"[^"]*")*)\s*(\/)?>/g;
  const stack: {name: string; path: string; buffer: string}[] = [];
  const leaves: Record<string, string> = {};
  let root = '';
  let attrs: Record<string, string> = {};
  let text = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  const flush = () => {
    const top = stack[stack.length - 1];
    if (top && text.trim()) top.buffer += decodeEntities(text);
    text = '';
  };
  while ((match = tagRe.exec(withoutDecl)) !== null) {
    const [full, closing, name, attrString, selfClosing] = match;
    text += withoutDecl.slice(cursor, match.index);
    cursor = match.index + full.length;
    flush();
    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== name) throw new Error(`mismatched close </${name}>`);
      if (open.buffer.trim()) leaves[open.path] = open.buffer.trim();
      continue;
    }
    const path = stack.length === 0 ? name : `${stack[stack.length - 1].path}.${name}`;
    if (stack.length === 0 && !root) {
      root = name;
      attrs = Object.fromEntries(
        [...attrString.matchAll(/([\w.-]+)\s*=\s*"([^"]*)"/g)].map((a) => [a[1], a[2]]),
      );
    }
    if (!selfClosing) stack.push({name, path, buffer: ''});
  }
  text += withoutDecl.slice(cursor);
  flush();
  if (stack.length > 0) throw new Error(`unclosed tags: ${stack.map((s) => s.name).join(',')}`);
  return {root, attrs, leaves};
}

/** RFC4180-ish CSV row split (quotes may contain commas/newlines). */
function parseCsv(csv: string): {headers: string[]; rows: string[][]} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return {headers: headers ?? [], rows: body};
}

describe('mapProductToGemCatalog (#202 GeM packet mapper)', () => {
  it('carries the locked craft->HSN default 50072010 (grill G2)', () => {
    const catalog = mapProductToGemCatalog(baseProduct());
    expect(catalog.product_details.hsn_code).toBe('50072010');
    expect(mapProductToGemXml(baseProduct())).toContain('<hsn_code>50072010</hsn_code>');
    const csv = parseCsv(mapProductToGemCsv(baseProduct()));
    expect(csv.rows[0][CSV_HEADERS.indexOf('hsn_code')]).toBe('50072010');
  });

  it('passes the GI tag through (grill G2 field parity)', () => {
    const catalog = mapProductToGemCatalog(baseProduct());
    expect(catalog.product_details.gi_certification_tagged).toBe(true);
    expect(catalog.product_details.gi_tag_number).toBe('Banarasi Saree (GI-39)');

    const noGi = mapProductToGemCatalog(baseProduct({giTag: undefined}));
    expect(noGi.product_details.gi_certification_tagged).toBe(false);
    expect(noGi.product_details.gi_tag_number).toBe('');
  });

  it('normalizes the Heritage Passport shortcode in the verification URL', () => {
    expect(mapProductToGemCatalog(baseProduct({shortcode: 'a7x9b2'})).authenticity_verification.verification_url).toContain('/verify/A7X-9B2');
    expect(mapProductToGemCatalog(baseProduct({shortcode: 'A7X-9B2'})).authenticity_verification.verification_url).toContain('/verify/A7X-9B2');
    expect(mapProductToGemCatalog(baseProduct({shortcode: ' a7x9b2 '})).authenticity_verification.verification_url).toContain('/verify/A7X-9B2');
    expect(mapProductToGemXml(baseProduct({shortcode: 'a7x9b2'}))).toContain('/verify/A7X-9B2');
    const csv = parseCsv(mapProductToGemCsv(baseProduct({shortcode: 'a7x9b2'})));
    expect(csv.rows[0][CSV_HEADERS.indexOf('verification_url')]).toContain('/verify/A7X-9B2');
  });

  it('joins verificationBaseUrl without producing a double slash', () => {
    const trailing = mapProductToGemCatalog(baseProduct({verificationBaseUrl: 'https://artifybharat.in/'}));
    expect(trailing.authenticity_verification.verification_url).toBe('https://artifybharat.in/verify/A7X-9B2');
    const bare = mapProductToGemCatalog(baseProduct({verificationBaseUrl: 'https://artifybharat.in'}));
    expect(bare.authenticity_verification.verification_url).toBe('https://artifybharat.in/verify/A7X-9B2');
  });

  it('escapes the apostrophe so strict XML tooling accepts the text', () => {
    const {leaves} = parseXml(mapProductToGemXml(baseProduct({description: "Kanthi's silk"})));
    expect(leaves['gem_catalog.product_details.item_description']).toBe("Kanthi's silk");
    expect(mapProductToGemXml(baseProduct({description: "Kanthi's silk"}))).toContain('&apos;');
  });

  it('emits seller_details / product_details / authenticity_verification field parity with legacy format_for_gem', () => {
    const catalog = mapProductToGemCatalog(baseProduct());
    expect(catalog.gem_catalog_version).toBe('3.0');
    expect(catalog.category_code).toBe('HANDLOOM_SAREE_7210');
    expect(Object.keys(catalog.seller_details)).toEqual([
      'organization_name',
      'trifed_artisan_id',
      'artisan_state',
      'cluster_location',
    ]);
    expect(catalog.seller_details.organization_name).toBe('Ramesh Kumar Handloom Enterprise');
    expect(catalog.seller_details.trifed_artisan_id).toBe('TRF-2041');
    expect(catalog.seller_details.artisan_state).toBe('Uttar Pradesh');
    expect(catalog.seller_details.cluster_location).toBe('Varanasi Handloom Cluster');
    expect(catalog.product_details.country_of_origin).toBe('India');
    expect(catalog.product_details.unit_of_measurement).toBe('PIECE');
    expect(catalog.product_details.base_price_inr).toBe(2500);
    expect(catalog.authenticity_verification.digital_passport_hash).toBe('c'.repeat(64));
  });
});

describe('mapProductToGemXml (#202)', () => {
  it('is well-formed XML with gem_catalog root + version attribute', () => {
    const xml = mapProductToGemXml(baseProduct());
    const {root, attrs, leaves} = parseXml(xml);
    expect(root).toBe('gem_catalog');
    expect(attrs.version).toBe('3.0');
    expect(xml.startsWith('<?xml')).toBe(true);
  });

  it('has element parity with legacy format_for_gem_xml (category/seller/product/auth)', () => {
    const {leaves} = parseXml(mapProductToGemXml(baseProduct()));
    expect(leaves['gem_catalog.category_code']).toBe('HANDLOOM_SAREE_7210');
    expect(leaves['gem_catalog.seller_details.organization_name']).toBe('Ramesh Kumar Handloom Enterprise');
    expect(leaves['gem_catalog.seller_details.trifed_artisan_id']).toBe('TRF-2041');
    expect(leaves['gem_catalog.product_details.product_id']).toBe('prd_9f21');
    expect(leaves['gem_catalog.product_details.title']).toBe('Banarasi Silk Saree');
    expect(leaves['gem_catalog.product_details.item_description']).toBe('Handwoven on a pit loom with real zari.');
    expect(leaves['gem_catalog.product_details.country_of_origin']).toBe('India');
    expect(leaves['gem_catalog.authenticity_verification.digital_passport_hash']).toBe('c'.repeat(64));
  });

  it('escapes XML metacharacters so the document still parses back', () => {
    const xml = mapProductToGemXml(baseProduct({description: 'A & B <zari> "fine"'}));
    const {leaves} = parseXml(xml);
    expect(leaves['gem_catalog.product_details.item_description']).toBe('A & B <zari> "fine"');
  });
});

describe('mapProductToGemCsv (#202)', () => {
  it('keeps the legacy stable header set, in order', () => {
    const {headers} = parseCsv(mapProductToGemCsv(baseProduct()));
    expect(headers).toEqual(CSV_HEADERS);
  });

  it('writes one row with the mapped values (incl. product_id and normalized shortcode URL)', () => {
    const {rows} = parseCsv(mapProductToGemCsv(baseProduct()));
    expect(rows).toHaveLength(1);
    const row = Object.fromEntries(CSV_HEADERS.map((h, i) => [h, rows[0][i]]));
    expect(row.gem_catalog_version).toBe('3.0');
    expect(row.category_code).toBe('HANDLOOM_SAREE_7210');
    expect(row.product_id).toBe('prd_9f21');
    expect(row.title).toBe('Banarasi Silk Saree');
    expect(row.country_of_origin).toBe('India');
    expect(row.unit_of_measurement).toBe('PIECE');
    expect(row.base_price_inr).toBe('2500');
    expect(row.gi_certification_tagged).toBe('true');
    expect(row.verification_url).toContain('/verify/A7X-9B2');
  });

  it('quotes commas and doubles embedded quotes (RFC4180)', () => {
    const {rows} = parseCsv(mapProductToGemCsv(baseProduct({description: 'Silk, cotton & "zari"'})));
    expect(rows[0][CSV_HEADERS.indexOf('item_description')]).toBe('Silk, cotton & "zari"');
    expect(mapProductToGemCsv(baseProduct({description: 'a,b'}))).toContain('"a,b"');
  });

  it('accepts multiple products as one CSV block with a single header', () => {
    const csv = mapProductToGemCsv([baseProduct(), baseProduct({id: 'prd_2', title: 'Tussar Silk Saree'})]);
    const {headers, rows} = parseCsv(csv);
    expect(headers).toEqual(CSV_HEADERS);
    expect(rows).toHaveLength(2);
    expect(rows[1][CSV_HEADERS.indexOf('title')]).toBe('Tussar Silk Saree');
  });
});

describe('gem-mapper purity + server-only guard (#202)', () => {
  it('mapper source is pure: no process.env, no I/O imports, no fetch', () => {
    const source = readFileSync(MAPPER_PATH, 'utf8');
    expect(source).not.toContain('process.env');
    expect(source).not.toMatch(/from\s+['"]\.\.?\/(ondc|db|http)['"]/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it('is never value-imported by frontend/lib or components', () => {
    const hits = execFileSync('git', ['ls-files'], {cwd: REPO, encoding: 'utf8'})
      .split('\n')
      .filter((rel) => (rel.startsWith('frontend/lib/') || rel.startsWith('frontend/components/')) && (rel.endsWith('.ts') || rel.endsWith('.tsx')));
    for (const rel of hits) {
      const text = readFileSync(path.join(REPO, rel), 'utf8');
      expect(text).not.toMatch(/from\s+['"][^'"]*gem-mapper['"]/);
    }
  });

  it('mapper source carries the port-from / convention note', () => {
    const source = readFileSync(MAPPER_PATH, 'utf8');
    expect(source).toContain('legacy/backend/app/services/export_service.py');
    expect(source).toContain('format_for_gem');
  });
});
