import { openDB } from 'idb';
import type { CartItem } from '../types';

export const CART_KEY = 'artify-cart';
export const BUYER_PHONE_KEY = 'artify-buyer-phone';
export const CART_MAX_ITEMS = 5;
export const CART_CHANGE_EVENT = 'artify-cart-change';

function readCartSync(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCartSync(items: CartItem[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
  void persistCartIdb(items);
}

async function persistCartIdb(items: CartItem[]): Promise<void> {
  try {
    const db = await openDB('artifact_offline', 1);
    if (!db.objectStoreNames.contains('cart')) return;
    const tx = db.transaction('cart', 'readwrite');
    await tx.store.put({ key: CART_KEY, items, updatedAt: new Date().toISOString() });
    await tx.done;
  } catch {
    // localStorage is source of truth; idb is best-effort mirror
  }
}

export function totalQty(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function getCart(): CartItem[] {
  return readCartSync();
}

export function clearCart(): void {
  writeCartSync([]);
}

export function addToCart(product: CartItem['product'], qty = 1): CartItem[] {
  if (qty < 1) throw new Error('qty must be at least 1');
  const items = readCartSync();
  const existing = items.find((i) => i.product.id === product.id);
  const currentTotal = totalQty(items);
  if (currentTotal + qty > CART_MAX_ITEMS) {
    throw new Error(`Cart holds max ${CART_MAX_ITEMS} items total`);
  }
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ product, qty });
  }
  writeCartSync(items);
  return items;
}

export function removeFromCart(productId: string): CartItem[] {
  const items = readCartSync().filter((i) => i.product.id !== productId);
  writeCartSync(items);
  return items;
}

export function updateCartQty(productId: string, qty: number): CartItem[] {
  const items = readCartSync();
  const found = items.find((i) => i.product.id === productId);
  if (!found) throw new Error(`Product ${productId} not in cart`);
  if (qty <= 0) return removeFromCart(productId);
  const othersTotal = totalQty(items) - found.qty;
  if (othersTotal + qty > CART_MAX_ITEMS) {
    throw new Error(`Cart holds max ${CART_MAX_ITEMS} items total`);
  }
  found.qty = qty;
  writeCartSync(items);
  return items;
}

export function getBuyerPhone(): string | null {
  return window.localStorage.getItem(BUYER_PHONE_KEY);
}

export function setBuyerPhone(phone: string): void {
  window.localStorage.setItem(BUYER_PHONE_KEY, phone);
}

export function clearBuyerPhone(): void {
  window.localStorage.removeItem(BUYER_PHONE_KEY);
}
