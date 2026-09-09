/**
 * Artify Bharat - MediaDevices Camera Capture Utility
 * Wraps navigator.mediaDevices.getUserMedia for capturing high-resolution
 * 1:1 square cropped and client-side compressed product & WIP photos.
 * Zero external dependencies / Zero external API keys.
 */

export interface CameraStreamOptions {
  facingMode?: 'environment' | 'user';
  idealWidth?: number;
  idealHeight?: number;
}

export interface CaptureImageOptions {
  targetSize?: number; // Target square dimension (e.g., 1080 for 1080x1080)
  mimeType?: 'image/webp' | 'image/jpeg';
  quality?: number; // 0.0 to 1.0 (e.g., 0.82 for optimal WebP compression)
  embedWatermark?: boolean; // Canvas 2D watermark embedding
  watermarkText?: string;
}

export interface CapturedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  formattedSize: string;
  mimeType: string;
  timestamp: string;
}

/**
 * Initializes and returns a MediaStream from the user's camera.
 */
export async function startCameraStream(options: CameraStreamOptions = {}): Promise<MediaStream> {
  const { facingMode = 'environment', idealWidth = 1920, idealHeight = 1080 } = options;

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser.');
  }

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: idealWidth },
      height: { ideal: idealHeight },
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error: any) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Camera access permission was denied by the user.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No camera hardware was detected on this device.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      throw new Error('Camera is already in use by another application.');
    }
    throw new Error(`Failed to access camera: ${error.message || error.name}`);
  }
}

/**
 * Stops all active tracks on a MediaStream to release camera hardware.
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {}
    });
  } catch (e) {}
}

/**
 * Converts a data URL to a binary Blob (fallback for older browsers).
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Captures the current frame from a HTMLVideoElement, crops it to a 1:1 square from the center,
 * compresses it via Canvas API, and outputs an optimized Blob and data URL.
 */
export async function captureSquareFrame(
  videoElement: HTMLVideoElement,
  options: CaptureImageOptions = {}
): Promise<CapturedImageResult> {
  const { targetSize = 1080, mimeType = 'image/webp', quality = 0.85 } = options;

  const videoWidth = videoElement.videoWidth || 0;
  const videoHeight = videoElement.videoHeight || 0;

  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error('Camera video stream is still initializing. Please wait a moment and try again.');
  }

  // Calculate centered 1:1 square crop box
  const minDimension = Math.min(videoWidth, videoHeight);
  const sourceX = (videoWidth - minDimension) / 2;
  const sourceY = (videoHeight - minDimension) / 2;

  // Create canvas for rendering & compression
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context for image processing.');
  }

  // Draw centered square crop with smooth bicubic scaling (Sanitizes raw EXIF metadata)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    videoElement,
    sourceX,
    sourceY,
    minDimension,
    minDimension,
    0,
    0,
    targetSize,
    targetSize
  );

  // Canvas 2D API: Optional Provenance Watermark embedding
  if (options.embedWatermark) {
    const watermarkText = options.watermarkText || `Artify Bharat | Verified Provenance | ${new Date().toISOString().substring(0, 10)}`;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, targetSize - 44, targetSize, 44);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🛡️ ${watermarkText}`, 20, targetSize - 22);
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL(mimeType, quality);

  // Convert canvas to compressed Blob with fallback
  let blob: Blob;
  if (canvas.toBlob) {
    try {
      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else resolve(dataUrlToBlob(dataUrl));
          },
          mimeType,
          quality
        );
      });
    } catch {
      blob = dataUrlToBlob(dataUrl);
    }
  } else {
    blob = dataUrlToBlob(dataUrl);
  }

  const fileSizeBytes = blob.size;
  const formattedSize =
    fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(fileSizeBytes / 1024).toFixed(1)} KB`;

  return {
    blob,
    dataUrl,
    width: targetSize,
    height: targetSize,
    fileSizeBytes,
    formattedSize,
    mimeType,
    timestamp: new Date().toISOString(),
  };
}
