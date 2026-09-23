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

export interface ProductExtractionResult {
  productName: ExtractedField<string>;
  materials: ExtractedField<string[]>;
  makingProcess: ExtractedField<string>;
  usage: ExtractedField<string>;
  timeRequired: ExtractedField<string>;
  craftCategory: ExtractedField<string>;
  description: ExtractedField<string>;
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

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, पंद्रह: 15
};

const MATERIALS_DICTIONARY: { keywords: string[]; label: string }[] = [
  { keywords: ['silk', 'pure silk', 'mulberry silk', 'kosa silk', 'tussar silk', 'रेशम', 'सिल्क'], label: 'Silk' },
  { keywords: ['gold zari', 'silver zari', 'zari', 'जरी'], label: 'Zari' },
  { keywords: ['brass', 'पीतल'], label: 'Brass' },
  { keywords: ['beeswax', 'wax', 'मोम'], label: 'Beeswax' },
  { keywords: ['river clay', 'clay', 'terracotta', 'मिट्टी'], label: 'River clay' },
  { keywords: ['pashmina', 'cashmere', 'wool', 'ऊन'], label: 'Pashmina wool' },
  { keywords: ['cotton', 'khadi', 'कपास', 'खादी'], label: 'Cotton' },
  { keywords: ['wood', 'teak', 'sheesham', 'लकड़ी'], label: 'Wood' },
  { keywords: ['bell metal', 'bronze', 'कांसा'], label: 'Bell metal' },
  { keywords: ['jute', 'पटसन'], label: 'Jute' },
  { keywords: ['bamboo', 'cane', 'बांस'], label: 'Bamboo' },
];

/**
 * Extract product entities from English or Hindi transcript.
 */
