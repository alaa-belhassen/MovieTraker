import SearchPage from '@/components/search-page'
export default async function SearchAlias({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const params = await searchParams; return <SearchPage initialQuery={params.q || ''} /> }
