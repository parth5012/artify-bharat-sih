'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OnboardingDialect, OnboardingRole } from '../utils/onboardingStorage';

export interface DialectVoiceConfig {
  code: OnboardingDialect;
  nameEn: string;
  nameNative: string;
  langTag: string; // BCP-47 tag, e.g. hi-IN, bn-IN, mr-IN
  greeting: string;
  greetingEn: string;
}

export const REGIONAL_DIALECTS: Record<OnboardingDialect, DialectVoiceConfig> = {
  bhojpuri: {
    code: 'bhojpuri',
    nameEn: 'Bhojpuri',
    nameNative: 'भोजपुरी',
    langTag: 'hi-IN',
    greeting: 'प्रणाम! हम बाटी दादी। आर्टिफ़ाई भारत में राउर स्वागत बा। हम आपके आपन शिल्प बेचे में मदद करब।',
    greetingEn: 'Pranam! I am Dadi. Welcome to Artify Bharat. I will assist you in selling your craft directly.',
  },
  maithili: {
    code: 'maithili',
    nameEn: 'Maithili',
    nameNative: 'मैथिली',
    langTag: 'hi-IN',
    greeting: 'प्रणाम! हम दादी छी। आर्टिफ़ाई भारत में अहाँक स्वागत अछि। अपने हुनर के सही दाम लेल हम संग छी।',
    greetingEn: 'Pranam! I am Dadi. Welcome to Artify Bharat. I am with you to secure fair wages for your talent.',
  },
  hindi: {
    code: 'hindi',
    nameEn: 'Hindi',
    nameNative: 'हिन्दी',
    langTag: 'hi-IN',
    greeting: 'नमस्ते! मैं दादी हूँ। आर्टिफ़ाई भारत में आपका स्वागत है। आइए, बिना बिचौलिए के अपनी कला को दुनिया तक पहुंचाएं।',
    greetingEn: 'Namaste! I am Dadi. Welcome to Artify Bharat. Let us bring your craft to the world without middlemen.',
  },
  awadhi: {
    code: 'awadhi',
    nameEn: 'Awadhi',
    nameNative: 'अवधी',
    langTag: 'hi-IN',
    greeting: 'राम राम! हम दादी हई। आर्टिफ़ाई भारत में तोहार बहुत बहुत स्वागत है। आपन कला के असली पहचान पाईं।',
    greetingEn: 'Ram Ram! I am Dadi. Welcome to Artify Bharat. Gain true recognition for your artisanal craft.',
  },
  bengali: {
    code: 'bengali',
    nameEn: 'Bengali',
    nameNative: 'বাংলা',
    langTag: 'bn-IN',
    greeting: 'নমস্কার! আমি দাদী। আর্টিফাই ভারতে আপনাকে স্বাগতম। আসুন আপনার হস্তশিল্পের সঠিক মর্যাদা ও ন্যায্য দাম নিশ্চিত করি।',
    greetingEn: 'Namaskar! I am Dadi. Welcome to Artify Bharat. Let us ensure true recognition and fair wages for your handloom craft.',
  },
  marathi: {
    code: 'marathi',
    nameEn: 'Marathi',
    nameNative: 'मराठी',
    langTag: 'mr-IN',
    greeting: 'नमस्कार! मी आजी आहे. आर्टिफाय भारत मध्ये आपले सहर्ष स्वागत आहे. आपल्या हस्तकलेला योग्य सन्मान आणि योग्य भाव मिळवून देऊया.',
    greetingEn: 'Namaskar! I am Aaji (Dadi). Welcome to Artify Bharat. Let us secure the right honor and fair price for your craft.',
  },
};

export interface StepVoicePrompt {
  hindi: string;
  dialectEquivalent: string;
  english: string;
}

