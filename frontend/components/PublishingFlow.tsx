'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,Loader2,ExternalLink,Printer,Download,QrCode,X} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {getVerificationUrl,shortenHash} from '@/lib/hash';
import {deriveChecklist,PublishSource,PublishState,PublishStepId,PublishStepStatus} from '@/lib/publishing';

// Wayfinder #195 — the Step 6 checklist renders REAL publish progress: the
// record page feeds it the local record/photos work plus the `ondc` payload of
// POST /api/products (and the Try Again relist). No simulated delays. The
// component consumes the API response only — no env reads, no ONDC_* secrets.

interface PublishingFlowProps {
  /** Live publish progress reported by the record page. */
  status: PublishState;
  onComplete: () => void;
  /** Try Again on a rejected listing: re-attempts the sandbox publish. */
  onRetryListing: () => void;
  /** Try Again on a failed GeM packet: re-runs POST /api/gem/packet (#205). */
  onRetryPacket: () => void;
}

const STEP_LABELS:Record<PublishStepId,string>={
  registered:'Product registered',
  photos:'Photos & product details saved',
  ondc:'Publishing to ONDC Network',
  gem:'GeM approval packet',
  available:'Making your product available to buyers',
};
const STEP_LOGOS:Partial<Record<PublishStepId,{src:string;alt:string}>>={
  ondc:{src:'/src/ondchvv_d4-removebg-preview.png',alt:'ONDC'},
  gem:{src:'/src/gem-Photoroom.png',alt:'GeM'},
};
const SOURCE_LABEL:Record<PublishSource,string>={
  'live-sandbox':'Live sandbox',
  'offline-fallback':'Offline fallback',
};
// Grill G4 (LOCKED): the badge states the truth — a packet for MANUAL upload,
// never a GeM listing claim (grill G5: GeM exposes no seller catalog API).
const GEM_PACKET_BADGE = 'Packet ready (manual upload)';
const GEM_PACKET_DETAIL = 'XML + CSV + 5-stage manifest — paste into the gem.gov.in dashboard';

