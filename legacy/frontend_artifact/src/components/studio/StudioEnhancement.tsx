import React, { useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { enhanceAdditionalProductImage, type ProductEvidenceResponse } from '../../api/productApi';

interface StudioEnhancementProps {
  capturedImage: string;
  result: ProductEvidenceResponse;
  savedImages?: string[];
  onContinue: (productImages: string[]) => void;
  onImageEnhanced?: (images: string[]) => void;
}

interface AdditionalImage {
  id: string;
  original: string;
  enhanced: string;
  status: 'processing' | 'enhanced' | 'failed';
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function resolveMediaUrl(value: string, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  const mediaPath = value.split('media_storage').pop()?.replaceAll('\\', '/');
  return mediaPath ? `${API_BASE_URL}/media${mediaPath}` : fallback;
}

export const StudioEnhancement: React.FC<StudioEnhancementProps> = ({
  capturedImage,
  result,
  savedImages = [],
  onContinue,
  onImageEnhanced,
}) => {
  const enhancedImage = resolveMediaUrl(result.enhanced_image_url, capturedImage);
  const additionalImageInputRef = useRef<HTMLInputElement | null>(null);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>(() => savedImages.slice(1).map((image, index) => ({
    id: `saved-${index}`,
    original: image,
    enhanced: image,
    status: 'enhanced',
  })));

  const handleAdditionalImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    if (!files.length) return;

    const imageJobs = files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject();
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));

    Promise.allSettled(imageJobs).then((results) => {
      results.forEach((item, index) => {
        if (item.status !== 'fulfilled') return;
        const id = `${Date.now()}-${index}`;
        setAdditionalImages((current) => [...current, {
          id,
          original: item.value,
          enhanced: item.value,
          status: 'processing',
        }]);
        fetch(item.value)
          .then((response) => response.blob())
          .then((blob) => enhanceAdditionalProductImage(blob))
          .then((studioResult) => {
            const enhanced = resolveMediaUrl(studioResult.enhanced_image_url, item.value);
            setAdditionalImages((current) => {
              const updated = current.map((image) => (
                image.id === id ? { ...image, enhanced, status: 'enhanced' as const } : image
              ));
              onImageEnhanced?.([enhancedImage, ...updated.filter((image) => image.status === 'enhanced').map((image) => image.enhanced)]);
              return updated;
            });
          })
          .catch((error: unknown) => {
            setAdditionalImages((current) => current.map((image) => (
              image.id === id
                ? { ...image, status: 'failed', error: error instanceof Error ? error.message : 'Enhancement failed' }
                : image
            )));
          });
      });
    });
  };

  const isProcessing = additionalImages.some((image) => image.status === 'processing');
  const hasFailed = additionalImages.some((image) => image.status === 'failed');

  return (
    <section className="space-y-6 rounded-2xl border border-terracotta-200 bg-cream-50 p-5 shadow-warm">
      <div className="flex flex-col gap-3 border-b border-terracotta-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-terracotta-700">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">AI Studio Enhancement</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-charcoal-900">Your craft image is studio-ready</h2>
          <p className="mt-1 text-sm text-charcoal-700">Non-generative cleanup preserves the original weave texture and provenance.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          {result.status}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-terracotta-200 bg-white">
          <div className="flex items-center gap-2 border-b border-terracotta-100 px-4 py-3 text-sm font-semibold text-charcoal-800">
            <ImagePlus className="h-4 w-4 text-terracotta-600" />
            Captured evidence
          </div>
          <img src={capturedImage} alt="Original craft evidence" className="aspect-square w-full object-cover" />
        </div>
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
          <div className="flex items-center gap-2 border-b border-emerald-100 px-4 py-3 text-sm font-semibold text-charcoal-800">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Enhanced studio image
          </div>
          <img src={enhancedImage} alt="Enhanced craft studio image" className="aspect-square w-full object-contain bg-[#fdfbf7]" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-terracotta-100 bg-white p-3">
          <span className="block text-xs text-charcoal-600">Background</span>
          <strong className="text-sm text-charcoal-900">{result.background_removed ? 'Removed' : 'Preserved'}</strong>
        </div>
        <div className="rounded-xl border border-terracotta-100 bg-white p-3">
          <span className="block text-xs text-charcoal-600">Lighting</span>
          <strong className="text-sm text-charcoal-900">{result.clahe_applied ? 'CLAHE equalized' : 'Unchanged'}</strong>
        </div>
        <div className="rounded-xl border border-terracotta-100 bg-white p-3">
          <span className="block text-xs text-charcoal-600">Composition</span>
          <strong className="text-sm text-charcoal-900">{result.auto_cropped_ratio || '1:1'} square crop</strong>
        </div>
      </div>

      <div className="rounded-xl border border-terracotta-200 bg-white p-4">
        <input
          ref={additionalImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleAdditionalImages}
          className="hidden"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Add more product images</h3>
            <p className="mt-1 text-xs text-charcoal-600">Add detail, side, back, or work-in-progress views before creating the description.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => additionalImageInputRef.current?.click()}
          >
            Browse images
          </Button>
        </div>
        {additionalImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {additionalImages.map((image, index) => (
              <div key={image.id} className="group relative overflow-hidden rounded-lg border border-terracotta-100">
                <img src={image.enhanced} alt={`Enhanced additional product view ${index + 1}`} className="aspect-square w-full object-cover" />
                <div className={`absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] font-semibold text-white ${image.status === 'enhanced' ? 'bg-emerald-700/90' : image.status === 'failed' ? 'bg-red-700/90' : 'bg-charcoal-900/80'}`}>
                  {image.status === 'processing' ? 'Enhancing...' : image.status === 'enhanced' ? 'Enhanced and saved' : image.error}
                </div>
                <button
                  type="button"
                  aria-label={`Remove additional image ${index + 1}`}
                  onClick={() => setAdditionalImages((current) => current.filter((currentImage) => currentImage.id !== image.id))}
                  className="absolute right-1 top-1 rounded-full bg-charcoal-900/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{result.message} Complexity score: {result.visual_complexity_score.toFixed(2)}.</span>
        </div>
        <Button
          variant="gold"
          disabled={isProcessing || hasFailed}
          onClick={() => onContinue([enhancedImage, ...additionalImages.filter((image) => image.status === 'enhanced').map((image) => image.enhanced)])}
        >
          {isProcessing ? 'Enhancing images...' : hasFailed ? 'Fix image errors first' : 'Continue to catalog details'}
        </Button>
      </div>
    </section>
  );
};
