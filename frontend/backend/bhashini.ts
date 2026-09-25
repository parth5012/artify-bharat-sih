/**
 * Bhashini Server-Only Voice and Translation Adapter.
 *
 * Implements server-side ASR and translation integration with MeitY Bhashini
 * (Dhruva pipeline). Keeps all Bhashini credentials strictly on the server;
 * no keys are ever bundled or exposed to the client browser.
 *
 * Matches the pipeline contract of legacy/backend/app/services/nlp_service.py:
 * - Single compute POST to /services/inference/pipeline with pipelineTasks [asr, translation]
 * - Authorization inference key header
 * - Timeout <= 60s with max 3 retry attempts
 * - Accept-with-flag result surfacing when retries exhausted or confidence missing
 * - Dialect mapping supporting ship languages: hi, bn, or, ta
 */

export const SUPPORTED_LANGUAGES = ['hi', 'bn', 'or', 'ta'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DIALECT_LANGUAGE_CODES: Record<string, string> = {
  hindi: 'hi',
  bengali: 'bn',
  bangla: 'bn',
  odia: 'or',
  oriya: 'or',
  tamil: 'ta',
  bhojpuri: 'hi',
  maithili: 'mai',
  kashmiri: 'ks',
  gujarati: 'gu',
  telugu: 'te',
  hi: 'hi',
  bn: 'bn',
  or: 'or',
  ta: 'ta',
};

export type VoiceConfidenceFlag = 'confidence_missing' | 'low_confidence' | 'retries_exhausted';

export interface VoiceResult {
  transcript: string;
  translation: string;
  language: string;
  confidence: number | null;
  lowConfidence: boolean;
  flag?: VoiceConfidenceFlag | null;
  acceptedWithFlag: boolean;
  attempts: number;
  error?: string;
}

export interface VoiceInput {
  audioBase64: string;
  language?: string;
  targetLanguage?: string;
  isDigitOnly?: boolean;
  kind?: 'identity' | 'product';
  clientTranscript?: string;
}

interface BhashiniTaskOutput {
  source?: string;
  target?: string;
  text?: string;
  transcript?: string;
  score?: number;
  confidence?: number;
}

interface BhashiniPipelineTaskResponse {
  taskType?: string;
  output?: BhashiniTaskOutput[];
}

interface BhashiniPipelineResponse {
  pipelineResponse?: BhashiniPipelineTaskResponse[];
}

const DEFAULT_ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
const DEFAULT_ASR_SERVICE_ID = 'bhashini/ai4bharat/conformer-multilingual-asr';
const DEFAULT_TRANSLATION_SERVICE_ID = 'ai4bharat/indictrans-v2-all-gpu--t4';
export const DEFAULT_PIPELINE_ID = '64392f96daac500b55c543cd';

const MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 60_000; // <= 60s per decision #141
const CONFIDENCE_THRESHOLD_PHRASES = 0.70; // 70% threshold
const CONFIDENCE_THRESHOLD_DIGITS = 0.85;  // 85% threshold

/**
 * Resolves a dialect or language name into a standardized ISO code.
 * Defaults to 'hi' if not supplied.
 */
export function resolveLanguageCode(language?: string): string {
  if (!language) return 'hi';
  const clean = language.toLowerCase().trim();
  return DIALECT_LANGUAGE_CODES[clean] || clean;
}

/**
 * Server-only endpoint resolution.
 */
const endpoint = (): string => {
  const value = process.env.BHASHINI_INFERENCE_URL;
  return value?.startsWith('http://') || value?.startsWith('https://') ? value : DEFAULT_ENDPOINT;
};

/**
 * Server-only inference authentication key resolution.
 */
const inferenceKey = (): string | undefined =>
  process.env.BHASHINI_INFERENCE_API_KEY ||
  process.env.BHASHINI_API_KEY ||
  (process.env.BHASHINI_INFERENCE_URL && !process.env.BHASHINI_INFERENCE_URL.startsWith('http')
    ? process.env.BHASHINI_INFERENCE_URL
    : undefined);

/**
 * Strips data URI prefix (e.g. data:audio/wav;base64,) to produce raw base64.
 */
function cleanBase64Audio(raw: string): string {
  return raw.replace(/^data:[^,]+;base64,/i, '').trim();
}

/**
 * Normalizes browser audio (WebM from Chrome/Android, MP4 from Safari/iOS)
 * into standard 16kHz mono WAV for Bhashini Dhruva ASR.
 */
async function normalizeAudioToWav(rawBase64: string): Promise<string> {
  try {
    const inputBuffer = Buffer.from(rawBase64, 'base64');
    if (inputBuffer.length >= 12 && inputBuffer.toString('ascii', 0, 4) === 'RIFF' && inputBuffer.toString('ascii', 8, 12) === 'WAVE') {
      return rawBase64;
    }

    const { spawn } = await import('child_process');
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      'pipe:1'
    ]);

    const chunks: Buffer[] = [];
    return await new Promise<string>((resolve) => {
      ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks).toString('base64'));
        } else {
          resolve(rawBase64);
        }
      });
      ffmpeg.on('error', () => resolve(rawBase64));
      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    });
  } catch {
    return rawBase64;
  }
}

