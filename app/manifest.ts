import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CinéTrack',
    short_name: 'CinéTrack',
    description: 'Votre cinéma, en mieux : découvrez, notez et partagez vos films.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'fr',
    background_color: '#1b1915',
    theme_color: '#1b1915',
    categories: ['entertainment', 'movies'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Rechercher', short_name: 'Recherche', url: '/recherche' },
      { name: 'Mes listes', short_name: 'Listes', url: '/mes-listes' },
      { name: 'Mes séances', short_name: 'Séances', url: '/watch' },
    ],
    share_target: {
      action: '/watch?shared=1',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  }
}
