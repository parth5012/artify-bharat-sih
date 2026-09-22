import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export type User={id:string;phone:string;name?:string;artisanId?:string;place?:string;craft?:string;createdAt:number;updatedAt:number};
export type OtpChallenge={phone:string;codeHash:string;expiresAt:number;attempts:number};
export type Session={tokenHash:string;userId:string;expiresAt:number};
export type ProductRecord={id:string;parentHash:string;childHash:string;serialNumber:string;artisanId:string;name:string;craft:string;price:number;description:string;materials:string[];status:'published'|'archived';createdAt:number};
export type OndcOrderIntent={id:string;items:{id:string;qty:number;price:number}[];buyer:{name:string;phone:string;line:string;city:string;state:string;pin:string;language:string};status:'created'|'paid'|'failed';createdAt:number;updatedAt:number};
export type Database={users:User[];otpChallenges:OtpChallenge[];sessions:Session[];products:ProductRecord[];ondcOrders:OndcOrderIntent[]};

const file=join(process.cwd(),'data','artifact-db.json');
const empty:Database={users:[],otpChallenges:[],sessions:[],products:[],ondcOrders:[]};

export async function readDb():Promise<Database>{
 try{const db=JSON.parse(await readFile(file,'utf8')) as Partial<Database>;return{...empty,...db,ondcOrders:db.ondcOrders??[]}}
 catch{return empty}
}
export async function writeDb(db:Database){await mkdir(join(process.cwd(),'data'),{recursive:true});await writeFile(file,JSON.stringify(db,null,2),'utf8')}