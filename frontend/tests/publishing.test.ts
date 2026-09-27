import {deriveChecklist,initialPublishState,listingSource,PublishState} from '../lib/publishing';

// Wayfinder #195 — Step 6 "Ready" checklist derives from REAL publish status.
// The component used to advance on setTimeout delays; every step now comes from
// the record page's progress + the POST /api/products `ondc` payload.

function ready(overrides:Partial<PublishState>={}):PublishState{
 return{...initialPublishState(),registered:true,photos:true,...overrides};
}

describe('publishing checklist derivation (#195)',()=>{
 it('starts with registration active and nothing claimed',()=>{
  const view=deriveChecklist(initialPublishState());
  expect(view.steps.map(s=>s.status)).toEqual(['active','pending','pending','pending','pending']);
  expect(view.complete).toBe(false);
  expect(view.source).toBeNull();
  expect(view.listingFailure).toBeNull();
  expect(view.ondcDetail).toBeNull();
 });

 it('activates the ONDC step only once the local record and photos are saved',()=>{
  const view=deriveChecklist(ready());
  expect(view.steps.map(s=>s.status)).toEqual(['done','done','active','pending','pending']);
  expect(view.complete).toBe(false);
 });

 it('marks ONDC done with the live-sandbox source badge and on_search ack detail',()=>{
  const view=deriveChecklist(ready({listing:{listed:true,attempts:1,catalogId:'cat_1'}}));
  expect(view.steps[2]).toEqual({id:'ondc',status:'done'});
  expect(view.source).toBe('live-sandbox');
  expect(view.ondcDetail).toContain('cat_1');
  expect(view.ondcDetail).toContain('on_search');
  expect(view.listingFailure).toBeNull();
 });

 it('shows the offline-fallback source badge for the Grill A1 fallback publish',()=>{
  const view=deriveChecklist(ready({listing:{listed:true,attempts:3,fallback:true,reason:'sandbox unreachable after 3 attempts: ECONNREFUSED'}}));
  expect(view.steps[2].status).toBe('done');
  expect(view.source).toBe('offline-fallback');
  expect(view.listingFailure).toBeNull();
 });

 it('fails the ONDC step with the sandbox reason and blocks the later steps',()=>{
  const view=deriveChecklist(ready({listing:{listed:false,attempts:1,reason:'ONDC listing rejected with 422'}}));
  expect(view.steps.map(s=>s.status)).toEqual(['done','done','failed','pending','pending']);
  expect(view.listingFailure).toContain('422');
  expect(view.complete).toBe(false);
  expect(view.ondcDetail).toBeNull();
 });

 it('keeps the failed ONDC step in progress while Try Again is running',()=>{
  const view=deriveChecklist(ready({listing:{listed:false,attempts:1,reason:'ONDC listing rejected with 422'},retrying:true}));
  expect(view.steps[2].status).toBe('active');
  expect(view.retrying).toBe(true);
  expect(view.listingFailure).toContain('422');
  expect(view.complete).toBe(false);
 });

 it('does not complete until the durable local publish (GeM packet gates it too)',()=>{
  const listed=ready({listing:{listed:true,attempts:1}});
  expect(deriveChecklist(listed).steps.map(s=>s.status)).toEqual(['done','done','done','active','pending']);
  expect(deriveChecklist(listed).complete).toBe(false);

  // Durable publish alone is no longer enough: the GeM packet is a real step (#205).
  const noPacket=deriveChecklist({...listed,available:true});
  expect(noPacket.steps.map(s=>s.status)).toEqual(['done','done','done','active','done']);
  expect(noPacket.complete).toBe(false);

  const view=deriveChecklist({...listed,available:true,packet:{status:'ready'}});
  expect(view.steps.map(s=>s.status)).toEqual(['done','done','done','done','done']);
  expect(view.complete).toBe(true);
 });

 it('never completes while the listing is rejected, even if local work finished',()=>{
  const view=deriveChecklist(ready({listing:{listed:false,attempts:1,reason:'rejected'},available:true}));
  expect(view.complete).toBe(false);
  expect(view.steps[2].status).toBe('failed');
 });

 it('surfaces the hard-failure message for the record page error screen',()=>{
  const view=deriveChecklist({...initialPublishState(),error:'Unable to register product'});
  expect(view.error).toBe('Unable to register product');
  expect(view.complete).toBe(false);
 });

 it('maps listing sources: live unless the A1 fallback ran',()=>{
  expect(listingSource(null)).toBeNull();
  expect(listingSource({listed:true,attempts:1})).toBe('live-sandbox');
  expect(listingSource({listed:false,attempts:1})).toBe('live-sandbox');
  expect(listingSource({listed:true,attempts:3,fallback:true})).toBe('offline-fallback');
 });
});

// --- Wayfinder #205: the GeM step tells the truth (grill G4 + G5) -------------

import {readFileSync} from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..');
const read = (rel: string) => readFileSync(path.join(REPO, rel), 'utf8');

function listed(overrides: Partial<PublishState> = {}): PublishState {
  return {...ready({listing: {listed: true, attempts: 1}, available: true}), ...overrides};
}

