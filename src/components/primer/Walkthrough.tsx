'use client'

import { useMemo, useState } from 'react'

import { CommitGraph } from '@/components/graph/CommitGraph'
import { run } from '@/lib/git/commands'
import { emptyRepo } from '@/lib/git/repo'
import type { Repo } from '@/lib/git/types'
import { usePresent } from '@/lib/present'
import { STEPS } from '@/lib/quests/primer'

import { ThreeBoxes } from './ThreeBoxes'

/**
 * 八步走完第一個 commit。
 *
 * 對第一次碰的人，自由沙盒太自由了 —— 會打錯、會卡住、會不知道下一步。
 * 這裡只有一顆「下一步」，但底下跑的是同一顆引擎，所以看到的東西
 * 跟他們自己動手打出來的完全一樣。老師可以投影著按，學生也可以自己走。
 */

/** 從頭把前 n 步重播出來。步驟不多，每次重算比維護增量狀態安全。 */
function repoAt(index: number): Repo {
  let repo = emptyRepo()
  for (let i = 0; i <= index; i++) {
    const cmd = STEPS[i]?.command
    if (cmd) repo = run(repo, cmd).repo
  }
  return repo
}

export function Walkthrough() {
  const [i, setI] = useState(0)
  const { present, toggle } = usePresent()
  const repo = useMemo(() => repoAt(i), [i])
  const step = STEPS[i]!
  const last = i === STEPS.length - 1

  return (
    <div className="border border-rule">
      {/* 進度 */}
      <div className="rule-b flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <span className="label">
          第 {i + 1} 步 / 共 {STEPS.length} 步
        </span>
        <div className="flex flex-1 gap-1" aria-hidden>
          {STEPS.map((s, n) => (
            <button
              key={s.id}
              onClick={() => setI(n)}
              title={s.title}
              className={`h-[3px] min-w-[10px] flex-1 transition-colors ${
                n <= i ? 'bg-vermilion' : 'bg-rule'
              }`}
            />
          ))}
        </div>
        <button
          onClick={toggle}
          className={`label transition-colors ${present ? 'text-vermilion' : 'hover:text-ink'}`}
          title="放大字和圖，給教室後排看"
        >
          投影
        </button>
      </div>

      {/* 說明 */}
      <div className="rule-b px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="num text-[0.6875rem] text-vermilion">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display text-[1.375rem] leading-[1.35]">
            {step.title}
          </h3>
        </div>

        <p className="mt-2.5 max-w-[58ch] text-[1rem] leading-[1.9] text-ink-2">
          {step.body}
        </p>

        {step.command && (
          <div className="mt-4">
            <p className="label mb-1.5">這一步實際打的指令</p>
            <code className="num inline-block rounded-[2px] border border-rule bg-paper-2 px-3 py-1.5 text-[0.875rem] text-ink">
              {step.command.replace(/\\n/g, ' ⏎ ')}
            </code>
          </div>
        )}

        {step.say && (
          <p className="mt-4 max-w-[58ch] border-l border-rule pl-4 text-[0.9062rem] leading-[1.8] text-ink-3">
            <span className="label mr-2">講的時候可以說</span>
            {step.say}
          </p>
        )}
      </div>

      {/* 三格 */}
      <div className="rule-b px-4 py-5 md:px-6">
        <ThreeBoxes repo={repo} focus={step.focus} />
      </div>

      {/* 歷史 */}
      <div className="rule-b bg-paper-2/40">
        <CommitGraph repo={repo} />
      </div>

      {/* 控制 */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={i === 0}
          className="btn btn-quiet"
        >
          <span aria-hidden>←</span>
          上一步
        </button>

        <button onClick={() => setI(0)} className="label hover:text-ink transition-colors">
          從頭再走一次
        </button>

        <button
          onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}
          disabled={last}
          className={`btn ${last ? '' : 'btn-mark'}`}
        >
          {last ? '走完了' : '下一步'}
          {!last && <span aria-hidden>→</span>}
        </button>
      </div>
    </div>
  )
}
