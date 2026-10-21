'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const CONSENT_COOKIE = 'cinetrack_cookie_consent'

export function CookieNotice() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(!document.cookie.split('; ').some((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))) }, [])
  if (!visible) return null
  function accept() {
    document.cookie = `${CONSENT_COOKIE}=accepted; Max-Age=31536000; Path=/; SameSite=Lax`
    setVisible(false)
  }
  return (
    <aside className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6" aria-label="Notice de confidentialité">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">Nous utilisons uniquement les cookies nécessaires au fonctionnement de CinéTrack. <Link href="/confidentialite" className="font-medium text-foreground underline underline-offset-4">En savoir plus</Link></p>
        <button onClick={accept} className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">J’ai compris</button>
      </div>
    </aside>
  )
}
