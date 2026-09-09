'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  startCameraStream,
  stopCameraStream,
  captureSquareFrame,
  CapturedImageResult,
} from '../utils/camera';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';

interface CameraCaptureProps {
  onCaptureComplete: (image: CapturedImageResult) => void;
  label?: string;
  targetSize?: number;
  quality?: number;
  craftProvenanceInfo?: string;
}

/**
 * Artify Bharat - Native In-Browser 1:1 Camera Capture Studio
 * 1. MediaDevices API: navigator.mediaDevices.getUserMedia (Native file picker locked out to prevent stock photos).
 * 2. DeviceOrientation API: Gyroscope spirit level enforces tilt <= 1.5° before enabling camera shutter button.
 *    Manual bypass toggle activates after 3 failed alignment attempts.
 * 3. Canvas 2D API: 1:1 bicubic crop, EXIF metadata sanitization, and provenance watermark embedding.
 */
export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCaptureComplete,
  label = 'Capture 1:1 Product / WIP Photo',
  targetSize = 1080,
  quality = 0.85,
  craftProvenanceInfo = 'Artify Bharat Verified Provenance',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<CapturedImageResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // DeviceOrientation Gyroscope Spirit Level Hook (<= 1.5 deg tilt threshold)
  const {
    isSupported: isOrientationSupported,
    absoluteTilt,
    isLevel,
    attemptCount,
    canBypass,
    isBypassed,
    recordFailedAttempt,
    toggleBypass,
    resetAttempts,
  } = useDeviceOrientation({ maxTiltThreshold: 1.5, bypassAttemptThreshold: 3 });

  const initCamera = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
      const newStream = await startCameraStream({ facingMode });
      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback
        });
      }
      setIsStreaming(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to open camera stream. Please grant camera permissions.');
      setIsStreaming(false);
    }
  }, [facingMode]);

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [initCamera]);

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isStreaming) return;

    // Enforce spirit level tilt <= 1.5 deg
    if (!isLevel && !isBypassed) {
      recordFailedAttempt();
      setErrorMsg(`Device tilt is ${absoluteTilt}° (Must be ≤ 1.5° for crisp 1:1 catalog quality). Level phone or tap bypass.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = await captureSquareFrame(videoRef.current, {
        targetSize,
        mimeType: 'image/webp',
        quality,
        embedWatermark: true,
        watermarkText: `${craftProvenanceInfo} | ${new Date().toISOString().substring(0, 10)}`,
      });
      setCapturedImage(result);
      resetAttempts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error capturing and sanitizing frame.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    resetAttempts();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCaptureComplete(capturedImage);
    }
  };

  return (
    <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-2xl text-white max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold tracking-wide text-amber-400">{label}</h3>
          <p className="text-xs text-slate-400">1:1 Studio Square • Gyroscope Spirit Level Enforced</p>
        </div>
        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30">
          Native Studio
        </span>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="px-2 py-1 bg-red-800 text-white rounded text-xs hover:bg-red-700 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Viewfinder Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* 1:1 Aspect Ratio Framing Grid */}
            <div className="absolute inset-0 pointer-events-none border-2 border-amber-400/40 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/10"></div>
              <div className="border-r border-b border-white/10"></div>
              <div className="border-b border-white/10"></div>
              <div className="border-r border-b border-white/10"></div>
              <div className="border-r border-b border-white/10"></div>
              <div className="border-b border-white/10"></div>
              <div className="border-r border-b border-white/10"></div>
              <div className="border-r border-b border-white/10"></div>
              <div></div>
            </div>

            {/* DeviceOrientation Gyroscope Spirit Level Overlay */}
            {isOrientationSupported && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-xs">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLevel || isBypassed
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : absoluteTilt <= 3.0
                      ? 'bg-amber-400'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                />
                <span className="font-mono font-bold">
                  {isBypassed ? 'Bypassed' : `${absoluteTilt}°`}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isLevel || isBypassed ? '(Level)' : '(≤1.5° req)'}
                </span>
              </div>
            )}

            {/* Locked-Out File Picker Antifraud Notice */}
            <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
              <span className="bg-black/70 backdrop-blur-sm text-[10px] text-amber-300/80 px-2 py-0.5 rounded border border-amber-500/20">
                🔒 Live Hardware Capture Only • Stock Photos Locked Out
              </span>
            </div>
          </>
        ) : (
          <img
            src={capturedImage.dataUrl}
            alt="Captured Craft WIP"
            className="w-full h-full object-cover"
          />
        )}

        {/* Compression & EXIF Badge */}
        {capturedImage && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <span className="text-emerald-400 font-mono font-bold">
              {capturedImage.formattedSize}
            </span>{' '}
            <span className="text-slate-400">
              ({capturedImage.width}×{capturedImage.height} WebP • EXIF Sanitized)
            </span>
          </div>
        )}
      </div>

      {/* Manual Bypass Notice if 3 failed attempts */}
      {!capturedImage && canBypass && !isBypassed && (
        <div className="mt-3 p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-300">
          <span>Failed alignment 3+ times?</span>
          <button
            onClick={toggleBypass}
            className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400"
          >
            Manual Bypass Tilt
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {!capturedImage ? (
          <>
            <button
              onClick={handleToggleFacingMode}
              title="Flip Camera"
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 text-sm flex items-center gap-1.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Flip</span>
            </button>

            <button
              onClick={handleCapture}
              disabled={isProcessing || !isStreaming}
              className={`flex-1 py-3 px-4 font-bold rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 ${
                isLevel || isBypassed
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 text-amber-400 border border-amber-500/40 hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 ${isLevel || isBypassed ? 'border-slate-950 bg-slate-950' : 'border-amber-400'}`}></div>
              {isProcessing
                ? 'Compressing & Sanitizing...'
                : !isLevel && !isBypassed
                ? `Hold Level (${absoluteTilt}° / ≤1.5°)`
                : 'Capture Photo'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition"
            >
              Confirm & Use
            </button>
          </>
        )}
      </div>
    </div>
  );
};
