import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import { Providers } from './providers'
import { validateEnv } from '@/lib/env';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaskMaster - Smart Task Management',
  description: 'Streamline your tasks and boost productivity with our intuitive task management platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validate environment variables
  validateEnv();

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
