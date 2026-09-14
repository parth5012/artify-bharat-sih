import React, { useState } from 'react';
import { Search, QrCode, ArrowRight, Tag } from 'lucide-react';
import { Button } from '../ui/Button';

interface ShortcodeSearchProps {
  onSearch: (code: string) => void;
  onOpenQRScanner: () => void;
  isLoading?: boolean;
}

const SAMPLE_CODES = [
  { code: 'ABC123', label: 'Banarasi Zari Saree' },
  { code: 'VRN456', label: 'Madhubani Canvas' },
  { code: 'MDB789', label: 'Pashmina Stole' },
];

export const ShortcodeSearch: React.FC<ShortcodeSearchProps> = ({
  onSearch,
  onOpenQRScanner,
  isLoading = false,
}) => {
  const [code, setCode] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSearch(code.trim().toUpperCase());
    }
  };

  const handleChipClick = (sampleCode: string) => {
    setCode(sampleCode);
    onSearch(sampleCode);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-cream-50 p-6 rounded-3xl border border-terracotta-200 shadow-warm-lg">
      <h2 className="text-xl font-bold font-heading text-charcoal-800 mb-1 text-center sm:text-left">
        Verify Authentic Indian Craft Provenance
      </h2>
      <p className="text-xs text-charcoal-700 mb-5 text-center sm:text-left">
        Enter the 6-character Digital Passport shortcode from your product tag or scan the thermal QR code.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-terracotta-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            maxLength={8}
            placeholder="e.g. ABC123, VRN456, MDB789"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-terracotta-200 rounded-2xl text-base font-mono font-bold tracking-wider text-charcoal-900 placeholder:font-sans placeholder:font-normal placeholder:text-charcoal-700 uppercase focus:outline-none focus:border-terracotta-500 shadow-inner-warm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            Verify Passport
          </Button>

          <Button
            type="button"
            variant="gold"
            size="lg"
            leftIcon={<QrCode className="w-5 h-5" />}
            onClick={onOpenQRScanner}
            title="Scan QR Code via Camera"
          >
            Scan QR
          </Button>
        </div>
      </form>

      <div className="mt-4 pt-3 border-t border-cream-200/80 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-charcoal-700 font-semibold flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-terracotta-500" />
          Quick Samples:
        </span>
        {SAMPLE_CODES.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => handleChipClick(s.code)}
            className="px-2.5 py-1 bg-white hover:bg-terracotta-50 border border-terracotta-200 rounded-lg font-mono font-bold text-terracotta-700 hover:border-terracotta-400 transition-colors shadow-xs"
          >
            {s.code} ({s.label})
          </button>
        ))}
      </div>
    </div>
  );
};

