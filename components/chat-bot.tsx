'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { MessageCircle, Send, Sparkles, Square, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

function messageText(message: UIMessage) {
  if (!Array.isArray(message.parts)) {
    const legacyMessage = message as UIMessage & { content?: string }
    return legacyMessage.content ?? ''
  }
  return message.parts.filter(part => part.type === 'text').map(part => part.text).join('')
}

function getChatErrorMessage(error: Error | undefined) {
  const message = error?.message ?? ''
  if (/quota|resource exhausted|resource_exhausted|\b429\b/i.test(message)) {
    return 'Le quota Gemini est atteint. Réessayez après son renouvellement ou vérifiez les limites de votre projet Google AI.'
  }
  if (/api key.*not valid|invalid api key|unauthorized|\b401\b/i.test(message)) {
    return 'La clé Gemini est invalide ou révoquée. Remplacez-la dans .env.local puis redémarrez le serveur.'
  }
  if (/invalid chat messages|latest chat message must be from the user/i.test(message)) {
    return 'Le format de la conversation est invalide. Fermez puis rouvrez le chat pour réinitialiser son historique.'
  }
  if (message) return message.replace(/^AI_APICallError:\s*/, '').slice(0, 240)
  return 'Gemini ne peut pas répondre pour le moment. Vérifiez la clé API et la connexion.'
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [persistenceEnabled, setPersistenceEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages: messages.map(message => ({
          id: message.id,
          role: message.role,
          parts: [{ type: 'text' as const, text: messageText(message) }],
        })),
      },
    }),
  }), [])
  const { messages, setMessages, sendMessage, status, error, clearError, stop } = useChat({
    transport,
    onError: error => console.error('CinéTrack chat failed:', error),
  })
  const isBusy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    let active = true
    fetch('/api/chat')
      .then(async response => {
        if (!response.ok) throw new Error('Could not load chat history')
        return response.json() as Promise<{ messages: UIMessage[]; persistenceEnabled: boolean }>
      })
      .then(history => {
        if (!active) return
        setMessages(history.messages)
        setPersistenceEnabled(history.persistenceEnabled)
      })
      .catch(loadError => console.error('CinéTrack chat history failed:', loadError))
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [setMessages])

  useEffect(() => {
    if (!historyLoading && status === 'ready' && messages.length > 18) {
      setMessages(current => current.slice(-18))
    }
  }, [historyLoading, messages.length, setMessages, status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isBusy || historyLoading) return
    setInput('')
    clearError()
    try {
      await sendMessage({ text })
    } catch {
      // useChat exposes request failures through its error state.
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <section role="dialog" aria-modal="false" aria-labelledby="cinetrack-chat-title" className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101211] text-[#f4f5f2] shadow-2xl shadow-black/40">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#d8ff45] text-black"><Sparkles size={18} aria-hidden="true" /></span>
              <div><h2 id="cinetrack-chat-title" className="text-sm font-semibold">Assistant cinéma</h2><p className="text-xs text-white/45">Propulsé par Gemini</p></div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer le chat" className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {historyLoading && <p className="mt-8 text-center text-sm text-white/50">Chargement de la conversation…</p>}
            {!historyLoading && messages.length === 0 && <p className="mt-8 text-center text-sm leading-6 text-white/55">Bonjour ! Vous cherchez un film pour ce soir ou une recommandation ?</p>}
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-sm bg-[#d8ff45] text-black' : 'rounded-bl-sm bg-white/[0.08] text-white/85'}`}>{messageText(message)}</p>
              </div>
            ))}
            {isBusy && <p className="text-xs text-white/40">L’assistant écrit…</p>}
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-5 text-red-200">{getChatErrorMessage(error)}</p>}
            <div ref={messagesEndRef} />
          </div>

          <p className="px-4 pb-1 text-[11px] text-white/35">{persistenceEnabled ? 'Historique enregistré dans MongoDB' : 'Historique non enregistré : configurez MongoDB'}</p>
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
            <label htmlFor="cinetrack-chat-input" className="sr-only">Votre message</label>
            <input id="cinetrack-chat-input" value={input} onChange={event => setInput(event.target.value)} maxLength={4000} placeholder="Parler de cinéma…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-[#d8ff45]/60" />
            {isBusy ? (
              <button type="button" onClick={stop} aria-label="Arrêter la réponse" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/75 hover:bg-white/10"><Square size={15} /></button>
            ) : (
              <button type="submit" disabled={historyLoading || !input.trim()} aria-label="Envoyer le message" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d8ff45] text-black transition hover:bg-[#e5ff82] disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
            )}
          </form>
        </section>
      ) : (
        <button type="button" onClick={() => setIsOpen(true)} aria-label="Ouvrir l’assistant cinéma" className="flex size-14 items-center justify-center rounded-full bg-[#d8ff45] text-black shadow-lg shadow-black/30 transition hover:scale-105 hover:bg-[#e5ff82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <MessageCircle size={23} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}