import { extractArtisanFromTranscript } from './nlp';

async function runTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];
  const test = (name: string, fn: () => void | Promise<void>) => {
    try {
      fn();
      results.push({ name, passed: true });
      console.log(`PASS: ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
      console.error(`FAIL: ${name} ->`, err?.message || err);
    }
  };

  test('extracts all artisan fields from clean English transcript', () => {
    const text = 'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const res = extractArtisanFromTranscript(text);

    if (res.name.value !== 'Ramesh Kumar') throw new Error(`Expected name Ramesh Kumar, got ${res.name.value}`);
    if (res.name.confidence < 0.8) throw new Error(`Expected high name confidence, got ${res.name.confidence}`);
    if (res.name.flag !== 'verified') throw new Error(`Expected verified flag, got ${res.name.flag}`);

    if (res.phone.value !== '9876543210') throw new Error(`Expected phone 9876543210, got ${res.phone.value}`);
    if (res.phone.confidence < 0.9) throw new Error(`Expected high phone confidence, got ${res.phone.confidence}`);

    if (res.artisanId.value !== 'ART-2041') throw new Error(`Expected artisanId ART-2041, got ${res.artisanId.value}`);
    if (res.artisanId.confidence < 0.8) throw new Error(`Expected high artisanId confidence, got ${res.artisanId.confidence}`);

    if (!res.location.value?.includes('Bastar')) throw new Error(`Expected location Bastar, got ${res.location.value}`);
    if (!res.craft.value?.toLowerCase().includes('handloom') && !res.craft.value?.toLowerCase().includes('weaving')) {
      throw new Error(`Expected craft handloom/weaving, got ${res.craft.value}`);
    }
  });

  test('missing fields return null and missing flag without demo fallback', () => {
    const text = 'I craft brass statues in Varanasi.';
    const res = extractArtisanFromTranscript(text);

    if (res.name.value !== null) throw new Error(`Expected name null, got ${res.name.value}`);
    if (res.name.flag !== 'missing') throw new Error(`Expected missing flag for name, got ${res.name.flag}`);
    if (res.name.confidence !== 0) throw new Error(`Expected 0 confidence for missing name`);

    if (res.phone.value !== null) throw new Error(`Expected phone null, got ${res.phone.value}`);
    if (res.phone.flag !== 'missing') throw new Error(`Expected missing flag for phone, got ${res.phone.flag}`);

    if (res.artisanId.value !== null) throw new Error(`Expected artisanId null, got ${res.artisanId.value}`);
    if (res.artisanId.flag !== 'missing') throw new Error(`Expected missing flag for artisanId, got ${res.artisanId.flag}`);

    if (!res.location.value?.includes('Varanasi')) throw new Error(`Expected location Varanasi, got ${res.location.value}`);
    if (!res.craft.value?.toLowerCase().includes('brass')) throw new Error(`Expected craft brass, got ${res.craft.value}`);
  });

  test('handles phone variations like +91 and hyphens', () => {
    const text = 'Name is Sunita Bai, contact +91 91234-56789 from Jaipur.';
    const res = extractArtisanFromTranscript(text);

    if (res.phone.value !== '9123456789') throw new Error(`Expected phone 9123456789, got ${res.phone.value}`);
    if (res.phone.confidence < 0.8) throw new Error(`Expected high phone confidence, got ${res.phone.confidence}`);
  });

  test('extracts entities from Hindi/Devanagari text', () => {
    const text = 'मेरा नाम शान्ति देवी है। फोन 9812345670 और आईडी ART-5521 है। मैं मधुबनी से हूँ।';
    const res = extractArtisanFromTranscript(text);

    if (res.name.value !== 'शान्ति देवी') throw new Error(`Expected name शान्ति देवी, got ${res.name.value}`);
    if (res.phone.value !== '9812345670') throw new Error(`Expected phone 9812345670, got ${res.phone.value}`);
    if (res.artisanId.value !== 'ART-5521') throw new Error(`Expected artisanId ART-5521, got ${res.artisanId.value}`);
    if (!res.location.value?.includes('मधुबनी')) throw new Error(`Expected location मधुबनी, got ${res.location.value}`);
  });

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} test(s) failed!`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} tests passed!`);
  }
}

runTests();
