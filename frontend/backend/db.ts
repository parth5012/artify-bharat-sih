import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool,PoolClient} from 'pg';

export type User={id:string;phone:string;name?:string;artisanId?:string;place?:string;craft?:string;pinHash?:string;createdAt:number;updatedAt:number};
export type OtpChallenge={phone:string;codeHash:string;expiresAt:number;attempts:number};
export type Session={tokenHash:string;userId:string;expiresAt:number};
export type ProductRecord={id:string;parentHash:string;childHash:string;serialNumber:string;artisanId:string;name:string;craft:string;price:number;description:string;materials:string[];status:'published'|'archived';ownership:'artisan'|'sold';soldAt?:number;orderId?:string;createdAt:number};
export type OndcOrderIntent={id:string;items:{id:string;qty:number;price:number;serialNumbers?:string[]}[];buyer:{name:string;phone:string;line:string;city:string;state:string;pin:string;language:string};status:'created'|'paid'|'failed';childUnitsSold?:boolean;createdAt:number;updatedAt:number};
export type AuditLog={id:string;ts:number;action:string;actor?:string|null;target?:string|null;ip?:string|null;detail?:Record<string,unknown>};
export type MediaRecord={id:string;artisanId:string;productId:string;kind:'photo'|'voice';dataUrl:string;lat:number|null;lng:number|null;ts:number;createdAt:number};
export type Database={users:User[];otpChallenges:OtpChallenge[];sessions:Session[];products:ProductRecord[];ondcOrders:OndcOrderIntent[];auditLogs:AuditLog[];media:MediaRecord[]};

export type DatabaseKey=Exclude<keyof Database,'__proto__'|'constructor'>;
export const emptyDb:Database={users:[],otpChallenges:[],sessions:[],products:[],ondcOrders:[],auditLogs:[],media:[]};

// PostgreSQL adapter (production). Setting DATABASE_URL moves persistence off
// the development JSON file. The JSON file stays ONLY as a local dev fallback
// so `npm run dev` keeps working without infrastructure. Supabase Postgres is
// compatible with this adapter.

const TABLE='app_state';
let pool:Pool|null=null;
export function hasDatabaseUrl(){return !!process.env.DATABASE_URL}
function pgPool():Pool{if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,max:10});return pool}

async function ensureSchema(client:PoolClient){
 // app_state: one JSONB document per collection.
 await client.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (key text PRIMARY KEY, value jsonb NOT NULL)`);
}

async function migrateLegacyJsonOnce(client:PoolClient){
 try{
  const raw=await readFile(join(process.cwd(),'data','artifact-db.json'),'utf8');
  const parsed=JSON.parse(raw) as Partial<Database>;
  for(const key of Object.keys(emptyDb)){
   const rows=parsed[key as keyof Database];
   if(Array.isArray(rows)&&rows.length){
    const existing=await client.query('SELECT 1 FROM '+TABLE+' WHERE key=$1',[key]);
    if((existing.rowCount??0)===0)await client.query(`INSERT INTO ${TABLE} (key,value) VALUES ($1,$2)`,[key,JSON.stringify(rows)]);
   }
  }
  // Retire the dev file only after a successful copy so a crash cannot lose data.
  await rename(join(process.cwd(),'data','artifact-db.json'),join(process.cwd(),'data','artifact-db.json.migrated'));
 }catch{/* no legacy file or unreadable file — nothing to migrate */}
}

export async function readDb():Promise<Database>{
 if(!hasDatabaseUrl())return legacyReadDb();
 const client=await pgPool().connect();
 try{
  await ensureSchema(client);
  // Migrate any legacy dev JSON file BEFORE reading so the first production
  // read already includes migrated rows.
  await migrateLegacyJsonOnce(client);
  const result=await client.query<{key:string;value:unknown}>(`SELECT key,value FROM ${TABLE}`);
  const db={...emptyDb};
  for(const row of result.rows){
   if(Object.prototype.hasOwnProperty.call(db,row.key)&&Array.isArray(row.value))(db as Record<string,unknown>)[row.key]=row.value;
  }
  return db;
 }finally{client.release()}
}

export async function writeDb(next:Database){
 if(!hasDatabaseUrl())return legacyWriteDb(next);
 const client=await pgPool().connect();
 try{
  await ensureSchema(client);
  for(const key of Object.keys(emptyDb)){
   await client.query(`INSERT INTO ${TABLE} (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,[key,JSON.stringify(next[key as DatabaseKey])]);
  }
 }finally{client.release()}
}

// Legacy JSON file persistence — local development fallback only.

const file=join(process.cwd(),'data','artifact-db.json');
async function legacyReadDb():Promise<Database>{
 try{const db=JSON.parse(await readFile(file,'utf8')) as Partial<Database>;return{...emptyDb,...db,ondcOrders:db.ondcOrders??[]}}
 catch{return emptyDb}
}
async function legacyWriteDb(db:Database){await mkdir(join(process.cwd(),'data'),{recursive:true});await writeFile(file,JSON.stringify(db,null,2),'utf8')}

export async function closePool(){if(pool){await pool.end();pool=null}}
