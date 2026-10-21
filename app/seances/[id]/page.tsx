import { SessionRoom } from '@/components/watch-together-feature'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { await params; return <SessionRoom /> }
