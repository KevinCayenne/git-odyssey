'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useProgress } from '@/lib/progress'
import { QUESTS } from '@/lib/quests/data'

export function QuestIndex() {
  const { done, clear } = useProgress()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2600)
    return () => clearTimeout(t)
  }, [copied])

  // 進度只存在自己的瀏覽器裡，老師看不到。
  // 所以給一段可以貼回去的文字，當作最土但最可靠的交作業方式。
  const copyProgress = useCallback(async () => {
    const cleared = QUESTS.filter((q) => done.includes(q.slug))
    const text =
      `Git Odyssey 進度 ${cleared.length}/${QUESTS.length}\n` +
      QUESTS.map(
        (q) => `${done.includes(q.slug) ? '✓' : '○'} ${q.num} ${q.title}`,
      ).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // 沒有剪貼簿權限就算了，畫面上本來就看得到
    }
  }, [done])

  return (
    <div>
      <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
        <p className="label">
          {done.length} / {QUESTS.length} 關
        </p>
        <div className="flex items-baseline gap-3">
          <button
            onClick={copyProgress}
            className="label hover:text-ink transition-colors"
            title="複製一段可以貼給老師的進度文字"
          >
            {copied ? '複製好了' : '複製進度'}
          </button>
          {done.length > 0 && (
            <button
              onClick={clear}
              className="label hover:text-ink transition-colors"
            >
              清掉紀錄
            </button>
          )}
        </div>
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
