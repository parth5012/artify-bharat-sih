import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Artify Bharat - MoSJE Digital Heritage Passport & Artisan Onboarding',
  description:
    'AI-Powered Digital Business Manager & Gatekeeper for Rural Artisans & Weavers (Ministry of Social Justice & Empowerment, SIH PS 26090)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <body className="min-h-screen bg-[#FDFBF7] text-slate-900 antialiased selection:bg-amber-200 selection:text-amber-950">
        {children}
      </body>
    </html>
  );
}
