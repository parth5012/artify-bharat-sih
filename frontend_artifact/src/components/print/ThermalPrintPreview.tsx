import React, { useRef, useState } from 'react';
import { Printer, Bluetooth, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ThermalPrintPreviewProps {
  artisanName?: string;
  productTitle?: string;
  shortcode?: string;
  price?: number;
  craftCluster?: string;
  /** #102: real backend print assets (POST /passport/issue, GET code/verify). */
  qrSvgDataUri?: string;
  escposB64?: string;
  verificationUrl?: string;
}

/** Common BLE thermal-printer serial services (HM-10 0xFFE0 et al). */
const PRINTER_SERVICE_UUIDS = [
  '0000ffe0-0000-1000-8000-00805f9a34fb',
  '000018f0-0000-1000-8000-00805f9a34fb',
];

interface BleCharacteristic {
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue: (value: BufferSource) => Promise<void>;
}

interface BleService {
  getCharacteristics: () => Promise<BleCharacteristic[]>;
}

interface BleGatt {
  connected: boolean;
  connect: () => Promise<unknown>;
  getPrimaryServices: () => Promise<BleService[]>;
}

interface BleDevice {
  name?: string;
  gatt?: BleGatt;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const ThermalPrintPreview: React.FC<ThermalPrintPreviewProps> = ({
  artisanName = 'Sita Devi Ramani',
  productTitle = 'Madhubani Kohbar Canvas',
  shortcode = 'VRN456',
  price = 5800,
  craftCluster = 'Madhubani Hub',
  qrSvgDataUri,
  escposB64,
  verificationUrl,
}) => {
  const [bluetoothStatus, setBluetoothStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const deviceRef = useRef<BleDevice | null>(null);

  // Web Bluetooth pairing — real errors surface, never a fake Paired state.
  const connectBluetoothPrinter = async () => {
    setBluetoothStatus('connecting');
    setErrorMessage(null);
    try {
      const nav = navigator as unknown as {
        bluetooth?: {
          requestDevice: (opts: unknown) => Promise<{ name?: string; gatt?: unknown }>;
        };
      };
      if (!nav.bluetooth) {
        throw new Error('Web Bluetooth API is not supported on this browser or platform.');
      }

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      deviceRef.current = device as BleDevice;
      setDeviceName(device.name || '58mm Thermal Printer');
      setBluetoothStatus('connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bluetooth pairing failed.';
      console.warn('Bluetooth connection error:', err);
      deviceRef.current = null;
      setDeviceName(null);
      // User-cancelled chooser is not an error state.
      if (message.includes('cancelled') || message.includes('User cancelled')) {
        setBluetoothStatus('disconnected');
      } else {
        setErrorMessage(message);
        setBluetoothStatus('error');
      }
    }
  };

  const writePayloadToPrinter = async (bytes: Uint8Array): Promise<void> => {
    const device = deviceRef.current;
    const gatt = device?.gatt;
    if (!gatt) throw new Error('No Bluetooth printer connected.');
    if (!gatt.connected) await gatt.connect();
    const services = await gatt.getPrimaryServices();
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties?.write || ch.properties?.writeWithoutResponse) {
          // BLE writes must be chunked (≤512B) for thermal payloads.
          for (let i = 0; i < bytes.length; i += 512) {
            await ch.writeValue(bytes.slice(i, i + 512) as unknown as BufferSource);
          }
          return;
        }
      }
    }
    throw new Error('No writable characteristic found on this printer.');
  };

  const handleDownloadBin = () => {
    if (!escposB64) return;
    try {
      downloadBytes(base64ToBytes(escposB64), `passport-${shortcode}.bin`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Download failed.');
      setBluetoothStatus('error');
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    setErrorMessage(null);

    try {
      if (escposB64) {
        const bytes = base64ToBytes(escposB64);
        if (bluetoothStatus === 'connected') {
          await writePayloadToPrinter(bytes);
          setPrintSuccess(true);
        } else {
          // No printer paired: real fallback is the raw ESC/POS .bin file.
          downloadBytes(bytes, `passport-${shortcode}.bin`);
          setPrintSuccess(true);
        }
      } else {
        // No backend payload (preview-only product): browser print of the receipt.
        window.print();
        setPrintSuccess(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Print failed.';
      console.warn('Thermal print error:', err);
      setErrorMessage(`${message} Use Download .bin as fallback.`);
      setBluetoothStatus('error');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-terracotta-300 shadow-warm-lg">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-terracotta-500" />
          <h3 className="text-lg font-bold font-heading text-charcoal-800">
            58mm Thermal Receipt Preview
          </h3>
        </div>

        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-cream-200 text-charcoal-800 rounded-full border border-cream-300">
          58mm ESC/POS
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between p-3 bg-cream-100 rounded-xl border border-terracotta-200/60 text-xs">
        <div className="flex items-center gap-2">
          <Bluetooth className={`w-4 h-4 ${bluetoothStatus === 'connected' ? 'text-blue-600' : 'text-charcoal-700'}`} />
          <span className="font-semibold text-charcoal-800">
            {bluetoothStatus === 'connected' ? deviceName : 'Printer Disconnected'}
          </span>
        </div>

        {bluetoothStatus !== 'connected' ? (
          <Button variant="outline" size="sm" onClick={connectBluetoothPrinter}>
            Connect Bluetooth
          </Button>
        ) : (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
            Paired
          </span>
        )}
      </div>

      {bluetoothStatus === 'error' && errorMessage && (
        <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="thermal-paper p-5 rounded-2xl border border-gray-300 text-gray-900 text-xs space-y-3 font-mono shadow-inner">
        <div className="text-center border-b border-dashed border-gray-400 pb-3">
          <h4 className="font-bold text-sm uppercase tracking-wider">ARTIFY BHARAT (MoSJE)</h4>
          <p className="text-[10px] font-bold">HERITAGE DIGITAL PASSPORT</p>
          <p className="text-[9px] text-gray-700 mt-1">SIH PS 26090 • Ministry of Social Justice</p>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>DATE:</span>
            <span>{new Date().toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>PASSPORT CODE:</span>
            <strong className="text-sm font-bold">{shortcode}</strong>
          </div>
          <div className="flex justify-between">
            <span>CLUSTER:</span>
            <span>{craftCluster}</span>
          </div>
        </div>

        <div className="border-t border-b border-dashed border-gray-400 py-2 space-y-1 text-[11px]">
          <div>
            <span className="text-gray-600 block text-[9px]">PRODUCT:</span>
            <strong className="block">{productTitle}</strong>
          </div>
          <div className="mt-1">
            <span className="text-gray-600 block text-[9px]">ARTISAN:</span>
            <span>{artisanName} (Verified)</span>
          </div>
        </div>

        <div className="py-2 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-white border-2 border-black p-1 flex items-center justify-center">
            {qrSvgDataUri ? (
              <img src={qrSvgDataUri} alt={`Passport QR ${shortcode}`} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'radial-gradient(circle, #000 30%, transparent 31%)', backgroundSize: '8px 8px' }}>
                <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-center bg-white/80">
                  QR: {shortcode}
                </div>
              </div>
            )}
          </div>
          <span className="text-[9px] text-gray-700 mt-1">Scan for Authentic Proof</span>
          {verificationUrl && (
            <span className="text-[8px] text-gray-600 mt-0.5 break-all text-center">{verificationUrl}</span>
          )}
          {!qrSvgDataUri && (
            <span className="text-[8px] text-amber-700 mt-0.5">Preview mock — issue passport for live QR</span>
          )}
        </div>

        <div className="border-t border-dashed border-gray-400 pt-2 text-[11px] space-y-1">
          <div className="flex justify-between font-bold text-sm">
            <span>FAIR RETAIL:</span>
            <span>₹{price.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-[9px] text-gray-700">
            <span>DIRECT WAGE REALIZATION:</span>
            <span>84.5%</span>
          </div>
        </div>

        <div className="text-center pt-2 text-[9px] text-gray-700 border-t border-dashed border-gray-400">
          *** THANK YOU FOR SUPPORTING INDIAN ARTISANS ***
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="gold"
          size="lg"
          leftIcon={<Printer className="w-5 h-5" />}
          isLoading={isPrinting}
          onClick={handlePrint}
          className="w-full"
        >
          Print Thermal Receipt Tag (58mm)
        </Button>

        {printSuccess && (
          <p className="text-xs text-emerald-700 text-center font-semibold mt-2 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {escposB64
              ? bluetoothStatus === 'connected'
                ? 'ESC/POS payload sent to printer!'
                : 'ESC/POS .bin downloaded — copy to printer!'
              : 'Receipt sent to browser print dialog!'}
          </p>
        )}
        {escposB64 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadBin}
            className="w-full mt-2"
          >
            Download ESC/POS .bin
          </Button>
        )}
      </div>
    </Card>
  );
};
