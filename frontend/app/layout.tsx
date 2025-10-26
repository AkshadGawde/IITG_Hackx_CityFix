import './globals.css';
import Providers from './providers';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RIFI (Report It, Fix It)',
  description: 'Report civic issues and track resolutions',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-brand-gray text-brand-dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
