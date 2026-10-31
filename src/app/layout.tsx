import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/layout/pwa';

export const metadata: Metadata = {
  title: { default: 'MIRA', template: '%s · MIRA' },
  description: 'MIRA — Método Integrado de Radiestesia Aplicada. Copiloto metodológico para atendimentos.',
  robots: { index: false, follow: false },
  applicationName: 'MIRA',
  appleWebApp: { capable: true, title: 'MIRA', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbf9f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
