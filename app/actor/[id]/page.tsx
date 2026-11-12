import { redirect } from 'next/navigation'

export default async function ActorAlias({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/acteur/${id}`)
}
