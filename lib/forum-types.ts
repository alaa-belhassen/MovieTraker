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
