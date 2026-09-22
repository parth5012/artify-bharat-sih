'use client';
import {useEffect} from 'react';
import {useStore} from '@/lib/store';
export function LanguageSync(){const {s}=useStore();useEffect(()=>{if(s.lang)document.documentElement.lang=s.lang.code},[s.lang]);return null}