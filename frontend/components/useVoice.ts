'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VOICE_LEVEL_COUNT,
  computeVoiceLevels,
  micErrorMessage,
  pickRecorderMimeType,
} from '@/lib/voiceStates';

const N = VOICE_LEVEL_COUNT;

export function useVoice() {
  const [listening, setL] = useState(false);
  const [levels, setLv] = useState<number[]>(Array(N).fill(4));
  const [micError, setMicError] = useState<string | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const liveTranscript = useRef('');
  const srRef = useRef<any>(null);

  const start = useCallback(async () => {
    setMicError(null);
    setL(true);
    liveTranscript.current = '';
    let an: AnalyserNode | null = null;

    const SpeechRec = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
    if (SpeechRec) {
      try {
        const sr = new SpeechRec();
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e: any) => {
          let s = '';
          for (let i = 0; i < e.results.length; ++i) {
            s += e.results[i][0].transcript + ' ';
          }
          liveTranscript.current = s.trim();
        };
        sr.start();
        srRef.current = sr;
      } catch (e) {
        console.warn('[useVoice] SpeechRecognition could not start:', e);
      }
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not supported on this browser or connection. Ensure HTTPS is used.');
      }

      console.log('[useVoice] Requesting microphone access...');
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.current = s;

      const mimeType = pickRecorderMimeType(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
      );

      const r = mimeType ? new MediaRecorder(s, { mimeType }) : new MediaRecorder(s);
      chunks.current = [];
      r.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      // Request data slices every 250ms so chunks are captured continuously
      r.start(250);
      rec.current = r;
      console.log(`[useVoice] MediaRecorder started (mimeType: ${r.mimeType || 'default'})`);

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const c = new AudioCtx();
          ctx.current = c;
          an = c.createAnalyser();
          an.fftSize = 64;
          const source = c.createMediaStreamSource(s);
          source.connect(an);
        }
      } catch (audioCtxErr) {
        console.warn('[useVoice] AudioContext analyser init error (recording still works):', audioCtxErr);
      }
    } catch (err: unknown) {
      console.error('[useVoice] Microphone access failed:', err);
      setMicError(micErrorMessage(err));
      an = null;
    }

    const buf = new Uint8Array(32);
    const tick = () => {
      if (an) an.getByteFrequencyData(buf);
      setLv(computeVoiceLevels(an ? buf : null, N));
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stop = useCallback(
    () =>
      new Promise<Blob | null>((res) => {
        cancelAnimationFrame(raf.current);
        setL(false);
        setLv(Array(N).fill(4));

        if (srRef.current) {
          try { srRef.current.stop(); } catch {}
          srRef.current = null;
        }

        const r = rec.current;
        const clean = () => {
          stream.current?.getTracks().forEach((t) => t.stop());
          stream.current = null;
          ctx.current?.close().catch(() => {});
          ctx.current = null;
        };

        if (r && r.state !== 'inactive') {
          r.onstop = () => {
            const recordedType = r.mimeType || 'audio/webm';
            const blob = new Blob(chunks.current, { type: recordedType });
            clean();
            console.log(`[useVoice] Recording finished: ${blob.size} bytes (${recordedType})`);
            res(blob.size > 0 ? blob : null);
          };
          try {
            r.stop();
          } catch {
            clean();
            res(null);
          }
        } else {
          clean();
          console.warn('[useVoice] Stop called with no active recorder.');
          res(null);
        }
      }),
    []
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      ctx.current?.close().catch(() => {});
    },
    []
  );

  return { listening, levels, micError, liveTranscript, start, stop };
}
