import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Camera, Mic, IndianRupee, Printer, HardDrive, CheckCircle2, UserRound, Plus, MapPin, Clock3, FilePenLine, ShoppingBag } from 'lucide-react';
import { RoleSwitcher } from '../components/artisan/RoleSwitcher';
import { SoloArtisanDashboard } from '../components/artisan/SoloArtisanDashboard';
import { SHGLeaderDashboard } from '../components/artisan/SHGLeaderDashboard';
import { CameraStudio } from '../components/camera/CameraStudio';
import { VoiceRecorder } from '../components/voice/VoiceRecorder';
import { FairWageSlider } from '../components/pricing/FairWageSlider';
import { ThermalPrintPreview } from '../components/print/ThermalPrintPreview';
import { OfflineDraftManager } from '../components/offline/OfflineDraftManager';
import { VoiceProfileForm, type ArtisanProfileDraft } from '../components/artisan/VoiceProfileForm';
import { LocationStatus } from '../components/location/LocationStatus';
import { Button } from '../components/ui/Button';
import { saveOfflineDraft } from '../services/db';
import { MOCK_PRODUCTS } from '../mocks/mockData';
import type { ArtisanRole } from '../types';
import type { VoiceCatalogExtraction } from '../api/catalogApi';
import { loginArtisan, registerOrLoginArtisan, type ArtisanSession } from '../api/authApi';
import { createProductFromEvidence } from '../api/productApi';
import { ArtisanOrdersTab } from '../components/market/ArtisanOrdersTab';

interface ArtisanPortalPageProps {
  currentRole: ArtisanRole;
  onRoleChange: (role: ArtisanRole) => void;
}

