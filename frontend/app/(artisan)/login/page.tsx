'use client';
import {useState, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {Mic, MicOff, LogIn, Volume2} from 'lucide-react';
import {Btn, Screen} from '@/components/ui';
import {useVoice} from '@/components/useVoice';
import {processVoiceAudio} from '@/lib/voice';
import {speak} from '@/lib/mock';

export default function Login() {
  const r = useRouter();
  const v = useVoice();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const handleVoiceLogin = async () => {
    if (isListening) {
      // Stop listening and process
      setIsListening(false);
      const blob = await v.stop();
      blobRef.current = blob;
      
      if (!blob) {
        setError('No audio recorded. Please try again.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Process voice to get transcript
        const result = await processVoiceAudio(blob, {
          language: 'hi',
          targetLanguage: 'en',
          kind: 'identity',
        });

        const text = result.translation || result.transcript || '';
        
        // Extract phone and PIN from transcript
        // Pattern 1: "9876543210, 1234" or "9876543210 my PIN is 1234"
        const phoneMatch = text.match(/([6-9]\d{9})/);
        const pinMatch = text.match(/(?:pin|पिन)?\s*(?:is|hai)?\s*(\d{4})/i) || text.match(/\d{10}[\s,]+(\d{4})/);

        if (phoneMatch && pinMatch) {
          const extractedPhone = phoneMatch[1];
          const extractedPin = pinMatch[1];
          
          // Attempt login
          await attemptLogin(extractedPhone, extractedPin);
        } else {
          setError('Could not understand phone number or PIN. Please try again or enter manually.');
        }
      } catch (err: any) {
        console.error('Voice login error:', err);
        setError('Voice recognition failed. Please try manual entry.');
      } finally {
        setLoading(false);
      }
    } else {
      // Start listening
      setIsListening(true);
      setError('');
      speak('अपना फ़ोन नंबर और चार अंकों का पिन बोलिए');
      await v.start();
    }
  };

  const attemptLogin = async (phoneNum: string, pinNum: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          phone: phoneNum,
          pin: pinNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Login successful, redirect to home
      r.push('/home');
    } catch (err: any) {
      setError(err.message || 'Invalid phone number or PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    await attemptLogin(cleanPhone, pin);
  };

  return (
    <Screen>
      <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-extrabold text-[#3B2418]">Welcome Back</h1>
            <p className="mt-2 text-lg text-stone-600">Login to your artisan account</p>
          </div>

          {/* Voice Login Section */}
          <div className="rounded-3xl border-2 border-[#E8D7C3] bg-[#FFF8EF] p-8 shadow-lg">
            <div className="text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#3B2418] mb-1">🎙️ Voice Login</h3>
                <p className="text-sm text-stone-600">Speak your phone number and 4-digit PIN</p>
              </div>
              
              <div className="relative inline-block">
                <button
                  onClick={handleVoiceLogin}
                  disabled={loading}
                  className={`relative mx-auto grid h-40 w-40 place-items-center rounded-full shadow-2xl transition-all ${
                    isListening ? 'bg-emerald-50 ring-4 ring-emerald-200' : 'bg-white ring-4 ring-orange-200'
                  } ${loading ? 'opacity-60' : ''}`}
                >
                  {isListening && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/50" />
                  )}
                  {isListening ? (
                    <Mic size={72} className="text-emerald-600" />
                  ) : (
                    <MicOff size={72} className="text-stone-700" />
                  )}
                </button>
              </div>
              
              <div className="mt-4 flex h-14 items-center justify-center gap-[3px]">
                {v.levels.map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-orange-400/70 transition-all"
                    style={{ height: isListening ? h : 4 }}
                  />
                ))}
              </div>
              
              <p className="mt-4 text-base font-semibold text-[#3B2418]">
                {isListening
                  ? '🔴 Listening... Tap to stop'
                  : loading
                  ? '⏳ Processing...'
                  : ''}
              </p>
              
              {!isListening && !loading && (
                <div className="mt-3 rounded-xl bg-orange-50/50 border border-orange-200 p-3">
                  <p className="text-xs font-semibold text-stone-600 mb-1">Try saying:</p>
                  <p className="text-sm font-mono text-stone-800">"9876543210, my PIN is 1234"</p>
                </div>
              )}
              
              <button
                onClick={() => speak('अपना फ़ोन नंबर और चार अंकों का पिन बोलिए')}
                className="mt-4 flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 mx-auto hover:bg-orange-200 transition-colors"
              >
                <Volume2 size={16} /> Listen to example
              </button>
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-[#E8D7C3]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-stone-50 px-6 py-1 font-semibold text-stone-500 rounded-full border-2 border-[#E8D7C3]">
                Or enter manually
              </span>
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="rounded-3xl border-2 border-[#E8D7C3] bg-[#FFFAF5] p-6 shadow-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#3B2418] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="h-14 w-full rounded-xl border-2 border-[#E8D7C3] bg-white px-4 text-xl outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3B2418] mb-2">
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="h-14 w-full rounded-xl border-2 border-[#E8D7C3] bg-white px-4 text-xl tracking-widest outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                />
              </div>

              {error && (
                <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  ⚠️ {error}
                </div>
              )}

              <Btn type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'} <LogIn />
              </Btn>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-stone-600">
              New artisan?{' '}
              <button
                onClick={() => r.push('/onboarding')}
                className="font-semibold text-orange-700 underline decoration-2 hover:text-orange-800"
              >
                Create your profile
              </button>
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}
