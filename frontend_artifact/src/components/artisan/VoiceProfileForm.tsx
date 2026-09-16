import React, { useState } from 'react';
import { CheckCircle2, Edit3, UserRound, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { VoiceCatalogExtraction } from '../../api/catalogApi';

interface VoiceProfileFormProps {
  extraction?: VoiceCatalogExtraction | null;
  dialect?: string;
  onSubmitted: (profile: ArtisanProfileDraft) => void | Promise<void>;
}

export interface ArtisanProfileDraft {
  name: string;
  phone: string;
  pin: string;
  dialect: string;
  craftTitle: string;
  craftType: string;
  material: string;
  description: string;
  laborDays: number;
}

export const VoiceProfileForm: React.FC<VoiceProfileFormProps> = ({
  extraction,
  dialect,
  onSubmitted,
}) => {
  const [isManualMode, setIsManualMode] = useState(!extraction);
  const [name, setName] = useState(extraction?.artisanName || '');
  const [phone, setPhone] = useState(extraction?.artisanPhone || '');
  const [pin, setPin] = useState('');
  const [profileDialect, setProfileDialect] = useState(extraction?.dialect || dialect || '');
  const [craftTitle, setCraftTitle] = useState(extraction?.extractedTitle || '');
  const [craftType, setCraftType] = useState(extraction?.extractedCraftType || '');
  const [material, setMaterial] = useState(extraction?.extractedMaterial || '');
  const [description, setDescription] = useState(extraction?.extractedDescription || '');
  const [laborDays, setLaborDays] = useState(extraction?.estimatedLaborDays || 0);

  const canSubmit = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10 && pin.length >= 4;

  const inputClass = `mt-1 w-full rounded-xl border p-3 text-sm outline-none ${
    isManualMode
      ? 'border-terracotta-200 bg-white focus:border-terracotta-500'
      : 'border-emerald-200 bg-emerald-50'
  }`;

  const submitProfile = () => onSubmitted({
    name: name.trim(),
    phone: phone.trim(),
    pin: pin.trim(),
    dialect: profileDialect.trim(),
    craftTitle: craftTitle.trim(),
    craftType: craftType.trim(),
    material: material.trim(),
    description: description.trim(),
    laborDays,
  });

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 shadow-warm">
      <div className="mb-4 flex items-center gap-2 border-b border-emerald-200 pb-3">
        <UserRound className="h-5 w-5 text-emerald-700" />
        <div>
          <h3 className="text-base font-bold text-charcoal-900">Create Artisan Profile</h3>
          <p className="text-xs text-charcoal-700">Review voice details or enter this artisan profile manually.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {extraction && <Button
          variant={isManualMode ? 'outline' : 'secondary'}
          size="sm"
          leftIcon={<Volume2 className="h-4 w-4" />}
          onClick={() => setIsManualMode(false)}
        >
          Use Voice Details
        </Button>}
        <Button
          variant={isManualMode ? 'secondary' : 'outline'}
          size="sm"
          leftIcon={<Edit3 className="h-4 w-4" />}
          onClick={() => setIsManualMode(true)}
        >
          Fill Manually
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{extraction ? 'Craft details were filled from your voice. Please review them before continuing.' : 'Enter this artisan profile manually, or record a voice story on the left.'}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-charcoal-800">
          Artisan Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Mobile Number
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            placeholder="10-digit mobile number"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Security PIN
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            type="password"
            placeholder="4-6 digit PIN"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Mother Tongue
          <input value={profileDialect} onChange={(event) => setProfileDialect(event.target.value)} readOnly={!isManualMode} placeholder="Not detected in voice" className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Craft Title
          <input value={craftTitle} onChange={(event) => setCraftTitle(event.target.value)} readOnly={!isManualMode} placeholder="Not detected in voice" className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Craft Type
          <input value={craftType} onChange={(event) => setCraftType(event.target.value)} readOnly={!isManualMode} placeholder="Not detected in voice" className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Material
          <input value={material} onChange={(event) => setMaterial(event.target.value)} readOnly={!isManualMode} placeholder="Not detected in voice" className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-charcoal-800 md:col-span-2">
          Catalog Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} readOnly={!isManualMode} placeholder="Not detected in voice" rows={3} className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-charcoal-800">
          Labor Days
          <input type="number" min="0" value={laborDays || ''} onChange={(event) => setLaborDays(Number(event.target.value) || 0)} readOnly={!isManualMode} placeholder="Not detected in voice" className={inputClass} />
        </label>
      </div>

      <Button variant="gold" size="lg" disabled={!canSubmit} onClick={submitProfile} className="mt-5 w-full sm:w-auto">
        Save Profile &amp; Continue to Pricing
      </Button>
    </Card>
  );
};