export const ArtisanPortalPage: React.FC<ArtisanPortalPageProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    capturedAt: string;
    village: string;
    city: string;
    state: string;
  } | null>(null);
  const [activeStep, setActiveStep] = useState<'dashboard' | 'capture' | 'voice' | 'profile' | 'pricing' | 'print' | 'drafts' | 'orders'>('dashboard');
  const [selectedProductCode, setSelectedProductCode] = useState<string>('VRN456');
  const [voiceExtraction, setVoiceExtraction] = useState<VoiceCatalogExtraction | null>(null);
  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfileDraft | null>(null);
  const [artisanSession, setArtisanSession] = useState<ArtisanSession | null>(null);
  const [profileAuthError, setProfileAuthError] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState('Handcrafted Product');
  const [productUploadState, setProductUploadState] = useState<'idle' | 'uploading' | 'saved' | 'offline' | 'error'>('idle');
  const [productUploadError, setProductUploadError] = useState<string | null>(null);

  useEffect(() => {
    const routeState = location.state as { profile?: ArtisanProfileDraft; session?: ArtisanSession } | null;
    const restoredSession = routeState?.session;
    const restoredProfile = routeState?.profile;
    const phone = restoredSession?.phone || restoredProfile?.phone;
    const storedProfile = phone
      ? window.localStorage.getItem(`artify-artisan-profile-${phone.replace(/\D/g, '')}`)
      : null;
    const profile = restoredProfile || (storedProfile ? JSON.parse(storedProfile) as ArtisanProfileDraft : null);

    if (profile) {
      setArtisanProfile(profile);
      setActiveStep('profile');
    }
    const storedSession = window.localStorage.getItem('artify-artisan-session');
    const session = restoredSession || (storedSession ? JSON.parse(storedSession) as ArtisanSession : null);
    if (session) {
      setArtisanSession(session);
    } else if (profile?.pin && window.localStorage.getItem('artify-auth-token')) {
      loginArtisan(profile.phone, profile.pin).then((recoveredSession) => {
        setArtisanSession(recoveredSession);
        window.localStorage.setItem('artify-auth-token', recoveredSession.access_token);
        window.localStorage.setItem('artify-artisan-session', JSON.stringify(recoveredSession));
      }).catch(() => undefined);
    }
    if (routeState) {
      window.history.replaceState({}, document.title, window.location.href);
    }
    if (new URLSearchParams(location.search).get('signup') === '1') {
      setActiveStep('voice');
    }
  }, [location]);

  const selectedProduct = MOCK_PRODUCTS.find((p) => p.shortcode === selectedProductCode) || MOCK_PRODUCTS[0];

  const handleCaptureComplete = async (imageDataUrl: string, tiltVerified: boolean, capturedAt: string) => {
    if (!gpsData) {
      setProductUploadState('error');
      setProductUploadError('Capture GPS location before saving the product.');
      return;
    }

    setProductUploadState('uploading');
    setProductUploadError(null);
    try {
      const imageBlob = await fetch(imageDataUrl).then((response) => response.blob());

      try {
        await saveOfflineDraft({
          id: `draft-${Date.now()}`,
          title: productTitle || 'Handcrafted Product',
          craftType: artisanProfile?.craftType || 'handloom',
          wipPhotoDataUrl: imageDataUrl,
          gpsCoords: { lat: gpsData.lat, lng: gpsData.lng },
          tiltVerified,
          createdAt: new Date().toISOString(),
          synced: false,
          provenanceTimestamp: capturedAt,
        });
      } catch (draftError) {
        console.warn('Could not save offline product draft:', draftError);
      }

      if (!artisanSession) {
        setProductUploadState('offline');
        setProductUploadError('Product saved offline. Sign in to attach it to your backend artisan account.');
        return;
      }

      await createProductFromEvidence({
        artisanId: artisanSession.artisan_id,
        productTitle,
        craftCategory: artisanProfile?.craftType || 'handloom',
        image: imageBlob,
        gpsLatitude: gpsData.lat,
        gpsLongitude: gpsData.lng,
        provenanceTimestamp: capturedAt,
      });
      setProductUploadState('saved');
      setActiveStep('voice');
    } catch (error) {
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('NetworkError'))) {
        setProductUploadState('offline');
        setProductUploadError(null);
      } else {
        setProductUploadState('error');
        setProductUploadError(error instanceof Error ? error.message : 'Product saved offline. Server upload will retry later.');
      }
    }
  };

  const handleNavigateToPrint = (code?: string) => {
    if (code) {
      setSelectedProductCode(code);
    }
    setActiveStep('print');
  };

  return (
    <div className="space-y-6 py-4">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-cream-50 p-4 rounded-2xl border border-terracotta-200 shadow-sm">
        <div className="flex items-center gap-3">
          {activeStep !== 'dashboard' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setActiveStep('dashboard')}
            >
              Back to Dashboard
            </Button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-heading text-charcoal-900">
                Artifact Artisan Studio &amp; Provenance Hub
              </h1>
              <span className="px-2 py-0.5 bg-terracotta-100 text-terracotta-800 text-[10px] font-bold rounded-full border border-terracotta-300">
                Live Studio
              </span>
            </div>
            <p className="text-xs text-charcoal-700">
              {currentRole === 'solo' ? 'Solo Master Artisan Mode' : '50-Artisan SHG Leader Collective Hub'}
            </p>
          </div>
        </div>

        <RoleSwitcher currentRole={currentRole} onRoleChange={onRoleChange} />
      </div>

      {/* Navigation Step Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
          { id: 'capture', label: '1. Camera Studio', icon: Camera },
          { id: 'voice', label: '2. Dialect Voice', icon: Mic },
          { id: 'profile', label: '3. Artisan Profile', icon: UserRound },
          { id: 'pricing', label: '4. Fair Wage Engine', icon: IndianRupee },
          { id: 'print', label: '5. Thermal Print Tag', icon: Printer },
          { id: 'orders', label: '6. Orders', icon: ShoppingBag },
          { id: 'drafts', label: 'Offline Storage', icon: HardDrive },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeStep === step.id
                  ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                  : 'bg-cream-50 text-charcoal-700 border border-terracotta-200 hover:bg-terracotta-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {activeStep === 'dashboard' && (
        <>
          {currentRole === 'solo' ? (
            <SoloArtisanDashboard
              onNavigateToCapture={() => setActiveStep('capture')}
              onNavigateToVoice={() => setActiveStep('voice')}
              onNavigateToPricing={() => setActiveStep('pricing')}
              onNavigateToPassport={(code) => navigate(`/buyer/passport/${code}`)}
              onNavigateToPrint={handleNavigateToPrint}
              onNavigateToDrafts={() => setActiveStep('drafts')}
            />
          ) : (
            <SHGLeaderDashboard
              onNavigateToCapture={() => setActiveStep('capture')}
              onNavigateToPassport={(code) => navigate(`/buyer/passport/${code}`)}
              onNavigateToPrint={handleNavigateToPrint}
            />
          )}
          <div className="flex flex-col gap-3 rounded-2xl border border-terracotta-200 bg-cream-50 p-4 shadow-warm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-charcoal-900">Add a new product</h2>
              <p className="text-xs text-charcoal-700">Capture a live photo with GPS and UTC timestamp for verification.</p>
            </div>
            <Button
              variant="gold"
              leftIcon={<Plus className="h-5 w-5" />}
              onClick={() => {
                setProductUploadState('idle');
                setProductUploadError(null);
                setActiveStep('capture');
              }}
            >
              Add Product
            </Button>
          </div>
        </>
      )}

      {activeStep === 'capture' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-terracotta-200 bg-cream-50 p-5 shadow-warm">
            <label className="block text-sm font-semibold text-charcoal-800">
              Product name
              <input
                value={productTitle}
                onChange={(event) => setProductTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-terracotta-200 bg-white p-3 outline-none focus:border-terracotta-500"
                placeholder="Enter product name"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-700">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-terracotta-500" /> GPS captured before photo</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4 text-terracotta-500" /> UTC timestamp on confirmation</span>
            </div>
            {productUploadState === 'uploading' && <p className="mt-3 text-sm text-terracotta-700">Sending image to AI Studio and saving product evidence...</p>}
            {productUploadState === 'saved' && <p className="mt-3 text-sm text-emerald-700">Product evidence saved and connected to the backend.</p>}
            {productUploadState === 'offline' && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Product saved offline. Start the backend to sync it automatically.</p>}
            {productUploadError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{productUploadError}</p>}
          </div>
          <LocationStatus onLocationCaptured={(coords) => setGpsData(coords)} />
          <CameraStudio location={gpsData} onCaptureComplete={handleCaptureComplete} />
        </div>
      )}

      {activeStep === 'voice' && (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <VoiceRecorder onStoryExtracted={setVoiceExtraction} />
          <VoiceProfileForm
            key={voiceExtraction ? 'voice-profile-filled' : 'manual-profile'}
            extraction={voiceExtraction}
            dialect={voiceExtraction?.dialect}
            onSubmitted={(profile) => {
              setProfileAuthError(null);
              return registerOrLoginArtisan({
                name: profile.name,
                phone: profile.phone,
                pin: profile.pin,
                primary_dialect: profile.dialect || undefined,
              }).then((session) => {
                setArtisanProfile(profile);
                setArtisanSession(session);
                window.localStorage.setItem('artify-auth-token', session.access_token);
                window.localStorage.setItem('artify-artisan-session', JSON.stringify(session));
                window.localStorage.setItem(
                  `artify-artisan-profile-${profile.phone.replace(/\D/g, '')}`,
                  JSON.stringify(profile),
                );
                window.dispatchEvent(new Event('artify-auth-change'));
                setActiveStep('profile');
              }).catch((error: unknown) => {
                setProfileAuthError(error instanceof Error ? error.message : 'Could not create or sign in to this profile.');
              });
            }}
          />
        </div>
      )}

      {activeStep === 'profile' && artisanProfile && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-warm">
            <div className="mb-4 flex items-center gap-3 border-b border-emerald-200 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            {profileAuthError && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{profileAuthError}</p>
            )}
            {artisanSession && (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800">
                Account ready. You are signed in as {artisanSession.name}.
              </p>
            )}
              <div>
                <h2 className="text-xl font-bold text-charcoal-900">Profile Saved</h2>
                <p className="text-xs text-charcoal-700">This artisan profile is saved for {artisanProfile.phone}.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><span className="block text-xs text-charcoal-600">Name</span><strong>{artisanProfile.name}</strong></div>
              <div><span className="block text-xs text-charcoal-600">Mobile</span><strong>{artisanProfile.phone}</strong></div>
              <div><span className="block text-xs text-charcoal-600">Mother Tongue</span><strong>{artisanProfile.dialect || 'Not provided'}</strong></div>
              <div><span className="block text-xs text-charcoal-600">Craft</span><strong>{artisanProfile.craftTitle || artisanProfile.craftType || 'Not provided'}</strong></div>
              <div><span className="block text-xs text-charcoal-600">Material</span><strong>{artisanProfile.material || 'Not provided'}</strong></div>
              <div><span className="block text-xs text-charcoal-600">Labor Days</span><strong>{artisanProfile.laborDays || 'Not provided'}</strong></div>
            </div>
            {artisanProfile.description && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-charcoal-800">
                {artisanProfile.description}
              </p>
            )}
          </div>
          <div className="text-center">
            <div className="rounded-2xl border border-terracotta-200 bg-cream-50 p-5 text-left shadow-warm">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-charcoal-900">Add your first product</h3>
                <p className="text-xs text-charcoal-700">Choose how you want to start your product listing.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveStep('capture')}
                  className="rounded-xl border border-terracotta-200 bg-white p-4 text-left transition-colors hover:border-terracotta-500 hover:bg-terracotta-50"
                >
                  <Camera className="mb-2 h-5 w-5 text-terracotta-600" />
                  <strong className="block text-sm text-charcoal-900">Capture product</strong>
                  <span className="mt-1 block text-xs text-charcoal-700">Take a verified photo with GPS.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('capture')}
                  className="rounded-xl border border-terracotta-200 bg-white p-4 text-left transition-colors hover:border-terracotta-500 hover:bg-terracotta-50"
                >
                  <FilePenLine className="mb-2 h-5 w-5 text-terracotta-600" />
                  <strong className="block text-sm text-charcoal-900">Enter product details</strong>
                  <span className="mt-1 block text-xs text-charcoal-700">Name the product before adding evidence.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('drafts')}
                  className="rounded-xl border border-terracotta-200 bg-white p-4 text-left transition-colors hover:border-terracotta-500 hover:bg-terracotta-50"
                >
                  <HardDrive className="mb-2 h-5 w-5 text-terracotta-600" />
                  <strong className="block text-sm text-charcoal-900">Continue offline draft</strong>
                  <span className="mt-1 block text-xs text-charcoal-700">Continue a product saved offline.</span>
                </button>
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => setActiveStep('pricing')}>
                  Continue to Fair Wage Pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 'pricing' && (
        <div className="space-y-6">
          <FairWageSlider
            craftType={artisanProfile?.craftType || voiceExtraction?.extractedCraftType}
            extractedTitle={artisanProfile?.craftTitle || voiceExtraction?.extractedTitle}
            estimatedLaborDays={artisanProfile?.laborDays || voiceExtraction?.estimatedLaborDays}
          />
          <div className="text-center">
            <Button variant="gold" size="lg" onClick={() => setActiveStep('print')}>
              Generate Passport &amp; Print Thermal Tag
            </Button>
          </div>
        </div>
      )}

      {activeStep === 'print' && (
        <div className="space-y-6">
          <ThermalPrintPreview
            artisanName={artisanProfile?.name || selectedProduct.artisanName}
            productTitle={artisanProfile?.craftTitle || selectedProduct.title}
            shortcode={selectedProduct.shortcode}
            price={selectedProduct.pricing.retailPrice}
            craftCluster={`${selectedProduct.cluster} Cluster`}
          />
        </div>
      )}

      {activeStep === 'orders' && (
        <div className="space-y-6">
          <ArtisanOrdersTab />
        </div>
      )}

      {activeStep === 'drafts' && (
        <div className="space-y-6">
          <OfflineDraftManager />
        </div>
      )}
    </div>
  );
};
