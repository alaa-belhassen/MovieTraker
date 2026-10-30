'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export async function generateFilmSummary(title: string, overview: string): Promise<string> {
  const cleanTitle = title.trim()
  const cleanOverview = overview.trim().slice(0, 2500)
  if (cleanTitle.length < 2) throw new Error('Veuillez fournir un titre de film valide.')
  if (!cleanOverview) throw new Error('Le synopsis du film est indisponible.')

  try {
    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      system: 'Tu es un rédacteur cinéma. Réponds en français avec un résumé original de une à deux phrases, sans spoiler et sans markdown. Utilise uniquement les informations fournies; n’invente aucun détail.',
      prompt: JSON.stringify({ title: cleanTitle, synopsis: cleanOverview }),
      maxOutputTokens: 140,
    })
    return text.trim()
  } catch (error) {
    console.error('Film summary generation failed:', error)
    throw new Error('Impossible de générer le résumé. Vérifiez la clé Gemini et réessayez.')
  }
}