export function PublishingFlow({ status, onComplete, onRetryListing, onRetryPacket }: PublishingFlowProps) {
  const view = useMemo(() => deriveChecklist(status), [status]);
  const firedRef = useRef(false);

  // Hold on the completed checklist for a beat so the artisan actually sees the
  // final green step before the success card replaces this screen.
  useEffect(() => {
    if (!view.complete || firedRef.current) return;
    const timer = setTimeout(() => { firedRef.current = true; onComplete(); }, 700);
    return () => clearTimeout(timer);
  }, [view.complete, onComplete]);

  const failed = view.listingFailure !== null;
  const packetFailed = view.packetFailure !== null;
  // While Try Again runs the old failure text is still attached — the hero
  // must show the retry spinner, not a red X (#205 CodeReviewer finding).
  const inRetry = view.retrying || view.retryingPacket;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500">STEP 6 OF 6 · READY</p>
        </div>

        {/* Animated Circle */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={`h-32 w-32 rounded-full border-4 animate-pulse ${(failed || packetFailed) && !inRetry ? 'border-red-200' : 'border-orange-200'}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              {view.complete ? (
                <Check size={48} className="text-emerald-600 animate-bounce" />
              ) : (failed || packetFailed) && !inRetry ? (
                <X size={48} className="text-red-600" />
              ) : (
                <Loader2 size={48} className="animate-spin text-orange-600" />
              )}
            </div>
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[#3B2418]">
            {view.complete ? '🎉 Your craft is now live!' : inRetry ? 'Retrying…' : packetFailed ? 'GeM packet needs attention' : failed ? 'ONDC listing needs attention' : 'Taking your craft to market'}
          </h1>
          <p className="mt-2 text-stone-600">
            {view.complete
              ? 'Your product has been successfully published.'
              : inRetry
                ? 'Hang tight — trying that step again.'
                : packetFailed
                  ? 'The ONDC listing is live, but the GeM upload packet could not be generated.'
                  : failed
                    ? 'The product is registered, but the ONDC Network rejected the listing.'
                    : 'Your product is being published...'}
          </p>
        </div>

        {/* Publishing Steps Checklist */}
        <div role="status" aria-live="polite" aria-label="Publishing progress" className="space-y-3 rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-lg">
          {view.steps.map((step) => {
            const badge = step.id === 'ondc' ? (view.source ? SOURCE_LABEL[view.source] : undefined)
              : step.id === 'gem' && step.status === 'done' ? GEM_PACKET_BADGE : undefined;
            const badgeSource = step.id === 'ondc' ? view.source ?? undefined : undefined;
            const detail = step.id === 'ondc' ? view.ondcDetail ?? undefined
              : step.id === 'gem' && step.status === 'done' ? GEM_PACKET_DETAIL : undefined;
            return (
              <PublishingStepItem
                key={step.id}
                label={STEP_LABELS[step.id]}
                status={step.status}
                logo={STEP_LOGOS[step.id]?.src}
                logoAlt={STEP_LOGOS[step.id]?.alt}
                badge={badge}
                badgeSource={badgeSource}
                detail={detail}
              />
            );
          })}
        </div>

        {/* Listing failure (#195): never claim success the sandbox rejected. */}
        {failed && (
          <div role="alert" className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-center">
            <p className="font-bold text-red-700">Could not publish to the ONDC Network</p>
            <p className="mt-1 text-sm text-red-600">{view.listingFailure}</p>
            <button
              onClick={onRetryListing}
              disabled={view.retrying}
              aria-busy={view.retrying}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform disabled:opacity-60"
            >
              {view.retrying && <Loader2 size={18} className="animate-spin" />}
              {view.retrying ? 'Retrying…' : 'Try Again'}
            </button>
          </div>
        )}

        {/* GeM packet failure (#205): the packet route failed — retry the packet,
            never re-register the product, and never claim a GeM listing. */}
        {packetFailed && (
          <div role="alert" className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-center">
            <p className="font-bold text-red-700">Could not build the GeM upload packet</p>
            <p className="mt-1 text-sm text-red-600">{view.packetFailure}</p>
            <button
              onClick={onRetryPacket}
              disabled={view.retryingPacket}
              aria-busy={view.retryingPacket}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform disabled:opacity-60"
            >
              {view.retryingPacket && <Loader2 size={18} className="animate-spin" />}
              {view.retryingPacket ? 'Retrying…' : 'Try Again'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PublishingStepItemProps {
  label: string;
  status: PublishStepStatus;
  logo?: string;
  logoAlt?: string;
  /** Grill A1 source badge (Live sandbox vs Offline fallback). */
  badge?: string;
  badgeSource?: PublishSource;
  /** Proof line for the ONDC step (`on_search` ack + attempts + catalog id). */
  detail?: string;
}

function PublishingStepItem({ label, status, logo, logoAlt, badge, badgeSource, detail }: PublishingStepItemProps) {
  const completed = status === 'done';
  const active = status === 'active';
  const failed = status === 'failed';
  return (
    <div className="flex items-center gap-3">
      <div className={`
        flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all
        ${completed
          ? 'bg-emerald-600 text-white'
          : failed
            ? 'bg-red-600 text-white'
            : active
              ? 'border-2 border-orange-600 bg-orange-50'
              : 'border-2 border-stone-300 bg-white'}
      `}>
        {completed && <Check size={18} className="animate-pop" />}
        {failed && <X size={18} />}
        {active && !completed && logo && (
          <img src={logo} alt={logoAlt} className="h-5 w-5 object-contain animate-pulse" />
        )}
        {active && !completed && !logo && (
          <div className="h-2 w-2 rounded-full bg-orange-600 animate-ping" />
        )}
      </div>
      <div className="flex-1">
        <p className={`
        text-sm transition-all
        ${completed ? 'font-semibold text-stone-900' : failed ? 'font-semibold text-red-600' : active ? 'font-semibold text-orange-600' : 'text-stone-500'}
      `}>
          {label}
          {/* Screen readers get the raw state; sighted users read the icons. */}
          <span className="sr-only"> — {status}</span>
        </p>
        {detail && <p className="mt-0.5 text-xs text-stone-500">{detail}</p>}
      </div>
      {badge && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            badgeSource === 'offline-fallback' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {badge}
        </span>
      )}
      {logo && (active || completed) && (
        <img src={logo} alt={logoAlt} className="h-6 w-6 object-contain opacity-70" />
      )}
    </div>
  );
}

interface MarketplaceSuccessProps {
  productId: string;
  productName: string;
  productHash: string;
  onViewProducts: () => void;
  onViewMarketplace: () => void;
  ondcUrl?: string;
  /** Real packet verdict from POST /api/gem/packet (#204/#205) — never a GeM listing. */
  gemReady?: boolean;
  /** Downloads the packet (gem-catalog.xml + gem-catalog.csv) for manual upload. */
  onDownloadGemPacket?: () => Promise<void>;
  /** Real publish verdict from POST /api/products (#195): source badge + catalog proof. */
  ondc?: { source: PublishSource; catalogId?: string } | null;
}

export function MarketplaceSuccess({
  productId,
  productName,
  productHash,
  onViewProducts,
  onViewMarketplace,
  ondcUrl,
  gemReady,
  onDownloadGemPacket,
  ondc,
}: MarketplaceSuccessProps) {
  const verificationUrl = getVerificationUrl(productId);
  const [downloading, setDownloading] = useState(false);
  
  const handlePrintQR = () => {
    // Get the SVG and convert to data URL for printing
    const svgElement = document.querySelector('#qr-canvas') as unknown as SVGSVGElement;
    if (!svgElement) {
      console.error('QR code SVG not found');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 400, 400);
      
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);

      // Open print window with the QR code
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the QR code');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print QR Code - ${productId}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 20mm;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                text-align: center;
                max-width: 150mm;
              }
              .logo {
                font-size: 36px;
                font-weight: 900;
                color: #F97316;
                margin-bottom: 15px;
                letter-spacing: 2px;
              }
              .product-name {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 8px;
                color: #1F2937;
              }
              .product-id {
                font-size: 14px;
                color: #6B7280;
                font-family: 'Courier New', monospace;
                margin-bottom: 20px;
                font-weight: 600;
              }
              .qr-container {
                margin: 20px 0;
                display: flex;
                justify-content: center;
              }
              .qr-container img {
                width: 200px;
                height: 200px;
                border: 3px solid #F97316;
                border-radius: 12px;
                padding: 10px;
                background: white;
              }
              .instructions {
                font-size: 14px;
                margin-top: 20px;
                color: #374151;
                line-height: 1.6;
              }
              .instructions strong {
                display: block;
                font-size: 16px;
                margin-bottom: 8px;
                color: #1F2937;
              }
              .hash {
                font-size: 11px;
                font-family: 'Courier New', monospace;
                color: #9CA3AF;
                margin-top: 15px;
                padding: 8px;
                background: #F3F4F6;
                border-radius: 6px;
              }
              @media print {
                body {
                  padding: 10mm;
                }
                .qr-container img {
                  border-color: #000;
                }
              }
              @page {
                margin: 15mm;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">ARTIFACT</div>
              <div class="product-name">${productName}</div>
              <div class="product-id">${productId}</div>
              <div class="qr-container">
                <img src="${dataUrl}" alt="Product QR Code" />
              </div>
              <div class="instructions">
                <strong>📱 Scan to verify this product</strong>
                View artisan details, craft journey, and authenticity record
              </div>
              <div class="hash">SHA-256: ${shortenHash(productHash)}</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    img.onerror = () => {
      console.error('Failed to load QR code for printing');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };
  
  const handleDownloadQR = () => {
    // Get the SVG element and convert it to canvas
    const svgElement = document.querySelector('#qr-canvas') as unknown as SVGSVGElement;
    if (!svgElement) {
      console.error('QR code SVG not found');
      return;
    }

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get SVG dimensions
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Set canvas size to match SVG
      canvas.width = svgElement.width.baseVal.value;
      canvas.height = svgElement.height.baseVal.value;

      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Artifact_QR_${productId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    img.onerror = () => {
      console.error('Failed to load QR code image');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className="space-y-6 py-4">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="grid h-24 w-24 animate-pop place-items-center rounded-full bg-emerald-600 text-white">
          <Check size={56} />
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#3B2418]">Your craft is now live!</h1>
        <p className="mt-2 text-stone-600">Your product has been successfully published.</p>
      </div>

      {/* Marketplace Cards */}
      <div className="space-y-3">
        {/* ONDC Card */}
        <div className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-2">
              <img 
                src="/src/ondchvv_d4-removebg-preview.png" 
                alt="Open Network for Digital Commerce" 
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900">Open Network for Digital Commerce</h3>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Published
                </span>
                {ondc && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      ondc.source === 'offline-fallback' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {SOURCE_LABEL[ondc.source]}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500 uppercase tracking-wide font-semibold">ONDC Network</p>
              <p className="mt-1 text-sm text-stone-600">Product listed on national digital commerce platform</p>
              {ondc?.catalogId && (
                <p className="mt-1 text-xs text-stone-500">on_search catalog {ondc.catalogId}</p>
              )}
              {ondcUrl && (
                <a
                  href={ondcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View Listing <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* GeM Card */}
        <div className="rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-2">
              <img 
                src="/src/gem-Photoroom.png" 
                alt="Government e-Marketplace" 
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900">Government e-Marketplace</h3>
                {gemReady ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    {GEM_PACKET_BADGE}
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-600">
                    No packet generated yet
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500 uppercase tracking-wide font-semibold">GeM Portal</p>
              <p className="mt-1 text-sm text-stone-600">
                {gemReady
                  ? 'Upload the packet by hand: 5-stage dashboard form, then GeM Admin approval (3-day TAT).'
                  : 'Generate the upload packet from the publish flow — GeM has no listing API.'}
              </p>
              {gemReady && onDownloadGemPacket && (
                <button
                  // In-flight guard (#205): rapid taps burned the 10/hr packet
                  // rate limit; also honest loading feedback on a slow network.
                  disabled={downloading}
                  aria-busy={downloading}
                  onClick={() => {
                    setDownloading(true);
                    onDownloadGemPacket()
                      .catch((error: unknown) => {
                        alert(error instanceof Error ? error.message : 'Unable to download the GeM packet');
                      })
                      .finally(() => setDownloading(false));
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-60"
                >
                  {downloading ? 'Downloading…' : 'Download GeM packet'}{' '}
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product ID */}
      <div className="rounded-xl border-2 border-[#E8D7C3] bg-white p-4 text-center">
        <p className="text-sm font-semibold text-stone-600">Product ID</p>
        <p className="mt-1 font-mono text-lg font-bold text-[#3B2418]">{productId}</p>
        <p className="mt-2 text-sm font-semibold text-emerald-700">Ready to receive orders</p>
      </div>

      {/* Digital Craft Passport / QR Code */}
      <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <QrCode size={24} className="text-orange-600" />
          <h2 className="text-xl font-bold text-[#3B2418]">Digital Craft Passport</h2>
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center rounded-xl bg-stone-50 p-4">
          <QRCodeSVG 
            id="qr-canvas"
            value={verificationUrl}
            size={200}
            level="H"
            includeMargin
          />
        </div>
        
        {/* Verification URL */}
        <div className="mt-4 rounded-lg bg-stone-50 p-3">
          <p className="text-xs font-semibold text-stone-500 mb-1">Verification URL</p>
          <p className="break-all text-xs font-mono text-stone-700">{verificationUrl}</p>
        </div>
        
        {/* Hash */}
        <div className="mt-3 rounded-lg bg-orange-50 p-3">
          <p className="text-xs font-semibold text-orange-900 mb-1">SHA-256 Hash</p>
          <p className="font-mono text-xs text-orange-700">{shortenHash(productHash)}</p>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrintQR}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-stone-300 bg-white py-3 font-semibold text-stone-900 hover:bg-stone-50 active:scale-95 transition-transform"
          >
            <Printer size={18} />
            Print QR
          </button>
          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-orange-300 bg-orange-50 py-3 font-semibold text-orange-900 hover:bg-orange-100 active:scale-95 transition-transform"
          >
            <Download size={18} />
            Save QR
          </button>
        </div>
        
        {/* Instructions */}
        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold mb-1">📱 Attach this QR to your product</p>
          <p className="text-xs text-emerald-800">
            Print this QR and attach it to your product or packaging. 
            Buyers can scan it to view the artisan, craft story, WIP journey and product verification record.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={onViewProducts}
          className="w-full rounded-full bg-orange-600 py-4 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform"
        >
          Go to My Products
        </button>
        <button
          onClick={onViewMarketplace}
          className="w-full rounded-full border-2 border-stone-300 bg-white py-4 font-bold text-stone-900 hover:bg-stone-50 active:scale-95 transition-transform"
        >
          View Marketplace
        </button>
      </div>
    </div>
  );
}
