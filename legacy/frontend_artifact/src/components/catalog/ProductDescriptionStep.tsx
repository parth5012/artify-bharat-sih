import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileText, ImagePlus } from 'lucide-react';
import { VoiceRecorder } from '../voice/VoiceRecorder';
import { Button } from '../ui/Button';
import type { VoiceCatalogExtraction } from '../../api/catalogApi';
import { saveProductCatalog } from '../../api/catalogApi';

interface ProductDescriptionStepProps {
  images: string[];
  initialTitle: string;
  productId?: string;
  onSaved: (description: ProductDescription) => void | Promise<void>;
}

export interface ProductDescription {
  title: string;
  craftType: string;
  material: string;
  description: string;
  laborDays: number;
  tags: string[];
  transcript: string;
  translatedDescription: string;
}

export const ProductDescriptionStep: React.FC<ProductDescriptionStepProps> = ({
  images,
  initialTitle,
  productId,
  onSaved,
}) => {
  const [extraction, setExtraction] = useState<VoiceCatalogExtraction | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [craftType, setCraftType] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');
  const [laborDays, setLaborDays] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!extraction) return;
    setTitle(extraction.extractedTitle || title);
    setCraftType(extraction.extractedCraftType);
    setMaterial(extraction.extractedMaterial);
    setDescription(extraction.extractedDescription);
    setLaborDays(extraction.estimatedLaborDays);
  }, [extraction]);

  const handleSave = async () => {
    const productDescription: ProductDescription = {
      title: title.trim(),
      craftType: craftType.trim(),
      material: material.trim(),
      description: description.trim(),
      laborDays,
      tags: extraction?.tags || [],
      transcript: extraction?.originalTranscript || '',
      translatedDescription: extraction?.translatedEnglish || description.trim(),
    };
    setIsSaving(true);
    setSaveError(null);
    try {
      if (productId) {
        await saveProductCatalog(productId, {
          title: productDescription.title,
          description: productDescription.description,
          craft_category: productDescription.craftType || 'handloom',
          material: productDescription.material,
          estimated_days: productDescription.laborDays,
          seo_tags: productDescription.tags,
          enhanced_image_url: images[0],
        });
      }
      await onSaved(productDescription);
      setIsSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save product to the artisan site.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-xl border border-terracotta-200 bg-white p-3 text-sm outline-none focus:border-terracotta-500';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-warm">
        <div className="flex items-center gap-3 border-b border-emerald-200 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-charcoal-900">Create product description</h2>
            <p className="text-xs text-charcoal-700">Describe the product by voice or review the details manually.</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <div key={`${image.slice(0, 24)}-${index}`} className="relative shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-white">
              <img src={image} alt={`Enhanced product image ${index + 1}`} className="h-28 w-28 object-cover" />
              {index === 0 && <span className="absolute bottom-0 inset-x-0 bg-charcoal-900/80 px-2 py-1 text-[10px] font-semibold text-white">Primary enhanced</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <VoiceRecorder onStoryExtracted={setExtraction} />
        <section className="rounded-2xl border border-terracotta-200 bg-cream-50 p-5 shadow-warm">
          <h3 className="mb-4 text-lg font-bold text-charcoal-900">Product details</h3>
          {extraction && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              Voice story translated and structured by the catalog AI pipeline.
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-charcoal-800 sm:col-span-2">Product title<input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
            <label className="text-xs font-semibold text-charcoal-800">Craft type<input value={craftType} onChange={(event) => setCraftType(event.target.value)} className={inputClass} placeholder="e.g. handloom" /></label>
            <label className="text-xs font-semibold text-charcoal-800">Material<input value={material} onChange={(event) => setMaterial(event.target.value)} className={inputClass} placeholder="e.g. cotton" /></label>
            <label className="text-xs font-semibold text-charcoal-800 sm:col-span-2">Product description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className={inputClass} placeholder="Describe the craft, process, and heritage." /></label>
            <label className="text-xs font-semibold text-charcoal-800">Labor days<input type="number" min="0" value={laborDays || ''} onChange={(event) => setLaborDays(Number(event.target.value) || 0)} className={inputClass} /></label>
          </div>
          {extraction?.translatedEnglish && (
            <p className="mt-4 rounded-xl border border-terracotta-100 bg-white p-3 text-xs text-charcoal-700">English translation: {extraction.translatedEnglish}</p>
          )}
          <Button variant="gold" onClick={handleSave} className="mt-5 w-full sm:w-auto">
            {isSaved ? <><CheckCircle2 className="h-4 w-4" /> Product listed on Artisan Site</> : isSaving ? 'Saving product...' : 'Save and list product'}
          </Button>
          {saveError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{saveError}</p>}
        </section>
      </div>

      <div className="flex items-center gap-2 text-xs text-charcoal-600">
        <ImagePlus className="h-4 w-4 text-terracotta-600" />
        {images.length} enhanced image{images.length === 1 ? '' : 's'} attached to this product.
      </div>
    </div>
  );
};
