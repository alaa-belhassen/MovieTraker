import ActorPage from '@/components/actor-page'
import { getActorDetails } from '@/lib/tmdb'

export default async function ActorRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const person = await getActorDetails(Number(id))
    return <ActorPage id={id} initialPerson={person} />
  } catch {
    return <ActorPage id={id} />
  }
}
