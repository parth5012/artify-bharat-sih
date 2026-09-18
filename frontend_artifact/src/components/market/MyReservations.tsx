import React, { useState } from 'react';
import { Phone, KeyRound, PackageSearch, TicketCheck, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { ErrorState } from '../ui/ErrorState';
import { getMyReservations, confirmReservation } from '../../api/marketplaceApi';
import { getBuyerPhone, setBuyerPhone } from '../../services/cart';
import { MOCK_PRODUCTS } from '../../mocks/mockData';
import type { Reservation, ReservationStatus } from '../../types';

// Same mock OTP as ReserveModal (T4) — phone-only verification, no backend SMS in mock mode.
const MOCK_OTP = '123456';

type Filter = 'all' | ReservationStatus;

function persistMockUpdate(updated: Reservation): void {
  try {
    const raw = window.localStorage.getItem('artify-mock-reservations');
    const list = raw ? (JSON.parse(raw) as Reservation[]) : [];
    const next = list.map((r) => (r.id === updated.id ? updated : r));
    window.localStorage.setItem('artify-mock-reservations', JSON.stringify(next));
  } catch {
    // best-effort mock mirror
  }
}

function statusVariant(status: ReservationStatus): 'pending' | 'verified' | 'danger' | 'neutral' {
  if (status === 'pending') return 'pending';
  if (status === 'confirmed') return 'verified';
  if (status === 'declined') return 'danger';
  return 'neutral';
}

function productTitle(productId: string): string {
  return MOCK_PRODUCTS.find((p) => p.id === productId)?.title ?? productId;
}

export const MyReservations: React.FC = () => {
  const [phone, setPhone] = useState(() => getBuyerPhone() ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const phoneValid = /^[6-9]\d{9}$/.test(phone.trim());

  const handleSendOtp = () => {
    setError(null);
    setNote(null);
    if (!phoneValid) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
  };

  const handleLookup = async () => {
    setError(null);
    setNote(null);
    if (!phoneValid) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (otp.trim() !== MOCK_OTP) {
      setError('Incorrect OTP. Hint (mock): 123456.');
      return;
    }
    setLoading(true);
    try {
      const list = await getMyReservations(phone.trim());
      setBuyerPhone(phone.trim());
      setReservations(list);
      setVerified(true);
      if (list.length === 0) setNote('No reservations found for this number yet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setError(null);
    setNote(null);
    setActionId(id);
    try {
      const updated = await confirmReservation(id, 'buyer-self', 'decline');
      persistMockUpdate(updated);
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setNote(`Reservation ${updated.pickupCode} cancelled.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setActionId(null);
    }
  };

  const visible = reservations.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="space-y-6 py-4 max-w-3xl mx-auto">
      <Card variant="gold" padding="lg">
        <h1 className="text-xl font-bold font-heading text-charcoal-900">My Orders</h1>
        <p className="text-xs text-charcoal-700 mt-1">
          Phone OTP lookup — view pending / confirmed / expired holds with pickup codes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <label className="block text-xs font-bold text-charcoal-800 uppercase">
            10-digit mobile
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-terracotta-200 bg-cream-100 px-3 py-2">
              <Phone className="w-4 h-4 text-terracotta-500 shrink-0" />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full bg-transparent text-sm font-mono outline-none"
              />
            </span>
          </label>
          <label className="block text-xs font-bold text-charcoal-800 uppercase">
            OTP (mock 123456)
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-terracotta-200 bg-cream-100 px-3 py-2">
              <KeyRound className="w-4 h-4 text-terracotta-500 shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full bg-transparent text-sm font-mono tracking-[0.3em] text-center outline-none"
              />
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {!otpSent ? (
            <Button variant="primary" size="sm" onClick={handleSendOtp} disabled={!phoneValid}>
              Send OTP
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => void handleLookup()} isLoading={loading} disabled={!phoneValid}>
              Verify & View Orders
            </Button>
          )}
          {otpSent && (
            <Button variant="ghost" size="sm" onClick={() => { setOtpSent(false); setOtp(''); setVerified(false); }}>
              Change number
            </Button>
          )}
        </div>
        {otpSent && <p className="text-[11px] font-mono text-charcoal-700 mt-2">Mock OTP: {MOCK_OTP} (sent to +91 {phone || '—'})</p>}
      </Card>

      {loading && <Loader size="lg" label="Looking up reservations..." />}
      {!loading && error && <ErrorState title="Orders lookup failed" message={error} onRetry={() => void handleLookup()} />}
      {note && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{note}</p>}

      {verified && !loading && !error && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'confirmed', 'expired'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filter === f
                    ? 'bg-terracotta-500 text-white shadow-md'
                    : 'bg-cream-50 text-charcoal-700 border border-terracotta-200 hover:bg-terracotta-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <Card padding="md" className="text-center">
              <PackageSearch className="w-6 h-6 text-terracotta-500 mx-auto" />
              <p className="text-sm text-charcoal-700 mt-2">No {filter === 'all' ? '' : `${filter} `}orders found.</p>
            </Card>
          )}

          {visible.map((r) => (
            <Card key={r.id} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-charcoal-900 truncate">{productTitle(r.productId)}</p>
                  <p className="text-[11px] font-mono text-charcoal-700">Qty {r.qty} · expires {new Date(r.expiresAt).toLocaleDateString('en-IN')}</p>
                  <p className="text-xs mt-1 flex items-center gap-1.5">
                    <TicketCheck className="w-3.5 h-3.5 text-terracotta-600" />
                    Pickup code: <strong className="font-mono text-terracotta-700">{r.pickupCode}</strong>
                  </p>
                </div>
                <Badge variant={statusVariant(r.status)} size="sm">{r.status}</Badge>
              </div>
              {r.status === 'pending' && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    isLoading={actionId === r.id}
                    onClick={() => void handleCancel(r.id)}
                  >
                    Cancel hold
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
