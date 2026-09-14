import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ShieldCheck, Award, ArrowRight, MapPin, IndianRupee, Sparkles, QrCode } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MOCK_PRODUCTS } from '../mocks/mockData';
import { loginArtisan, type ArtisanSession } from '../api/authApi';
import type { ArtisanProfileDraft } from '../components/artisan/VoiceProfileForm';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const session: ArtisanSession = await loginArtisan(phone.trim(), pin.trim());
      const normalizedPhone = session.phone.replace(/\D/g, '');
      const storedProfile = window.localStorage.getItem(`artify-artisan-profile-${normalizedPhone}`);
      const profile = storedProfile ? JSON.parse(storedProfile) as ArtisanProfileDraft : {
        name: session.name,
        phone: session.phone,
        pin: '',
        dialect: '',
        craftTitle: '',
        craftType: '',
        material: '',
        description: '',
        laborDays: 0,
      };

      window.localStorage.setItem('artify-auth-token', session.access_token);
      window.localStorage.setItem('artify-artisan-session', JSON.stringify(session));
      window.dispatchEvent(new Event('artify-auth-change'));
      navigate('/artisan', { state: { profile, session } });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in. Check your phone number and PIN.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-12 py-6 animate-fade-in-up">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl heritage-gradient text-white p-8 sm:p-12 md:p-16 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-heritage-gold border border-white/20 shadow-sm">
            <Award className="w-4 h-4 text-heritage-gold" />
            <span>ARTIFACT • SIH PS 26090 • MoSJE Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading leading-tight tracking-tight drop-shadow-sm">
            AI-Powered Digital Heritage Passport &amp; Fair-Wage Rural Platform
          </h1>

          <p className="text-sm sm:text-base text-cream-100 font-normal leading-relaxed opacity-95 max-w-2xl">
            Empowering Indian master artisans from Varanasi, Madhubani, Kashmir, Kutch, and Pochampally with cryptographic SHA-256 loom provenance, 1:1 live camera evidence, dialect audio stories, and non-exploitative 3-tier fair wage pricing.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <span className="inline-flex items-center rounded-xl border border-heritage-gold/60 bg-white/10 px-4 py-3 text-sm font-bold text-heritage-gold">
              Artisan work happens in the Android app
            </span>

            <Link to="/buyer">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 hover:scale-105 transition-transform">
                Buyer Passport Verification
              </Button>
            </Link>

            <Link to="/admin">
              <Button variant="ghost" size="lg" className="text-cream-100 hover:bg-white/10">
                MoSJE Admin Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 opacity-15 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M47.5,-57.2C59.7,-46.1,66.6,-28.9,68.2,-11.6C69.8,5.7,66.1,23.1,56.7,36.5C47.3,49.9,32.2,59.3,15.5,63.9C-1.2,68.5,-19.5,68.3,-34.7,60.8C-49.9,53.3,-62,38.5,-66.3,21.8C-70.6,5.1,-67.1,-13.5,-58.5,-28.3C-49.9,-43.1,-36.2,-54.1,-21.9,-63.9C-7.6,-73.7,7.3,-82.3,22.2,-79.8C37.1,-77.3,52.0,-63.7,47.5,-57.2Z" transform="translate(100 100)" />
          </svg>
        </div>
      </section>

      <section id="artisan-login" className="mx-auto w-full max-w-xl scroll-mt-24 rounded-3xl border border-terracotta-200 bg-cream-50 p-6 shadow-warm">
        <div className="mb-4">
          <h2 className="text-xl font-bold font-heading text-charcoal-900">Artisan Login</h2>
          <p className="text-sm text-charcoal-700">Sign in with your phone number and PIN to open your saved profile.</p>
        </div>
        <form onSubmit={handleLogin} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-charcoal-800">
            Mobile Number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              required
              placeholder="10-digit mobile number"
              className="mt-1 w-full rounded-xl border border-terracotta-200 bg-white p-3 text-sm outline-none focus:border-terracotta-500"
            />
          </label>
          <label className="text-xs font-semibold text-charcoal-800">
            Security PIN
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              type="password"
              required
              minLength={4}
              placeholder="4-6 digit PIN"
              className="mt-1 w-full rounded-xl border border-terracotta-200 bg-white p-3 text-sm outline-none focus:border-terracotta-500"
            />
          </label>
          {loginError && <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loginError}</p>}
          <Button type="submit" variant="gold" size="lg" disabled={isLoggingIn} className="sm:col-span-2">
            {isLoggingIn ? 'Signing in...' : 'Login & Open Profile'}
          </Button>
        </form>
      </section>

      {/* Innovation Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-terracotta-100 text-terracotta-800 text-xs font-bold rounded-full uppercase border border-terracotta-200">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-600" />
            Core Innovation Pillars
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-charcoal-900">
            End-to-End Digital Heritage Architecture
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-700">
            Built for SIH PS 26090 in collaboration with the Ministry of Social Justice &amp; Empowerment (MoSJE).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-terracotta-400 transition-all hover:scale-[1.02] hover:shadow-warm-lg space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-600 flex items-center justify-center font-bold shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">1:1 Live Camera Studio</h3>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              Enforces physical camera access with real-time gyroscope spirit level (&le; 1.5&deg; tilt lock). Gallery uploads are strictly blocked to eliminate counterfeit machine-made submissions.
            </p>
          </Card>

          <Card className="hover:border-terracotta-400 transition-all hover:scale-[1.02] hover:shadow-warm-lg space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-ochre-100 text-ochre-700 flex items-center justify-center font-bold shadow-sm">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">Fair-Wage Pricing Engine</h3>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              DPI pricing formula guarantees 84%+ direct wage realization to artisans. Floor, Retail, and Bulk Wholesale tiers prevent middleman under-pricing.
            </p>
          </Card>

          <Card className="hover:border-terracotta-400 transition-all hover:scale-[1.02] hover:shadow-warm-lg space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">Zero-Trust Peer Audit</h3>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              3 randomized peer jurors validate loom evidence with 2/3 quorum consensus, velocity anomaly detection, and fraud reporting.
            </p>
          </Card>
        </div>
      </section>

      {/* Featured Products Catalog Showcase */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-terracotta-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600">Featured Provenance Products</span>
            <h2 className="text-2xl font-bold font-heading text-charcoal-900 mt-1">Verified Craft Products with SHA-256 Passports</h2>
          </div>

          <Link to="/buyer">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View Full Buyer Catalog
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {MOCK_PRODUCTS.slice(0, 3).map((prod) => (
            <div
              key={prod.id}
              className="p-5 bg-cream-50 rounded-3xl border border-terracotta-200 shadow-warm space-y-4 hover:shadow-warm-lg hover:border-terracotta-400 transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-charcoal-900 border border-terracotta-200">
                  <img
                    src={prod.cleanPhotoUrl || prod.wipPhotoUrl}
                    alt={prod.title}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-terracotta-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    {prod.shortcode}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-emerald-800/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {prod.pricing.breakdown.directWageRealizationPct}% Wage
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-terracotta-600 uppercase tracking-wider block">{prod.craftType} • {prod.cluster}</span>
                  <h3 className="font-bold text-base font-heading text-charcoal-900 mt-0.5 line-clamp-1">{prod.title}</h3>
                  <p className="text-xs text-charcoal-700">Artisan: <strong>{prod.artisanName}</strong></p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-terracotta-200/80 pt-3">
                <div>
                  <span className="text-[10px] text-charcoal-700 font-semibold block uppercase">Fair Retail</span>
                  <strong className="text-base font-bold font-mono text-charcoal-900">₹{prod.pricing.retailPrice.toLocaleString('en-IN')}</strong>
                </div>

                <Link to={`/buyer/passport/${prod.shortcode}`}>
                  <Button variant="gold" size="sm" leftIcon={<QrCode className="w-3.5 h-3.5" />}>
                    Passport
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Registered Clusters */}
      <section className="bg-cream-50 p-8 rounded-3xl border border-terracotta-200 shadow-warm">
        <h3 className="text-xl font-bold font-heading text-charcoal-800 mb-4 text-center sm:text-left">
          Registered Handloom &amp; Handicraft Clusters
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { name: 'Varanasi', craft: 'Banarasi Zari Silk Saree', state: 'Uttar Pradesh' },
            { name: 'Madhubani', craft: 'Mithila Painting Canvas', state: 'Bihar' },
            { name: 'Kashmir', craft: 'Sozni Pashmina Stole', state: 'Jammu & Kashmir' },
            { name: 'Kutch', craft: 'Ajrakh Block Print', state: 'Gujarat' },
            { name: 'Pochampally', craft: 'Double Ikat Handloom', state: 'Telangana' },
          ].map((cluster, i) => (
            <div key={i} className="p-4 bg-cream-100 rounded-2xl border border-terracotta-200/60 text-center space-y-1 hover:border-terracotta-400 transition-all hover:shadow-sm">
              <MapPin className="w-5 h-5 text-terracotta-500 mx-auto mb-1" />
              <strong className="text-sm font-bold text-charcoal-900 block">{cluster.name}</strong>
              <span className="text-[10px] text-terracotta-700 font-semibold block">{cluster.craft}</span>
              <span className="text-[9px] text-charcoal-700 block">{cluster.state}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
