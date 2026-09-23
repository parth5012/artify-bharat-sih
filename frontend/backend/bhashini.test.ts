import {
  DIALECT_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
  resolveLanguageCode,
  processVoiceWithBhashini,
  translateWithBhashini,
  VoiceResult,
} from './bhashini';
import { POST as voiceRouteHandler } from '../app/api/voice/route';

/**
 * Test suite for Bhashini voice and translation adapter.
 * Standalone: run via `npx tsx backend/bhashini.test.ts` (no HTTP route).
 */
async function runBhashiniTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  const test = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  };

  // Test 1: Supported languages include hi, bn, or, ta
  await test('supported languages include hi, bn, or, ta', () => {
    const langs = SUPPORTED_LANGUAGES as readonly string[];
    if (!langs.includes('hi') || !langs.includes('bn') || !langs.includes('or') || !langs.includes('ta')) {
      throw new Error(`Expected hi, bn, or, ta in SUPPORTED_LANGUAGES, got: ${langs.join(', ')}`);
    }
  });

  // Test 2: Dialect and language code resolution
  await test('dialect language codes resolve correctly', () => {
    if (resolveLanguageCode('hindi') !== 'hi') throw new Error('hindi should resolve to hi');
    if (resolveLanguageCode('bengali') !== 'bn') throw new Error('bengali should resolve to bn');
    if (resolveLanguageCode('bangla') !== 'bn') throw new Error('bangla should resolve to bn');
    if (resolveLanguageCode('odia') !== 'or') throw new Error('odia should resolve to or');
    if (resolveLanguageCode('oriya') !== 'or') throw new Error('oriya should resolve to or');
    if (resolveLanguageCode('tamil') !== 'ta') throw new Error('tamil should resolve to ta');
    if (resolveLanguageCode('bhojpuri') !== 'hi') throw new Error('bhojpuri should resolve to hi');
    if (resolveLanguageCode('bn') !== 'bn') throw new Error('bn should resolve to bn');
    if (resolveLanguageCode('or') !== 'or') throw new Error('or should resolve to or');
    if (resolveLanguageCode('ta') !== 'ta') throw new Error('ta should resolve to ta');
    if (resolveLanguageCode(undefined) !== 'hi') throw new Error('undefined should default to hi');
  });

  // Test 3: Missing confidence triggers accept-with-flag
  await test('missing confidence produces accept-with-flag (lowConfidence: true, flag: confidence_missing)', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };
    try {
      process.env.BHASHINI_API_KEY = 'test_key';
      process.env.BHASHINI_USER_ID = 'test_user';
      process.env.BHASHINI_INFERENCE_API_KEY = 'test_inf_key';

      // Mock Bhashini response without confidence score (standard Bhashini ASR behavior)
      globalThis.fetch = async (url: any, init: any) => {
        const body = JSON.parse(init.body);
        if (body.pipelineTasks?.[0]?.taskType === 'asr') {
          return new Response(JSON.stringify({
            pipelineResponse: [
              {
                taskType: 'asr',
                output: [{ source: 'मेरा नाम रमेश है' }]
              },
              {
                taskType: 'translation',
                output: [{ target: 'My name is Ramesh' }]
              }
            ]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not Found', { status: 404 });
      };

      const result: VoiceResult = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'hi',
      });

      if (result.transcript !== 'मेरा नाम रमेश है') {
        throw new Error(`Unexpected transcript: ${result.transcript}`);
      }
      if (result.translation !== 'My name is Ramesh') {
        throw new Error(`Unexpected translation: ${result.translation}`);
      }
      if (result.confidence !== null) {
        throw new Error(`Expected null confidence, got ${result.confidence}`);
      }
      if (!result.lowConfidence) {
        throw new Error('Expected lowConfidence: true when confidence is missing');
      }
      if (result.flag !== 'confidence_missing') {
        throw new Error(`Expected flag: confidence_missing, got ${result.flag}`);
      }
      if (!result.acceptedWithFlag) {
        throw new Error('Expected acceptedWithFlag: true');
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 4: Low confidence threshold check (phrases < 70%, digits < 85%)
  await test('confidence thresholds check (phrases 70%, digits 85%)', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };
    try {
      process.env.BHASHINI_API_KEY = 'test_key';
      process.env.BHASHINI_USER_ID = 'test_user';
      process.env.BHASHINI_INFERENCE_API_KEY = 'test_inf_key';

      // Mock response with 65% confidence phrase (below 70%)
      globalThis.fetch = async () => new Response(JSON.stringify({
        pipelineResponse: [
          {
            taskType: 'asr',
            output: [{ source: 'बनारसी साड़ी', score: 0.65 }]
          },
          {
            taskType: 'translation',
            output: [{ target: 'Banarasi saree' }]
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      const phraseResult = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'hi',
      });

      if (!phraseResult.lowConfidence || phraseResult.flag !== 'low_confidence') {
        throw new Error('Expected lowConfidence: true for phrase with 65% confidence (< 70%)');
      }

      // Mock response with 80% confidence digits (below 85% for digits)
      globalThis.fetch = async () => new Response(JSON.stringify({
        pipelineResponse: [
          {
            taskType: 'asr',
            output: [{ source: '9876543210', score: 0.80 }]
          },
          {
            taskType: 'translation',
            output: [{ target: '9876543210' }]
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      const digitResult = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'hi',
        isDigitOnly: true,
      });

      if (!digitResult.lowConfidence || digitResult.flag !== 'low_confidence') {
        throw new Error('Expected lowConfidence: true for digits with 80% confidence (< 85%)');
      }

      // Mock response with 90% confidence digits (above 85% for digits)
      globalThis.fetch = async () => new Response(JSON.stringify({
        pipelineResponse: [
          {
            taskType: 'asr',
            output: [{ source: '9876543210', score: 0.90 }]
          },
          {
            taskType: 'translation',
            output: [{ target: '9876543210' }]
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      const highDigitResult = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'hi',
        isDigitOnly: true,
      });

      if (highDigitResult.lowConfidence || highDigitResult.flag !== null) {
        throw new Error('Expected lowConfidence: false for digits with 90% confidence (>= 85%)');
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 5: Timeout + retry plumbing (max 3 attempts, accept-with-flag when exhausted)
  await test('retries up to 3 times and accepts-with-flag when retries exhausted', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };
    let attempts = 0;
    try {
      process.env.BHASHINI_API_KEY = 'test_key';
      process.env.BHASHINI_USER_ID = 'test_user';
      process.env.BHASHINI_INFERENCE_API_KEY = 'test_inf_key';
      process.env.BHASHINI_TIMEOUT_MS = '500';

      globalThis.fetch = async () => {
        attempts++;
        return new Response('Gateway Timeout', { status: 504 });
      };

      const result = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'bn',
      });

      if (attempts !== 3) {
        throw new Error(`Expected exactly 3 retry attempts, got ${attempts}`);
      }
      if (!result.lowConfidence || result.flag !== 'retries_exhausted') {
        throw new Error(`Expected retries_exhausted flag, got ${result.flag}`);
      }
      if (!result.acceptedWithFlag) {
        throw new Error('Expected acceptedWithFlag: true when retries exhausted');
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 6: Single compute POST matching nlp_service.py pipeline structure
  await test('single compute POST payload matches nlp_service.py', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };
    let capturedUrl = '';
    let capturedHeaders: any = {};
    let capturedBody: any = {};

    try {
      process.env.BHASHINI_API_KEY = 'ulca_key_123';
      process.env.BHASHINI_USER_ID = 'user_id_456';
      process.env.BHASHINI_INFERENCE_API_KEY = 'inference_key_789';
      process.env.BHASHINI_INFERENCE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

      globalThis.fetch = async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);

        return new Response(JSON.stringify({
          pipelineResponse: [
            { taskType: 'asr', output: [{ source: 'ଓଡ଼ିଆ କଥା' }] },
            { taskType: 'translation', output: [{ target: 'Odia speech' }] },
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      await processVoiceWithBhashini({
        audioBase64: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'odia',
      });

      if (capturedUrl !== 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline') {
        throw new Error(`Unexpected endpoint URL: ${capturedUrl}`);
      }
      if (capturedHeaders.Authorization !== 'inference_key_789') {
        throw new Error(`Expected Authorization header with inference key, got: ${capturedHeaders.Authorization}`);
      }
      if (capturedHeaders.userID !== 'user_id_456' || capturedHeaders.ulcaApiKey !== 'ulca_key_123') {
        throw new Error('Expected split auth headers userID and ulcaApiKey');
      }

      const tasks = capturedBody.pipelineTasks;
      if (!Array.isArray(tasks) || tasks.length !== 2) {
        throw new Error('Expected 2 pipelineTasks (asr + translation)');
      }
      if (tasks[0].taskType !== 'asr' || tasks[0].config.language.sourceLanguage !== 'or') {
        throw new Error(`Expected asr task with sourceLanguage "or", got: ${JSON.stringify(tasks[0])}`);
      }
      if (tasks[1].taskType !== 'translation' || tasks[1].config.language.targetLanguage !== 'en') {
        throw new Error(`Expected translation task with targetLanguage "en", got: ${JSON.stringify(tasks[1])}`);
      }
      if (capturedBody.inputData?.audio?.[0]?.audioContent !== 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA') {
        throw new Error(`Expected audioContent stripped of data URI prefix, got: ${capturedBody.inputData?.audio?.[0]?.audioContent}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 7: Route handler rejects request without audio (HTTP 400)
  await test('route handler returns 400 when audio is missing', async () => {
    const request = new Request('http://localhost:3000/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'hi' }),
    });

    const response = await voiceRouteHandler(request);
    if (response.status !== 400) {
      throw new Error(`Expected HTTP 400, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.error) {
      throw new Error('Expected error message in response');
    }
  });

  // Test 8: Route handler successfully processes voice and never leaks credentials
  await test('route handler returns voice result and never exposes credentials', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };

    try {
      process.env.BHASHINI_API_KEY = 'secret_ulca_key';
      process.env.BHASHINI_USER_ID = 'secret_user_id';
      process.env.BHASHINI_INFERENCE_API_KEY = 'secret_inference_key';

      globalThis.fetch = async () => new Response(JSON.stringify({
        pipelineResponse: [
          { taskType: 'asr', output: [{ source: 'தமிழ் பேச்சு' }] },
          { taskType: 'translation', output: [{ target: 'Tamil speech' }] },
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      const request = new Request('http://localhost:3000/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
          language: 'ta',
          targetLanguage: 'en',
        }),
      });

      const response = await voiceRouteHandler(request);
      if (response.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${response.status}`);
      }

      const bodyText = await response.text();
      // Ensure no secrets are leaked in response
      if (bodyText.includes('secret_ulca_key') || bodyText.includes('secret_user_id') || bodyText.includes('secret_inference_key')) {
        throw new Error('SECURITY BREACH: Response contains server-side Bhashini secrets!');
      }

      const data = JSON.parse(bodyText);
      if (data.transcript !== 'தமிழ் பேச்சு') {
        throw new Error(`Unexpected transcript: ${data.transcript}`);
      }
      if (data.translation !== 'Tamil speech') {
        throw new Error(`Unexpected translation: ${data.translation}`);
      }
      if (data.language !== 'ta') {
        throw new Error(`Expected language "ta", got "${data.language}"`);
      }
      if (!data.lowConfidence || data.flag !== 'confidence_missing') {
        throw new Error('Expected accept-with-flag default for missing confidence');
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 9: translateWithBhashini backward compatibility
  await test('translateWithBhashini backward compatibility', async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = { ...process.env };

    try {
      process.env.BHASHINI_API_KEY = 'key';
      process.env.BHASHINI_USER_ID = 'user';
      process.env.BHASHINI_TRANSLATION_SERVICE_ID = 'ai4bharat/indictrans-v2-all-gpu--t4';

      globalThis.fetch = async () => new Response(JSON.stringify({
        pipelineResponse: [
          { taskType: 'translation', output: [{ target: 'Hello World' }] }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      const translation = await translateWithBhashini('नमस्ते दुनिया', 'hi', 'en');
      if (translation !== 'Hello World') {
        throw new Error(`Unexpected translation: ${translation}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // Test 10: Mock mode fallback generates Playbook Banarasi saree sample for Hindi
  await test('mock mode generates Playbook sample', async () => {
    const originalEnv = { ...process.env };
    try {
      process.env.USE_MOCK_AI = 'true';
      delete process.env.BHASHINI_API_KEY;
      delete process.env.BHASHINI_USER_ID;
      delete process.env.BHASHINI_INFERENCE_API_KEY;

      const result = await processVoiceWithBhashini({
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA',
        language: 'hindi',
      });

      if (!result.transcript.includes('बनारसी सिल्क साड़ी')) {
        throw new Error(`Expected Banarasi silk saree sample in transcript, got: ${result.transcript}`);
      }
      if (!result.translation.includes('Banarasi pure silk saree')) {
        throw new Error(`Expected Banarasi pure silk saree translation, got: ${result.translation}`);
      }
      if (!result.acceptedWithFlag) {
        throw new Error('Expected acceptedWithFlag: true in mock result');
      }
    } finally {
      process.env = originalEnv;
    }
  });

  return results;
}

if (require.main === module) {
  runBhashiniTests().then((results) => {
    for (const r of results) {
      console.log(`${r.passed ? 'PASS' : 'FAIL'}: ${r.name}${r.error ? ` — ${r.error}` : ''}`);
    }
    const failed = results.filter((r) => !r.passed);
    process.exit(failed.length > 0 ? 1 : 0);
  });
}