/**
 * Checks whether content is primarily numeric digits (for phone, pin, ID).
 */
function isDigitContent(text: string, explicitHint?: boolean): boolean {
  if (explicitHint) return true;
  if (!text) return false;
  const digitsOnly = text.replace(/[\s+\-()]/g, '');
  return digitsOnly.length > 0 && /^[\d\p{Nd}]+$/u.test(digitsOnly);
}

/**
 * Builds authorization headers following split auth rules.
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authKey = inferenceKey();
  if (authKey) headers.Authorization = authKey;
  if (process.env.BHASHINI_USER_ID) headers.userID = process.env.BHASHINI_USER_ID;
  const ulca = process.env.BHASHINI_ULCA_API_KEY || process.env.BHASHINI_API_KEY;
  if (ulca) headers.ulcaApiKey = ulca;
  return headers;
}

/**
 * Mock responses for simulation / offline / dev environments.
 * Follows the playbook sample in nlp_service.py.
 */
function getMockVoiceResult(language: string, kind: 'identity' | 'product' = 'product'): VoiceResult {
  if (kind === 'identity') {
    const identitySamples: Record<string, { transcript: string; translation: string }> = {
      hi: {
        transcript:
          'मेरा नाम रमेश कुमार है, आर्टिज़न आईडी ART-2041 और फ़ोन 9876543210 है। मैं बस्तर छत्तीसगढ़ से हूँ और हथकरघा बुनाई करता हूँ।',
        translation:
          'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am from Bastar, Chhattisgarh practicing traditional handloom weaving.',
      },
      bn: {
        transcript:
          'আমার নাম সুবীর মণ্ডল, কারিগর আইডি ART-3104 এবং ফোন নম্বর 9831234567। আমি শান্তিনিকেতন থেকে ঐতিহ্যবাহী কাঁথা সেলাই করি।',
        translation:
          'My name is Subir Mondal. My artisan ID is ART-3104 and phone number is 9831234567. I am from Shantiniketan practicing traditional Kantha embroidery.',
      },
      or: {
        transcript:
          'ମୋର ନାମ ଦିଲ୍ଲୀପ ମେହେର, କାରିଗର ଆଇଡି ART-4209 ଏବଂ ଫୋନ୍ 9861234567। ମୁଁ ସମ୍ବଲପୁର ଓଡ଼ିଶାରୁ ଆସିଛି ଏବଂ ହାତବୁଣା ଶାଢ଼ୀ ବୁଣେ।',
        translation:
          'My name is Dillip Meher. My artisan ID is ART-4209 and phone number is 9861234567. I am from Sambalpur, Odisha practicing handloom weaving.',
      },
      ta: {
        transcript:
          'என் பெயர் சுந்தரம், கைவினைஞர் ஐடி ART-5512 மற்றும் தொலைபேசி 9840123456. நான் காஞ்சிபுரம் பகுதியிலிருந்து பாரம்பரிய பட்டு நெசவு செய்கிறேன்.',
        translation:
          'My name is Sundaram. My artisan ID is ART-5512 and phone number is 9840123456. I am from Kanchipuram practicing traditional silk weaving.',
      },
    };

    const sample = identitySamples[language] || identitySamples.hi;
    return {
      transcript: sample.transcript,
      translation: sample.translation,
      language,
      confidence: 0.95,
      lowConfidence: false,
      flag: null,
      acceptedWithFlag: false,
      attempts: 1,
    };
  }

  const samples: Record<string, { transcript: string; translation: string }> = {
    hi: {
      transcript:
        'ई हमार हाथ से बुनायल बनारसी सिल्क साड़ी हवे, जेहमे शुद्ध जरी के काम कइल गइल बा। एके बनावे मे हमके पूरा पंद्रह दिन लागल बा।',
      translation:
        'This is our handwoven Banarasi pure silk saree with authentic gold zari border. It took fifteen full days of handloom labor to craft this traditional piece.',
    },
    bn: {
      transcript:
        'এটি আমাদের হাতে বোনা জামদানি শাড়ি, খাঁটি সুতি দিয়ে তৈরি। এটি তৈরি করতে পুরো দশ দিন সময় লেগেছে।',
      translation:
        'This is our handwoven Jamdani saree, crafted from pure cotton. It took ten full days of handloom labor to weave this traditional piece.',
    },
    or: {
      transcript:
        'ଏହା ଆମର ହାତବୁଣା ସମ୍ବଲପୁରୀ ବାନ୍ଧ ଶାଢ଼ୀ, ଯେଉଁଥିରେ ପାରମ୍ପରିକ ଇକତ କାମ ହୋଇଛି। ଏହାକୁ ତିଆରି କରିବା ପାଇଁ ବାର ଦିନ ଲାଗିଛି।',
      translation:
        'This is our handwoven Sambalpuri Bandha saree, featuring traditional ikat work. It took twelve full days to craft this piece.',
    },
    ta: {
      transcript:
        'இது எங்களின் கைத்தறி காஞ்சிபுரம் பட்டுப் புடவை, தூய ஜரிகை வேலைப்பாடு கொண்டது. இதை நெசவு செய்ய இருபது நாட்கள் ஆனது.',
      translation:
        'This is our handwoven Kanchipuram silk saree with pure zari work. It took twenty days of handloom weaving to complete.',
    },
  };

  const sample = samples[language] || samples.hi;
  return {
    transcript: sample.transcript,
    translation: sample.translation,
    language,
    confidence: null,
    lowConfidence: true,
    flag: 'confidence_missing',
    acceptedWithFlag: true,
    attempts: 1,
  };
}

