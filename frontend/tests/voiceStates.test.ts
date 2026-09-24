/**
 * Tests for the pure voice state machine + capture helpers (frontend/lib/voiceStates.ts).
 * Covers phase transitions, derived UI flags, recorder mime selection,
 * microphone error mapping, and waveform level computation.
 */
import {
  VOICE_LEVEL_COUNT,
  VOICE_PHASE_LABELS,
  VOICE_PHASE_STEP,
  canEditFields,
  computeVoiceLevels,
  isListening,
  isVoiceControlsVisible,
  micErrorMessage,
  pickRecorderMimeType,
  showsTranscript,
  transitionVoicePhase,
  type VoicePhase,
} from '../lib/voiceStates';

describe('voice phase machine', () => {
  it('exposes 5 progress labels and step indices for all 6 phases', () => {
    expect(VOICE_PHASE_LABELS).toEqual([
      'Ready',
      'Listening',
      'Processing',
      'Understanding',
      'Confirmed',
    ]);
    expect(VOICE_PHASE_STEP).toEqual({
      idle: 0,
      listening: 1,
      processing: 2,
      understanding: 3,
      confirm: 3,
      confirmed: 4,
    });
  });

  it('idle + tap starts listening', () => {
    expect(transitionVoicePhase('idle', 'tap')).toBe('listening');
  });

  it('listening + finish moves to processing (tap-done and 12s timeout share the path)', () => {
    expect(transitionVoicePhase('listening', 'finish')).toBe('processing');
    expect(transitionVoicePhase('listening', 'timeout')).toBe('processing');
  });

  it('submit (sample speech / typed text / file upload) enters processing from any pre-processing phase', () => {
    expect(transitionVoicePhase('idle', 'submit')).toBe('processing');
    expect(transitionVoicePhase('listening', 'submit')).toBe('processing');
    expect(transitionVoicePhase('processing', 'submit')).toBe('processing');
  });

  it('processing + understood moves to understanding', () => {
    expect(transitionVoicePhase('processing', 'understood')).toBe('understanding');
  });

  it('processing + failed recovers to idle instead of wedging on the spinner', () => {
    expect(transitionVoicePhase('processing', 'failed')).toBe('idle');
  });

  it('understanding + revealed advances to confirm once all fields are shown', () => {
    expect(transitionVoicePhase('understanding', 'revealed')).toBe('confirm');
  });

  it('confirm + accept confirms; confirm + retry returns to idle', () => {
    expect(transitionVoicePhase('confirm', 'accept')).toBe('confirmed');
    expect(transitionVoicePhase('confirm', 'retry')).toBe('idle');
  });

  it('confirmed + retry allows a fresh take', () => {
    expect(transitionVoicePhase('confirmed', 'retry')).toBe('idle');
  });

  it('illegal actions are no-ops, never throw', () => {
    expect(transitionVoicePhase('idle', 'accept')).toBe('idle');
    expect(transitionVoicePhase('idle', 'revealed')).toBe('idle');
    expect(transitionVoicePhase('listening', 'understood')).toBe('listening');
    expect(transitionVoicePhase('processing', 'accept')).toBe('processing');
    expect(transitionVoicePhase('understanding', 'retry')).toBe('understanding');
    expect(transitionVoicePhase('confirmed', 'tap')).toBe('confirmed');
    expect(transitionVoicePhase('confirmed', 'submit')).toBe('confirmed');
  });
});

describe('derived voice UI flags', () => {
  const phases: VoicePhase[] = [
    'idle',
    'listening',
    'processing',
    'understanding',
    'confirm',
    'confirmed',
  ];

  it('controls (mic, hints, sample buttons) show only before the field review', () => {
    expect(phases.filter(isVoiceControlsVisible)).toEqual(['idle', 'listening', 'processing']);
  });

  it('isListening matches only the listening phase', () => {
    expect(phases.filter(isListening)).toEqual(['listening']);
  });

  it('field editing is allowed only in confirm', () => {
    expect(phases.filter(canEditFields)).toEqual(['confirm']);
  });

  it('transcript + extracted fields render during understanding and confirm only', () => {
    expect(phases.filter(showsTranscript)).toEqual(['understanding', 'confirm']);
  });
});

describe('pickRecorderMimeType', () => {
  it('returns the first supported type in preference order', () => {
    expect(pickRecorderMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickRecorderMimeType((t) => t === 'audio/webm;codecs=opus')).toBe(
      'audio/webm;codecs=opus'
    );
  });

  it('prefers opus webm when everything is supported', () => {
    expect(pickRecorderMimeType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('returns empty string when nothing is supported', () => {
    expect(pickRecorderMimeType(() => false)).toBe('');
  });
});

describe('micErrorMessage', () => {
  it('maps permission denial names to actionable guidance', () => {
    const expected =
      'Microphone permission denied. Please allow microphone access in your browser settings.';
    expect(micErrorMessage({ name: 'NotAllowedError' })).toBe(expected);
    expect(micErrorMessage({ name: 'PermissionDeniedError' })).toBe(expected);
  });

  it('passes through the original message for other errors', () => {
    expect(micErrorMessage(new Error('Requested device not found'))).toBe(
      'Requested device not found'
    );
  });

  it('falls back to a generic message when there is nothing useful', () => {
    expect(micErrorMessage(null)).toBe('Could not access microphone.');
    expect(micErrorMessage(undefined)).toBe('Could not access microphone.');
    expect(micErrorMessage({})).toBe('Could not access microphone.');
  });
});

describe('computeVoiceLevels', () => {
  it('renders VOICE_LEVEL_COUNT flat bars when there is no audio data', () => {
    const levels = computeVoiceLevels(null, VOICE_LEVEL_COUNT);
    expect(levels).toHaveLength(VOICE_LEVEL_COUNT);
    expect(levels.every((h) => h === 4)).toBe(true);
  });

  it('scales frequency bytes into the 4..60 bar-height range', () => {
    const data = new Uint8Array([0, 255]);
    const levels = computeVoiceLevels(data, 4);
    expect(levels).toEqual([4, 60, 4, 60]);
  });

  it('wraps short frequency buffers across the requested bar count', () => {
    const data = new Uint8Array([255]);
    const levels = computeVoiceLevels(data, 3);
    expect(levels).toEqual([60, 60, 60]);
  });

  it('treats an empty buffer as no audio', () => {
    expect(computeVoiceLevels(new Uint8Array(0), 2)).toEqual([4, 4]);
  });
});
