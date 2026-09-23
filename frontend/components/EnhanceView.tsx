'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Check, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { Btn } from './ui';
import { createStudioImage, StudioResult } from '@/lib/studio';

const STEPS = [
  'Removing background distractions (rembg U²-Net)',
  'Setting up studio lighting & contact shadow',
  'Framing authentic craft for digital catalog',
];

export function EnhanceView({
  src,
  onAccept,
  onRetake,
}: {
  src: string;
  onAccept: (enhancedSrc?: string) => void;
  onRetake: () => void;
}) {
  const [pos, setPos] = useState(0);
  const [studioSrc, setStudioSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [engineUsed, setEngineUsed] = useState<string>('rembg U²-Net');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Run studio background removal and staging
  useEffect(() => {
    let active = true;
    setProcessing(true);
    setStepIdx(0);
    setStudioSrc(null);

    const stepTimer1 = setTimeout(() => {
      if (active) setStepIdx(1);
    }, 800);

    const stepTimer2 = setTimeout(() => {
      if (active) setStepIdx(2);
    }, 1800);

    createStudioImage(src)
      .then((res: StudioResult) => {
        if (!active) return;
        setStudioSrc(res.studioSrc);
        setEngineUsed(res.engineUsed === 'rembg-u2net' ? 'U²-Net (browser)' : 'Studio CV');
        setStepIdx(3);
        setProcessing(false);
      })
      .catch((err) => {
        console.error('Studio enhancement failed, using original', err);
        if (!active) return;
        setStudioSrc(src);
        setStepIdx(3);
        setProcessing(false);
      });

    return () => {
      active = false;
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    };
  }, [src]);

  // Reveal slider after studio processing finishes
  useEffect(() => {
    if (processing || !studioSrc) return;
    setPos(0);
    const t = setInterval(() => {
      setPos((p) => {
        if (p >= 50) {
          clearInterval(t);
          return 50;
        }
        return p + 2.5;
      });
    }, 25);
    return () => clearInterval(t);
  }, [processing, studioSrc]);

  // Drag interaction on image container
  const handlePointer = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = Math.round((x / rect.width) * 100);
    setPos(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (processing) return;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || processing) return;
    handlePointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900">
          {processing ? 'Removing background in studio…' : 'Ready for digital selling'}
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-emerald-700">
          ✓ Authentic Craft Colors Preserved • Non-Generative Studio
        </p>
      </div>

      {/* Interactive Before / After Split Viewer */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative aspect-[3/4] cursor-ew-resize select-none overflow-hidden rounded-3xl border-4 border-white shadow-xl touch-none bg-stone-100"
      >
        {/* Original Raw Photo (Base) */}
        <img
          src={src}
          alt="Original craft with room background"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Studio Photo with Background Removed (Revealed by slider) */}
        {studioSrc && (
          <img
            src={studioSrc}
            alt="Studio isolated craft"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
        )}

        {/* Processing Overlay while rembg U²-Net runs */}
        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] text-white p-4">
            <Loader2 size={44} className="animate-spin text-orange-500 mb-3" />
            <p className="text-base font-bold text-center">Isolating craft with rembg U²-Net</p>
            <p className="text-xs text-white/80 text-center mt-1">Removing background clutter without altering product dyes</p>
          </div>
        )}

        {/* Divider Bar with Handle (Visible once ready) */}
        {!processing && (
          <div
            className="absolute inset-y-0 w-1 bg-white shadow-lg pointer-events-none transition-transform"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-orange-600 shadow-md border-2 border-orange-600 text-xs font-black">
              ↔
            </div>
          </div>
        )}

        {/* Floating Badges */}
        {!processing && (
          <>
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur-sm">
              <Sparkles size={13} />
              Studio ({engineUsed})
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur-sm">
              Original
            </span>
          </>
        )}
      </div>

      {/* Manual Slider Input */}
      {!processing && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-emerald-700">Studio</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(+e.target.value)}
            aria-label="Compare before and after"
            className="w-full accent-orange-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
          />
          <span className="text-xs font-semibold text-stone-500">Original</span>
        </div>
      )}

      {/* Processing Steps Checklist */}
      <ul className="space-y-1.5 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700 border border-stone-200/60">
        {STEPS.map((s, k) => {
          const isDone = stepIdx > k;
          const isCurrent = stepIdx === k;
          return (
            <li
              key={s}
              className={`flex items-center gap-2.5 transition-opacity ${
                isDone ? 'text-stone-900 font-medium' : isCurrent ? 'text-orange-700 font-medium' : 'opacity-40'
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 size={18} className="animate-spin text-orange-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-stone-300 shrink-0" />
              )}
              <span>{s}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-stone-500">
        Only background and framing improve. Traditional dyes and weave textures are never altered by AI.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-1">
        <Btn
          aria-label="Use this photo"
          onClick={() => onAccept(studioSrc || src)}
          disabled={processing || !studioSrc}
          className="flex-1"
        >
          <Check size={28} /> {processing ? 'Processing Studio…' : 'Use Studio Photo'}
        </Btn>
        <Btn
          tone="red"
          aria-label="Retake"
          onClick={onRetake}
          className="flex-1"
        >
          <X size={28} /> Retake
        </Btn>
      </div>
    </div>
  );
}
