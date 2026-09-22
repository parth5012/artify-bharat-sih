import {ReactNode} from 'react';
import {MinistryProvider} from '@/lib/ministry/context';
export default function MinistryLayout({children}:{children:ReactNode}){return <MinistryProvider>{children}</MinistryProvider>}
