import ForumDetail from '@/components/forum-detail'

export default async function ForumDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ForumDetail topicId={id} />
}
