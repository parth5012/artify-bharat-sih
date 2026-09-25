/**
 * SHA-256 hashing utilities for product authenticity
 */

/**
 * Generate SHA-256 hash from product data
 */
export async function generateProductHash(data: {
  productId: string;
  artisanId: string;
  productName: string;
  timestamp: number;
}): Promise<string> {
  const input = `${data.productId}|${data.artisanId}|${data.productName}|${data.timestamp}`;
  
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Shorten hash for display (first 4 and last 4 characters)
 */
export function shortenHash(hash: string): string {
  if (hash.length < 8) return hash;
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

/**
 * Generate verification URL
 */
export function getVerificationUrl(productId: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://artify.example.com';
  return `${baseUrl}/verify/${productId}`;
}
