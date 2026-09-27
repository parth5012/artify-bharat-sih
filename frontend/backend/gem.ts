/**
 * Server-only GeM packet assembly + reserved future-API env seam (grill G6/G8).
 *
 * Wayfinder #204, map #201. Builds `{catalog, xml, csv, manifest}` from a
 * product + artisan through the PURE mapper (`./gem-mapper`, #202/#203) — no
 * network: GeM exposes no public seller catalog-upload API, so the packet is
 * pasted into the dashboard's 5-stage form trail (manual lane).
 *
 * `GEM_PORTAL_API_URL` / `GEM_SELLER_TOKEN` are RESERVED for a future
 * GeM-approved API (registration/grant is unknowable until the packet flow is
 * green — map #201 "Not yet specified"). Packet generation needs neither; when
 * unset `getGemEnv()` answers the ONDC grill-A1-symmetric unconfigured verdict.
 *
 * Server-only invariant (`frontend/tests/env-leak.test.ts`, #204 needles):
 * this module may be imported ONLY under `frontend/app/api/**` and
 * `frontend/backend/**` — never `NEXT_PUBLIC_`-prefixed, never value-imported
 * by `frontend/lib/` or `frontend/components/`.
 */

import {buildGemManifest, mapProductToGemCatalog, mapProductToGemCsv, mapProductToGemXml} from './gem-mapper';
import type {GemCatalog, GemManifest} from './gem-mapper';
import type {ProductRecord, User} from './db';

export type GemEnv = {
  configured: boolean;
  /** Present only when unconfigured — the human-readable verdict. */
  reason?: string;
  /** Present only when configured. Never carries the seller token. */
  portalUrl?: string;
};

/** Reserved-seam status. Mirrors the ONDC grill-A1 unconfigured shape. */
export function getGemEnv(): GemEnv {
  const portalUrl = process.env.GEM_PORTAL_API_URL;
  if (!portalUrl) return {configured: false, reason: 'GEM_PORTAL_API_URL is not configured'};
  return {configured: true, portalUrl};
}

export type GemPacket = {
  catalog: GemCatalog;
  xml: string;
  csv: string;
  manifest: GemManifest;
  /** Configured/unconfigured verdict for the future API — never a secret. */
  env: GemEnv;
};

export type GemPacketInput = {
  product: ProductRecord;
  artisan?: User | null;
  /**
   * Digital Heritage Passport shortcode when the caller has one. Absent ->
   * empty (the DB stores no shortcode; nothing is derived or invented here,
   * same stance as #193's passport passthrough).
   */
  shortcode?: string;
  /**
   * Fetchable image URLs for `stage5_media`. The media store keeps photos as
   * base64 data URLs, so the packet route passes none — the operator attaches
   * the 3 dashboard images by hand (grill G4 badge: "Packet ready (manual
   * upload)").
   */
  images?: string[];
};

/**
 * `User.place` is written as `"<city>, <state>"` across the repo
 * (`'Varanasi, Uttar Pradesh'`). Take the segment after the last comma as the
 * state; a single-token place yields `''` rather than a guess.
 */
function stateFromPlace(place?: string): string {
  const value = (place ?? '').trim();
  if (!value.includes(',')) return '';
  return value.slice(value.lastIndexOf(',') + 1).trim();
}

/** Assemble the full manual-upload packet for one product. */
export function buildGemPacket(input: GemPacketInput): GemPacket {
  const {product, artisan} = input;
  const place = artisan?.place ?? '';
  const packetInput = {
    id: product.id,
    title: product.name,
    description: product.description,
    price: product.price,
    shortcode: input.shortcode ?? '',
    passportHash: product.childHash,
    artisanName: artisan?.name ?? product.artisanId,
    trifedId: artisan?.artisanId,
    state: stateFromPlace(place),
    clusterName: place,
    craft: product.craft,
    giTag: undefined,
    parentHash: product.parentHash,
    // Grill G3: the fair-wage tier's list price IS the offer; MRP derives from it.
    offerPrice: product.price,
    deliveryLocation: place,
    // The DB has no stock counter; the 1-of-1 record is either held or sold.
    stock: product.ownership === 'sold' ? 0 : 1,
    leadTimeDays: 7,
    images: input.images ?? [],
    // The operator ticks GeM's terms box at the dashboard — never pre-accepted.
    termsAccepted: false,
  };

  return {
    catalog: mapProductToGemCatalog(packetInput),
    xml: mapProductToGemXml(packetInput),
    csv: mapProductToGemCsv(packetInput),
    manifest: buildGemManifest(packetInput),
    env: getGemEnv(),
  };
}
