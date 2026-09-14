import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Flag, CheckCircle2, Copy, Check, Filter, Search, Sparkles, MapPin, ArrowRight, ShoppingBag, Store, BadgeCheck } from 'lucide-react';
import { ShortcodeSearch } from '../components/passport/ShortcodeSearch';
import { DualViewProof } from '../components/passport/DualViewProof';
import { AudioStoryPlayer } from '../components/voice/AudioStoryPlayer';
import { TransparentCostBreakdown } from '../components/pricing/TransparentCostBreakdown';
import { ReportFakeModal } from '../components/passport/ReportFakeModal';
import { QRScannerModal } from '../components/passport/QRScannerModal';
import { ProductCard } from '../components/market/ProductCard';
import { CartDrawer } from '../components/market/CartDrawer';
import { ReserveModal } from '../components/market/ReserveModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';
import { getPassportByShortcode } from '../api/passportApi';
import { listMarketProducts } from '../api/marketplaceApi';
import { getCart, addToCart, updateCartQty, removeFromCart, clearCart, totalQty } from '../services/cart';
import type { CraftProduct, CartItem, Reservation } from '../types';

type PortalTab = 'verify' | 'shop';

function readBuyerArtisanId(): string | null {
  try {
    const raw = window.localStorage.getItem('artify-artisan-session');
    if (!raw) return null;
    const session = JSON.parse(raw) as { artisan_id?: string };
    return session.artisan_id ?? null;
  } catch {
    return null;
  }
}

