import { JoinList } from '@/components/shared-lists-feature'

export default async function JoinListRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <JoinList token={token} />
}
