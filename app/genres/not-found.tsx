import Link from 'next/link'
export default function NotFound() { return <main className="grid min-h-screen place-items-center bg-[#080909] px-5 text-center text-white"><div><h1 className="text-4xl font-semibold">Genres introuvables</h1><Link href="/genres" className="mt-6 inline-flex rounded-full bg-[#d8ff45] px-5 py-3 font-semibold text-black">Voir les genres</Link></div></main> }
