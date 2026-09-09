'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DadiVoiceRecorder,
  VoiceRecordingResult,
  VoiceRecorderOptions,
} from '../utils/voiceRecorder';

export function useVoiceRecorder(options: VoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordingResult, setRecordingResult] = useState<VoiceRecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<DadiVoiceRecorder | null>(null);

  useEffect(() => {
    recorderRef.current = new DadiVoiceRecorder();
    recorderRef.current.onTranscriptUpdate = (text: string) => {
      setLiveTranscript(text);
    };
    recorderRef.current.onTimeUpdate = (seconds: number) => {
      setElapsedSeconds(seconds);
    };

    return () => {
      if (recorderRef.current && recorderRef.current.isRecording) {
        recorderRef.current.cancel();
      }
    };
  }, []);

  const startRecording = useCallback(async (customOptions?: VoiceRecorderOptions) => {
    setError(null);
    setLiveTranscript('');
    setElapsedSeconds(0);
    setRecordingResult(null);

    if (!recorderRef.current) {
      recorderRef.current = new DadiVoiceRecorder();
    }

    try {
      await recorderRef.current.start({ ...options, ...customOptions });
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start microphone recording.');
      setIsRecording(false);
    }
  }, [options]);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (!recorderRef.current || !isRecording) return null;
    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setRecordingResult(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording.');
      setIsRecording(false);
      return null;
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    setIsRecording(false);
    setLiveTranscript('');
    setElapsedSeconds(0);
    setRecordingResult(null);
  }, []);

  return {
    isRecording,
    liveTranscript,
    elapsedSeconds,
    recordingResult,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isSpeechRecognitionSupported: DadiVoiceRecorder.isSpeechRecognitionSupported(),
  };
}
