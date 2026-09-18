import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { normalizeShortcode } from '../../api/passportApi';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHandledRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<() => void>(() => {});

  const [hasCameraError, setHasCameraError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleSuccessfulScan = useCallback(
    (scannedText: string) => {
      if (isHandledRef.current) return;
      isHandledRef.current = true;

      const normalized = normalizeShortcode(scannedText) || scannedText.trim();
      setDetectedCode(normalized);

      // Brief visual confirmation before transitioning
      setTimeout(() => {
        stopScanner();
        onScanSuccess(normalized);
        onClose();
      }, 300);
    },
    [onClose, onScanSuccess, stopScanner]
  );

  // Maintain stable loop function in ref
  useEffect(() => {
    scanLoopRef.current = () => {
      if (!videoRef.current || isHandledRef.current) return;

      const video = videoRef.current;
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data && code.data.trim()) {
              handleSuccessfulScan(code.data);
              return;
            }
          } catch {
            // Frame decode exception ignored
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(() => {
        scanLoopRef.current();
      });
    };
  }, [handleSuccessfulScan]);

  const startScanner = useCallback(async () => {
    isHandledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      await Promise.resolve();
      setHasCameraError(true);
      setErrorMessage('Camera API is not supported on this device/browser.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      activeStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      // Start scanning frames once camera is active
      animFrameRef.current = requestAnimationFrame(() => {
        scanLoopRef.current();
      });
    } catch (err) {
      console.warn('QR camera stream error:', err);
      setHasCameraError(true);
      setErrorMessage('Unable to access camera. Please allow permissions or use quick shortcuts.');
    }
  }, []);

  useEffect(() => {
    let unmounted = false;

    if (isOpen) {
      const timer = setTimeout(() => {
        if (!unmounted) {
          void startScanner();
        }
      }, 0);
      return () => {
        unmounted = true;
        clearTimeout(timer);
        stopScanner();
      };
    }

    stopScanner();
    return () => {
      unmounted = true;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  const handleSimulateScan = (code: string) => {
    handleSuccessfulScan(code);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Live Camera QR Scanner">
      <div className="flex flex-col items-center justify-center space-y-4">
        <p className="text-xs text-charcoal-700 text-center">
          Point camera at QR code on 58mm thermal product tag or Digital Passport card.
        </p>

        <div className="relative w-64 h-64 bg-black rounded-3xl overflow-hidden border-4 border-terracotta-500 shadow-xl flex items-center justify-center">
          {hasCameraError ? (
            <div className="p-4 text-center text-cream-100 text-xs flex flex-col items-center justify-center space-y-2">
              <span className="font-semibold text-terracotta-300">Camera Unavailable</span>
              <p className="text-[11px] text-cream-200">{errorMessage}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute w-44 h-44 border-2 border-heritage-gold rounded-2xl animate-pulse flex items-center justify-center pointer-events-none">
                <div className="w-full h-[2px] bg-terracotta-500 animate-bounce" />
              </div>
              {detectedCode && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                  <span className="text-xs font-semibold text-emerald-300">QR Code Verified</span>
                  <span className="text-lg font-mono font-bold tracking-wider">{detectedCode}</span>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="w-full pt-2 border-t border-cream-200">
          <p className="text-[11px] font-bold text-charcoal-700 mb-2 text-center">
            Quick Scan Demo Shortcuts:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('A7X-9B2')}>
              Banarasi Zari (A7X-9B2)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('M3B-77L')}>
              Madhubani (M3B-77L)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('K9P-12M')}>
              Pashmina (K9P-12M)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
