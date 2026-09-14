import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Sparkles, CheckCircle2, Volume2, Globe, Languages, LoaderCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { uploadVoiceRecording, type VoiceCatalogExtraction } from '../../api/catalogApi';

interface VoiceRecorderProps {
  onStoryExtracted?: (extraction: VoiceCatalogExtraction) => void;
  onContinueToPricing?: () => void;
}

const DIALECTS = [
  { id: 'bhojpuri', name: 'Bhojpuri / Maithili (Eastern Cluster)', sample: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'kashmiri', name: 'Kashmiri (Srinagar Valley)', sample: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'gujarati', name: 'Gujarati (Kutch Ajrakh Reserve)', sample: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'telugu', name: 'Telugu (Pochampally Ikkat Zone)', sample: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'hindi', name: 'Hindi / Awadhi (Varanasi Weaving)', sample: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

const EXTRACTION_STAGES = ['Uploading voice story', 'Transcribing dialect speech', 'Building catalog details'];

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onStoryExtracted, onContinueToPricing }) => {
  const [selectedDialect, setSelectedDialect] = useState<string>('bhojpuri');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] = useState<VoiceCatalogExtraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionStage, setExtractionStage] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isProcessing) return;

    const stageTimer = window.setInterval(() => {
      setExtractionStage((currentStage) => Math.min(currentStage + 1, EXTRACTION_STAGES.length - 1));
    }, 900);

    return () => window.clearInterval(stageTimer);
  }, [isProcessing]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        if (audioCtxRef.current) audioCtxRef.current.close();

        void handleExtractStory(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      drawWaveform();
    } catch (err) {
      console.warn('Microphone fallback triggered:', err);
      // Fallback demo audio if mic permission denied or unavailable
      const currentDialectObj = DIALECTS.find((d) => d.id === selectedDialect) || DIALECTS[0];
      setAudioUrl(currentDialectObj.sample);
      setAudioBlob(new Blob(['demo-audio'], { type: 'audio/mp3' }));
      setRecordingSeconds(18);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const render = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArray.length) * 2;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#D4AF37');
        grad.addColorStop(1, '#C05621');
        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const handleExtractStory = async (recordedBlob: Blob = audioBlob || new Blob(['demo-audio'], { type: 'audio/mp3' })) => {
    setIsProcessing(true);
    setExtractionStage(0);
    setExtractionError(null);
    try {
      const result = await uploadVoiceRecording(recordedBlob, { dialect: selectedDialect });
      setExtractionResult(result);
      if (onStoryExtracted) onStoryExtracted(result);
    } catch (err) {
      console.error('Extraction error:', err);
      setExtractionError(err instanceof Error ? err.message : 'Voice extraction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseDemoAudio = () => {
    const currentDialectObj = DIALECTS.find((d) => d.id === selectedDialect) || DIALECTS[0];
    setAudioUrl(currentDialectObj.sample);
    setAudioBlob(new Blob(['demo-audio'], { type: 'audio/mp3' }));
    setRecordingSeconds(24);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="max-w-2xl mx-auto border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-terracotta-500" />
            <h2 className="text-xl font-bold font-heading text-charcoal-800">
              Dialect Voice Story Studio
            </h2>
          </div>
          <p className="text-xs text-charcoal-700 mt-1">
            Record in your mother tongue (Bhojpuri, Maithili, Kashmiri, Gujarati, Telugu, Hindi).
          </p>
        </div>
        <span className="px-3 py-1 bg-terracotta-100 text-terracotta-800 text-xs font-bold rounded-full uppercase border border-terracotta-300">
          AI Voice Extraction
        </span>
      </div>

      <div className="mb-4 space-y-1.5">
        <label className="block text-xs font-bold text-charcoal-800 flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-terracotta-600" />
          <span>Select Artisan Mother Tongue Dialect:</span>
        </label>
        <select
          value={selectedDialect}
          onChange={(e) => setSelectedDialect(e.target.value)}
          className="w-full p-2.5 bg-cream-50 border border-terracotta-200 rounded-xl text-xs font-bold text-charcoal-800 focus:outline-none focus:border-terracotta-500 shadow-sm"
        >
          {DIALECTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-cream-100 p-6 rounded-2xl border border-terracotta-200/60 flex flex-col items-center justify-center text-center">
        <canvas ref={canvasRef} width={360} height={60} className="w-full max-w-sm h-16 mb-4 rounded-xl bg-cream-200/50 shadow-inner" />

        <div className="text-2xl font-mono font-bold text-terracotta-700 mb-4">
          {formatTime(recordingSeconds)}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isRecording ? (
            <>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Mic className="w-5 h-5" />}
                onClick={startRecording}
              >
                {audioUrl ? 'Re-record Story' : 'Start Dialect Recording'}
              </Button>

              {!audioUrl && (
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Volume2 className="w-4 h-4" />}
                  onClick={handleUseDemoAudio}
                >
                  Load Demo Dialect Story
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="danger"
              size="lg"
              leftIcon={<Square className="w-5 h-5" />}
              onClick={stopRecording}
            >
              Stop Recording
            </Button>
          )}
        </div>

        {audioUrl && !isRecording && (
          <div className="mt-4 flex items-center gap-3">
            <audio ref={audioPlayerRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={() => {
                if (audioPlayerRef.current) {
                  if (isPlaying) audioPlayerRef.current.pause();
                  else audioPlayerRef.current.play();
                  setIsPlaying(!isPlaying);
                }
              }}
            >
              {isPlaying ? 'Pause Playback' : 'Listen Recording'}
            </Button>
          </div>
        )}
      </div>

      {audioUrl && !isRecording && !extractionResult && !isProcessing && (
        <div className="mt-5 text-center">
          <Button
            variant="gold"
            size="lg"
            leftIcon={<Sparkles className="w-5 h-5" />}
            isLoading={isProcessing}
            onClick={() => void handleExtractStory()}
            className="w-full sm:w-auto"
          >
            Process Audio (Whisper ASR → IndicTrans2 → Catalog AI)
          </Button>
        </div>
      )}

      {isProcessing && (
        <div className="mt-5 rounded-2xl border border-terracotta-200 bg-cream-100 p-5 text-left shadow-inner">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-500 text-white shadow-md">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal-900">AI is extracting your catalog</p>
              <p className="text-xs text-charcoal-700">Please keep this page open while your voice is processed.</p>
            </div>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-cream-300">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-terracotta-500 transition-all duration-700" style={{ transform: `translateX(${extractionStage * 100}%)` }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {EXTRACTION_STAGES.map((stage, index) => (
              <div key={stage} className={`flex items-center gap-2 text-xs font-semibold ${index <= extractionStage ? 'text-terracotta-700' : 'text-charcoal-500'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${index < extractionStage ? 'border-emerald-500 bg-emerald-500 text-white' : index === extractionStage ? 'border-terracotta-500 bg-terracotta-100 text-terracotta-700' : 'border-cream-400 bg-white'}`}>
                  {index < extractionStage ? '✓' : index + 1}
                </span>
                {stage}
              </div>
            ))}
          </div>
        </div>
      )}

      {extractionError && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {extractionError}
        </div>
      )}

      {extractionResult && (
        <div className="mt-6 space-y-4 animate-fade-in-up border-t border-terracotta-200/80 pt-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Voice Extraction Complete: Structured Catalog Generated</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-cream-200/50 rounded-2xl border border-cream-300">
              <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-700 uppercase mb-2">
                <Volume2 className="w-4 h-4 text-terracotta-500" />
                <span>Original Dialect Speech (Whisper ASR)</span>
              </div>
              <p className="text-xs text-charcoal-800 italic bg-white p-3 rounded-xl border border-terracotta-100 shadow-sm">
                "{extractionResult.originalTranscript}"
              </p>
            </div>

            <div className="p-4 bg-cream-200/50 rounded-2xl border border-cream-300">
              <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-700 uppercase mb-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Translated English (IndicTrans2)</span>
              </div>
              <p className="text-xs text-charcoal-800 bg-white p-3 rounded-xl border border-terracotta-100 shadow-sm">
                "{extractionResult.translatedEnglish}"
              </p>
            </div>
          </div>

          <div className="p-4 bg-terracotta-50/60 rounded-2xl border border-terracotta-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-terracotta-800 mb-3">
              Mistral-7B Structured Extraction
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-charcoal-700 block">Title:</span>
                <strong className="text-charcoal-900">{extractionResult.extractedTitle}</strong>
              </div>
              <div>
                <span className="text-charcoal-700 block">Craft Type:</span>
                <strong className="text-charcoal-900">{extractionResult.extractedCraftType}</strong>
              </div>
              <div>
                <span className="text-charcoal-700 block">Material:</span>
                <strong className="text-charcoal-900">{extractionResult.extractedMaterial}</strong>
              </div>
              <div>
                <span className="text-charcoal-700 block">Labor Days:</span>
                <strong className="text-terracotta-700">{extractionResult.estimatedLaborDays} Days</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Sparkles className="h-4 w-4" /> Catalog Description
            </h4>
            <p className="rounded-xl border border-emerald-100 bg-white p-3 text-sm leading-6 text-charcoal-800 shadow-sm">
              {extractionResult.extractedDescription}
            </p>
          </div>

          {onContinueToPricing && (
            <Button variant="gold" size="lg" onClick={onContinueToPricing} className="w-full sm:w-auto">
              Continue to Fair Wage Pricing
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

