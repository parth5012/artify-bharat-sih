// Wayfinder #195 — Ministry proof: the ONDC-linked KPI is a documented,
// aggregate-only demo multiplier labelled "Aggregated". The ministry demo path
// (frontend/lib/ministry/data.ts) is client-side and cannot read the
// server-side ONDC-linked intents (db.ondcOrders + product.ondc_listing audits),
// so the derivation is documented here and asserted so it cannot drift silently.
//
// The upstream map package ships ESM-only .js (unparsable by ts-jest's CJS
// runner), so it is mocked with the real state ids (seed records resolve
// stateById at import time) — the KPI maths under test needs populated states,
// not the full India geometry.
jest.mock('@svg-maps/india',()=>({
 __esModule:true,
 default:{viewBox:'0 0 100 100',locations:[
  ['up','Uttar Pradesh'],['wb','West Bengal'],['rj','Rajasthan'],['br','Bihar'],
  ['tn','Tamil Nadu'],['gj','Gujarat'],['or','Odisha'],['as','Assam'],
  ['mh','Maharashtra'],['ka','Karnataka'],['ap','Andhra Pradesh'],['tg','Telangana'],
  ['ct','Chhattisgarh'],['mp','Madhya Pradesh'],['kl','Kerala'],['jk','Jammu & Kashmir'],
  ['jh','Jharkhand'],['hr','Haryana'],['pb','Punjab'],['ut','Uttarakhand'],
  ['hp','Himachal Pradesh'],['dl','Delhi'],['mn','Manipur'],['tr','Tripura'],
  ['ml','Meghalaya'],['nl','Nagaland'],['ar','Arunachal Pradesh'],['mz','Mizoram'],
  ['sk','Sikkim'],['ga','Goa'],['py','Puducherry'],['ch','Chandigarh'],
  ['dn','Dadra & Nagar Haveli'],['dd','Daman & Diu'],['an','Andaman & Nicobar'],
  ['ld','Lakshadweep'],
 ].map(([id,name])=>({id,name,path:'M0 0'}))},
}));
import {ONDC_LINKED_DEMO_MULTIPLIER,ONDC_LINKED_LABEL,kpis,ondcLinkedFromListings} from '../lib/ministry/data';

describe('Ministry ONDC-linked proof (#195)',()=>{
 it('exports the documented demo multiplier',()=>{
  expect(ONDC_LINKED_DEMO_MULTIPLIER).toBe(0.42);
 });

 it('derives the ONDC-linked KPI from the aggregate listings count',()=>{
  const K=kpis();
  expect(K.ondc).toBe(ondcLinkedFromListings(K.listings));
  expect(K.ondc).toBeLessThanOrEqual(K.listings);
 });

 it('is deterministic and zero-safe',()=>{
  expect(ondcLinkedFromListings(0)).toBe(0);
  expect(ondcLinkedFromListings(1000)).toBe(420);
  expect(ondcLinkedFromListings(1000)).toBe(ondcLinkedFromListings(1000));
 });

 it('labels the figure Aggregated with no individual financial data',()=>{
  expect(ONDC_LINKED_LABEL.sub).toContain('Aggregated');
  expect(ONDC_LINKED_LABEL.value).not.toMatch(/[₹$]/);
  expect(ONDC_LINKED_LABEL.sub).not.toMatch(/[₹$]/);
  expect(ONDC_LINKED_LABEL.value).not.toMatch(/\d{10}/);
 });
});
