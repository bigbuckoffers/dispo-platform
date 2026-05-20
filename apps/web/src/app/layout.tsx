import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Dispo Platform — AI Wholesale Real Estate',
  description: 'AI-powered buyer matching and deal dispositions for wholesale real estate investors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="bg-gray-950 text-white antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
