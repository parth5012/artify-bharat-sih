'use client';

// Wayfinder #195 — Step 6 "Ready" checklist derivation.
//
// The checklist used to advance on a fixed setTimeout sequence (simulated
// delays). It now derives every step from the REAL publish progress the record
// page reports: local Digital Heritage Passport record -> photos/hash -> the
// `ondc` payload of POST /api/products ({listed, attempts, catalogId, fallback,
// reason}) -> durable local publish. No timers, no invented statuses.
//
// Server-only invariant: this is client code. It consumes the API response
// only — no process.env, no ONDC_* reads (guarded by tests/env-leak.test.ts).

/** `ondc` object returned by POST /api/products (#193) and the #195 retry route. */
export type OndcListingStatus={
 listed:boolean;
 attempts:number;
 /** Sandbox catalog id from the on_search listing ack, when it returns one. */
 catalogId?:string;
 /** Grill A1: true when the sandbox was unreachable/unset and the mocked publish ran. */
 fallback?:boolean;
 reason?:string;
};

export type PublishStepId='registered'|'photos'|'ondc'|'gem'|'available';
export type PublishStepStatus='pending'|'active'|'done'|'failed';

export type PublishState={
 /** Local record created (`createRecord`) — checklist step "Product registered". */
 registered:boolean;
 /** Photo thumbnails + Digital Heritage Passport hash generated. */
 photos:boolean;
 /** `ondc` from POST /api/products, or from a Try Again relist (#195). */
 listing:OndcListingStatus|null;
 /** Local marketplace publish durable + productId persisted. */
 available:boolean;
 /** Hard failure (network / rejected POST). The offline queue entry is written by the caller. */
 error:string|null;
 /** A listing Try Again attempt is in flight. */
 retrying:boolean;
};

/** Grill A1 source badge: did this publish hit the live sandbox or the mock? */
export type PublishSource='live-sandbox'|'offline-fallback';

export type PublishStepView={id:PublishStepId;status:PublishStepStatus};

export type PublishChecklist={
 steps:PublishStepView[];
 source:PublishSource|null;
 /** Proof line for a listed ONDC step (`on_search` ack + attempts + catalog id). */
 ondcDetail:string|null;
 /** Reason when the sandbox rejected the listing (`listed:false`). */
 listingFailure:string|null;
 error:string|null;
 retrying:boolean;
 complete:boolean;
};

export const PUBLISH_STEPS:PublishStepId[]=['registered','photos','ondc','gem','available'];

export function initialPublishState():PublishState{
 return{registered:false,photos:false,listing:null,available:false,error:null,retrying:false};
}

export function listingSource(listing:OndcListingStatus|null):PublishSource|null{
 if(!listing)return null;
 return listing.fallback?'offline-fallback':'live-sandbox';
}

// GeM has no listing API in this repo — it is a stub channel (same stance as
// the #194 GeM/WhatsApp delist stubs), so its step completes with the durable
// local publish instead of a timer. Documented in
// docs/marketplace-publishing-flow.md; only the ONDC step is backend-backed.
export function deriveChecklist(state:PublishState):PublishChecklist{
 const {registered,photos,listing,available,error,retrying}=state;
 const listed=!!listing?.listed;
 const rejected=!!listing&&!listing.listed;

 const raw:PublishStepStatus[]=[
  registered?'done':'pending',
  photos?'done':'pending',
  rejected?'failed':(listed?'done':'pending'),
  available?'done':'pending',
  available?'done':'pending',
 ];
 // Try Again in flight: the rejected step is being re-attempted, not settled.
 if(retrying&&raw[2]==='failed')raw[2]='active';

 for(let i=0;i<raw.length;i++){
  if(raw[i]==='done')continue;
  // The first unfinished step is active only when every earlier step is done;
  // a rejected step leaves no active step (the failure panel owns attention).
  if(raw[i]==='pending'&&raw.slice(0,i).every(s=>s==='done'))raw[i]='active';
  break;
 }

 const ondcDetail=listing&&listed
  ? `on_search ack · ${listing.attempts} attempt${listing.attempts===1?'':'s'}${listing.catalogId?` · catalog ${listing.catalogId}`:''}`
  : null;

 return{
  steps:PUBLISH_STEPS.map((id,i)=>({id,status:raw[i]})),
  source:listingSource(listing),
  ondcDetail,
  listingFailure:rejected?(listing?.reason??'ONDC listing was rejected by the sandbox'):null,
  error,
  retrying,
  complete:registered&&photos&&listed&&available,
 };
}
