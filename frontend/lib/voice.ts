import type { VoiceResult } from '@/backend/bhashini';

export interface ProcessVoiceOptions {
  language?: string;
  targetLanguage?: string;
  isDigitOnly?: boolean;
}

/**
 * Client helper to send recorded audio to the server-side /api/voice route.
 * Bhashini keys are never exposed to the client.
 */
export async function processVoiceAudio(
  audio: Blob | string,
  options: ProcessVoiceOptions = {}
): Promise<VoiceResult> {
  let body: BodyInit;
  const headers: Record<string, string> = {};

  if (typeof audio === 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      audio,
      language: options.language || 'hi',
      targetLanguage: options.targetLanguage || 'en',
      isDigitOnly: options.isDigitOnly,
    });
  } else {
    const formData = new FormData();
    formData.append('audio', audio);
    if (options.language) formData.append('language', options.language);
    if (options.targetLanguage) formData.append('targetLanguage', options.targetLanguage);
    if (options.isDigitOnly) formData.append('isDigitOnly', 'true');
    body = formData;
  }

  const response = await fetch('/api/voice', {
    method: 'POST',
    headers,
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Voice processing failed.');
  }

  return data as VoiceResult;
}
