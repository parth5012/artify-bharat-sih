'use client';
import { useState, useEffect } from 'react';
import { Check, Loader2, ExternalLink, Printer, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getVerificationUrl, shortenHash } from '@/lib/hash';

type PublishingStep = 
  | 'registering'
  | 'publishing-ondc'
  | 'publishing-gem'
  | 'finalizing'
  | 'complete'
  | 'error';

interface PublishingFlowProps {
  onComplete: () => void;
  onError?: (error: string) => void;
}

export function PublishingFlow({ onComplete, onError }: PublishingFlowProps) {
  const [step, setStep] = useState<PublishingStep>('registering');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sequence = async () => {
      try {
        // Step 1: Register product
        await delay(1500);
        setCompletedSteps(prev => [...prev, 'registered']);
        
        await delay(500);
        setCompletedSteps(prev => [...prev, 'photos']);
        
        // Step 2: Publish to ONDC
        await delay(800);
        setStep('publishing-ondc');
        setCompletedSteps(prev => [...prev, 'ondc']);
        
        // Step 3: Publish to GeM
        await delay(1200);
        setStep('publishing-gem');
        setCompletedSteps(prev => [...prev, 'gem']);
        
        // Step 4: Finalize
        await delay(800);
        setStep('finalizing');
        setCompletedSteps(prev => [...prev, 'available']);
        
        // Complete
        await delay(500);
        setStep('complete');
        onComplete();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Publishing failed';
        setError(errorMsg);
        setStep('error');
        onError?.(errorMsg);
      }
    };

    sequence();
  }, [onComplete, onError]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const isStepComplete = (stepName: string) => completedSteps.includes(stepName);
  const isStepActive = (stepName: string) => {
    const currentIndex = completedSteps.length;
    const steps = ['registered', 'photos', 'ondc', 'gem', 'available'];
    return steps[currentIndex] === stepName;
  };

  if (step === 'error') {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
        <div className="w-full space-y-6 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red-100 text-red-600">
            <span className="text-4xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Publishing failed</h2>
            <p className="mt-2 text-stone-600">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
            <div className="h-32 w-32 rounded-full border-4 border-orange-200 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              {step === 'complete' ? (
                <Check size={48} className="text-emerald-600 animate-bounce" />
              ) : (
                <Loader2 size={48} className="animate-spin text-orange-600" />
              )}
            </div>
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[#3B2418]">
            {step === 'complete' ? '🎉 Your craft is now live!' : 'Taking your craft to market'}
          </h1>
          <p className="mt-2 text-stone-600">
            {step === 'complete' 
              ? 'Your product has been successfully published.' 
              : 'Your product is being published...'}
          </p>
        </div>

        {/* Publishing Steps Checklist */}
        <div className="space-y-3 rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-lg">
          <PublishingStepItem
            label="Product registered"
            completed={isStepComplete('registered')}
            active={isStepActive('registered')}
          />
          <PublishingStepItem
            label="Photos & product details saved"
            completed={isStepComplete('photos')}
            active={isStepActive('photos')}
          />
          <PublishingStepItem
            label="Publishing to ONDC Network"
            completed={isStepComplete('ondc')}
            active={isStepActive('ondc')}
            logo="/logos/ondc-logo.png"
            logoAlt="ONDC"
          />
          <PublishingStepItem
            label="Listing on GeM"
            completed={isStepComplete('gem')}
            active={isStepActive('gem')}
            logo="/logos/gem-logo.png"
            logoAlt="GeM"
          />
          <PublishingStepItem
            label="Making your product available to buyers"
            completed={isStepComplete('available')}
            active={isStepActive('available')}
          />
        </div>
      </div>
    </div>
  );
}

interface PublishingStepItemProps {
  label: string;
  completed: boolean;
  active: boolean;
  logo?: string;
  logoAlt?: string;
}

function PublishingStepItem({ label, completed, active, logo, logoAlt }: PublishingStepItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`
        flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all
        ${completed 
          ? 'bg-emerald-600 text-white' 
          : active 
            ? 'border-2 border-orange-600 bg-orange-50' 
            : 'border-2 border-stone-300 bg-white'}
      `}>
        {completed && <Check size={18} className="animate-pop" />}
        {active && !completed && logo && (
          <img src={logo} alt={logoAlt} className="h-5 w-5 object-contain animate-pulse" />
        )}
        {active && !completed && !logo && (
          <div className="h-2 w-2 rounded-full bg-orange-600 animate-ping" />
        )}
      </div>
      <p className={`
        text-sm transition-all flex-1
        ${completed ? 'font-semibold text-stone-900' : active ? 'font-semibold text-orange-600' : 'text-stone-500'}
      `}>
        {label}
      </p>
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
  gemUrl?: string;
}

export function MarketplaceSuccess({
  productId,
  productName,
  productHash,
  onViewProducts,
  onViewMarketplace,
  ondcUrl,
  gemUrl,
}: MarketplaceSuccessProps) {
  const verificationUrl = getVerificationUrl(productId);
  
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <img 
                src="/logos/ondc-logo.png" 
                alt="ONDC" 
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = 'flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600';
                    parent.innerHTML = '<span class="text-2xl font-extrabold text-white">ONDC</span>';
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900">ONDC Network</h3>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Published
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">Ready for buyer orders</p>
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <img 
                src="/logos/gem-logo.png" 
                alt="GeM" 
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = 'flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 via-green-400 to-blue-400';
                    parent.innerHTML = '<span class="text-2xl font-extrabold text-white drop-shadow-md">GeM</span>';
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900">Government e-Marketplace</h3>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Listed
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">Available for government buyers</p>
              {gemUrl && (
                <a
                  href={gemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  View Listing <ExternalLink size={14} />
                </a>
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
