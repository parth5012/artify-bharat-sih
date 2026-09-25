/**
 * Dummy Artisan Registry for Prototype/Demo
 * 
 * WARNING: This is ONLY for prototype/demo purposes.
 * These are NOT real government-verified artisan records.
 * 
 * In production, replace this with actual artisan verification API.
 */

export interface RegisteredArtisan {
  artisanId: string;
  name: string;
  phone: string;
  location: string;
  craft: string;
  registeredDate?: string;
  verified: boolean;
}

// Dummy artisan registry for demo/testing
export const DUMMY_ARTISAN_REGISTRY: RegisteredArtisan[] = [
  {
    artisanId: 'ART-2041',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    location: 'Bastar, Chhattisgarh',
    craft: 'Handloom & Weaving',
    registeredDate: '2024-01-15',
    verified: true,
  },
  {
    artisanId: 'ART-2042',
    name: 'Sunita Devi',
    phone: '9876543211',
    location: 'Jaipur, Rajasthan',
    craft: 'Hand Block Printing',
    registeredDate: '2024-02-10',
    verified: true,
  },
  {
    artisanId: 'ART-2043',
    name: 'Mohan Lal',
    phone: '9876543212',
    location: 'Kutch, Gujarat',
    craft: 'Embroidery & Textile',
    registeredDate: '2024-03-05',
    verified: true,
  },
  {
    artisanId: 'ART-2044',
    name: 'Kamla Bai',
    phone: '9876543213',
    location: 'Madhya Pradesh',
    craft: 'Bamboo Craft',
    registeredDate: '2024-03-20',
    verified: true,
  },
  {
    artisanId: 'ART-2045',
    name: 'Abdul Rahman',
    phone: '9876543214',
    location: 'Srinagar, Jammu & Kashmir',
    craft: 'Wood Carving',
    registeredDate: '2024-04-01',
    verified: true,
  },
];

export interface VerificationResult {
  found: boolean;
  artisan?: RegisteredArtisan;
  matchStatus?: {
    nameMatch: boolean;
    phoneMatch: boolean;
    locationMatch: boolean;
    craftMatch: boolean;
    overallMatch: boolean;
  };
}

/**
 * Simulate artisan ID verification with network delay
 * In production, this would call a real government verification API
 */
export async function verifyArtisanId(artisanId: string): Promise<VerificationResult> {
  // Simulate network delay (500-1500ms)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  const normalizedId = artisanId.toUpperCase().trim();
  const artisan = DUMMY_ARTISAN_REGISTRY.find(a => a.artisanId === normalizedId);

  if (!artisan) {
    return { found: false };
  }

  return {
    found: true,
    artisan,
  };
}

/**
 * Compare spoken details against registered artisan record
 */
export function compareArtisanDetails(
  spoken: {
    name?: string;
    phone?: string;
    location?: string;
    craft?: string;
  },
  registered: RegisteredArtisan
): VerificationResult['matchStatus'] {
  const normalize = (str?: string) => (str || '').toLowerCase().trim();
  const normalizePhone = (phone?: string) => (phone || '').replace(/\D/g, '');

  const nameMatch = spoken.name
    ? normalize(spoken.name) === normalize(registered.name)
    : true; // If not spoken, consider as match

  const phoneMatch = spoken.phone
    ? normalizePhone(spoken.phone) === normalizePhone(registered.phone)
    : true;

  // Location match - partial match acceptable (e.g., "Bastar" matches "Bastar, Chhattisgarh")
  const locationMatch = spoken.location
    ? normalize(registered.location).includes(normalize(spoken.location)) ||
      normalize(spoken.location).includes(normalize(registered.location))
    : true;

  // Craft match - partial match acceptable
  const craftMatch = spoken.craft
    ? normalize(registered.craft).includes(normalize(spoken.craft)) ||
      normalize(spoken.craft).includes(normalize(registered.craft))
    : true;

  const overallMatch = nameMatch && phoneMatch && locationMatch && craftMatch;

  return {
    nameMatch,
    phoneMatch,
    locationMatch,
    craftMatch,
    overallMatch,
  };
}

/**
 * Get test scenarios for demo
 */
export function getTestScenarios() {
  return [
    {
      label: 'ART-2041 - Perfect Match',
      artisanId: 'ART-2041',
      spokenDetails: {
        name: 'Ramesh Kumar',
        phone: '9876543210',
        location: 'Bastar, Chhattisgarh',
        craft: 'Handloom & Weaving',
      },
    },
    {
      label: 'ART-2042 - Perfect Match',
      artisanId: 'ART-2042',
      spokenDetails: {
        name: 'Sunita Devi',
        phone: '9876543211',
        location: 'Jaipur, Rajasthan',
        craft: 'Hand Block Printing',
      },
    },
    {
      label: 'ART-9999 - Not Found',
      artisanId: 'ART-9999',
      spokenDetails: {
        name: 'Test User',
        phone: '9999999999',
        location: 'Unknown',
        craft: 'Unknown',
      },
    },
    {
      label: 'ART-2041 - Wrong Phone',
      artisanId: 'ART-2041',
      spokenDetails: {
        name: 'Ramesh Kumar',
        phone: '9999999999', // Wrong phone
        location: 'Bastar, Chhattisgarh',
        craft: 'Handloom & Weaving',
      },
    },
  ];
}
