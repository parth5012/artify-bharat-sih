import React from 'react';
import { ShoppingCart, Zap, MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { CraftProduct } from '../../types';

interface ProductCardProps {
  product: CraftProduct;
  buyerArtisanId?: string | null;
  onAddToCart: (product: CraftProduct) => void;
  onReserve: (product: CraftProduct) => void;
  onOpenPassport: (shortcode: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  buyerArtisanId,
  onAddToCart,
  onReserve,
  onOpenPassport,
}) => {
  const available = product.stockQty - product.reservedQty;
  const soldOut = available <= 0;
  const isOwn = !!buyerArtisanId && product.artisanId === buyerArtisanId;

  return (
    <Card
      variant="gold"
      padding="sm"
      className="bg-cream-100 border-terracotta-500/30 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-warm-lg"
      onClick={() => onOpenPassport(product.shortcode)}
    >
      <div className="space-y-3">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-charcoal-900 border border-terracotta-200 shadow-inner">
          <img
            src={product.wipPhotoUrl}
            alt={product.title}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 font-mono text-[10px] font-bold bg-charcoal-900/80 backdrop-blur-md text-heritage-gold px-2 py-0.5 rounded-md border border-heritage-gold/30">
            {product.shortcode}
          </div>
          <div className="absolute top-2 right-2">
            {soldOut ? (
              <Badge variant="danger" size="sm">Sold out</Badge>
            ) : product.stockType === 'unique' ? (
              <Badge variant="gold" size="sm">1-of-1 Unique</Badge>
            ) : (
              <Badge variant="pending" size="sm">{available} left</Badge>
            )}
          </div>
          <div className="absolute bottom-2 right-2 bg-emerald-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
            {product.pricing.breakdown.directWageRealizationPct}% Wage
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-terracotta-600">{product.craftType}</span>
            <span className="text-charcoal-700 font-mono flex items-center gap-1">
              <MapPin className="w-3 h-3 text-terracotta-500" />
              {product.cluster}
            </span>
          </div>
          <h3 className="font-bold text-sm font-heading text-charcoal-900 line-clamp-1">
            {product.title}
          </h3>
          <p className="text-xs text-charcoal-700">
            Artisan: <strong>{product.artisanName}</strong>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-terracotta-200/60 pt-3">
          <div>
            <span className="text-[10px] text-charcoal-700 font-semibold block uppercase">Fair Retail</span>
            <strong className="text-base font-bold font-mono text-charcoal-900">
              ₹{product.pricing.retailPrice.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        {isOwn && (
          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            Your listing — you cannot reserve your own craft.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
            disabled={soldOut || isOwn}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex-1"
          >
            Add to Cart
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Zap className="w-3.5 h-3.5" />}
            disabled={soldOut || isOwn}
            onClick={(e) => {
              e.stopPropagation();
              onReserve(product);
            }}
            className="flex-1"
          >
            Reserve Now
          </Button>
        </div>
      </div>
    </Card>
  );
};
