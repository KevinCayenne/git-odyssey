'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'

import { Sandbox } from '@/components/sandbox/Sandbox'
import { useProgress } from '@/lib/progress'
import { getQuest, questNeighbours } from '@/lib/quests/data'

/**
 * 關卡物件裡有 setup 和一堆 check 函式，過不了 server/client 的邊界。
 * 所以頁面只丟 slug 過來，這邊自己查表。
 */
export function QuestRunner({ slug }: { slug: string }) {
  const quest = getQuest(slug)
  const next = questNeighbours(slug).next
  const { mark } = useProgress()
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [cleared, setCleared] = useState(false)

  const onComplete = useCallback(() => {
    mark(slug)
    setCleared(true)
  }, [mark, slug])

  if (!quest) return null

  const aside = (
    <div className="flex h-full flex-col">
      {cleared && (
        <div className="border-b border-moss bg-moss/[0.07] px-5 py-5">
          <p className="label mb-2" style={{ color: 'var(--moss)' }}>
            過關
          </p>
          <div className="prose text-[14.5px] leading-[1.9] text-ink-2">
            {quest.closing.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {next && (
            <Link
              href={`/quests/${next.slug}`}
              className="btn btn-mark mt-4 inline-flex"
            >
              {next.num} {next.title}
              <span aria-hidden>→</span>
            </Link>
          )}
          {!next && (
            <Link href="/lifeflow" className="btn btn-mark mt-4 inline-flex">
              把它搬進生活
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      )}

      <div className="rule-b px-5 py-5">
        <p className="label mb-2">
          {quest.num} · {quest.kicker}
        </p>
        <h1 className="font-display text-[24px] leading-[1.3]">{quest.title}</h1>
        <div className="prose mt-4 text-[14.5px] leading-[1.9] text-ink-2">
          {quest.scene.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="label">提示</p>
          {hintsShown < quest.hints.length && (
            <button
              onClick={() => setHintsShown((n) => n + 1)}
              className="label hover:text-ink transition-colors"
            >
              {hintsShown === 0 ? '卡住了？' : '再給一點'}
            </button>
          )}
        </div>

        {hintsShown === 0 ? (
          <p className="mt-2 text-[13px] leading-[1.8] text-ink-3">
            先自己撞一下。指令打錯的時候，錯誤訊息會告訴你為什麼 ——
            那些訊息是這一關的一部分。
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {quest.hints.slice(0, hintsShown).map((h, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.8]">
                <span className="num shrink-0 text-[11px] text-ink-3">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-ink-2">{h}</span>
              </li>
            ))}
          </ol>
        )}

        {hintsShown >= quest.hints.length && !showSolution && (
          <button
            onClick={() => setShowSolution(true)}
            className="label mt-4 hover:text-ink transition-colors"
          >
            直接給我答案
          </button>
        )}

        {showSolution && (
          <p className="mt-4 text-[13px] leading-[1.8] text-ink-3">
            解法已經放到下面那排按鈕了，由左到右按過去就會過關。
            按之前先看一眼指令，比看完再按有用。
          </p>
        )}
      </div>

      <div className="mt-auto px-5 pt-2 pb-5">
        <Link href="/quests" className="label hover:text-ink transition-colors">
          ← 回關卡列表
        </Link>
      </div>
    </div>
  )

  return (
    <Sandbox
      initial={quest.setup}
      intro={quest.intro}
      objectives={quest.objectives}
      quickCommands={showSolution ? quest.solution : quest.quickCommands}
      events={quest.events}
      onComplete={onComplete}
      aside={aside}
    />
  )
}
