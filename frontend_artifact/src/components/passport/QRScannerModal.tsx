import React, { useRef, useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startScanner = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('QR camera error:', err);
    }
  };

  const stopScanner = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isOpen]);

  const handleSimulateScan = (code: string) => {
    stopScanner();
    onScanSuccess(code);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Live Camera QR Scanner">
      <div className="flex flex-col items-center justify-center space-y-4">
        <p className="text-xs text-charcoal-700 text-center">
          Point your camera at the QR code on the 58mm thermal product tag.
        </p>

        <div className="relative w-64 h-64 bg-black rounded-3xl overflow-hidden border-4 border-terracotta-500 shadow-xl flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          <div className="absolute w-44 h-44 border-2 border-heritage-gold rounded-2xl animate-pulse flex items-center justify-center">
            <div className="w-full h-[2px] bg-terracotta-500 animate-bounce" />
          </div>
        </div>

        <div className="w-full pt-2 border-t border-cream-200">
          <p className="text-[11px] font-bold text-charcoal-700 mb-2 text-center">
            Quick Scan Demo Shortcuts:
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('ABC123')}>
              Banarasi Zari (ABC123)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('VRN456')}>
              Madhubani (VRN456)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSimulateScan('MDB789')}>
              Pashmina (MDB789)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
