'use client'

import { headTree } from '@/lib/git/repo'
import type { Repo, Tree } from '@/lib/git/types'
import type { Focus } from '@/lib/quests/primer'

/**
 * 全站最重要的一張圖。
 *
 * 大部分人卡在 git 不是因為指令背不起來，是因為腦袋裡沒有這三格 ——
 * 不知道檔案改了之後停在哪、不知道 add 到底把東西搬到哪去。
 * 這裡把三格攤開、標出正在動的那一格，然後讓它跟著真的引擎狀態走。
 */

const BOXES: Array<{ key: Focus; num: string; title: string; note: string }> = [
  { key: 'work', num: '01', title: '工作目錄', note: '你眼前正在動的東西' },
  { key: 'index', num: '02', title: '暫存區', note: '你打算收成同一件事的' },
  { key: 'history', num: 'history', title: '歷史', note: '已經記下來、找得回來的' },
]

function Box({
  num,
  title,
  note,
  files,
  changed,
  active,
  empty,
}: {
  num: string
  title: string
  note: string
  files: string[]
  changed: Set<string>
  active: boolean
  empty: string
}) {
  return (
    <div
      className={`min-w-0 border px-4 py-4 transition-colors duration-200 ${
        active
          ? 'border-vermilion bg-vermilion/[0.05]'
          : 'border-rule bg-transparent'
      }`}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span
          className={`num text-[0.625rem] ${active ? 'text-vermilion' : 'text-ink-3'}`}
        >
          {num === 'history' ? '03' : num}
        </span>
        <span className="text-[0.9375rem] text-ink">{title}</span>
      </div>
      <p className="mb-3 text-[0.75rem] leading-[1.5] text-ink-3">{note}</p>

      {files.length === 0 ? (
        <p className="text-[0.8125rem] text-ink-3">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f} className="flex items-baseline gap-2">
              <span
                className={`num text-[0.6875rem] ${
                  changed.has(f) ? 'text-vermilion' : 'text-ink-3'
                }`}
              >
                {changed.has(f) ? '●' : '·'}
              </span>
              <span className="num truncate text-[0.8125rem] text-ink">{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 py-2 md:py-0">
      <span className="num text-[0.6875rem] text-ink-2">{label}</span>
      <span aria-hidden className="text-ink-3 md:hidden">
        ↓
      </span>
      <span aria-hidden className="hidden text-ink-3 md:inline">
        →
      </span>
    </div>
  )
}

export function ThreeBoxes({ repo, focus }: { repo: Repo; focus: Focus }) {
  const head: Tree = headTree(repo)

  const workFiles = Object.keys(repo.work).sort()
  const indexFiles = Object.keys(repo.index).sort()
  const headFiles = Object.keys(head).sort()

  // 標紅點的規則：跟右邊那一格不一樣的，就是「還沒送過去」的
  const workChanged = new Set(
    workFiles.filter((f) => repo.work[f] !== repo.index[f]),
  )
  const indexChanged = new Set(
    indexFiles.filter((f) => repo.index[f] !== head[f]),
  )

  return (
    <div className="grid grid-cols-1 items-stretch gap-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3">
      <Box
        {...BOXES[0]!}
        files={workFiles}
        changed={workChanged}
        active={focus === 'work'}
        empty="（還沒有檔案）"
      />
      <Arrow label="git add" />
      <Box
        {...BOXES[1]!}
        files={indexFiles}
        changed={indexChanged}
        active={focus === 'index'}
        empty="（空的）"
      />
      <Arrow label="git commit" />
      <Box
        {...BOXES[2]!}
        files={headFiles}
        changed={new Set()}
        active={focus === 'history'}
        empty="（還沒有 commit）"
      />
    </div>
  )
}
