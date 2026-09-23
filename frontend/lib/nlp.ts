/**
 * Natural Language Processing & Entity Extraction for ArtifyBharat.
 *
 * Extracts structured artisan and product fields from transcribed/translated voice audio.
 * Adheres strictly to the "No demo values" invariant: missing or low-confidence
 * entities return null with explicit confidence flags, never canned mocks.
 */

export interface ExtractedField<T = string> {
  value: T | null;
  confidence: number; // 0.0 to 1.0
  flag: 'missing' | 'low_confidence' | 'verified';
}

export interface ArtisanExtractionResult {
  name: ExtractedField<string>;
  phone: ExtractedField<string>;
  artisanId: ExtractedField<string>;
  location: ExtractedField<string>;
  craft: ExtractedField<string>;
  rawTranscript: string;
  overallConfidence: number;
}

const CRAFT_HUBS_EN = [
  'Varanasi', 'Banaras', 'Kashi', 'Bastar', 'Chanderi', 'Madhubani', 'Kutch', 'Bhuj',
  'Jaipur', 'Jodhpur', 'Udaipur', 'Pochampally', 'Sambalpur', 'Kotpad', 'Bhagalpur',
  'Tanjore', 'Thanjavur', 'Mysore', 'Murshidabad', 'Shantiniketan', 'Bishnupur',
  'Kashmir', 'Srinagar', 'Lucknow', 'Agra', 'Moradabad', 'Firozabad', 'Saharanpur',
  'Khurja', 'Kannauj', 'Surat', 'Ahmedabad', 'Patan', 'Paithan', 'Solapur', 'Kolhapur',
  'Warangal', 'Bidar', 'Kondapalli', 'Nirmal', 'Channapatna', 'Kullu', 'Kinnaur',
  'Chhattisgarh', 'Bihar', 'Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Madhya Pradesh',
  'Odisha', 'West Bengal', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana',
  'Kerala', 'Assam', 'Manipur', 'Nagaland', 'Tripura', 'Meghalaya', 'Jharkhand'
];

const CRAFT_HUBS_HI = [
  'बस्तर', 'वाराणसी', 'बनारस', 'काशी', 'जयपुर', 'जोधपुर', 'मधुबनी', 'चंदेरी',
  'लखनऊ', 'आगरा', 'मुरादाबाद', 'सूरत', 'संबलपुर', 'कश्मीर', 'श्रीनगर',
  'छत्तीसगढ़', 'बिहार', 'उत्तर प्रदेश', 'राजस्थान', 'गुजरात', 'मध्य प्रदेश',
  'ओडिशा', 'पश्चिम बंगाल', 'कर्नाटक', 'तमिलनाडु'
];

const CRAFT_TYPES = [
  { keywords: ['handloom', 'weaving', 'weaver', 'weave', 'loom', 'बुनाई', 'हथकरघा', 'बुनकर'], label: 'Handloom & Weaving' },
  { keywords: ['banarasi', 'zari', 'brocade', 'saree', 'sari', 'silk', 'साड़ी', 'सिल्क', 'जरी'], label: 'Banarasi Silk & Zari Weaving' },
  { keywords: ['pashmina', 'cashmere', 'wool', 'shawl', 'stole', 'ऊन', 'शॉल'], label: 'Pashmina & Wool Weaving' },
  { keywords: ['dhokra', 'lost-wax', 'brass', 'bell metal', 'bronze', 'ढोकरा', 'पीतल', 'धातु'], label: 'Dhokra Brass & Bell Metal Craft' },
  { keywords: ['terracotta', 'pottery', 'clay', 'ceramic', 'मिट्टी', 'टेराकोटा', 'कुम्हार'], label: 'Terracotta & Pottery' },
  { keywords: ['madhubani', 'mithila', 'pattachitra', 'warli', 'painting', 'artwork', 'चित्रकला', 'मधुबनी', 'पेंटिंग'], label: 'Traditional Painting' },
  { keywords: ['wood', 'carving', 'wooden', 'teak', 'sheesham', 'लकड़ी', 'नक्काशी'], label: 'Wood Carving' },
  { keywords: ['chikankari', 'zardozi', 'embroidery', 'phulkari', 'kantha', 'कढ़ाई', 'चिकनकारी', 'ज़रदोज़ी'], label: 'Traditional Embroidery' },
  { keywords: ['bandhani', 'tie-dye', 'ikat', 'block print', 'ajrakh', 'छपाई', 'बंधेज'], label: 'Textile Printing & Dyeing' },
];

function makeField<T = string>(value: T | null, confidence: number): ExtractedField<T> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { value: null, confidence: 0, flag: 'missing' };
  }
  return {
    value,
    confidence: Number(confidence.toFixed(2)),
    flag: confidence >= 0.7 ? 'verified' : 'low_confidence',
  };
}

/**
 * Extract artisan identity fields from English or Hindi transcript.
 */
