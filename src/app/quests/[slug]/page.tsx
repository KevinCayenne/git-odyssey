import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { QuestRunner } from '@/components/quests/QuestRunner'
import { QUESTS, getQuest } from '@/lib/quests/data'

export function generateStaticParams() {
  return QUESTS.map((q) => ({ slug: q.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const quest = getQuest(slug)
  if (!quest) return { title: '找不到這一關' }
  return {
    title: `${quest.num} ${quest.title}`,
    description: quest.scene[0],
  }
}

export default async function QuestPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const quest = getQuest(slug)
  if (!quest) notFound()

  return (
    <div className="border-b border-rule">
      <QuestRunner slug={quest.slug} />
    </div>
  )
}
