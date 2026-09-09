'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DeviceOrientationState {
  isSupported: boolean;
  permissionGranted: boolean;
  alpha: number | null; // Compass heading (0-360 deg)
  beta: number | null;  // Front-to-back tilt / Pitch (-180 to 180 deg)
  gamma: number | null; // Left-to-right tilt / Roll (-90 to 90 deg)
  absoluteTilt: number; // Combined tilt angle in degrees
  isLevel: boolean;     // True if absoluteTilt <= maxTiltThreshold (default 1.5 deg)
  attemptCount: number; // Number of failed capture attempts
  canBypass: boolean;   // True if attemptCount >= 3 (enables manual bypass toggle)
  isBypassed: boolean;  // User explicitly bypassed spirit level constraint
}

export interface UseDeviceOrientationOptions {
  maxTiltThreshold?: number; // Default: 1.5 degrees
  bypassAttemptThreshold?: number; // Default: 3 attempts
}

/**
 * Artify Bharat - DeviceOrientation Gyroscope Spirit Level Hook
 * Enforces camera alignment (tilt <= 1.5°) before enabling the shutter button
 * to guarantee professional, non-skewed 1:1 catalog photography.
 * Offers manual bypass after 3 failed attempts as per SIH specification.
 */
export function useDeviceOrientation(options: UseDeviceOrientationOptions = {}) {
  const { maxTiltThreshold = 1.5, bypassAttemptThreshold = 3 } = options;

  const [state, setState] = useState<DeviceOrientationState>({
    isSupported: false,
    permissionGranted: false,
    alpha: null,
    beta: null,
    gamma: null,
    absoluteTilt: 0,
    isLevel: true, // Default to true if sensor unavailable
    attemptCount: 0,
    canBypass: false,
    isBypassed: false,
  });

  const requestOrientationPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    // iOS 13+ DeviceOrientationEvent.requestPermission
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        const granted = response === 'granted';
        setState((prev) => ({ ...prev, permissionGranted: granted }));
        return granted;
      } catch (err) {
        console.warn('[DeviceOrientation] Permission request rejected:', err);
        return false;
      }
    }

    setState((prev) => ({ ...prev, permissionGranted: true }));
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'DeviceOrientationEvent' in window;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) {
      // If hardware has no gyroscope, default to level and allow bypass
      setState((prev) => ({ ...prev, isLevel: true, canBypass: true }));
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;   // Pitch (-180 to 180)
      const gamma = event.gamma; // Roll (-90 to 90)
      const alpha = event.alpha; // Yaw (0 to 360)

      if (beta !== null && gamma !== null) {
        // Compute Euclidean tilt deviation from perpendicular 90° portrait or flat plane
        // When holding phone upright: beta ~ 90°, gamma ~ 0°
        // When pointing phone down at table/loom: beta ~ 0°, gamma ~ 0°
        const pitchDev = Math.min(Math.abs(beta), Math.abs(Math.abs(beta) - 90));
        const rollDev = Math.abs(gamma);
        const combinedTilt = Math.sqrt(pitchDev * pitchDev + rollDev * rollDev);

        const isCurrentlyLevel = combinedTilt <= maxTiltThreshold;

        setState((prev) => ({
          ...prev,
          alpha,
          beta,
          gamma,
          absoluteTilt: Math.round(combinedTilt * 10) / 10,
          isLevel: isCurrentlyLevel || prev.isBypassed,
          permissionGranted: true,
        }));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [maxTiltThreshold]);

  // Record an attempt when user tries to snap while unlevel
  const recordFailedAttempt = useCallback(() => {
    setState((prev) => {
      const newAttempts = prev.attemptCount + 1;
      const canBypass = newAttempts >= bypassAttemptThreshold;
      return {
        ...prev,
        attemptCount: newAttempts,
        canBypass,
      };
    });
  }, [bypassAttemptThreshold]);

  // Toggle manual bypass
  const toggleBypass = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isBypassed: !prev.isBypassed,
      isLevel: !prev.isBypassed ? true : prev.absoluteTilt <= maxTiltThreshold,
    }));
  }, [maxTiltThreshold]);

  const resetAttempts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      attemptCount: 0,
      canBypass: false,
      isBypassed: false,
      isLevel: prev.absoluteTilt <= maxTiltThreshold,
    }));
  }, [maxTiltThreshold]);

  return {
    ...state,
    requestOrientationPermission,
    recordFailedAttempt,
    toggleBypass,
    resetAttempts,
  };
}
