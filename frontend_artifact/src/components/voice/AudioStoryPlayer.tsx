import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface AudioStoryPlayerProps {
  artisanName: string;
  dialect: string;
  audioUrl: string;
  transcript: string;
  translatedText: string;
}

export const AudioStoryPlayer: React.FC<AudioStoryPlayerProps> = ({
  artisanName,
  dialect,
  audioUrl,
  transcript,
  translatedText,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(true);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Web Audio synth fallback if network MP3 fails
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.2);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.2);
        } catch (e) {}
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 2000);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-terracotta-500" />
          <h3 className="text-lg font-bold font-heading text-charcoal-800">
            Listen to the Artisan's Voice Story
          </h3>
        </div>
        <Badge variant="cluster" icon={<Globe className="w-3.5 h-3.5" />}>
          {dialect}
        </Badge>
      </div>

      <div className="bg-cream-100 p-5 rounded-2xl border border-terracotta-200/60 space-y-4">
        
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Audio Player Controls Bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-terracotta-500 text-white flex items-center justify-center shadow-md shadow-terracotta-500/30 hover:bg-terracotta-600 transition-transform active:scale-95"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700">
              <span>{artisanName}'s Craft Narrative</span>
              <span className="font-mono text-charcoal-800">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Progress Slider */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Number(e.target.value);
                  setCurrentTime(Number(e.target.value));
                }
              }}
              className="w-full h-2 bg-cream-300 rounded-lg appearance-none cursor-pointer accent-terracotta-500"
            />
          </div>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="p-2 text-charcoal-700 hover:text-terracotta-600 rounded-xl"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Transcript Toggle Accordion */}
        <div className="border-t border-cream-300 pt-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center justify-between w-full text-xs font-bold text-terracotta-700 hover:text-terracotta-800"
          >
            <span>Dialect Transcript &amp; English Translation</span>
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTranscript && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-terracotta-100 italic text-charcoal-800">
                <span className="font-bold text-terracotta-700 not-italic block mb-0.5">Original Voice ({dialect}):</span>
                "{transcript}"
              </div>
              <div className="p-3 bg-white rounded-xl border border-terracotta-100 text-charcoal-800">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-emerald-700 block">English Translation (IndicTrans2):</span>
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(translatedText);
                        utterance.rate = 0.95;
                        utterance.pitch = 1.0;
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3 h-3 text-emerald-700" />
                    <span>Read Aloud</span>
                  </button>
                </div>
                "{translatedText}"
              </div>
            </div>
          )}
        </div>

      </div>
    </Card>
  );
};
