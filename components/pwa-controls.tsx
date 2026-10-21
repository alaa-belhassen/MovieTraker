'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

export function PwaControls() {
  const [offline, setOffline] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    const updateOnline = () => setOffline(!navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }); if (!standalone) setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', onInstall)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        if (registration.waiting) setUpdate(registration)
        registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting) setUpdate(registration) }))
      }).catch(() => undefined)
    }
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); window.removeEventListener('beforeinstallprompt', onInstall) }
  }, [])

  const install = async () => { await installPrompt?.prompt?.(); setShowInstall(false) }
  const refresh = () => { update?.waiting?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload() }
  return <>
    {offline && <div role="status" className="offline-banner"><WifiOff aria-hidden="true" /> Hors ligne : certaines fonctions sont indisponibles</div>}
    {showInstall && installPrompt && <div className="fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-2xl border border-[#d8ff45]/30 bg-[#24221d] p-4 shadow-2xl sm:bottom-6 sm:left-auto sm:max-w-sm"><Download className="text-[#d8ff45]" aria-hidden="true" /><p className="flex-1 text-sm">Installez CinéTrack pour retrouver vos films plus vite.</p><button type="button" onClick={install} className="rounded-full bg-[#d8ff45] px-3 py-2 text-xs font-bold text-black">Installer</button><button type="button" aria-label="Fermer" onClick={() => setShowInstall(false)}><X aria-hidden="true" /></button></div>}
    {update && <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#d8ff45]/30 bg-[#24221d] px-4 py-3 text-sm shadow-xl"><span>Nouvelle version disponible</span><button type="button" onClick={refresh} className="inline-flex items-center gap-1 rounded-full bg-[#d8ff45] px-3 py-1.5 text-xs font-bold text-black"><RefreshCw aria-hidden="true" /> Actualiser</button></div>}
    <Link href="/confidentialite" className="sr-only">Politique de confidentialité</Link>
  </>
}
