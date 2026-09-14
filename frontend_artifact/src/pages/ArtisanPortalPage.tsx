import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Camera, Mic, IndianRupee, Printer, HardDrive, CheckCircle2, UserRound } from 'lucide-react';
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
import { registerOrLoginArtisan, type ArtisanSession } from '../api/authApi';

interface ArtisanPortalPageProps {
  currentRole: ArtisanRole;
  onRoleChange: (role: ArtisanRole) => void;
}

export const ArtisanPortalPage: React.FC<ArtisanPortalPageProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const navigate = useNavigate();

  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; cluster: string } | null>(null);
  const [activeStep, setActiveStep] = useState<'dashboard' | 'capture' | 'voice' | 'profile' | 'pricing' | 'print' | 'drafts'>('dashboard');
  const [selectedProductCode, setSelectedProductCode] = useState<string>('VRN456');
  const [voiceExtraction, setVoiceExtraction] = useState<VoiceCatalogExtraction | null>(null);
  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfileDraft | null>(null);
  const [artisanSession, setArtisanSession] = useState<ArtisanSession | null>(null);
  const [profileAuthError, setProfileAuthError] = useState<string | null>(null);

  const selectedProduct = MOCK_PRODUCTS.find((p) => p.shortcode === selectedProductCode) || MOCK_PRODUCTS[0];

  const handleCaptureComplete = async (imageDataUrl: string, tiltVerified: boolean) => {
    await saveOfflineDraft({
      id: `draft-${Date.now()}`,
      title: 'Banarasi Zari Handloom Draft',
      craftType: 'Banarasi Brocade',
      wipPhotoDataUrl: imageDataUrl,
      gpsCoords: gpsData ? { lat: gpsData.lat, lng: gpsData.lng } : undefined,
      tiltVerified,
      createdAt: new Date().toISOString(),
      synced: false,
    });

    setActiveStep('voice');
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
        </>
      )}

      {activeStep === 'capture' && (
        <div className="space-y-6">
          <LocationStatus onLocationCaptured={(coords) => setGpsData(coords)} />
          <CameraStudio onCaptureComplete={handleCaptureComplete} />
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
                window.localStorage.setItem(
                  `artify-artisan-profile-${profile.phone.replace(/\D/g, '')}`,
                  JSON.stringify(profile),
                );
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
            <Button variant="gold" size="lg" onClick={() => setActiveStep('pricing')}>
              Continue to Fair Wage Pricing
            </Button>
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

      {activeStep === 'drafts' && (
        <div className="space-y-6">
          <OfflineDraftManager />
        </div>
      )}
    </div>
  );
};
