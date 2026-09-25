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
      <div className="flex min-h-full flex-col items-center justify-center gap-6 py-8">
        {/* Header */}
        <div className="w-full text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-[#3B2418]">Welcome Back</h1>
          <p className="text-base text-stone-600">Login to your artisan account</p>
        </div>

        {/* Voice Login Card */}
        <div className="w-full rounded-3xl border-2 border-stone-200 bg-white p-6 shadow-lg">
          <div className="space-y-4">
            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#3B2418] mb-1">🎙️ Voice Login</h2>
              <p className="text-sm text-stone-600">Speak your phone number and 4-digit PIN</p>
            </div>
            
            {/* Microphone Button */}
            <div className="relative py-4">
              <button
                onClick={handleVoiceLogin}
                disabled={loading}
                aria-label={isListening ? 'Stop recording' : 'Start voice login'}
                className={`relative mx-auto grid h-36 w-36 place-items-center rounded-full shadow-xl transition-all active:scale-95 ${
                  isListening ? 'bg-emerald-50' : 'bg-white'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isListening && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40" />
                )}
                {isListening ? (
                  <Mic size={64} className="text-emerald-600 relative z-10" />
                ) : (
                  <MicOff size={64} className="text-stone-700 relative z-10" />
                )}
              </button>
            </div>
            
            {/* Audio Visualizer */}
            <div className="flex h-12 items-center justify-center gap-[3px]">
              {v.levels.map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-stone-700/70 transition-all"
                  style={{ height: isListening ? h : 4 }}
                />
              ))}
            </div>
            
            {/* Status Text */}
            <p className="text-center text-base font-semibold text-[#3B2418] min-h-[24px]">
              {isListening
                ? 'Listening... Tap again to stop'
                : loading
                ? 'Processing your voice...'
                : 'Tap the mic and speak'}
            </p>
            
            {/* Example Box */}
            {!isListening && !loading && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
                <p className="text-xs font-bold text-stone-600 mb-2 uppercase tracking-wide">Try saying:</p>
                <p className="text-sm font-mono text-stone-900">"9876543210, my PIN is 1234"</p>
              </div>
            )}
            
            {/* Listen Button */}
            <button
              onClick={() => speak('अपना फ़ोन नंबर और चार अंकों का पिन बोलिए')}
              className="flex items-center justify-center gap-2 rounded-full bg-orange-100 px-4 py-2.5 text-sm font-semibold text-orange-800 mx-auto hover:bg-orange-200 active:scale-95 transition-all"
            >
              <Volume2 size={18} /> Listen to example
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative w-full my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-stone-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#FBF7F0] px-6 py-1 text-sm font-semibold text-stone-500 rounded-full border-2 border-stone-200">
              Or enter manually
            </span>
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin} className="w-full rounded-3xl border-2 border-stone-200 bg-white p-6 shadow-lg">
          <div className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-4 text-lg font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {/* PIN Input */}
            <div>
              <label htmlFor="pin" className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wide">
                4-Digit PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-4 text-2xl font-bold text-stone-900 tracking-[0.5em] placeholder:tracking-normal placeholder:text-stone-400 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-lg font-bold text-white shadow-lg transition-all hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'} <LogIn size={20} />
            </button>
          </div>
        </form>

        {/* Register Link */}
        <div className="w-full text-center mt-4">
          <p className="text-sm text-stone-600">
            New artisan?{' '}
            <button
              onClick={() => r.push('/onboarding')}
              className="font-bold text-orange-700 underline decoration-2 underline-offset-2 hover:text-orange-800 transition-colors"
            >
              Create your profile →
            </button>
          </p>
        </div>
      </div>
    </Screen>
  );
}
