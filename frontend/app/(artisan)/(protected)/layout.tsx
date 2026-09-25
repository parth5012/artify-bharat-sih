import {ReactNode} from 'react';
import {redirect} from 'next/navigation';
import {currentUser} from '@/backend/auth';

// Server-side route protection for every artisan screen. Auth stays enforced in
// each API route as well; this guard stops unauthenticated renders early.
export default async function ProtectedLayout({children}:{children:ReactNode}){
 const user=await currentUser();
 if(!user)redirect('/login');
 return <>{children}</>;
}
