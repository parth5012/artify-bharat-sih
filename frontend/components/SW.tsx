'use client';
import {useEffect} from 'react';
import {initOfflineSync} from '@/lib/sync';

export default function SW(){
 useEffect(()=>{
  // Replay queued offline work (product registrations) when connectivity returns.
  const stop=initOfflineSync();
  if('serviceWorker' in navigator&&process.env.NODE_ENV==='production')navigator.serviceWorker.register('/sw.js');
  return stop;
 },[]);
 return null;
}
