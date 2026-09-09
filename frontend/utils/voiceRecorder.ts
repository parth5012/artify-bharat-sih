/**
 * Artify Bharat - "Ask Dadi" Web Speech & MediaRecorder Utility
 * Integrates browser-native SpeechRecognition (for real-time dialect transcription)
 * and MediaRecorder (for secure audio chunking and binary Blob creation).
 * Zero external keys / Native Browser APIs.
 */

export interface VoiceRecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  durationSeconds: number;
  transcript: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface VoiceRecorderOptions {
  dialectCode?: string; // e.g. 'hi-IN', 'bho-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 'en-IN'
  continuous?: boolean;
  timeSliceMs?: number; // Chunk interval in ms (default: 500ms)
}

export class DadiVoiceRecorder {
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private recognition: any = null;
  private accumulatedTranscript: string = '';
  private startTime: number = 0;
  private timerInterval: any = null;

  public isRecording: boolean = false;
  public liveTranscript: string = '';
  public elapsedSeconds: number = 0;

  public onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  public onTimeUpdate?: (seconds: number) => void;

  /**
   * Helper for stopping and clearing the acquired microphone MediaStream.
   */
  private releaseStream(): void {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      } catch {}
      this.mediaStream = null;
    }
  }

  /**
   * Check if speech recognition is available in the browser.
   */
  public static isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Start recording audio and live dialect speech recognition.
   */
  public async start(options: VoiceRecorderOptions = {}): Promise<void> {
    const { dialectCode = 'hi-IN', timeSliceMs = 500 } = options;

    // Check MediaRecorder support before getUserMedia
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser.');
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone audio capture is not supported in this browser.');
    }

    this.audioChunks = [];
    this.accumulatedTranscript = '';
    this.liveTranscript = '';
    this.elapsedSeconds = 0;

    // 1. Acquire microphone MediaStream
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      this.releaseStream();
      throw err;
    }

    // 2. Determine optimal supported audio MIME type & instantiate MediaRecorder
    try {
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);
    } catch (recorderErr) {
      this.releaseStream();
      throw recorderErr;
    }

    this.mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // 3. Initialize SpeechRecognition if supported
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = dialectCode;

        this.recognition.onresult = (event: any) => {
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              this.accumulatedTranscript += event.results[i][0].transcript + ' ';
              if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(this.accumulatedTranscript.trim(), true);
              }
            } else {
              interimText += event.results[i][0].transcript;
            }
          }
          this.liveTranscript = (this.accumulatedTranscript + interimText).trim();
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate(this.liveTranscript, false);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('[Dadi Voice Assistant] SpeechRecognition notice:', event.error);
        };

        this.recognition.start();
      } catch (recErr) {
        console.warn('SpeechRecognition initialization skipped:', recErr);
      }
    }

    // 4. Start MediaRecorder
    this.mediaRecorder.start(timeSliceMs);
    this.isRecording = true;
    this.startTime = Date.now();

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.elapsedSeconds);
      }
    }, 1000);
  }

  /**
   * Stop recording, release microphone hardware, and return finalized VoiceRecordingResult.
   */
  public async stop(): Promise<VoiceRecordingResult> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    return new Promise<VoiceRecordingResult>((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.releaseStream();
        return reject(new Error('MediaRecorder is not initialized.'));
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSeconds = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
        const finalTranscript = (this.accumulatedTranscript || this.liveTranscript).trim();

        // Clean up media tracks
        this.releaseStream();
        this.isRecording = false;

        resolve({
          audioBlob,
          audioUrl,
          durationSeconds,
          transcript: finalTranscript,
          mimeType,
          fileSizeBytes: audioBlob.size,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (stopErr) {
        this.releaseStream();
        this.isRecording = false;
        reject(stopErr);
      }
    });
  }

  /**
   * Cancel recording and discard buffer without saving.
   */
  public cancel(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.releaseStream();
    this.isRecording = false;
    this.audioChunks = [];
  }
}
