import {enqueueProduct,readQueue,takeQueuedProduct} from '../lib/sync';

// Wayfinder #195 — offline queue preservation: a manual publish retry that
// succeeds must drop the queued copy of the same record, otherwise the queued
// replay (connectivity restored) would register a second product.

const mem=new Map<string,string>();
beforeAll(()=>{
 Object.defineProperty(globalThis,'localStorage',{
  configurable:true,
  value:{
   getItem:(key:string)=>mem.get(key)??null,
   setItem:(key:string,value:string)=>{mem.set(key,value)},
   removeItem:(key:string)=>{mem.delete(key)},
   clear:()=>{mem.clear()},
  },
 });
});
afterAll(()=>{mem.clear()});
beforeEach(()=>{mem.clear()});

const queued=(seed:string)=>({name:'Dhokra Elephant',craft:'metal',description:'Lost-wax cast brass elephant',price:2499,materials:['Brass'],queuedAtSeed:seed});

describe('offline queue vs manual retry (#195)',()=>{
 it('drops the queued product once a manual publish retry succeeds',()=>{
  enqueueProduct(queued('rec_1'));
  expect(readQueue()).toHaveLength(1);

  const taken=takeQueuedProduct('rec_1');
  expect(taken?.kind).toBe('product');
  expect(taken?.payload.queuedAtSeed).toBe('rec_1');
  expect(readQueue()).toHaveLength(0);
 });

 it('leaves other records and absent entries untouched',()=>{
  enqueueProduct(queued('rec_1'));
  expect(takeQueuedProduct('rec_2')).toBeNull();
  expect(readQueue()).toHaveLength(1);

  expect(takeQueuedProduct('rec_1')).not.toBeNull();
  expect(takeQueuedProduct('rec_1')).toBeNull();
  expect(readQueue()).toHaveLength(0);
 });
});
