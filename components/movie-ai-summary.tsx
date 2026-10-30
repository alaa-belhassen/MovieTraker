'use client'

import { generateFilmSummary } from '@/app/actions/ai-actions'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

export function MovieAiSummary({ title, overview }: { title: string; overview: string }) {
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setError('')
    setIsGenerating(true)
    try {
      setSummary(await generateFilmSummary(title, overview))
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'La génération a échoué.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mt-4 max-w-3xl">
      <button type="button" onClick={handleGenerate} disabled={isGenerating || !overview} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-[#d8ff45]/50 hover:text-[#d8ff45] disabled:opacity-50">
        <Sparkles size={15} aria-hidden="true" />
        {isGenerating ? 'Génération…' : 'Créer un résumé IA'}
      </button>
      {summary && <p className="mt-3 border-l-2 border-[#d8ff45] pl-3 text-sm leading-6 text-white/80">{summary}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}