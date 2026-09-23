import { NextResponse } from 'next/server';
import { processVoiceWithBhashini, VoiceResult } from '@/backend/bhashini';
import { asObject, jsonError } from '@/backend/http';

export const runtime = 'nodejs';

/**
 * Server-side Voice Processing Route Handler.
 *
 * Accepts audio recording from the browser, runs combined ASR and translation
 * through the server-side Bhashini Dhruva pipeline, and returns the transcript,
 * translation, and confidence status.
 *
 * Bhashini keys are never exposed to the client.
 */
export async function POST(request: Request) {
  try {
    let audioBase64 = '';
    let language = 'hi';
    let targetLanguage = 'en';
    let isDigitOnly = false;
    let kind: 'identity' | 'product' | undefined;
    let clientTranscript: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return jsonError('Invalid multipart form data.');
      }

      const audioEntry = formData.get('audio');
      if (audioEntry instanceof Blob) {
        const buffer = await audioEntry.arrayBuffer();
        audioBase64 = Buffer.from(buffer).toString('base64');
      } else if (typeof audioEntry === 'string') {
        audioBase64 = audioEntry.trim();
      }

      const langEntry = formData.get('language') || formData.get('sourceLanguage');
      if (typeof langEntry === 'string' && langEntry.trim()) {
        language = langEntry.trim();
      }

      const targetLangEntry = formData.get('targetLanguage');
      if (typeof targetLangEntry === 'string' && targetLangEntry.trim()) {
        targetLanguage = targetLangEntry.trim();
      }

      const digitEntry = formData.get('isDigitOnly') || formData.get('is_digit');
      if (digitEntry === 'true' || digitEntry === '1') {
        isDigitOnly = true;
      }

      const kindEntry = formData.get('kind');
      if (kindEntry === 'identity' || kindEntry === 'product') {
        kind = kindEntry;
      }

      const transcriptEntry = formData.get('clientTranscript');
      if (typeof transcriptEntry === 'string' && transcriptEntry.trim()) {
        clientTranscript = transcriptEntry.trim();
      }
    } else {
      const body = asObject(await request.json().catch(() => null));
      if (!body) {
        return jsonError('Request body must be valid JSON or multipart/form-data.');
      }

      const audio = body.audio || body.audioBase64 || body.audioContent;
      if (typeof audio === 'string') {
        audioBase64 = audio.trim();
      }

      const lang = body.language || body.sourceLanguage;
      if (typeof lang === 'string' && lang.trim()) {
        language = lang.trim();
      }

      const targetLang = body.targetLanguage;
      if (typeof targetLang === 'string' && targetLang.trim()) {
        targetLanguage = targetLang.trim();
      }

      if (typeof body.isDigitOnly === 'boolean') {
        isDigitOnly = body.isDigitOnly;
      }

      if (body.kind === 'identity' || body.kind === 'product') {
        kind = body.kind;
      }

      if (typeof body.clientTranscript === 'string' && body.clientTranscript.trim()) {
        clientTranscript = body.clientTranscript.trim();
      }
    }

    if (!audioBase64 && !clientTranscript) {
      console.warn('[POST /api/voice] Rejected: Audio data and clientTranscript missing.');
      return jsonError('Audio data or transcript is required.');
    }

    console.log(`[POST /api/voice] Processing audio: length=${audioBase64.length} chars, language=${language}, targetLanguage=${targetLanguage}, kind=${kind || 'default'}`);

    const result: VoiceResult = await processVoiceWithBhashini({
      audioBase64: audioBase64 || 'VGVzdEF1ZGlv',
      language,
      targetLanguage,
      isDigitOnly,
      kind,
      clientTranscript,
    });

    console.log(`[POST /api/voice] Result: transcript="${result.transcript?.slice(0, 40)}...", translation="${result.translation?.slice(0, 40)}...", flag=${result.flag}`);

    return NextResponse.json(result);
  } catch (error: any) {
    return jsonError(
      error instanceof Error ? error.message : 'Voice processing failed.',
      500
    );
  }
}
