import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Flag, CheckCircle2, Copy, Check, Filter, Search, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { ShortcodeSearch } from '../components/passport/ShortcodeSearch';
import { DualViewProof } from '../components/passport/DualViewProof';
import { AudioStoryPlayer } from '../components/voice/AudioStoryPlayer';
import { TransparentCostBreakdown } from '../components/pricing/TransparentCostBreakdown';
import { ReportFakeModal } from '../components/passport/ReportFakeModal';
import { QRScannerModal } from '../components/passport/QRScannerModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';
import { getPassportByShortcode } from '../api/passportApi';
import { MOCK_PRODUCTS } from '../mocks/mockData';
import type { CraftProduct } from '../types';

export const BuyerPortalPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<CraftProduct | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Catalog filters
  const [selectedCluster, setSelectedCluster] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  const loadPassport = async (shortcode: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getPassportByShortcode(shortcode);
      if (result) {
        setProduct(result);
      } else {
        setProduct(null);
        setErrorMsg(`No Digital Passport found matching code: "${shortcode}". Please check shortcode on thermal tag.`);
      }
    } catch (err) {
      setErrorMsg('Failed to query passport provenance ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      loadPassport(code);
    } else {
      loadPassport('ABC123');
    }
  }, [code]);

  const handleSearchSubmit = (inputCode: string) => {
    navigate(`/buyer/passport/${inputCode}`);
    loadPassport(inputCode);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setToastMsg(`Copied ${label} to clipboard!`);
    setTimeout(() => setToastMsg(null), 2500);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredCatalog = MOCK_PRODUCTS.filter((item) => {
    const matchesCluster = selectedCluster === 'All' || item.cluster.toLowerCase() === selectedCluster.toLowerCase();
    const query = catalogSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.craftType.toLowerCase().includes(query) ||
      item.artisanName.toLowerCase().includes(query) ||
      item.shortcode.toLowerCase().includes(query);

    return matchesCluster && matchesSearch;
  });

  return (
    <div className="space-y-10 py-4">
      {toastMsg && (
        <Toast
          message={toastMsg}
          type="success"
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3 bg-gradient-to-b from-cream-50 to-cream-100/60 p-6 sm:p-8 rounded-3xl border border-terracotta-200 shadow-warm">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-terracotta-100 text-terracotta-800 text-xs font-bold rounded-full uppercase border border-terracotta-300 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Artifact Verified Buyer Provenance Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-charcoal-900 tracking-tight">
          Digital Heritage Passport Provenance
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-700 max-w-xl mx-auto leading-relaxed">
          Verify authentic hand-crafted Indian products directly from rural master artisans with cryptographic SHA-256 loom evidence.
        </p>
      </div>

      {/* Shortcode & QR Search Component */}
      <ShortcodeSearch
        onSearch={handleSearchSubmit}
        onOpenQRScanner={() => setIsQRModalOpen(true)}
        isLoading={isLoading}
      />

      {isLoading && <Loader size="lg" label="Decrypting SHA-256 Provenance Ledger..." />}

      {!isLoading && errorMsg && (
        <ErrorState
          title="Passport Not Found"
          message={errorMsg}
          onRetry={() => loadPassport('ABC123')}
        />
      )}

      {/* Active Passport Presentation */}
      {!isLoading && product && (
        <div className="space-y-8 animate-fade-in-up">
          <Card variant="gold" padding="lg" className="border-heritage-gold shadow-warm-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-heritage-gold/40 pb-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <button
                    onClick={() => copyToClipboard(product.shortcode, 'Shortcode')}
                    className="font-mono font-bold text-sm bg-terracotta-500 text-white px-2.5 py-0.5 rounded-lg shadow-sm hover:bg-terracotta-600 transition-colors flex items-center gap-1.5"
                    title="Click to copy shortcode"
                  >
                    <span>{product.shortcode}</span>
                    {copiedField === 'Shortcode' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-80" />}
                  </button>
                  <Badge variant="verified" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    SHA-256 Verified
                  </Badge>
                  <Badge variant="cluster">{product.cluster} Cluster</Badge>
                </div>
                <h2 className="text-2xl font-bold font-heading text-charcoal-900">{product.title}</h2>
                <p className="text-xs text-charcoal-700">
                  Crafted by master artisan: <strong className="text-terracotta-700">{product.artisanName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Flag className="w-4 h-4" />}
                  onClick={() => setIsReportModalOpen(true)}
                >
                  🚩 Report Fake / Machine-Made
                </Button>
              </div>
            </div>

            <div className="bg-white/90 p-3.5 rounded-2xl border border-heritage-gold/40 text-[11px] font-mono text-charcoal-800 break-all flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-[9px] font-bold text-charcoal-700 block uppercase font-sans">
                  Cryptographic SHA-256 Provenance Hash:
                </span>
                <span>{product.sha256Hash}</span>
              </div>
              <button
                onClick={() => copyToClipboard(product.sha256Hash, 'SHA-256 Hash')}
                className="px-3 py-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-800 rounded-xl text-xs font-sans font-semibold border border-cream-300 shrink-0 flex items-center gap-1.5 transition-colors"
              >
                {copiedField === 'SHA-256 Hash' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-terracotta-600" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
          </Card>

          <DualViewProof product={product} />

          <AudioStoryPlayer
            artisanName={product.artisanName}
            dialect="Bhojpuri / Maithili"
            audioUrl={product.audioStoryUrl}
            transcript={product.transcript}
            translatedText={product.translatedText}
          />

          <TransparentCostBreakdown
            materialCost={product.pricing.breakdown.materialCost}
            laborCost={product.pricing.breakdown.laborCost}
            overheadCost={product.pricing.breakdown.overheadCost}
            retailPrice={product.pricing.retailPrice}
            directWagePct={product.pricing.breakdown.directWageRealizationPct}
          />
        </div>
      )}

      {/* Catalog & Crafts Provenance Directory */}
      <section className="space-y-6 pt-4 border-t border-terracotta-200/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-terracotta-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-heritage-goldDark" />
              <span>Verified Heritage Crafts Catalog</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-charcoal-900 mt-1">
              Explore All Registered Indian Craft Passports
            </h2>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-charcoal-700" />
            <input
              type="text"
              placeholder="Search by craft, cluster, or artisan..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-cream-50 border border-terracotta-200 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-terracotta-500 shadow-xs"
            />
          </div>
        </div>

        {/* Cluster Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-charcoal-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-terracotta-500" /> Filter Cluster:
          </span>
          {['All', 'Varanasi', 'Madhubani', 'Kashmir', 'Kutch', 'Pochampally'].map((cluster) => (
            <button
              key={cluster}
              onClick={() => setSelectedCluster(cluster)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                selectedCluster === cluster
                  ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                  : 'bg-cream-50 text-charcoal-700 border border-terracotta-200 hover:bg-terracotta-50'
              }`}
            >
              {cluster}
            </button>
          ))}
        </div>

        {/* Catalog Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSearchSubmit(item.shortcode)}
              className={`group cursor-pointer bg-cream-50 rounded-2xl border p-4 space-y-3 transition-all hover:scale-[1.02] hover:shadow-warm-lg ${
                product?.id === item.id ? 'border-terracotta-500 ring-2 ring-terracotta-400/40 bg-terracotta-50/40' : 'border-terracotta-200'
              }`}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-charcoal-900 border border-terracotta-200 shadow-inner">
                <img
                  src={item.wipPhotoUrl}
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[10px] font-bold bg-charcoal-900/80 backdrop-blur-md text-heritage-gold px-2 py-0.5 rounded-md border border-heritage-gold/30">
                  <span>{item.shortcode}</span>
                </div>
                <div className="absolute bottom-2 right-2 bg-emerald-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                  {item.pricing.breakdown.directWageRealizationPct}% Wage
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-terracotta-600">{item.craftType}</span>
                  <span className="text-charcoal-700 font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-terracotta-500" />
                    {item.cluster}
                  </span>
                </div>

                <h3 className="font-bold text-sm font-heading text-charcoal-900 line-clamp-1 group-hover:text-terracotta-600 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-charcoal-700">
                  Artisan: <strong>{item.artisanName}</strong>
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-terracotta-200/60 pt-3 text-xs">
                <div>
                  <span className="text-[10px] text-charcoal-700 font-semibold block uppercase">Fair Retail</span>
                  <strong className="text-base font-bold font-mono text-charcoal-900">
                    ₹{item.pricing.retailPrice.toLocaleString('en-IN')}
                  </strong>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="group-hover:bg-terracotta-500 group-hover:text-white transition-colors"
                >
                  Verify Passport
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {product && (
        <ReportFakeModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          shortcode={product.shortcode}
        />
      )}

      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onScanSuccess={handleSearchSubmit}
      />
    </div>
  );
};