describe('GeM step derives from the real packet result (#205, grill G4)', () => {
  it('never marks the GeM step done without a packet result — no simulated completion', () => {
    const view = deriveChecklist(listed());
    expect(view.steps[3].status).toBe('active');
    expect(view.complete).toBe(false);
    expect(view.packetFailure).toBeNull();
  });

  it('marks the GeM step done only for a ready packet, and then completes', () => {
    const view = deriveChecklist(listed({packet: {status: 'ready'}}));
    expect(view.steps[3]).toEqual({id: 'gem', status: 'done'});
    expect(view.steps.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(view.complete).toBe(true);
    expect(view.packetFailure).toBeNull();
  });

  it('fails the GeM step with the packet reason, exposes retry state, and blocks completion', () => {
    const view = deriveChecklist(
      listed({packet: {status: 'failed', reason: 'packet generation failed'}}),
    );
    expect(view.steps[3]).toEqual({id: 'gem', status: 'failed'});
    expect(view.complete).toBe(false);
    expect(view.packetFailure).toBe('packet generation failed');
    expect(view.retryingPacket).toBe(false);

    // Try Again in flight: the failed step is being re-attempted, not settled.
    const retrying = deriveChecklist(
      listed({packet: {status: 'failed', reason: 'packet generation failed'}, retryingPacket: true}),
    );
    expect(retrying.steps[3]).toEqual({id: 'gem', status: 'active'});
    expect(retrying.retryingPacket).toBe(true);
    expect(retrying.complete).toBe(false);
  });

  it('holds the steps after GeM until the packet is ready', () => {
    const before = deriveChecklist(listed({available: false}));
    expect(before.steps[3].status).toBe('active');
    expect(before.steps[4].status).toBe('pending');

    const after = deriveChecklist(listed({available: false, packet: {status: 'ready'}}));
    expect(after.steps[3].status).toBe('done');
    expect(after.steps[4].status).toBe('active');
  });
});

describe('GeM publish surfaces never fake a listing (#205, grill G5)', () => {
  it('never renders a bare "Listed on GeM" claim', () => {
    for (const rel of [
      'frontend/lib/publishing.ts',
      'frontend/components/PublishingFlow.tsx',
      'frontend/app/(artisan)/(protected)/record/page.tsx',
    ]) {
      expect(read(rel)).not.toContain('Listed on GeM');
    }
  });

  it('never links to a fabricated gem.gov.in product page', () => {
    for (const rel of [
      'frontend/components/PublishingFlow.tsx',
      'frontend/app/(artisan)/(protected)/record/page.tsx',
    ]) {
      expect(read(rel)).not.toContain('gem.gov.in/product');
    }
  });

  it('labels the GeM step as a packet, and carries the locked G4 badge text', () => {
    const flow = read('frontend/components/PublishingFlow.tsx');
    expect(flow).not.toContain("'Listing on GeM'");
    expect(flow).toContain('GeM approval packet');
    expect(flow).toContain('Packet ready (manual upload)');
  });

  it('retries the packet through POST /api/gem/packet, never re-registering', () => {
    const page = read('frontend/app/(artisan)/(protected)/record/page.tsx');
    expect(page).toContain('/api/gem/packet');
    expect(page).toContain('onRetryPacket');
  });
});

describe('#205 packet retry UX hardening (CodeReviewer findings)', () => {
  it('sets the packet retry flag only from retryPacket — never on the initial request', () => {
    const page = read('frontend/app/(artisan)/(protected)/record/page.tsx');
    const requestBlock = page.slice(
      page.indexOf('const requestPacket='),
      page.indexOf('const retryPacket='),
    );
    expect(requestBlock).not.toContain('retryingPacket:true');
    const retryBlock = page.slice(
      page.indexOf('const retryPacket='),
      page.indexOf('const downloadGemPacket='),
    );
    expect(retryBlock).toContain('retryingPacket:true');
  });

  it('staggers the XML/CSV saves, guards concurrency, and ships the manifest too', () => {
    const page = read('frontend/app/(artisan)/(protected)/record/page.tsx');
    const download = page.slice(page.indexOf('const downloadGemPacket='));
    const first = download.indexOf('gem-catalog-');
    const second = download.lastIndexOf('gem-catalog-');
    expect(first).not.toBe(-1);
    expect(second).not.toBe(first);
    // The second file save must be deferred: sync double-download drops the CSV on mobile.
    expect(download.slice(first, second)).toContain('setTimeout');
    expect(download).toContain('gem-manifest-');
    expect(download).toContain('packetting.current');
  });

  it('disables the download button with a loading state while the packet fetch runs', () => {
    const flow = read('frontend/components/PublishingFlow.tsx');
    expect(flow).toContain('aria-busy={downloading}');
    expect(flow).toContain('downloading ?');
    expect(flow).toContain('Downloading');
  });

  it('spins the hero while a retry is in flight instead of a red X', () => {
    const flow = read('frontend/components/PublishingFlow.tsx');
    expect(flow).toContain('inRetry');
    expect(flow).toContain('(failed || packetFailed) && !inRetry');
  });

  it('announces each step status to screen readers', () => {
    const flow = read('frontend/components/PublishingFlow.tsx');
    expect(flow).toContain('sr-only');
    expect(flow).toContain('— {status}');
  });
});