export function getStepVoicePrompt(
  step: 1 | 2 | 3,
  dialect: OnboardingDialect,
  role: OnboardingRole
): StepVoicePrompt {
  if (step === 1) {
    const roleTextHi = role === 'shg' ? 'स्वयं सहायता समूह हब' : 'एकल कारीगर';
    return {
      hindi: `नमस्ते! चरण 1 में अपनी भूमिका चुनें - एकल कारीगर या स्वयं सहायता समूह। अपनी भाषा चुनें, और अपना 10 अंकों का मोबाइल नंबर व 4 अंकों का वॉइस सुरक्षा पिन दर्ज करें।`,
      dialectEquivalent:
        dialect === 'bhojpuri'
          ? `प्रणाम! चरण 1 में अपनी भूमिका चुनीं - ${roleTextHi}। आपन भाषा चुनीं, आ मोबाइल नंबर व 4 अंकन के वॉइस पिन दर्ज करीं।`
          : dialect === 'bengali'
          ? `নমস্কার! ধাপ ১-এ আপনার ভূমিকা ও ভাষা নির্বাচন করুন এবং ১০ অঙ্কের মোবাইল নম্বর ও ৪ অঙ্কের পিন লিখুন।`
          : dialect === 'marathi'
          ? `नमस्कार! पायरी १ मध्ये आपली भूमिका व बोलीभाषा निवडा, आणि आपला १० अंकी मोबाइल क्रमांक व ४ अंकी व्हॉइस पिन टाका.`
          : `नमस्ते! चरण 1 में अपनी भूमिका चुनें, भाषा चुनें और अपना 10 अंकों का मोबाइल नंबर व 4 अंकों का सुरक्षा पिन दर्ज करें।`,
      english: `Step 1: Choose your role, select your dialect, and enter your 10-digit mobile number and 4-digit voice security PIN.`,
    };
  }

  if (step === 2) {
    return {
      hindi: `चरण 2: 1-टैप सरकारी सत्यापन। अपना पहचान पत्र, ई-श्रम यूएएन, या ट्राईफेड नंबर दर्ज करके सरकारी सत्यापन करें। यदि आपके पास अभी कार्ड नहीं है, तो आप नीचे दिए विकल्प से इसे छोड़ भी सकते हैं।`,
      dialectEquivalent:
        dialect === 'bhojpuri'
          ? `चरण 2: 1-टैप सरकारी सत्यापन। आपन पहचान पत्र भा ई-श्रम नंबर दर्ज करीं। कार्ड ना होखे त छोड़ भी सकत बानी।`
          : dialect === 'bengali'
          ? `ধাপ ২: সরকারি পরিচিতি যাচাই। আপনার পেহচান কার্ড বা ই-শ্রম নম্বর দিয়ে যাচাই করুন, অথবা এড়িয়ে যান।`
          : dialect === 'marathi'
          ? `पायरी २: सरकारी पडताळणी. आपला पहचान आयडी किंवा ई-श्रम क्रमांक टाका, किंवा मॅन्युअल नोंदणी करा.`
          : `चरण 2: 1-टैप सरकारी सत्यापन। पहचान पत्र या ई-श्रम नंबर से सत्यापन करें या सीधे आगे बढ़ें।`,
      english: `Step 2: 1-Tap Government Verification. Verify your Pehchan Card, e-Shram UAN, or TRIFED ID, or skip to manual entry.`,
    };
  }

  // Step 3
  const isShg = role === 'shg';
  return {
    hindi: isShg
      ? `चरण 3: बधाई! अपने स्वयं सहायता समूह का नाम और सदस्यों की संख्या दर्ज करें। आर्टिफ़ाई भारत आपके पूरे समूह को GeM और ONDC पर सीधे जोड़कर शून्य बिचौलिया कमीशन सुनिश्चित करेगा।`
      : `चरण 3: बधाई! अपना नाम और शिल्प विशेषता दर्ज करें। आर्टिफ़ाई भारत आपको डिजिटल हेरिटेज पासपोर्ट, न्यूनतम कानूनी मजदूरी गारंटी और सरकारी GeM पोर्टल पर सीधी पहुंच प्रदान करेगा।`,
    dialectEquivalent:
      dialect === 'bhojpuri'
        ? `चरण 3: बधाई! आपन नाम आ शिल्प दर्ज करीं। आर्टिफ़ाई भारत आपके हुनर के डिजिटल पासपोर्ट आ सीधा बाज़ार उपलब्ध कराई।`
        : dialect === 'bengali'
        ? `ধাপ ৩: অভিনন্দন! আপনার নাম ও শিল্প বিবরণ পূরণ করুন। আর্টিফাই ভারতে আপনার হস্তশিল্প ন্যায্য মূল্য পাবে।`
        : dialect === 'marathi'
        ? `पायरी ३: अभिनंदन! आपले नाव व हस्तकलेची माहिती भरा. आर्टिफाय भारत सोबत थेट बाजारपेठ मिळवा.`
        : `चरण 3: बधाई! अपना नाम और शिल्प दर्ज करें। आर्टिफ़ाई भारत में आपका स्वागत है।`,
    english: `Step 3: Complete your profile. Artify Bharat protects your craft with Digital Heritage Passports, statutory fair wages, and 0% middleman commission.`,
  };
}

export function useAskDadi() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [activeText, setActiveText] = useState<string>('');
  const [activeTextEn, setActiveTextEn] = useState<string>('');
  const [isVisualDialogOpen, setIsVisualDialogOpen] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, langTag = 'hi-IN', textEn = '') => {
      setActiveText(text);
      if (textEn) setActiveTextEn(textEn);

      if (!synthRef.current || !('speechSynthesis' in window)) {
        // Fallback to visual dialog box
        setIsVisualDialogOpen(true);
        setIsSpeaking(false);
        return;
      }

      try {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langTag;
        utterance.rate = 0.92; // Deliberate, clear cadence for rural audio comprehension
        utterance.pitch = 1.05; // Friendly matronly warmth

        // Attempt to find a native voice matching the language
        const voices = synthRef.current.getVoices();
        const matchingVoice = voices.find(
          (v) =>
            v.lang.toLowerCase() === langTag.toLowerCase() ||
            v.lang.toLowerCase().startsWith(langTag.slice(0, 2).toLowerCase())
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = (e) => {
          console.warn('[useAskDadi] SpeechSynthesis error:', e);
          setIsSpeaking(false);
          setIsVisualDialogOpen(true); // Gracefully pop visual dialog
        };

        synthRef.current.speak(utterance);
      } catch (err) {
        console.warn('[useAskDadi] Speech trigger failed:', err);
        setIsSpeaking(false);
        setIsVisualDialogOpen(true);
      }
    },
    []
  );

  const playDialectPreview = useCallback(
    (dialect: OnboardingDialect) => {
      const config = REGIONAL_DIALECTS[dialect] || REGIONAL_DIALECTS.hindi;
      speak(config.greeting, config.langTag, config.greetingEn);
    },
    [speak]
  );

  const speakStepGuidance = useCallback(
    (step: 1 | 2 | 3, dialect: OnboardingDialect, role: OnboardingRole) => {
      const prompt = getStepVoicePrompt(step, dialect, role);
      const config = REGIONAL_DIALECTS[dialect] || REGIONAL_DIALECTS.hindi;
      speak(prompt.dialectEquivalent, config.langTag, prompt.english);
    },
    [speak]
  );

  return {
    isSpeaking,
    isSupported,
    activeText,
    activeTextEn,
    isVisualDialogOpen,
    setIsVisualDialogOpen,
    speak,
    stopSpeaking,
    playDialectPreview,
    speakStepGuidance,
  };
}
