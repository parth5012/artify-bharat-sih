import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface LocationStatusProps {
  onLocationCaptured?: (coords: {
    lat: number;
    lng: number;
    capturedAt: string;
    village: string;
    city: string;
    state: string;
  }) => void;
}

interface LocationAddress {
  village: string;
  city: string;
  state: string;
}

const reverseGeocode = async (lat: number, lng: number): Promise<LocationAddress> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
  );
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with HTTP ${response.status}`);
  }

  const result = await response.json() as { address?: Record<string, string> };
  const location = result.address || {};
  return {
    village: location.village || location.hamlet || location.suburb || 'Not available',
    city: location.city || location.town || location.municipality || location.county || 'Not available',
    state: location.state || 'Not available',
  };
};

export const LocationStatus: React.FC<LocationStatusProps> = ({ onLocationCaptured }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'captured' | 'error'>('idle');
  const [address, setAddress] = useState<LocationAddress | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureGPS = () => {
    setStatus('loading');
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation API is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        const timestamp = new Date(pos.timestamp || Date.now()).toISOString();
        setCoords({ lat, lng });
        setCapturedAt(timestamp);
        setStatus('captured');

        const unavailableAddress = { village: 'Not available', city: 'Not available', state: 'Not available' };

        onLocationCaptured?.({ lat, lng, capturedAt: timestamp, ...unavailableAddress });

        reverseGeocode(lat, lng).then((locationAddress) => {
          setAddress(locationAddress);
          onLocationCaptured?.({
            lat,
            lng,
            capturedAt: timestamp,
            ...locationAddress,
          });
        }).catch(() => {
          setAddress(unavailableAddress);
        });
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setStatus('error');
        const message = err.code === 1
          ? 'Allow location access in your browser, then retry GPS.'
          : err.code === 2
            ? 'Your location could not be determined. Check device location and retry GPS.'
            : 'GPS took too long to respond. Check device location and retry GPS.';
        setErrorMessage(message);
      },
      { maximumAge: 60000, timeout: 15000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    captureGPS();
  }, []);

  return (
    <div className="bg-cream-50 p-5 rounded-2xl border border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-terracotta-500" />
          <h3 className="text-base font-bold font-heading text-charcoal-800">
            GPS Location Verification
          </h3>
        </div>

        {status === 'captured' && (
          <Badge variant="verified" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            GPS Captured
          </Badge>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-3 p-3 bg-terracotta-50/60 rounded-xl text-terracotta-800 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-terracotta-500" />
          <span>Capturing your GPS location...</span>
        </div>
      )}

      {status === 'captured' && coords && (
        <div className="grid grid-cols-1 gap-3 text-xs bg-cream-200/50 p-3.5 rounded-xl border border-cream-300 sm:grid-cols-2">
          <div>
            <span className="text-charcoal-700 font-medium block">Coordinates:</span>
            <strong className="text-charcoal-800 font-mono text-sm">
              {coords.lat}° N, {coords.lng}° E
            </strong>
          </div>
          <div>
            <span className="text-charcoal-700 font-medium block">Village:</span>
            <strong className="text-terracotta-700 font-semibold">{address?.village || 'Finding location...'}</strong>
          </div>
          <div>
            <span className="text-charcoal-700 font-medium block">City / District:</span>
            <strong className="text-terracotta-700 font-semibold">{address?.city || 'Finding location...'}</strong>
          </div>
          <div>
            <span className="text-charcoal-700 font-medium block">State:</span>
            <strong className="text-terracotta-700 font-semibold">{address?.state || 'Finding location...'}</strong>
          </div>
          <div>
            <span className="text-charcoal-700 font-medium block">Captured at:</span>
            <strong className="text-charcoal-800 font-mono text-sm">{capturedAt ? new Date(capturedAt).toLocaleString('en-IN') : 'Recording...'}</strong>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={captureGPS}>
            Retry GPS
          </Button>
        </div>
      )}
    </div>
  );
};
