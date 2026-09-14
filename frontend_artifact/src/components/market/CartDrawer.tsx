import React from 'react';
import { X, Minus, Plus, Trash2, Zap, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/Button';
import type { CartItem, CraftProduct } from '../../types';
import { CART_MAX_ITEMS } from '../../services/cart';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckoutReserve: (product: CraftProduct) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemove,
  onClear,
  onCheckoutReserve,
}) => {
  if (!isOpen) return null;

  const total = items.reduce((sum, i) => sum + i.product.pricing.retailPrice * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-cream-100 border-l border-terracotta-200 shadow-2xl flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-terracotta-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-terracotta-600" />
            <h3 className="text-lg font-bold font-heading text-charcoal-900">
              Cart ({count}/{CART_MAX_ITEMS})
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-charcoal-700 text-center py-10">
              Your cart is empty. Reserve authentic crafts from the Shop tab.
            </p>
          )}
          {items.map(({ product, qty }) => (
            <div
              key={product.id}
              className="bg-cream-50 border border-terracotta-200 rounded-2xl p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm font-heading text-charcoal-900 truncate">{product.title}</p>
                  <p className="text-[11px] font-mono text-charcoal-700">{product.shortcode} · {product.cluster}</p>
                  <p className="text-xs font-bold font-mono text-charcoal-900">
                    ₹{(product.pricing.retailPrice * qty).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.title}`}
                  className="p-1.5 text-charcoal-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQty(product.id, qty - 1)}
                    aria-label="Decrease quantity"
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-terracotta-200 bg-cream-100 hover:bg-terracotta-50 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold font-mono w-6 text-center">{qty}</span>
                  <button
                    onClick={() => onUpdateQty(product.id, qty + 1)}
                    aria-label="Increase quantity"
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-terracotta-200 bg-cream-100 hover:bg-terracotta-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Zap className="w-3.5 h-3.5" />}
                  onClick={() => onCheckoutReserve(product)}
                >
                  Reserve
                </Button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-terracotta-200 space-y-3 bg-cream-50">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-charcoal-700">Total</span>
              <strong className="font-bold font-mono text-charcoal-900">₹{total.toLocaleString('en-IN')}</strong>
            </div>
            <p className="text-[11px] text-charcoal-700">Cart holds max {CART_MAX_ITEMS} items total.</p>
            <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
              Clear cart
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
};