/**
 * Executes a single compute POST to the Bhashini inference pipeline with
 * combined ASR + Translation tasks matching legacy nlp_service.py.
 *
 * Implements:
 * - Max 3 retry attempts
 * - Timeout <= 60s per attempt
 * - Accept-with-flag return on retry exhaustion or missing/low confidence
 */
export async function processVoiceWithBhashini(input: VoiceInput): Promise<VoiceResult> {
  const sourceLanguage = resolveLanguageCode(input.language);
  const targetLanguage = input.targetLanguage?.trim() || 'en';
  const cleanBase64 = cleanBase64Audio(input.audioBase64);

  // If client provided a recognized transcript directly (e.g. browser speech recognition fallback or test input)
  if (input.clientTranscript && input.clientTranscript.trim()) {
    const text = input.clientTranscript.trim();
    return {
      transcript: text,
      translation: text,
      language: sourceLanguage,
      confidence: 0.95,
      lowConfidence: false,
      flag: null,
      acceptedWithFlag: false,
      attempts: 1,
    };
  }

  // Check for mock mode or unconfigured dev environment
  const useMock = process.env.USE_MOCK_AI === 'true' || process.env.USE_MOCK_VOICE === 'true';
  const apiKey = process.env.BHASHINI_API_KEY || process.env.BHASHINI_ULCA_API_KEY;
  const userId = process.env.BHASHINI_USER_ID;
  const authKey = inferenceKey();

  if (useMock || (!apiKey && !userId && !authKey)) {
    console.warn(
      `[bhashini] WARNING: Unconfigured environment (useMock=${useMock}, apiKey=${!!apiKey}, userId=${!!userId}, authKey=${!!authKey}). Falling back to static mock data.`
    );
    return getMockVoiceResult(sourceLanguage, input.kind || 'product');
  }

  console.log(`[bhashini] Calling live Dhruva endpoint: ${endpoint()} (userId=${userId ? 'configured' : 'missing'}, authKey=${authKey ? 'configured' : 'missing'})`);

  const normalizedWavBase64 = await normalizeAudioToWav(cleanBase64);

  const asrServiceId =
    process.env.BHASHINI_ASR_SERVICE_ID ||
    process.env.BHASHINI_ASR_MODEL_ID ||
    DEFAULT_ASR_SERVICE_ID;

  const translationServiceId =
    process.env.BHASHINI_TRANSLATION_SERVICE_ID ||
    process.env.BHASHINI_TRANSLATION_MODEL_ID ||
    DEFAULT_TRANSLATION_SERVICE_ID;

  const timeoutMs = Number(process.env.BHASHINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const headers = buildHeaders();

  const pipelinePayload = {
    pipelineTasks: [
      {
        taskType: 'asr',
        config: {
          language: { sourceLanguage },
          serviceId: asrServiceId,
          audioFormat: 'wav',
          samplingRate: 16000,
        },
      },
      {
        taskType: 'translation',
        config: {
          language: { sourceLanguage, targetLanguage },
          serviceId: translationServiceId,
        },
      },
    ],
    inputData: {
      audio: [
        {
          audioContent: normalizedWavBase64,
        },
      ],
    },
  };

  let lastError: Error | null = null;
  let lastTranscript = '';
  let lastTranslation = '';
  let lastConfidence: number | null = null;
  let completedAttempt = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    completedAttempt = attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers,
        body: JSON.stringify(pipelinePayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Bhashini voice inference failed with ${response.status}`);
      }

      const data = (await response.json()) as BhashiniPipelineResponse;
      clearTimeout(timer);
      const responses = data.pipelineResponse || [];

      let regionalText = '';
      let englishText = '';
      let confidenceScore: number | null = null;

      for (const res of responses) {
        const taskType = res.taskType;
        const output = res.output?.[0];
        if (!output) continue;

        if (taskType === 'asr') {
          regionalText = output.source || output.text || output.transcript || output.target || '';
          const rawScore = output.score ?? output.confidence;
          if (typeof rawScore === 'number' && !Number.isNaN(rawScore)) {
            // Normalize percentage 0-100 to 0-1 if necessary
            confidenceScore = rawScore > 1 ? rawScore / 100 : rawScore;
          }
        } else if (taskType === 'translation') {
          englishText = output.target || output.text || '';
        }
      }

      if (!regionalText) {
        throw new Error('Bhashini returned no speech transcript');
      }

      lastTranscript = regionalText;
      lastTranslation = englishText || regionalText;
      lastConfidence = confidenceScore;
      lastError = null;
      break; // Succeeded
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      // Backoff before next attempt if attempts remain
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  // Handle retry exhaustion: surface accept-with-flag rather than hard fail
  if (lastError || !lastTranscript) {
    return {
      transcript: lastTranscript,
      translation: lastTranslation,
      language: sourceLanguage,
      confidence: lastConfidence,
      lowConfidence: true,
      flag: 'retries_exhausted',
      acceptedWithFlag: true,
      attempts: completedAttempt,
      error: lastError?.message,
    };
  }

  // Handle confidence verification per #141 decisions
  // Default missing -> accept+flag since Bhashini ASR returns no confidence
  if (lastConfidence === null || lastConfidence === undefined) {
    return {
      transcript: lastTranscript,
      translation: lastTranslation,
      language: sourceLanguage,
      confidence: null,
      lowConfidence: true,
      flag: 'confidence_missing',
      acceptedWithFlag: true,
      attempts: completedAttempt,
    };
  }

  // Threshold check: 85% for digits, 70% for phrases
  const isDigit = isDigitContent(lastTranscript, input.isDigitOnly);
  const threshold = isDigit ? CONFIDENCE_THRESHOLD_DIGITS : CONFIDENCE_THRESHOLD_PHRASES;

  if (lastConfidence < threshold) {
    return {
      transcript: lastTranscript,
      translation: lastTranslation,
      language: sourceLanguage,
      confidence: lastConfidence,
      lowConfidence: true,
      flag: 'low_confidence',
      acceptedWithFlag: true,
      attempts: completedAttempt,
    };
  }

  return {
    transcript: lastTranscript,
    translation: lastTranslation,
    language: sourceLanguage,
    confidence: lastConfidence,
    lowConfidence: false,
    flag: null,
    acceptedWithFlag: false,
    attempts: completedAttempt,
  };
}

/**
 * Server-only text translation through Bhashini.
 * Kept backward compatible with existing /api/translate route.
 */
export async function translateWithBhashini(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const apiKey = process.env.BHASHINI_API_KEY;
  const userId = process.env.BHASHINI_USER_ID;
  const serviceId =
    process.env.BHASHINI_TRANSLATION_SERVICE_ID ||
    process.env.BHASHINI_TRANSLATION_MODEL_ID ||
    DEFAULT_TRANSLATION_SERVICE_ID;
  const authKey = inferenceKey();

  if (!apiKey && !userId && !authKey) {
    // If running in mock/demo mode
    if (process.env.USE_MOCK_AI === 'true') {
      return text;
    }
    throw new Error(
      'Bhashini translation is not configured. Set BHASHINI_API_KEY, BHASHINI_USER_ID, and BHASHINI_TRANSLATION_SERVICE_ID or BHASHINI_TRANSLATION_MODEL_ID.'
    );
  }

  const timeoutMs = Number(process.env.BHASHINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const headers = buildHeaders();
  const sourceLang = resolveLanguageCode(sourceLanguage);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: { sourceLanguage: sourceLang, targetLanguage },
                serviceId,
              },
            },
          ],
          inputData: { input: [{ source: text }] },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Bhashini translation failed with ${response.status}`);
      }

      const data = (await response.json()) as BhashiniPipelineResponse;
      clearTimeout(timer);
      const translated = data.pipelineResponse?.[0]?.output?.[0]?.target;
      if (!translated) {
        throw new Error('Bhashini returned no translated text.');
      }
      return translated;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  throw lastError || new Error('Bhashini translation failed after retries.');
}
