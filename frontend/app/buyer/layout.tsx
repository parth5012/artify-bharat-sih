import {ReactNode} from 'react';
import {BottomNav,BuyerHeader,Footer} from '@/components/buyer/Chrome';
import {CartDrawer,Toast} from '@/components/buyer/CartParts';
export default function BuyerLayout({children}:{children:ReactNode}){
 return <div className="min-h-dvh bg-cream pb-20 md:pb-0"><BuyerHeader/><main>{children}</main><Footer/><BottomNav/><CartDrawer/><Toast/></div>;
}
