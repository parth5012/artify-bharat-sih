import React, { useEffect, useState } from 'react';
import { Check, X, Inbox, MessageSquareText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { ErrorState } from '../ui/ErrorState';
import { confirmReservation } from '../../api/marketplaceApi';
import { MOCK_PRODUCTS } from '../../mocks/mockData';
import type { Reservation } from '../../types';

function readArtisanId(): string | null {
  try {
    const raw = window.localStorage.getItem('artify-artisan-session');
    if (!raw) return null;
    const session = JSON.parse(raw) as { artisan_id?: string };
    return session.artisan_id ?? null;
  } catch {
    return null;
  }
}

function readMockReservations(): Reservation[] {
  try {
    const raw = window.localStorage.getItem('artify-mock-reservations');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Reservation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistMockUpdate(updated: Reservation): void {
  try {
    const list = readMockReservations().map((r) => (r.id === updated.id ? updated : r));
    window.localStorage.setItem('artify-mock-reservations', JSON.stringify(list));
  } catch {
    // best-effort mock mirror
  }
}

function productMeta(productId: string): { title: string; shortcode: string; artisanId: string } {
  const p = MOCK_PRODUCTS.find((item) => item.id === productId);
  return { title: p?.title ?? productId, shortcode: p?.shortcode ?? '—', artisanId: p?.artisanId ?? '' };
}

export const ArtisanOrdersTab: React.FC = () => {
  const [artisanId] = useState<string | null>(() => readArtisanId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Reservation[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [smsNote, setSmsNote] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setError(null);
    try {
      const all = readMockReservations();
      const mine = artisanId ? all.filter((r) => productMeta(r.productId).artisanId === artisanId) : all;
      setOrders(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (id: string, action: 'confirm' | 'decline') => {
    setError(null);
    setSmsNote(null);
    setActionId(id);
    try {
      const updated = await confirmReservation(id, artisanId ?? 'artisan-mock', action);
      persistMockUpdate(updated);
      setOrders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSmsNote(
        `SMS sent to buyer (mock): pickup ${updated.pickupCode} ${action === 'confirm' ? 'confirmed — ready for cluster-center pickup' : 'declined — hold released'}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `Reservation ${action} failed.`);
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <Loader size="lg" label="Loading artisan orders..." />;
  if (error) return <ErrorState title="Orders unavailable" message={error} onRetry={reload} />;

  const pending = orders.filter((o) => o.status === 'pending');
  const history = orders.filter((o) => o.status !== 'pending');

  return (
    <div className="space-y-4">
      <Card variant="gold" padding="md">
        <h2 className="text-lg font-bold font-heading text-charcoal-900">Incoming Orders</h2>
        <p className="text-xs text-charcoal-700 mt-1">
          {artisanId ? `Accept / decline pickup holds for your listings.` : 'Sign in as artisan to filter to your listings — showing all mock holds.'}
        </p>
      </Card>

      {smsNote && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <MessageSquareText className="w-4 h-4 shrink-0 mt-0.5" />
          {smsNote}
        </p>
      )}

      {pending.length === 0 && (
        <Card padding="md" className="text-center">
          <Inbox className="w-6 h-6 text-terracotta-500 mx-auto" />
          <p className="text-sm text-charcoal-700 mt-2">No pending orders. New buyer holds will appear here.</p>
        </Card>
      )}

      {pending.map((o) => {
        const meta = productMeta(o.productId);
        return (
          <Card key={o.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm text-charcoal-900 truncate">{meta.title}</p>
                <p className="text-[11px] font-mono text-charcoal-700">{meta.shortcode} · Qty {o.qty} · {o.pickupCode}</p>
                {o.buyerName && <p className="text-xs text-charcoal-700">Buyer: <strong>{o.buyerName}</strong></p>}
              </div>
              <Badge variant="pending" size="sm">pending</Badge>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <Button
                variant="danger"
                size="sm"
                leftIcon={<X className="w-3.5 h-3.5" />}
                isLoading={actionId === o.id}
                onClick={() => void handleAction(o.id, 'decline')}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-3.5 h-3.5" />}
                isLoading={actionId === o.id}
                onClick={() => void handleAction(o.id, 'confirm')}
              >
                Accept
              </Button>
            </div>
          </Card>
        );
      })}

      {history.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase text-charcoal-700">Decided ({history.length})</h3>
          {history.map((o) => {
            const meta = productMeta(o.productId);
            return (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-terracotta-200 bg-cream-50 px-3 py-2">
                <p className="text-xs text-charcoal-800 truncate">{meta.title} · <span className="font-mono">{o.pickupCode}</span></p>
                <Badge variant={o.status === 'confirmed' ? 'verified' : o.status === 'declined' ? 'danger' : 'neutral'} size="sm">
                  {o.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
