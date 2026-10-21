import { SharedListDetail } from '@/components/shared-lists-feature'

export default async function SharedListDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SharedListDetail id={id} />
}
