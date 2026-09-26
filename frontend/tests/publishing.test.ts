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

 it('does not complete until the durable local publish (GeM stub rides on it)',()=>{
  const listed=ready({listing:{listed:true,attempts:1}});
  expect(deriveChecklist(listed).steps.map(s=>s.status)).toEqual(['done','done','done','active','pending']);
  expect(deriveChecklist(listed).complete).toBe(false);

  const view=deriveChecklist({...listed,available:true});
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