export function extractArtisanFromTranscript(transcript: string): ArtisanExtractionResult {
  const text = transcript.trim();
  if (!text) {
    return {
      name: makeField<string>(null, 0),
      phone: makeField<string>(null, 0),
      artisanId: makeField<string>(null, 0),
      location: makeField<string>(null, 0),
      craft: makeField<string>(null, 0),
      rawTranscript: transcript,
      overallConfidence: 0,
    };
  }

  // 1. Phone extraction
  let phoneValue: string | null = null;
  let phoneConf = 0;

  // Patterns for 10-digit Indian phone, with optional +91/91 prefix, spaces, dashes
  const labeledPhoneMatch = text.match(/(?:phone|mobile|contact|call|फ़ोन|मोबाइल|नंबर)[\s\w:]*(?:\+?91[\-\s]?)?([6-9]\d{4}[\-\s]?\d{5}|[6-9]\d{9})/i);
  if (labeledPhoneMatch) {
    phoneValue = labeledPhoneMatch[1].replace(/\D/g, '');
    phoneConf = 0.95;
  } else {
    const rawPhoneMatch = text.match(/(?:\+?91[\-\s]?)?([6-9]\d{4}[\-\s]?\d{5}|[6-9]\d{9})\b/);
    if (rawPhoneMatch) {
      phoneValue = rawPhoneMatch[1].replace(/\D/g, '');
      phoneConf = 0.75;
    }
  }

  // 2. Artisan ID extraction
  let idValue: string | null = null;
  let idConf = 0;

  const explicitIdMatch = text.match(/\b(ART[\-\s]?[0-9][0-9A-Z]{2,7})\b/i);
  if (explicitIdMatch) {
    idValue = explicitIdMatch[1].toUpperCase().replace(/\s+/, '-');
    idConf = 0.95;
  } else {
    const labeledIdMatch = text.match(/(?:artisan\s*id|pehchan\s*id|pehchan|id\s*(?:card)?|आईडी)[\s:\-]*([A-Z0-9\-_]{4,12})/i);
    if (labeledIdMatch) {
      idValue = labeledIdMatch[1].toUpperCase();
      idConf = 0.85;
    }
  }

  // 3. Name extraction
  let nameValue: string | null = null;
  let nameConf = 0;

  const enNameMatch = text.match(/(?:my\s+name\s+is|i\s+am|this\s+is|name\s+is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})(?=\.|\,|$|\sand\b|\smy\b|\sphone\b|\scontact\b|\sfrom\b|\si\s+am\b|\sa\s+master\b|\sa\s+weaver\b|\san\s+artisan\b)/i);
  if (enNameMatch && enNameMatch[1]) {
    const candidate = enNameMatch[1].trim();
    const blacklist = ['an', 'a', 'the', 'artisan', 'weaver', 'from', 'living', 'making', 'crafting'];
    if (!blacklist.includes(candidate.toLowerCase()) && candidate.length > 2) {
      nameValue = candidate;
      nameConf = 0.90;
    }
  }

  if (!nameValue) {
    const hiNameMatch = text.match(/(?:मेरा\s*नाम|नाम)\s+([^\s\.\,]+(?:\s+[^\s\.\,]+){0,2})\s*(?:है|हवे|बा)/);
    if (hiNameMatch && hiNameMatch[1]) {
      nameValue = hiNameMatch[1].trim();
      nameConf = 0.90;
    }
  }

  // 4. Location extraction
  let locValue: string | null = null;
  let locConf = 0;

  // Search known craft hubs (English)
  for (const hub of CRAFT_HUBS_EN) {
    const regex = new RegExp(`\\b${hub}\\b`, 'i');
    if (regex.test(text)) {
      locValue = hub;
      locConf = 0.85;
      break;
    }
  }

  // Search known craft hubs (Hindi)
  if (!locValue) {
    for (const hub of CRAFT_HUBS_HI) {
      if (text.includes(hub)) {
        locValue = hub;
        locConf = 0.85;
        break;
      }
    }
  }

  // Check preposition context: "from [place], [state]"
  const fromMatch = text.match(/(?:from|living in|resident of|in)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z][a-zA-Z]+)?)/);
  if (fromMatch && fromMatch[1]) {
    const candidate = fromMatch[1].trim();
    if (!locValue || locConf < 0.9) {
      locValue = locValue ? `${locValue}, ${candidate}`.replace(new RegExp(`\\b${locValue}\\b.*\\b${locValue}\\b`, 'i'), locValue) : candidate;
      locConf = 0.85;
    }
  }

  // 5. Craft extraction
  let craftValue: string | null = null;
  let craftConf = 0;

  const lowerText = text.toLowerCase();
  for (const entry of CRAFT_TYPES) {
    const hit = entry.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
    if (hit) {
      craftValue = entry.label;
      craftConf = 0.88;
      break;
    }
  }

  const nameField = makeField(nameValue, nameConf);
  const phoneField = makeField(phoneValue, phoneConf);
  const idField = makeField(idValue, idConf);
  const locField = makeField(locValue, locConf);
  const craftField = makeField(craftValue, craftConf);

  const fields = [nameField, phoneField, idField, locField, craftField];
  const populated = fields.filter(f => f.value !== null);
  const overallConfidence = populated.length > 0
    ? Number((populated.reduce((acc, f) => acc + f.confidence, 0) / populated.length).toFixed(2))
    : 0;

  return {
    name: nameField,
    phone: phoneField,
    artisanId: idField,
    location: locField,
    craft: craftField,
    rawTranscript: transcript,
    overallConfidence,
  };
}
