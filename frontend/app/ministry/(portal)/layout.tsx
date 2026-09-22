'use client';
import {ReactNode,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Shell} from '@/components/ministry/Shell';
import {useMinistry} from '@/lib/ministry/context';
export default function PortalLayout({children}:{children:ReactNode}){
 const {ready,session}=useMinistry();const r=useRouter();
 useEffect(()=>{if(ready&&!session)r.replace('/ministry')},[ready,session,r]);
 return <Shell>{session?children:null}</Shell>;
}
