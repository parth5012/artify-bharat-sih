'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, ExternalLink, Package, User, MapPin, Clock, IndianRupee } from 'lucide-react';
import { shortenHash } from '@/lib/hash';

// Mock product data for demo
const DEMO_PRODUCTS: Record<string, any> = {
  'u-REC-7F405208': {
    id: 'u-REC-7F405208',
    name: 'Handmade Floral Decorative Hanging',
    description: 'A beautiful hand-assembled floral decorative craft with intricate details. It is designed for home décor and gifting, and can be used to add a handmade, colorful touch to walls, doors, and festive spaces.',
    materials: ['Fabric', 'thread', 'decorative paper/fiber elements'],
    howMade: 'Hand-assembled floral decorative craft',
    usedFor: 'Home décor & gifting',
    time: '1 day',
    price: 1138.5,
    images: [
      '/products/demo-hanging.jpg'
    ],
    wip: [
      { step: 'Making Started', image: '/products/wip1.jpg', timestamp: Date.now() - 86400000 },
      { step: 'In Progress', image: '/products/wip2.jpg', timestamp: Date.now() - 43200000 },
      { step: 'Finished Product', image: '/products/wip3.jpg', timestamp: Date.now() }
    ],
    artisan: {
      name: 'Mohan Lal',
      id: 'ART-2043',
      phone: '9876543212',
      location: 'Kutch, Gujarat',
      craft: 'Embroidery & Textile'
    },
    hash: '8f4a9b2c7d1e3f5a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a7c21',
    registeredAt: Date.now() - 86400000,
    verified: true
  }
};

export default function VerifyProduct() {
  const params = useParams();
  const productId = params?.productId as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - in production, fetch from actual API
    setTimeout(() => {
      const demoProduct = DEMO_PRODUCTS[productId];
      setProduct(demoProduct || null);
      setLoading(false);
    }, 500);
  }, [productId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EF]">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>
          <p className="mt-4 font-semibold text-stone-600">Verifying product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EF] px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red-100 text-red-600">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3B2418]">Product Not Found</h1>
          <p className="text-stone-600">
            We couldn't find a product with ID: <span className="font-mono font-bold">{productId}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EF] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Verification Badge */}
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-white">
            <Check size={32} />
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">✓ VERIFIED PRODUCT</h1>
          <p className="mt-2 text-sm text-emerald-800">
            This product is registered in the Artify authenticity system
          </p>
        </div>

        {/* Product Image */}
        {product.images[0] && (
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="aspect-video w-full object-cover"
              onError={(e) => {
                // Fallback for missing image
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23E8D7C3" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" fill="%233B2418" font-family="sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle"%3EProduct Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}

        {/* Product Info */}
        <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#3B2418]">{product.name}</h2>
          <p className="mt-1 text-sm font-mono text-stone-500">Product ID: {product.id}</p>
        </div>

        {/* Product Details */}
        <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3B2418]">
            <Package size={20} />
            PRODUCT DETAILS
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-stone-700">Description</p>
              <p className="text-stone-600">{product.description}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Materials</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {product.materials.map((mat: string, idx: number) => (
                  <span key={idx} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
                    {mat}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-stone-700">How it is made</p>
              <p className="text-stone-600">{product.howMade}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Time required</p>
              <p className="text-stone-600">{product.time}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Fair/Suggested price</p>
              <p className="flex items-center gap-1 text-lg font-bold text-emerald-700">
                <IndianRupee size={16} />
                {product.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Artisan Info */}
        <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3B2418]">
            <User size={20} />
            ARTISAN
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-semibold text-stone-700">Artisan Name</p>
              <p className="text-stone-900">{product.artisan.name}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Artisan ID</p>
              <p className="font-mono text-stone-900">{product.artisan.id}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Craft Category</p>
              <p className="text-stone-900">{product.artisan.craft}</p>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-stone-500" />
              <p className="text-stone-700">{product.artisan.location}</p>
            </div>
          </div>
        </div>

        {/* Craft Journey / WIP Timeline */}
        {product.wip && product.wip.length > 0 && (
          <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3B2418]">
              <Clock size={20} />
              CRAFT JOURNEY / PROVENANCE
            </h3>
            <div className="space-y-4">
              {product.wip.map((step: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                      {idx + 1}
                    </div>
                    {idx < product.wip.length - 1 && (
                      <div className="my-1 h-full w-0.5 bg-orange-200"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-stone-900">{step.step}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(step.timestamp).toLocaleDateString()} {new Date(step.timestamp).toLocaleTimeString()}
                    </p>
                    {step.image && (
                      <img 
                        src={step.image} 
                        alt={step.step}
                        className="mt-2 h-32 w-32 rounded-lg border-2 border-stone-200 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect fill="%23E8D7C3" width="128" height="128"/%3E%3Ctext x="50%25" y="50%25" fill="%233B2418" font-family="sans-serif" font-size="10" text-anchor="middle" dominant-baseline="middle"%3EWIP%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authenticity Record */}
        <div className="rounded-2xl border-2 border-[#E8D7C3] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-[#3B2418]">AUTHENTICITY RECORD</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-stone-700">Product Registration ID</p>
              <p className="font-mono text-stone-900">{product.id}</p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">SHA-256 Hash</p>
              <p className="break-all font-mono text-xs text-stone-700">
                {shortenHash(product.hash)}
              </p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-orange-600 hover:text-orange-700">
                  View full hash
                </summary>
                <p className="mt-2 break-all font-mono text-xs text-stone-600">{product.hash}</p>
              </details>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Registration Timestamp</p>
              <p className="text-stone-900">
                {new Date(product.registeredAt).toLocaleDateString()} {new Date(product.registeredAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Verification Status</p>
              <p className="flex items-center gap-1 font-semibold text-emerald-700">
                <Check size={16} />
                Registered
              </p>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 text-center text-sm text-orange-900">
          <p className="font-semibold">📱 Scan this QR to learn about the artisan and verify the product record.</p>
          <p className="mt-2 text-xs text-orange-800">
            This digital craft passport ensures authenticity and supports fair trade for artisans.
          </p>
        </div>

        {/* Powered by Artify */}
        <div className="pb-8 text-center">
          <p className="text-sm text-stone-500">Powered by</p>
          <p className="text-2xl font-bold text-orange-600">ARTIFY</p>
        </div>
      </div>
    </div>
  );
}
