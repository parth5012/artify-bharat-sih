import {randomBytes} from 'node:crypto';
import {OndcOrderIntent,readDb,writeDb} from './db';

export async function createOndcIntent(input:Omit<OndcOrderIntent,'id'|'status'|'createdAt'|'updatedAt'>){
 const now=Date.now();const order:OndcOrderIntent={...input,id:'ondc_'+randomBytes(10).toString('hex'),status:'created',createdAt:now,updatedAt:now};const db=await readDb();db.ondcOrders.push(order);await writeDb(db);return order;
}
export async function updateOndcIntent(id:string,status:'paid'|'failed'){const db=await readDb();const order=db.ondcOrders.find(x=>x.id===id);if(!order)return null;order.status=status;order.updatedAt=Date.now();await writeDb(db);return order}
export async function listProductOnOndc(product:{id:string;name:string;craft:string;price:number;description:string;materials:string[];parentHash:string;childHash:string}){
 const endpoint=process.env.ONDC_SELLER_LISTING_URL;if(!endpoint)return{listed:false,reason:'ONDC_SELLER_LISTING_URL is not configured'};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.ONDC_SELLER_TOKEN??''}`},body:JSON.stringify(product)});if(!response.ok)throw new Error(`ONDC listing failed with ${response.status}`);return{listed:true};
}