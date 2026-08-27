'use client'

import Link from 'next/link'

import { useProgress } from '@/lib/progress'
import { QUESTS } from '@/lib/quests/data'

export function QuestIndex() {
  const { done, clear } = useProgress()

  return (
    <div>
      <div className="rule-b flex items-baseline justify-between gap-4 pb-2">
        <p className="label">
          {done.length} / {QUESTS.length} 關
        </p>
        {done.length > 0 && (
          <button
            onClick={clear}
            className="label hover:text-ink transition-colors"
          >
            清掉紀錄
          </button>
        )}
      </div>

      <ol>
        {QUESTS.map((quest) => {
          const cleared = done.includes(quest.slug)
          return (
            <li key={quest.slug} className="rule-b">
              <Link
                href={`/quests/${quest.slug}`}
                className="group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-6"
              >
                <span
                  className={`num text-[12px] ${cleared ? 'text-moss' : 'text-ink-3'}`}
                >
                  {cleared ? '✓' : quest.num}
                </span>

                <span className="min-w-0">
                  <span className="font-display block text-[21px] leading-[1.35] transition-colors group-hover:text-vermilion">
                    {quest.title}
                  </span>
                  <span className="num mt-0.5 block text-[11.5px] text-ink-3">
                    {quest.kicker}
                  </span>
                  <span className="mt-1.5 block max-w-[62ch] text-[14px] leading-[1.85] text-ink-2">
                    {quest.scene[0]}
                  </span>
                </span>

                <span className="label col-start-2 sm:col-start-3 sm:text-right">
                  {quest.tags.join(' · ')}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
