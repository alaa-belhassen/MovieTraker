import { WatchInvite } from '@/components/watch-page'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <WatchInvite token={token} />
}
