'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check, X} from 'lucide-react';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {ArtisanVerification} from '@/components/ArtisanVerification';
import {extractArtisanFromTranscript} from '@/lib/nlp';
import {useStore, Profile} from '@/lib/store';

type OnboardingPhase = 'voice' | 'verifying' | 'verified' | 'mismatch' | 'not-found' | 'creating-profile';

export default function Onboarding(){
 const r=useRouter();
 const {set}=useStore();
 const [phase, setPhase] = useState<OnboardingPhase>('voice');
 const [extractedData, setExtractedData] = useState<any>(null);
 const [verifiedArtisan, setVerifiedArtisan] = useState<any>(null);
 const [mismatchData, setMismatchData] = useState<any>(null);
 const [showLoginRedirect, setShowLoginRedirect] = useState(false);
 
 if(showLoginRedirect){
  return (
   <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
    <div className="w-full max-w-md rounded-3xl border-2 border-[#E8D7C3] bg-white p-8 shadow-lg text-center">
     <div className="mb-4 text-6xl">⚠️</div>
     <h2 className="text-2xl font-bold text-[#3B2418] mb-2">Already Registered</h2>
     <p className="text-lg text-stone-700 mb-6">This phone number is already registered.</p>
     <button
      onClick={() => r.push('/login')}
      className="w-full rounded-xl bg-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg hover:bg-orange-700 transition-colors"
     >
      Login instead →
     </button>
    </div>
   </div>
  );
 }
 
 if(phase === 'creating-profile') {
  return <Processing step={1} title="Setting up your profile" sub="Just a moment" steps={['Saving what you said','Preparing your profile']} onDone={()=>r.push('/home')}/>;
 }

 // Artisan ID Verification Phase
 if (phase === 'verifying' && extractedData?.artisanId) {
  return (
   <ArtisanVerification
    artisanId={extractedData.artisanId}
    spokenDetails={{
     name: extractedData.name,
     phone: extractedData.phone,
     location: extractedData.location,
     craft: extractedData.craft,
    }}
    onComplete={(result, data) => {
     if (result === 'verified') {
      setVerifiedArtisan(data?.artisan);
      setPhase('verified');
     } else if (result === 'mismatch') {
      setMismatchData(data);
      setPhase('mismatch');
     } else {
      setPhase('not-found');
     }
    }}
   />
  );
 }

 // Artisan ID Not Found
 if (phase === 'not-found') {
  return (
   <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
    <div className="w-full max-w-md rounded-3xl border-2 border-red-300 bg-red-50 p-8 shadow-lg text-center space-y-6">
     <div className="text-6xl">⚠️</div>
     <div>
      <h2 className="text-2xl font-bold text-[#3B2418] mb-2">Artisan ID Not Found</h2>
      <p className="text-lg text-stone-700 mb-2">
       We couldn't find <span className="font-mono font-bold">{extractedData?.artisanId}</span> in our records.
      </p>
      <p className="text-sm text-stone-600">
       Please check your Artisan ID or contact support for registration.
      </p>
     </div>
     <div className="flex flex-col gap-3">
      <button
       onClick={() => setPhase('voice')}
       className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-orange-700 transition-colors"
      >
       Try Again
      </button>
      <button
       onClick={() => r.push('/login')}
       className="w-full rounded-xl border-2 border-stone-300 bg-white px-6 py-3 text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
      >
       Go to Login
      </button>
     </div>
    </div>
   </div>
  );
 }

 // Details Mismatch
 if (phase === 'mismatch' && mismatchData) {
  const matchStatus = mismatchData.matchStatus;
  const registered = mismatchData.artisan;
  
  return (
   <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
    <div className="w-full max-w-md rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 shadow-lg space-y-6">
     <div className="text-center">
      <div className="text-6xl mb-3">⚠️</div>
      <h2 className="text-2xl font-bold text-[#3B2418] mb-2">Details Don't Match</h2>
      <p className="text-sm text-stone-700">
       Some information doesn't match our records for{' '}
       <span className="font-mono font-bold">{extractedData?.artisanId}</span>
      </p>
     </div>

     <div className="space-y-3">
      {!matchStatus.nameMatch && (
       <div className="rounded-xl border-2 border-red-300 bg-white p-3">
        <p className="text-xs font-bold text-stone-500 mb-1">NAME</p>
        <div className="flex items-center justify-between text-sm">
         <div>
          <p className="text-stone-500">You said:</p>
          <p className="font-bold text-stone-900">{extractedData.name}</p>
         </div>
         <X size={20} className="text-red-600" />
        </div>
        <div className="mt-2 pt-2 border-t">
         <p className="text-stone-500">Registered:</p>
         <p className="font-bold text-emerald-700">{registered.name}</p>
        </div>
       </div>
      )}

      {!matchStatus.phoneMatch && (
       <div className="rounded-xl border-2 border-red-300 bg-white p-3">
        <p className="text-xs font-bold text-stone-500 mb-1">PHONE</p>
        <div className="flex items-center justify-between text-sm">
         <div>
          <p className="text-stone-500">You said:</p>
          <p className="font-bold text-stone-900">{extractedData.phone}</p>
         </div>
         <X size={20} className="text-red-600" />
        </div>
        <div className="mt-2 pt-2 border-t">
         <p className="text-stone-500">Registered:</p>
         <p className="font-bold text-emerald-700">{registered.phone}</p>
        </div>
       </div>
      )}

      {!matchStatus.locationMatch && (
       <div className="rounded-xl border-2 border-red-300 bg-white p-3">
        <p className="text-xs font-bold text-stone-500 mb-1">LOCATION</p>
        <div className="flex items-center justify-between text-sm">
         <div>
          <p className="text-stone-500">You said:</p>
          <p className="font-bold text-stone-900">{extractedData.location}</p>
         </div>
         <X size={20} className="text-red-600" />
        </div>
        <div className="mt-2 pt-2 border-t">
         <p className="text-stone-500">Registered:</p>
         <p className="font-bold text-emerald-700">{registered.location}</p>
        </div>
       </div>
      )}

      {!matchStatus.craftMatch && (
       <div className="rounded-xl border-2 border-red-300 bg-white p-3">
        <p className="text-xs font-bold text-stone-500 mb-1">CRAFT</p>
        <div className="flex items-center justify-between text-sm">
         <div>
          <p className="text-stone-500">You said:</p>
          <p className="font-bold text-stone-900">{extractedData.craft}</p>
         </div>
         <X size={20} className="text-red-600" />
        </div>
        <div className="mt-2 pt-2 border-t">
         <p className="text-stone-500">Registered:</p>
         <p className="font-bold text-emerald-700">{registered.craft}</p>
        </div>
       </div>
      )}
     </div>

     <div className="flex flex-col gap-3">
      <button
       onClick={() => setPhase('voice')}
       className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-orange-700 transition-colors"
      >
       Speak Again
      </button>
      <button
       onClick={() => r.push('/login')}
       className="w-full rounded-xl border-2 border-stone-300 bg-white px-6 py-3 text-lg font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
      >
       Go to Login
      </button>
     </div>
    </div>
   </div>
  );
 }

 // Verified - Show Confirmed Details
 if (phase === 'verified' && verifiedArtisan) {
  return (
   <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
    <div className="w-full max-w-md space-y-6">
     <div className="text-center">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 mb-4">
       <Check size={48} className="text-emerald-600" />
      </div>
      <h2 className="text-3xl font-bold text-[#3B2418] mb-2">✓ Artisan Details Verified</h2>
      <p className="text-stone-600">Your information matches our records.</p>
     </div>

     <div className="space-y-3">
      {[
       {label: 'NAME', value: verifiedArtisan.name},
       {label: 'ARTISAN ID', value: verifiedArtisan.artisanId},
       {label: 'PHONE', value: verifiedArtisan.phone},
       {label: 'LOCATION', value: verifiedArtisan.location},
       {label: 'CRAFT CATEGORY', value: verifiedArtisan.craft},
       {label: 'PIN', value: extractedData.pin ? '••••' : 'Not provided'},
      ].map((field, idx) => (
       <div
        key={field.label}
        className="animate-fade-up rounded-xl border-2 border-emerald-300 bg-white p-4 shadow-sm"
        style={{animationDelay: `${idx * 100}ms`}}
       >
        <div className="flex items-center justify-between">
         <div className="flex-1">
          <p className="text-xs font-bold text-stone-500 mb-1">{field.label}</p>
          <p className="text-lg font-bold text-stone-900">{field.value}</p>
         </div>
         <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100">
           <Check size={18} className="text-emerald-600" />
          </div>
         </div>
        </div>
       </div>
      ))}
     </div>

     <button
      onClick={async () => {
       setPhase('creating-profile');
       
       const p: Profile = {
        name: verifiedArtisan.name,
        artisanId: verifiedArtisan.artisanId,
        phone: verifiedArtisan.phone,
        place: verifiedArtisan.location,
        craft: verifiedArtisan.craft,
       };

       try {
        const regRes = await fetch('/api/artisans/register', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify(p),
        });
        
        const regData = await regRes.json();
        
        if (!regRes.ok && regData.error === 'phone_exists') {
         setShowLoginRedirect(true);
         return;
        }
        
        if (!regRes.ok) throw new Error('Registration failed');
        
        // Set PIN if provided
        if (extractedData.pin && /^\d{4}$/.test(extractedData.pin)) {
         await fetch('/api/auth/set-pin', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ pin: extractedData.pin }),
         }).catch(err => console.error('PIN setup failed:', err));
        }

        set({profile: p});
        setTimeout(() => r.push('/home'), 1500);
       } catch (err) {
        console.error('Profile creation error:', err);
       }
      }}
      className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
     >
      <Check size={24} /> Continue to Create Profile
     </button>
    </div>
   </div>
  );
 }

 // Voice Input Phase
 return <VoiceScreen kind="identity" step={1} title="Tell us about you" spoken="अपना कलाकार आईडी, नाम, फ़ोन नंबर और चार अंकों का पिन बोलिए।" hints={['Your Artisan ID','Your name','Your phone number','Your 4-digit PIN']} onBack={()=>r.push('/')}
  onResult={async({lang,blob,voiceResult,editedFields})=>{
    const transcriptText = voiceResult?.translation || voiceResult?.transcript || '';
    const extracted = extractArtisanFromTranscript(transcriptText);

    const getField = (label: string) => {
      const val = editedFields?.find(f => f.label === label)?.value;
      return val && val !== 'Not detected' ? val : undefined;
    };

    const data = {
     name: getField('Name') || extracted.name.value || '',
     artisanId: getField('Artisan ID') || extracted.artisanId.value || '',
     phone: getField('Phone') || extracted.phone.value || '',
     location: getField('Location') || extracted.location.value || '',
     craft: getField('Craft Category') || extracted.craft.value || '',
     pin: getField('PIN') || extracted.pin.value || '',
    };

    setExtractedData(data);
    set({lang});

    // If Artisan ID provided, start verification
    if (data.artisanId) {
     setPhase('verifying');
    } else {
     // No Artisan ID - direct registration (fallback)
     const p: Profile = {
      name: data.name,
      artisanId: data.artisanId,
      phone: data.phone,
      place: data.location,
      craft: data.craft,
     };

     try {
      const regRes = await fetch('/api/artisans/register', {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(p),
      });
      
      const regData = await regRes.json();
      
      if (!regRes.ok && regData.error === 'phone_exists') {
       setShowLoginRedirect(true);
       return;
      }
      
      if (!regRes.ok) throw new Error('Registration failed');
      
      if (data.pin && /^\d{4}$/.test(data.pin)) {
       await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pin: data.pin }),
       }).catch(err => console.error('PIN setup failed:', err));
      }

      set({profile: p});
      setPhase('creating-profile');
     } catch (err) {
      console.error('Onboarding error:', err);
     }
    }
  }}/>;
}
