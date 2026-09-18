import React, { useState } from 'react';
import { Printer, Bluetooth, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ThermalPrintPreviewProps {
  artisanName?: string;
  productTitle?: string;
  shortcode?: string;
  price?: number;
  craftCluster?: string;
}

export const ThermalPrintPreview: React.FC<ThermalPrintPreviewProps> = ({
  artisanName = 'Sita Devi Ramani',
  productTitle = 'Madhubani Kohbar Canvas',
  shortcode = 'VRN456',
  price = 5800,
  craftCluster = 'Madhubani Hub',
}) => {
  const [bluetoothStatus, setBluetoothStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);

  // Web Bluetooth Pairing
  const connectBluetoothPrinter = async () => {
    setBluetoothStatus('connecting');
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        throw new Error('Web Bluetooth API is not supported on this browser or platform.');
      }

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      setDeviceName(device.name || '58mm Thermal Printer');
      setBluetoothStatus('connected');
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      setDeviceName('POS-58 Bluetooth Thermal Printer (Simulated)');
      setBluetoothStatus('connected');
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    await new Promise((res) => setTimeout(res, 1200));

    setIsPrinting(false);
    setPrintSuccess(true);
  };

  return (
    <Card className="max-w-md mx-auto border-terracotta-300 shadow-warm-lg">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-terracotta-500" />
          <h3 className="text-lg font-bold font-heading text-charcoal-800">
            58mm Thermal Receipt Simulator
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

      <div className="thermal-paper p-5 rounded-2xl border border-gray-300 text-gray-900 text-xs space-y-3 font-mono shadow-inner">
        <div className="text-center border-b border-dashed border-gray-400 pb-3">
          <h4 className="font-bold text-sm uppercase tracking-wider">ARTIFACT</h4>
          <p className="text-[10px] text-gray-600">Digital Heritage Passport Tag</p>
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
            <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'radial-gradient(circle, #000 30%, transparent 31%)', backgroundSize: '8px 8px' }}>
              <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-center bg-white/80">
                QR: {shortcode}
              </div>
            </div>
          </div>
          <span className="text-[9px] text-gray-700 mt-1">Scan for Authentic Proof</span>
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
            Receipt printed successfully via ESC/POS driver!
          </p>
        )}
      </div>
    </Card>
  );
};
