import type { MetadataRoute } from 'next';

/** Manifesto do PWA: permite instalar o MIRA no computador e no celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MIRA — Método Integrado de Radiestesia Aplicada',
    short_name: 'MIRA',
    description: 'Copiloto metodológico para atendimentos de radiestesia e radiônica.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fbf9f5',
    theme_color: '#fbf9f5',
    categories: ['health', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Novo atendimento', url: '/atendimentos/novo', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Clientes', url: '/clientes', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
