/**
 * Pure voice-flow state machine + capture helpers for ArtifyBharat.
 *
 * Extracted from VoiceScreen.tsx / useVoice.ts so phase transitions, derived UI
 * flags, recorder mime selection, microphone error mapping, and waveform level
 * math are unit-testable in the node jest environment (no DOM required).
 */

export type VoicePhase =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'understanding'
  | 'confirm'
  | 'confirmed';

export type VoicePhaseAction =
  | 'tap'
  | 'finish'
  | 'timeout'
  | 'submit'
  | 'understood'
  | 'failed'
  | 'revealed'
  | 'accept'
  | 'retry';

export const VOICE_PHASE_LABELS = [
  'Ready',
  'Listening',
  'Processing',
  'Understanding',
  'Confirmed',
] as const;

export const VOICE_PHASE_STEP: Record<VoicePhase, number> = {
  idle: 0,
  listening: 1,
  processing: 2,
  understanding: 3,
  confirm: 3,
  confirmed: 4,
};

const TRANSITIONS: Record<VoicePhase, Partial<Record<VoicePhaseAction, VoicePhase>>> = {
  idle: { tap: 'listening', submit: 'processing' },
  listening: { finish: 'processing', timeout: 'processing', submit: 'processing' },
  processing: { understood: 'understanding', failed: 'idle', submit: 'processing' },
  understanding: { revealed: 'confirm' },
  confirm: { accept: 'confirmed', retry: 'idle' },
  confirmed: { retry: 'idle' },
};

export function transitionVoicePhase(phase: VoicePhase, action: VoicePhaseAction): VoicePhase {
  return TRANSITIONS[phase][action] ?? phase;
}

export function isVoiceControlsVisible(phase: VoicePhase): boolean {
  return phase === 'idle' || phase === 'listening' || phase === 'processing';
}

export function isListening(phase: VoicePhase): boolean {
  return phase === 'listening';
}

export function canEditFields(phase: VoicePhase): boolean {
  return phase === 'confirm';
}

export function showsTranscript(phase: VoicePhase): boolean {
  return phase === 'understanding' || phase === 'confirm';
}

export const VOICE_LEVEL_COUNT = 28;

const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
];

export function pickRecorderMimeType(isSupported: (type: string) => boolean): string {
  for (const type of RECORDER_MIME_TYPES) {
    if (isSupported(type)) return type;
  }
  return '';
}

export function micErrorMessage(err: unknown): string {
  const e = err as { name?: string; message?: string } | null | undefined;
  if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
    return 'Microphone permission denied. Please allow microphone access in your browser settings.';
  }
  return e?.message || 'Could not access microphone.';
}

export function computeVoiceLevels(freqData: Uint8Array | null, n: number): number[] {
  if (!freqData || freqData.length === 0) {
    return Array.from({ length: n }, () => 4);
  }
  return Array.from({ length: n }, (_, i) => 4 + (freqData[i % freqData.length] / 255) * 56);
}
