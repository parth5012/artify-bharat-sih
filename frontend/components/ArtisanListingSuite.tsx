'use client';

import React, { useState } from 'react';
import { CameraCapture } from './CameraCapture';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useGeolocation } from '../hooks/useGeolocation';
import { useThermalPrinter } from '../hooks/useThermalPrinter';
import { useOfflineDrafts } from '../hooks/useOfflineDrafts';
import { ArtifyApiClient, FairWageCalculationResult } from '../utils/apiClient';
import { CapturedImageResult } from '../utils/camera';

export const ArtisanListingSuite: React.FC = () => {
  // State for Listing Data
  const [title, setTitle] = useState<string>('Hand-Woven Banarasi Pure Silk Brocade Shawl');
  const [craftCategory, setCraftCategory] = useState<string>('handloom');
  const [stateCode, setStateCode] = useState<string>('HR');
  const [rawMaterialCost, setRawMaterialCost] = useState<number>(450);
  const [laborHours, setLaborHours] = useState<number>(8);
  const [isGiTagged, setIsGiTagged] = useState<boolean>(true);
  const [artisanName, setArtisanName] = useState<string>('Radha Devi');

  // Captured Media & Metadata
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedImageResult | null>(null);
  const [pricingResult, setPricingResult] = useState<FairWageCalculationResult | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Native Browser API Hooks
  const {
    isRecording,
    liveTranscript,
    elapsedSeconds,
    recordingResult,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({ dialectCode: 'hi-IN' });

  const {
    location,
    isLoading: isGeoLoading,
    fetchCoordinates,
  } = useGeolocation(true);

  const {
    printPassport,
    isPrinting,
    statusMessage: printStatus,
    isBluetoothSupported,
  } = useThermalPrinter();

  const {
    drafts,
    isOnline,
    pendingCount,
    saveDraft,
    syncPendingDrafts,
  } = useOfflineDrafts(async (draft) => {
    // Simulated sync callback sending draft to FastAPI backend
    return { serverProductId: `prod_${Date.now()}` };
  });

  // Calculate Pricing via FastAPI Backend
  const handleCalculatePrice = async () => {
    setIsCalculatingPrice(true);
    try {
      const res = await ArtifyApiClient.calculateFairPrice({
        raw_material_cost: rawMaterialCost,
        labor_hours: laborHours,
        state_code: stateCode,
        is_gi_tagged: isGiTagged,
        craft_category: craftCategory,
        visual_complexity: 0.85,
      });
      setPricingResult(res);
    } catch (err: any) {
      alert(`Pricing Calculation Error: ${err.message}`);
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Save to IndexedDB
  const handleSaveDraftOffline = async () => {
    try {
      await saveDraft({
        title,
        description: liveTranscript || recordingResult?.transcript || 'Authentic handcrafted piece',
        craftCategory,
        rawMaterialCost,
        laborHours,
        stateCode,
        isGiTagged,
        calculatedPrice: pricingResult?.fair_retail_price || 0,
        voiceTranscript: liveTranscript || recordingResult?.transcript,
        imageBlobBase64: capturedPhoto?.dataUrl,
        provenanceCoordinates: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracyMeters: location.accuracyMeters,
              timestamp: location.timestamp,
              formattedCoordinates: location.formattedCoordinates,
            }
          : undefined,
      });
      alert('Draft saved locally in IndexedDB (artify_offline_db)!');
    } catch (err: any) {
      alert(`Error saving draft: ${err.message}`);
    }
  };

  // Print 58mm Thermal Ticket via Bluetooth
  const handlePrintTicket = async () => {
    const shortcode = 'A7X-9B2';
    await printPassport({
      itemTitle: title,
      artisanName: artisanName,
      clusterName: 'Varanasi Handloom Cluster',
      state: stateCode === 'HR' ? 'Haryana' : 'Uttar Pradesh',
      giTagName: isGiTagged ? 'Banarasi Brocade (GI Reg #39)' : undefined,
      verificationShortcode: shortcode,
      fairPriceInr: pricingResult?.fair_retail_price || 1250,
      statutoryWageInr: pricingResult?.cost_breakdown.calculated_fair_wage || 680,
      dropoffTrackingPin: '549210',
    });
  };

  // Trigger WhatsApp Meta Graph API alert
  const handleSendWhatsAppNotification = async () => {
    setNotificationStatus('Sending WhatsApp notification...');
    try {
      const res = await ArtifyApiClient.sendWhatsAppAlert({
        recipient_phone: '+919876543210',
        message_body: `Namaste ${artisanName}! Your craft '${title}' is priced at ₹${pricingResult?.fair_retail_price || 1250}. Verification shortcode is [A7X-9B2]. Please drop off at your nearest CSC with PIN 549210.`,
        alert_type: 'FIRST_MILE_DROPOFF',
        order_id: 'ORD-2026-9011',
        tracking_pin: '549210',
      });
      setNotificationStatus(`WhatsApp Alert Sent (${res.status}) - ID: ${res.message_id || 'N/A'}`);
    } catch (err: any) {
      setNotificationStatus(`WhatsApp Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto mb-8 bg-gradient-to-r from-amber-900/40 via-orange-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg">
              SIH PS 26090
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'}`}>
              {isOnline ? '● Online (Auto-Sync Active)' : '○ Offline Mode (IndexedDB Active)'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
            Artify Bharat <span className="text-amber-400 font-serif italic">Artisan Digital Studio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browser-Native Integration Suite: Camera, Dialect Voice NLP, 58mm Bluetooth Printing, GPS Provenance & Fair-Wage Engine.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-right">
            <p className="text-xs text-slate-400">Cached Offline Drafts</p>
            <p className="text-lg font-bold text-amber-400">{drafts.length} ({pendingCount} pending)</p>
          </div>
          {pendingCount > 0 && isOnline && (
            <button
              onClick={syncPendingDrafts}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media & Voice Capture (Native Browser APIs) */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Camera Capture */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>📷</span> 1. MediaDevices 1:1 Camera
              </h2>
              <span className="text-xs text-slate-400">navigator.mediaDevices</span>
            </div>
            <CameraCapture onCaptureComplete={(img) => setCapturedPhoto(img)} />
          </div>

          {/* 2. "Ask Dadi" Regional Dialect Voice Recorder */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🎙️</span> 2. "Ask Dadi" Voice Helper
              </h2>
              <span className="text-xs text-slate-400">SpeechRecognition & MediaRecorder</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
              <p className="text-xs text-slate-400 mb-1 font-semibold uppercase">Live Hindi/Bhojpuri Transcript:</p>
              <p className="text-sm text-amber-200 min-h-[48px] italic">
                {liveTranscript || recordingResult?.transcript || "Tap 'Start Recording' and speak about your craft, raw materials, and weaving time..."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={() => startRecording()}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                  Start Voice Recording
                </button>
              ) : (
                <button
                  onClick={() => stopRecording()}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <div className="w-3 h-3 bg-white"></div>
                  Stop & Process ({elapsedSeconds}s)
                </button>
              )}
            </div>
          </div>

          {/* 3. W3C Geolocation Provenance Lock */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>📍</span> 3. Provenance GPS Lock
              </h2>
              <button
                onClick={() => fetchCoordinates()}
                disabled={isGeoLoading}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition"
              >
                {isGeoLoading ? 'Locking GPS...' : 'Refresh GPS'}
              </button>
            </div>

            {location ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Cryptographic Coordinates Lock:</p>
                  <p className="text-sm font-mono font-bold text-emerald-400">{location.formattedCoordinates}</p>
                  <p className="text-xs text-slate-500">Accuracy: ±{location.accuracyMeters}m | Timestamp: {new Date(location.timestamp).toLocaleTimeString()}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">
                  GPS Locked
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Acquiring GPS coordinates for provenance stamp...</p>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Pricing Engine & Physical Thermal Print */}
        <div className="lg:col-span-6 space-y-6">
          {/* 4. Fair-Wage Dynamic Pricing Engine */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>⚖️</span> 4. Fair-Wage Dynamic Pricing Engine
              </h2>
              <span className="text-xs text-slate-400">FastAPI /api/v1/calculate-price</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State Wage Floor</label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="HR">Haryana (HR) - ₹85/hr</option>
                    <option value="DL">Delhi (DL) - ₹95/hr</option>
                    <option value="MH">Maharashtra (MH) - ₹82/hr</option>
                    <option value="UP">Uttar Pradesh (UP) - ₹68/hr</option>
                    <option value="BR">Bihar (BR) - ₹65/hr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Craft Category</label>
                  <select
                    value={craftCategory}
                    onChange={(e) => setCraftCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="handloom">Handloom Textile</option>
                    <option value="pottery">Terracotta / Pottery</option>
                    <option value="woodcraft">Woodcraft & Carving</option>
                    <option value="metalwork">Metalwork & Brass</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Raw Material Cost (₹)</label>
                  <input
                    type="number"
                    value={rawMaterialCost}
                    onChange={(e) => setRawMaterialCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Labor Invested (Hours)</label>
                  <input
                    type="number"
                    value={laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Geographical Indication (GI) Tag (1.15x)</span>
                <input
                  type="checkbox"
                  checked={isGiTagged}
                  onChange={(e) => setIsGiTagged(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={handleCalculatePrice}
                disabled={isCalculatingPrice}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl shadow-lg transition"
              >
                {isCalculatingPrice ? 'Calculating Wage Floor...' : 'Calculate Fair-Wage Price Breakdown'}
              </button>

              {/* Price Breakdown Card */}
              {pricingResult && (
                <div className="mt-4 p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Guaranteed Labor Wage ({laborHours}h @ ₹{pricingResult.hourly_wage_rate}/h):</span>
                    <span className="text-emerald-400 font-bold">₹{pricingResult.cost_breakdown.calculated_fair_wage}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Raw Materials Input:</span>
                    <span className="text-slate-200">₹{pricingResult.cost_breakdown.raw_material_cost}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Logistics & Packaging Overhead:</span>
                    <span className="text-slate-200">₹{pricingResult.cost_breakdown.packaging_overhead}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Artisan Net Profit Margin:</span>
                    <span className="text-amber-400 font-bold">₹{pricingResult.artisan_net_profit}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Suggested Fair Retail Price:</span>
                    <span className="text-lg font-extrabold text-amber-400">₹{pricingResult.fair_retail_price}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Bulk Wholesale Price (GeM/B2B):</span>
                    <span className="font-semibold text-slate-300">₹{pricingResult.bulk_wholesale_price}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Physical Thermal Printer & WhatsApp Alerts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🖨️</span> 5. 58mm Bluetooth Printer & WhatsApp
              </h2>
              <span className="text-xs text-slate-400">Web Bluetooth + Meta Graph API</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintTicket}
                disabled={isPrinting}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-sm rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 transition"
              >
                <span>🖨️</span>
                {isPrinting ? 'Printing...' : 'Print 58mm Passport'}
              </button>

              <button
                onClick={handleSendWhatsAppNotification}
                className="py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                <span>💬</span>
                Send WhatsApp Alert
              </button>
            </div>

            {printStatus && (
              <p className="text-xs text-amber-300/80 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                {printStatus}
              </p>
            )}

            {notificationStatus && (
              <p className="text-xs text-emerald-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                {notificationStatus}
              </p>
            )}

            {/* Save to IndexedDB Button */}
            <button
              onClick={handleSaveDraftOffline}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
            >
              💾 Save Draft Locally (IndexedDB: artify_offline_db)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
