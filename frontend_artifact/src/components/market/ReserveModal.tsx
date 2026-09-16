import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { reserveProduct } from '../../api/marketplaceApi';
import { setBuyerPhone, getBuyerPhone } from '../../services/cart';
import type { CraftProduct, Reservation } from '../../types';

export const MOCK_OTP = '123456';

interface ReserveModalProps {
  isOpen: boolean;
  product: CraftProduct | null;
  initialQty?: number;
  buyerArtisanId?: string | null;
  onClose: () => void;
  onSuccess: (reservation: Reservation) => void;
}

type Step = 'details' | 'otp' | 'done';

export const ReserveModal: React.FC<ReserveModalProps> = ({
  isOpen,
  product,
  initialQty = 1,
  buyerArtisanId,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('details');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhoneInput] = useState('');
  const [qty, setQty] = useState(initialQty);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setError(null);
      setOtp('');
      setReservation(null);
      setQty(initialQty);
      setBuyerPhoneInput(getBuyerPhone() ?? '');
      setBuyerName('');
    }
  }, [isOpen, initialQty, product?.id]);

  if (!product) return null;

  const available = product.stockQty - product.reservedQty;
  const isOwn = !!buyerArtisanId && product.artisanId === buyerArtisanId;
  const phoneValid = /^[6-9]\d{9}$/.test(buyerPhone.trim());

  const handleDetailsNext = () => {
    setError(null);
    if (isOwn) {
      setError('Artisans cannot reserve their own listing.');
      return;
    }
    if (!buyerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!phoneValid) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (qty < 1 || qty > available) {
      setError(`Only ${available} unit(s) available.`);
      return;
    }
    setStep('otp');
  };

  const handleConfirmOtp = async () => {
    setError(null);
    if (otp.trim() !== MOCK_OTP) {
      setError('Incorrect OTP. Hint (mock): 123456.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await reserveProduct({
        productId: product.id,
        qty,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        otp: otp.trim(),
        buyerArtisanId: buyerArtisanId ?? undefined,
      });
      setBuyerPhone(buyerPhone.trim());
      try {
        const raw = window.localStorage.getItem('artify-mock-reservations');
        const list = raw ? (JSON.parse(raw) as Reservation[]) : [];
        list.push(result);
        window.localStorage.setItem('artify-mock-reservations', JSON.stringify(list));
      } catch {
        // best-effort mock mirror
      }
      setReservation(result);
      setStep('done');
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reservation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reserve · ${product.title}`}
      subtitle={`${product.shortcode} · ₹${product.pricing.retailPrice.toLocaleString('en-IN')} · ${available} available`}
      maxWidth="sm"
    >
      {step === 'details' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-charcoal-800 uppercase">Your name</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="mt-1 w-full px-3 py-2 bg-cream-100 border border-terracotta-200 rounded-xl text-sm text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 uppercase">10-digit mobile (OTP goes here)</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={buyerPhone}
              onChange={(e) => setBuyerPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              className="mt-1 w-full px-3 py-2 bg-cream-100 border border-terracotta-200 rounded-xl text-sm font-mono text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 uppercase">Quantity (max {available})</label>
            <input
              type="number"
              min={1}
              max={available}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-cream-100 border border-terracotta-200 rounded-xl text-sm font-mono text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            />
          </div>
          <p className="text-[11px] text-charcoal-700 bg-cream-100 border border-terracotta-200 rounded-xl px-3 py-2">
            Pickup hold valid for <strong>7 days</strong>. Show the pickup code at the cluster center.
          </p>
          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
          <Button variant="primary" onClick={handleDetailsNext} className="w-full" disabled={available <= 0}>
            Send OTP
          </Button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-3">
          <p className="text-xs text-charcoal-700">
            OTP sent to <strong className="font-mono">+91 {buyerPhone}</strong> (phone-only verification).
          </p>
          <p className="text-[11px] font-mono text-charcoal-700 bg-cream-100 border border-dashed border-terracotta-300 rounded-xl px-3 py-2">
            Mock OTP: {MOCK_OTP}
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full px-3 py-2 bg-cream-100 border border-terracotta-200 rounded-xl text-sm font-mono text-center tracking-[0.3em] text-charcoal-800 focus:outline-none focus:border-terracotta-500"
          />
          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('details')} className="flex-1">
              Back
            </Button>
            <Button variant="primary" onClick={handleConfirmOtp} isLoading={isSubmitting} className="flex-1">
              Confirm Reserve
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && reservation && (
        <div className="space-y-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="text-lg font-bold font-heading text-charcoal-900">Reserved!</h4>
          <p className="text-sm text-charcoal-700">
            Pickup code: <strong className="font-mono text-terracotta-700">{reservation.pickupCode}</strong>
          </p>
          <p className="text-[11px] text-charcoal-700 bg-cream-100 border border-terracotta-200 rounded-xl px-3 py-2">
            Pickup hold valid for <strong>7 days</strong> (until {new Date(reservation.expiresAt).toLocaleDateString('en-IN')}).
            Show this code at the {product.cluster} cluster center.
          </p>
          <Button variant="primary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
};