export const BuyerPortalPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PortalTab>(() =>
    pathname.startsWith('/market') ? 'shop' : 'verify',
  );
  const [product, setProduct] = useState<CraftProduct | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Catalog filters (shared Verify + Shop)
  const [selectedCluster, setSelectedCluster] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Shop state
  const [shopProducts, setShopProducts] = useState<CraftProduct[]>([]);
  const [shopLoading, setShopLoading] = useState<boolean>(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getCart());
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [reserveTarget, setReserveTarget] = useState<CraftProduct | null>(null);
  const [reserveQty, setReserveQty] = useState<number>(1);
  const [buyerArtisanId] = useState<string | null>(() => readBuyerArtisanId());

  const loadPassport = async (shortcode: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getPassportByShortcode(shortcode);
      if (result) {
        setProduct(result);
      } else {
        setProduct(null);
        setErrorMsg(`No Digital Passport found matching code: "${shortcode}". Please check shortcode on thermal tag.`);
      }
    } catch (err) {
      setErrorMsg('Failed to query passport provenance ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      loadPassport(code);
    } else {
      loadPassport('ABC123');
    }
  }, [code]);

  const fetchShop = useCallback(async () => {
    setShopLoading(true);
    setShopError(null);
    try {
      const items = await listMarketProducts({
        cluster: selectedCluster === 'All' ? undefined : selectedCluster,
        search: catalogSearch.trim() || undefined,
      });
      setShopProducts(items);
    } catch (err) {
      setShopError(err instanceof Error ? err.message : 'Failed to load shop.');
    } finally {
      setShopLoading(false);
    }
  }, [selectedCluster, catalogSearch]);

  useEffect(() => {
    if (activeTab === 'shop') {
      void fetchShop();
    }
  }, [activeTab, fetchShop]);

  const handleSearchSubmit = (inputCode: string) => {
    setActiveTab('verify');
    navigate(`/buyer/passport/${inputCode}`);
    loadPassport(inputCode);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setToastMsg(`Copied ${label} to clipboard!`);
    setTimeout(() => setToastMsg(null), 2500);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleAddToCart = (item: CraftProduct) => {
    try {
      setCartItems(addToCart(item, 1));
      flashToast(`${item.title} added to cart.`);
    } catch (err) {
      flashToast(err instanceof Error ? err.message : 'Could not add to cart.');
    }
  };

  const handleReserve = (item: CraftProduct, qty = 1) => {
    setReserveQty(qty);
    setReserveTarget(item);
  };

  const handleReserveSuccess = (reservation: Reservation) => {
    flashToast(`Reserved! Pickup code ${reservation.pickupCode}.`);
    try {
      setCartItems(removeFromCart(reservation.productId));
    } catch {
      setCartItems(getCart());
    }
    void fetchShop();
  };

  const cartCount = totalQty(cartItems);

  return (
    <div className="space-y-10 py-4">
      {toastMsg && (
        <Toast
          message={toastMsg}
          type="success"
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3 bg-gradient-to-b from-cream-50 to-cream-100/60 p-6 sm:p-8 rounded-3xl border border-terracotta-200 shadow-warm">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-terracotta-100 text-terracotta-800 text-xs font-bold rounded-full uppercase border border-terracotta-300 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Artifact Verified Buyer Provenance Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-charcoal-900 tracking-tight">
          Digital Heritage Passport Provenance
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-700 max-w-xl mx-auto leading-relaxed">
          Verify authentic hand-crafted Indian products directly from rural master artisans with cryptographic SHA-256 loom evidence.
        </p>

        {/* Verify | Shop toggle */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="inline-flex bg-cream-100 border border-terracotta-200 rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'verify'
                  ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                  : 'text-charcoal-700 hover:bg-terracotta-50'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              Verify
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'shop'
                  ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                  : 'text-charcoal-700 hover:bg-terracotta-50'
              }`}
            >
              <Store className="w-4 h-4" />
              Shop
            </button>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-1.5 px-4 py-2.5 bg-cream-50 border border-terracotta-200 rounded-2xl text-xs font-bold text-charcoal-800 hover:bg-terracotta-50 transition-colors shadow-xs"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-4 h-4 text-terracotta-600" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 flex items-center justify-center bg-terracotta-500 text-white text-[10px] font-bold rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'verify' && (
        <>
          {/* Shortcode & QR Search Component */}
          <ShortcodeSearch
            onSearch={handleSearchSubmit}
            onOpenQRScanner={() => setIsQRModalOpen(true)}
            isLoading={isLoading}
          />

          {isLoading && <Loader size="lg" label="Decrypting SHA-256 Provenance Ledger..." />}

          {!isLoading && errorMsg && (
            <ErrorState
              title="Passport Not Found"
              message={errorMsg}
              onRetry={() => loadPassport('ABC123')}
            />
          )}

          {/* Active Passport Presentation */}
          {!isLoading && product && (
            <div className="space-y-8 animate-fade-in-up">
              <Card variant="gold" padding="lg" className="border-heritage-gold shadow-warm-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-heritage-gold/40 pb-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <button
                        onClick={() => copyToClipboard(product.shortcode, 'Shortcode')}
                        className="font-mono font-bold text-sm bg-terracotta-500 text-white px-2.5 py-0.5 rounded-lg shadow-sm hover:bg-terracotta-600 transition-colors flex items-center gap-1.5"
                        title="Click to copy shortcode"
                      >
                        <span>{product.shortcode}</span>
                        {copiedField === 'Shortcode' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-80" />}
                      </button>
                      <Badge variant="verified" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                        SHA-256 Verified
                      </Badge>
                      <Badge variant="cluster">{product.cluster} Cluster</Badge>
                    </div>
                    <h2 className="text-2xl font-bold font-heading text-charcoal-900">{product.title}</h2>
                    <p className="text-xs text-charcoal-700">
                      Crafted by master artisan: <strong className="text-terracotta-700">{product.artisanName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Flag className="w-4 h-4" />}
                      onClick={() => setIsReportModalOpen(true)}
                    >
                      🚩 Report Fake / Machine-Made
                    </Button>
                  </div>
                </div>

                <div className="bg-white/90 p-3.5 rounded-2xl border border-heritage-gold/40 text-[11px] font-mono text-charcoal-800 break-all flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-[9px] font-bold text-charcoal-700 block uppercase font-sans">
                      Cryptographic SHA-256 Provenance Hash:
                    </span>
                    <span>{product.sha256Hash}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(product.sha256Hash, 'SHA-256 Hash')}
                    className="px-3 py-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-800 rounded-xl text-xs font-sans font-semibold border border-cream-300 shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedField === 'SHA-256 Hash' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-terracotta-600" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
              </Card>

              <DualViewProof product={product} />

              <AudioStoryPlayer
                artisanName={product.artisanName}
                dialect="Bhojpuri / Maithili"
                audioUrl={product.audioStoryUrl}
                transcript={product.transcript}
                translatedText={product.translatedText}
              />

              <TransparentCostBreakdown
                materialCost={product.pricing.breakdown.materialCost}
                laborCost={product.pricing.breakdown.laborCost}
                overheadCost={product.pricing.breakdown.overheadCost}
                retailPrice={product.pricing.retailPrice}
                directWagePct={product.pricing.breakdown.directWageRealizationPct}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'shop' && (
        <section className="space-y-6 pt-4 border-t border-terracotta-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-terracotta-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-heritage-goldDark" />
                <span>Verified Heritage Crafts Shop</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-charcoal-900 mt-1">
                Shop Listed Crafts & Reserve Pickup
              </h2>
            </div>

            {/* Search Input (shared state) */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-charcoal-700" />
              <input
                type="text"
                placeholder="Search by craft, cluster, or artisan..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-cream-50 border border-terracotta-200 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-terracotta-500 shadow-xs"
              />
            </div>
          </div>

          {/* Cluster Filter Buttons (shared state) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-charcoal-700 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-terracotta-500" /> Filter Cluster:
            </span>
            {['All', 'Varanasi', 'Madhubani', 'Kashmir', 'Kutch', 'Pochampally'].map((cluster) => (
              <button
                key={cluster}
                onClick={() => setSelectedCluster(cluster)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  selectedCluster === cluster
                    ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                    : 'bg-cream-50 text-charcoal-700 border border-terracotta-200 hover:bg-terracotta-50'
                }`}
              >
                {cluster}
              </button>
            ))}
          </div>

          {shopLoading && <Loader size="lg" label="Loading verified listings..." />}

          {!shopLoading && shopError && (
            <ErrorState
              title="Shop Unavailable"
              message={shopError}
              onRetry={() => fetchShop()}
            />
          )}

          {/* Shop Grid */}
          {!shopLoading && !shopError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shopProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  buyerArtisanId={buyerArtisanId}
                  onAddToCart={handleAddToCart}
                  onReserve={(p) => handleReserve(p, 1)}
                  onOpenPassport={handleSearchSubmit}
                />
              ))}
            </div>
          )}

          {!shopLoading && !shopError && shopProducts.length === 0 && (
            <div className="text-center py-10 space-y-3 bg-cream-50 border border-terracotta-200 rounded-2xl">
              <MapPin className="w-6 h-6 text-terracotta-500 mx-auto" />
              <p className="text-sm text-charcoal-700">No listed crafts match this cluster/search.</p>
              <Button
                variant="outline"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSelectedCluster('All');
                  setCatalogSearch('');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </section>
      )}

      <CartDrawer
        isOpen={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={(pid, qty) => {
          try {
            setCartItems(updateCartQty(pid, qty));
          } catch (err) {
            flashToast(err instanceof Error ? err.message : 'Could not update cart.');
          }
        }}
        onRemove={(pid) => setCartItems(removeFromCart(pid))}
        onClear={() => {
          clearCart();
          setCartItems(getCart());
        }}
        onCheckoutReserve={(p) => {
          setCartOpen(false);
          handleReserve(p, cartItems.find((i) => i.product.id === p.id)?.qty ?? 1);
        }}
      />

      <ReserveModal
        isOpen={!!reserveTarget}
        product={reserveTarget}
        initialQty={reserveQty}
        buyerArtisanId={buyerArtisanId}
        onClose={() => setReserveTarget(null)}
        onSuccess={handleReserveSuccess}
      />

      {product && (
        <ReportFakeModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          shortcode={product.shortcode}
        />
      )}

      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onScanSuccess={handleSearchSubmit}
      />
    </div>
  );
};
