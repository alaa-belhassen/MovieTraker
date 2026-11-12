'use client'

import dynamic from 'next/dynamic'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'

const ChatBotPanel = dynamic(
  () => import('./chat-bot-panel').then(module => module.ChatBotPanel),
  { loading: () => <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#101211] px-4 py-3 text-sm text-white/70">Chargement du chat…</div> }
)

export function ChatBot() {
  const [hasOpened, setHasOpened] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {hasOpened && <ChatBotPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />}
      {!isOpen && (
        <button type="button" onClick={() => { setHasOpened(true); setIsOpen(true) }} aria-label="Ouvrir l’assistant cinéma" className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#d8ff45] text-black shadow-lg shadow-black/30 transition hover:scale-105 hover:bg-[#e5ff82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <MessageCircle size={23} aria-hidden="true" />
        </button>
      )}
    </>
  )
}
