'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getArtisanProvenanceCoordinates,
  getClusterPincodeFallback,
  ProvenanceGeoLocation,
  GeolocationFetchOptions,
} from '../utils/geolocation';

export function useGeolocation(autoFetch: boolean = false) {
  const [location, setLocation] = useState<ProvenanceGeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoordinates = useCallback(
    async (options?: GeolocationFetchOptions): Promise<ProvenanceGeoLocation | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const coords = await getArtisanProvenanceCoordinates(options);
        setLocation(coords);
        return coords;
      } catch (err: any) {
        const msg = err.message || 'Geolocation acquisition failed.';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (autoFetch) {
      fetchCoordinates();
    }
  }, [autoFetch, fetchCoordinates]);

  const applyClusterFallback = useCallback(
    (pincode: string, shgLeaderId: string, shgLeaderName: string, clusterName?: string) => {
      const fallbackLocation = getClusterPincodeFallback({
        pincode,
        shgLeaderId,
        shgLeaderName,
        clusterName,
      });
      setLocation(fallbackLocation);
      setError(null);
      return fallbackLocation;
    },
    []
  );

  return {
    location,
    isLoading,
    error,
    fetchCoordinates,
    applyClusterFallback,
    isGeolocationSupported:
      typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined',
  };
}
