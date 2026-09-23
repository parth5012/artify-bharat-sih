import {NextResponse} from 'next/server';
import {readDb,ProductRecord} from '@/backend/db';

export const runtime='nodejs';

// Buyer order history: resolves an ONDC order id to the verified child
// products it contained. Public but PII-safe — only product authenticity
// fields and sold/ownership status are exposed; buyer identity never is.

function publicProduct(p:ProductRecord){
 return{id:p.id,name:p.name,craft:p.craft,description:p.description,materials:p.materials,price:p.price,parentHash:p.parentHash,childHash:p.childHash,serialNumber:p.serialNumber,status:p.status,ownership:p.ownership,soldAt:p.soldAt??null,createdAt:p.createdAt};
}

export async function GET(_request:Request,{params}:{params:{id:string}}){
 const db=await readDb();
 const order=db.ondcOrders.find(o=>o.id===params.id);
 if(!order)return NextResponse.json({found:false},{status:404});
 const lines=order.items.map(item=>{
  const product=db.products.find(p=>p.id===item.id||p.childHash===item.id);
  return product?{qty:item.qty,price:item.price,product:publicProduct(product)}:{qty:item.qty,price:item.price,product:null};
 });
 return NextResponse.json({found:true,orderId:order.id,status:order.status,placedAt:order.createdAt,lines});
}