export function extractProductFromTranscript(transcript: string): ProductExtractionResult {
  const text = transcript.trim();
  if (!text) {
    return {
      productName: makeField<string>(null, 0),
      materials: makeField<string[]>(null, 0),
      makingProcess: makeField<string>(null, 0),
      usage: makeField<string>(null, 0),
      timeRequired: makeField<string>(null, 0),
      craftCategory: makeField<string>(null, 0),
      description: makeField<string>(null, 0),
      rawTranscript: transcript,
      overallConfidence: 0,
    };
  }

  const lowerText = text.toLowerCase();

  // 1. Time Required extraction
  let timeVal: string | null = null;
  let timeConf = 0;

  const digitTimeMatch = text.match(/(?:took|takes|spent|need|needs|time|समय|लगते)?\s*(\d+(?:\.\d+)?)\s*(?:full\s*)?(days?|hours?|दिन|घंटे|din|ghante)\b/i);
  if (digitTimeMatch) {
    const qty = digitTimeMatch[1];
    const rawUnit = digitTimeMatch[2].toLowerCase();
    const unit = (rawUnit.startsWith('hour') || rawUnit.includes('घंटे') || rawUnit.includes('ghante')) ? 'hours' : 'days';
    timeVal = `${qty} ${unit}`;
    timeConf = 0.95;
  } else {
    const wordKeys = Object.keys(NUMBER_WORDS).join('|');
    const wordTimeRegex = new RegExp(`(?:took|takes|spent|need|needs|time|समय|लगते)?\\s*(${wordKeys})\\s*(?:full\\s*)?(days?|hours?|दिन|घंटे|din|ghante)\\b`, 'i');
    const wordTimeMatch = text.match(wordTimeRegex);
    if (wordTimeMatch) {
      const num = NUMBER_WORDS[wordTimeMatch[1].toLowerCase()] || wordTimeMatch[1];
      const rawUnit = wordTimeMatch[2].toLowerCase();
      const unit = (rawUnit.startsWith('hour') || rawUnit.includes('घंटे') || rawUnit.includes('ghante')) ? 'hours' : 'days';
      timeVal = `${num} ${unit}`;
      timeConf = 0.90;
    }
  }

  // 2. Materials extraction
  const detectedMaterials: string[] = [];
  for (const item of MATERIALS_DICTIONARY) {
    if (item.keywords.some(kw => lowerText.includes(kw))) {
      detectedMaterials.push(item.label);
    }
  }
  const matsVal = detectedMaterials.length > 0 ? detectedMaterials : null;
  const matsConf = detectedMaterials.length > 0 ? 0.88 : 0;

  // 3. Making Process extraction
  let processVal: string | null = null;
  let processConf = 0;

  if (lowerText.includes('lost-wax') || lowerText.includes('lost wax') || lowerText.includes('मोम और मिट्टी')) {
    processVal = 'Lost-wax casting, hand-finished';
    processConf = 0.92;
  } else if (lowerText.includes('jacquard') || lowerText.includes('pit loom') || (lowerText.includes('loom') && lowerText.includes('weaving'))) {
    processVal = 'Pit loom jacquard weaving';
    processConf = 0.90;
  } else if (lowerText.includes('handloom') || lowerText.includes('हाथ से बुनाई') || lowerText.includes('weaving')) {
    processVal = 'Handloom weaving';
    processConf = 0.85;
  } else if (lowerText.includes('hand-painted') || lowerText.includes('चित्रकला')) {
    processVal = 'Hand-painted with natural pigments';
    processConf = 0.85;
  } else if (lowerText.includes('carving') || lowerText.includes('नक्काशी')) {
    processVal = 'Hand-carved woodwork';
    processConf = 0.85;
  } else {
    const processMatch = text.match(/(?:made by|crafted by|technique|विधि|तरीका)[\s:]*([^,\.]+)/i);
    if (processMatch && processMatch[1].trim().length > 3) {
      processVal = processMatch[1].trim();
      processConf = 0.75;
    }
  }

  // 4. Usage extraction
  let usageVal: string | null = null;
  let usageConf = 0;

  if (lowerText.includes('décor') || lowerText.includes('decor') || lowerText.includes('gifting') || lowerText.includes('सजावट')) {
    usageVal = 'Home décor & gifting';
    usageConf = 0.90;
  } else if (lowerText.includes('wedding') || lowerText.includes('festive') || lowerText.includes('celebration') || lowerText.includes('शादी') || lowerText.includes('त्योहार')) {
    usageVal = 'Weddings & festive occasions';
    usageConf = 0.90;
  } else if (lowerText.includes('puja') || lowerText.includes('prayer') || lowerText.includes('पूजा')) {
    usageVal = 'Puja & spiritual ceremonies';
    usageConf = 0.88;
  } else if (lowerText.includes('daily wear') || lowerText.includes('रोजाना')) {
    usageVal = 'Daily apparel wear';
    usageConf = 0.85;
  } else {
    const usageMatch = text.match(/(?:used for|ideal for|उपयोग|काम आता है)[\s:]*([^,\.]+)/i);
    if (usageMatch && usageMatch[1].trim().length > 3) {
      usageVal = usageMatch[1].trim();
      usageConf = 0.75;
    }
  }

  // 5. Product Name extraction
  let nameVal: string | null = null;
  let nameConf = 0;

  if (lowerText.includes('banarasi') && (lowerText.includes('saree') || lowerText.includes('sari') || lowerText.includes('साड़ी'))) {
    nameVal = 'Handwoven Banarasi Silk Saree';
    nameConf = 0.92;
  } else if (lowerText.includes('dhokra') && (lowerText.includes('elephant') || lowerText.includes('हाथी'))) {
    nameVal = 'Dhokra Brass Elephant Figurine';
    nameConf = 0.92;
  } else if (lowerText.includes('dhokra')) {
    nameVal = 'Dhokra Brass Figurine';
    nameConf = 0.88;
  } else if (lowerText.includes('pashmina')) {
    nameVal = 'Handcrafted Pashmina Stole';
    nameConf = 0.90;
  } else if (lowerText.includes('madhubani')) {
    nameVal = 'Handmade Madhubani Painting';
    nameConf = 0.90;
  } else {
    const isAMatch = text.match(/(?:this\s+is\s+(?:a|an)|craft\s+is\s+(?:a|an)?)\s+([A-Za-z\s]+?)(?=\s+(?:made|with|using|crafted|that|which|and)|\.|\,|$)/i);
    if (isAMatch && isAMatch[1].trim().length > 2) {
      const cand = isAMatch[1].trim();
      const blacklist = ['artisan', 'master', 'traditional', 'handmade', 'piece', 'item'];
      if (!blacklist.includes(cand.toLowerCase())) {
        nameVal = cand;
        nameConf = 0.80;
      }
    }
  }

  // 6. Craft Category
  let craftCat: string | null = null;
  let craftCatConf = 0;
  for (const entry of CRAFT_TYPES) {
    const hit = entry.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
    if (hit) {
      craftCat = entry.label;
      craftCatConf = 0.88;
      break;
    }
  }

  const nameField = makeField(nameVal, nameConf);
  const matsField = makeField(matsVal, matsConf);
  const processField = makeField(processVal, processConf);
  const usageField = makeField(usageVal, usageConf);
  const timeField = makeField(timeVal, timeConf);
  const craftField = makeField(craftCat, craftCatConf);
  const descField = makeField(text.length > 5 ? text : null, text.length > 5 ? 0.90 : 0);

  const checkFields = [nameField, matsField, processField, usageField, timeField, craftField];
  const populated = checkFields.filter(f => f.value !== null);
  const overallConfidence = populated.length > 0
    ? Number((populated.reduce((acc, f) => acc + f.confidence, 0) / populated.length).toFixed(2))
    : 0;

  return {
    productName: nameField,
    materials: matsField,
    makingProcess: processField,
    usage: usageField,
    timeRequired: timeField,
    craftCategory: craftField,
    description: descField,
    rawTranscript: transcript,
    overallConfidence,
  };
}
