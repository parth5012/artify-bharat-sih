import {ReactNode} from 'react';
export default function ArtisanLayout({children}:{children:ReactNode}){
 return <div className="bg-stone-200 md:flex md:min-h-dvh md:items-center md:justify-center">
  <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#FBF7F0] md:h-[860px] md:max-h-[95dvh] md:rounded-[2.5rem] md:border-8 md:border-stone-900 md:shadow-2xl">{children}</div></div>;
}
