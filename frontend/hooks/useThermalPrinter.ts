'use client';

import { useState, useCallback } from 'react';
import {
  printToBluetoothThermalPrinter,
  ThermalPrintPassportData,
} from '../utils/thermalPrinter';

export function useThermalPrinter() {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const printPassport = useCallback(
    async (data: ThermalPrintPassportData) => {
      setIsPrinting(true);
      setError(null);
      setStatusMessage('Initializing Web Bluetooth...');

      try {
        const result = await printToBluetoothThermalPrinter(data, (msg) => {
          setStatusMessage(msg);
        });
        setConnectedDevice(result.deviceName);
        setStatusMessage(`Successfully printed passport on ${result.deviceName}`);
        return result;
      } catch (err: any) {
        const message = err.message || 'Thermal printing failed.';
        setError(message);
        setStatusMessage(message);
        return null;
      } finally {
        setIsPrinting(false);
      }
    },
    []
  );

  const isBluetoothSupported =
    typeof navigator !== 'undefined' && typeof (navigator as any).bluetooth !== 'undefined';

  return {
    printPassport,
    isPrinting,
    statusMessage,
    connectedDevice,
    error,
    isBluetoothSupported,
  };
}
