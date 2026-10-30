import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import type { User } from '@supabase/supabase-js'
import { CookieNotice } from '@/components/cookie-notice'
import { PwaControls } from '@/components/pwa-controls'
import { Navigation } from '@/components/navigation'
import { AuthProvider } from '@/components/auth-provider'
import { ChatBot } from '@/components/chat-bot'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'CinéTrack — Votre cinéma, en mieux',
  description: 'Découvrez, notez et gardez une trace de toutes vos expériences cinéma avec CinéTrack.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CinéTrack',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-icon.png' },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <html lang="fr" className="dark" data-scroll-behavior="smooth">
      <head><meta charSet="utf-8" /></head>
      <body className="antialiased">
        <AuthProvider initialUser={user}>
          <Navigation />
          <a href="#main-content" className="skip-link">Aller au contenu principal</a>
          {children}
          <ChatBot />
          <PwaControls />
          <CookieNotice />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
