import {Pool} from 'pg';

// Focused tests for the Postgres-backed persistence adapter in backend/db.ts.
// Uses a stubbed pg Pool client so no real database is required.

const queries:{text:string;params:unknown[]}[]=[];
let failConnect=false;
let legacyJson:string|null=null;
let tableExists=false;
let rows:Record<string,string>={};

jest.mock('pg',()=>{
 const release=jest.fn();
 const client={
  query:jest.fn(async(text:string,params:unknown[])=>{
   queries.push({text,params});
   if(text.startsWith('SELECT key,value')){
    return {rows:Object.entries(rows).map(([key,value])=>({key,value:JSON.parse(value)})),rowCount:Object.keys(rows).length};
   }
   if(text.startsWith('SELECT 1 FROM'))return {rows:[],rowCount:rows[params[0] as string]?1:0};
   if(text.startsWith('INSERT INTO')){
    rows[params[0] as string]=params[1] as string;
    return {rows:[],rowCount:1};
   }
   if(text.startsWith('CREATE TABLE')){tableExists=true;return {rows:[],rowCount:0}}
   return {rows:[],rowCount:0};
  }),
 };
 const Pool=jest.fn().mockImplementation(()=>{
  return {connect:async()=>{if(failConnect)throw new Error('connection refused');return {...client,release}}};
 });
 return {Pool};
});

jest.mock('node:fs/promises',()=>{
 const actual=jest.requireActual('node:fs/promises');
 return {
  ...actual,
  readFile:jest.fn(async(p:unknown)=>{
   if(typeof p==='string'&&p.includes('artifact-db.json')){
    if(legacyJson!==null)return legacyJson;
    throw new Error('ENOENT');
   }
   return (actual.readFile as typeof actual.readFile)(p as never);
  }),
  rename:jest.fn(async()=>{}),
 };
});

describe('db adapter',()=>{
 beforeEach(()=>{
  queries.length=0;failConnect=false;legacyJson=null;rows={};tableExists=false;jest.resetModules();
 });

 it('falls back to JSON file when DATABASE_URL is unset',async()=>{
  delete process.env.DATABASE_URL;
  const db=await import('../backend/db');
  const snapshot=await db.readDb();
  expect(snapshot).toEqual(db.emptyDb);
 });

 it('reads collections from Postgres when DATABASE_URL is set',async()=>{
  process.env.DATABASE_URL='postgres://test:test@localhost:5432/test';
  const db=await import('../backend/db');
  const empty=await db.readDb();
  expect(empty).toEqual(db.emptyDb);
  const next={...db.emptyDb,users:[{id:'u1',phone:'9876543210',createdAt:1,updatedAt:1}]};
  await db.writeDb(next);
  const insert=queries.find(q=>q.text.startsWith('INSERT INTO'));
  expect(insert).toBeDefined();
  expect(insert!.params[0]).toBe('users');
  expect(JSON.parse(insert!.params[1] as string)[0].id).toBe('u1');
 });

 it('returns the error when Postgres is unreachable',async()=>{
  process.env.DATABASE_URL='postgres://test:test@localhost:5432/test';
  failConnect=true;
  const db=await import('../backend/db');
  await expect(db.readDb()).rejects.toThrow('connection refused');
 });

 it('migrates a legacy JSON file into Postgres on first Postgres read',async()=>{
  process.env.DATABASE_URL='postgres://test:test@localhost:5432/test';
  legacyJson=JSON.stringify({users:[{id:'legacy',phone:'9000000000',createdAt:1,updatedAt:1}]});
  const db=await import('../backend/db');
  const snapshot=await db.readDb();
  expect(snapshot.users).toHaveLength(1);
  expect(snapshot.users[0].id).toBe('legacy');
  const insert=queries.find(q=>q.text.startsWith('INSERT INTO')&&(q.params[0]==='users'));
  expect(insert).toBeDefined();
  expect(JSON.parse(insert!.params[1] as string)[0].id).toBe('legacy');
 });

 it('does not migrate when no legacy file exists',async()=>{
  process.env.DATABASE_URL='postgres://test:test@localhost:5432/test';
  const db=await import('../backend/db');
  const snapshot=await db.readDb();
  expect(snapshot).toEqual(db.emptyDb);
  const migrateInsert=queries.find(q=>q.text.startsWith('INSERT INTO'));
  expect(migrateInsert).toBeUndefined();
 });
});
