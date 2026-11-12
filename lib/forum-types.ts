export const FORUM_CATEGORIES = [
  'Discussion générale',
  'Recommandations',
  'Critiques',
  'Séries',
] as const

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]

export function isForumCategory(value: unknown): value is ForumCategory {
  return typeof value === 'string' && FORUM_CATEGORIES.some(category => category === value)
}

const FORUM_INSULT_PATTERN = /(?<![\p{L}\p{N}_])(?:fils[\s-]+de[\s-]+pute|trou[\s-]+du[\s-]+cul|va[\s-]+te[\s-]+faire[\s-]+foutre|va[\s-]+chier|ferme[\s-]+(?:ta[\s-]+)?gueule|ferme[\s-]+la|nique[\s-]+ta[\s-]+m[eéè]re|ta[\s-]+m[eéè]re|casse[\s-]+couilles|connards?|connasses?|encul(?:er|e|es|é|ée|és|ées)|enfoir[ée]s?|salauds?|salopes?|salopards?|b[aâ]tards?|abruti[e]s?|cr[eé]tins?|imb[eé]ciles?|idiot[e]s?|con(?:s|ne|nes)?|putains?|putes?|merdes?|merdeux|emmerd(?:e|es|eur|eurs|euse|euses)|chiant(?:e|es|s)?|chieuses?|foutu(?:e|es|s)?|foutre|bordels?|nique(?:r|z|nt|[ée]s?)?|bite|couilles?|bouffons?|d[eé]biles?|ordures?|fuck(?:ing)?|shit|bitch(?:es)?|assholes?|bastards?|dicks?)(?![\p{L}\p{N}_])/giu

export function maskForumInsults(text: string): string {
  return text.replace(FORUM_INSULT_PATTERN, '****')
}
