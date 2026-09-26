/**
 * Regex regression suite (ticket #177, spec §7).
 * Port of frontend/lib/nlp.test.ts (hand-rolled runTests harness, never
 * collected by jest roots) to proper describe/it/expect. Preserves all 7
 * seed transcripts and behavioral assertions. lib/nlp.test.ts is deleted.
 */
import {
  extractArtisanFromTranscript,
  extractProductFromTranscript,
} from '../lib/nlp';

describe('nlp regex: artisan identity (English clean)', () => {
  it('extracts all artisan fields from clean English transcript', () => {
    const text =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const res = extractArtisanFromTranscript(text);

    expect(res.name.value).toBe('Ramesh Kumar');
    expect(res.name.confidence).toBeGreaterThanOrEqual(0.8);
    expect(res.name.flag).toBe('verified');

    expect(res.phone.value).toBe('9876543210');
    expect(res.phone.confidence).toBeGreaterThanOrEqual(0.9);

    expect(res.artisanId.value).toBe('ART-2041');
    expect(res.artisanId.confidence).toBeGreaterThanOrEqual(0.8);

    expect(res.location.value).toContain('Bastar');
    const craft = (res.craft.value ?? '').toLowerCase();
    expect(craft.includes('handloom') || craft.includes('weaving')).toBe(true);
  });
});

describe('nlp regex: missing fields without demo fallback', () => {
  it('missing fields return null and missing flag without demo fallback', () => {
    const text = 'I craft brass statues in Varanasi.';
    const res = extractArtisanFromTranscript(text);

    expect(res.name.value).toBeNull();
    expect(res.name.flag).toBe('missing');
    expect(res.name.confidence).toBe(0);

    expect(res.phone.value).toBeNull();
    expect(res.phone.flag).toBe('missing');

    expect(res.artisanId.value).toBeNull();
    expect(res.artisanId.flag).toBe('missing');

    expect(res.location.value).toContain('Varanasi');
    expect((res.craft.value ?? '').toLowerCase()).toContain('brass');
  });
});

describe('nlp regex: phone variations', () => {
  it('handles phone variations like +91 and hyphens', () => {
    const text = 'Name is Sunita Bai, contact +91 91234-56789 from Jaipur.';
    const res = extractArtisanFromTranscript(text);

    expect(res.phone.value).toBe('9123456789');
    expect(res.phone.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

describe('nlp regex: Hindi/Devanagari', () => {
  it('extracts entities from Hindi/Devanagari text', () => {
    const text =
      'मेरा नाम शान्ति देवी है। फोन 9812345670 और आईडी ART-5521 है। मैं मधुबनी से हूँ।';
    const res = extractArtisanFromTranscript(text);

    expect(res.name.value).toBe('शान्ति देवी');
    expect(res.phone.value).toBe('9812345670');
    expect(res.artisanId.value).toBe('ART-5521');
    expect(res.location.value).toContain('मधुबनी');
  });
});

describe('nlp regex: product (Banarasi)', () => {
  it('extracts product entities from English transcript', () => {
    const text =
      'This is a handwoven Banarasi pure silk saree with authentic gold zari border. It is made using pit loom jacquard weaving and took 15 full days to craft. It is used for weddings and festive ceremonies.';
    const res = extractProductFromTranscript(text);

    const pname = (res.productName.value ?? '').toLowerCase();
    expect(pname.includes('saree') || pname.includes('banarasi')).toBe(true);
    expect(res.productName.confidence).toBeGreaterThanOrEqual(0.8);

    const mats = res.materials.value ?? [];
    expect(mats.some((m) => m.toLowerCase().includes('silk'))).toBe(true);
    expect(mats.some((m) => m.toLowerCase().includes('zari'))).toBe(true);

    const proc = (res.makingProcess.value ?? '').toLowerCase();
    expect(proc.includes('weaving') || proc.includes('loom')).toBe(true);

    const usage = (res.usage.value ?? '').toLowerCase();
    expect(usage.includes('wedding') || usage.includes('festive')).toBe(true);

    expect(res.timeRequired.value).toBe('15 days');
  });
});

describe('nlp regex: product (Dhokra)', () => {
  it('extracts Dhokra metal craft with multi-materials and word numbers', () => {
    const text =
      'This is a Dhokra brass elephant made by lost-wax casting using brass, beeswax, and river clay. It is used for home décor and gifting, and took five days to make.';
    const res = extractProductFromTranscript(text);

    const pname = (res.productName.value ?? '').toLowerCase();
    expect(pname.includes('dhokra') || pname.includes('elephant')).toBe(true);

    const mats = res.materials.value ?? [];
    expect(mats.some((m) => m.toLowerCase().includes('brass'))).toBe(true);
    expect(mats.some((m) => m.toLowerCase().includes('beeswax'))).toBe(true);
    expect(mats.some((m) => m.toLowerCase().includes('clay'))).toBe(true);

    expect((res.makingProcess.value ?? '').toLowerCase()).toContain('lost-wax');

    const usage = (res.usage.value ?? '').toLowerCase();
    expect(
      usage.includes('décor') || usage.includes('decor') || usage.includes('gifting'),
    ).toBe(true);

    expect(res.timeRequired.value).toBe('5 days');
  });
});

describe('nlp regex: product missing fields', () => {
  it('missing product fields return null without demo fallback', () => {
    const text = 'Handmade item.';
    const res = extractProductFromTranscript(text);

    expect(res.materials.value).toBeNull();
    expect(res.materials.flag).toBe('missing');
    expect(res.timeRequired.value).toBeNull();
    expect(res.timeRequired.flag).toBe('missing');
  });
});
