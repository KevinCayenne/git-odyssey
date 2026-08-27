'use client'

import { useState } from 'react'

import { CommitGraph } from '@/components/graph/CommitGraph'
import { scenario } from '@/lib/quests/build'

/**
 * 同一批改動、同一顆地雷，兩種放法。
 * 差別不在 agent 做得好不好，在於出事之後你手上有沒有東西可以挑。
 */

const AGENT_WORK = [
  'become ai',
  'write app.md 主程式\\n抽成三個小函式',
  'git add .',
  'git commit -m "把長函式拆開"',
  'write config.md api_key = sk-live-9f2b7c',
  'git add .',
  'git commit -m "補上設定"',
  'write test.md 三個函式各一組測試',
  'git add .',
  'git commit -m "補測試"',
  'become me',
]

const BASE = [
  'git init',
  'write app.md 主程式',
  'git add .',
  'git commit -m "現在能跑的樣子"',
]

const MODES = [
  {
    id: 'on-main',
    label: '讓它直接在 main 上做',
    build: () => scenario([...BASE, ...AGENT_WORK]),
    verdict: '好的和壞的黏在同一條線上',
    body: (
      <>
        三個 commit 直接長在 main 後面，其中一個把金鑰寫死了。現在要拿掉它，
        你只有兩條路：<code>revert</code> 那一個（歷史會多一個抵銷的
        commit，可以接受），或是 <code>reset</code> 回去重做（但另外兩個好東西也一起消失）。
        更麻煩的是如果你已經推出去了 —— 別人手上也有這條線了。
      </>
    ),
  },
  {
    id: 'own-branch',
    label: '給它一條自己的分支',
    build: () =>
      scenario([...BASE, 'git switch -c agent/refactor', ...AGENT_WORK, 'git switch main']),
    verdict: 'main 還乾淨，你有得挑',
    body: (
      <>
        同樣三個 commit，但 main 一動也沒動。你可以先看再決定：整條收進來、
        只 <code>cherry-pick</code> 想要的那兩個、或是整條丟掉當作沒發生過。
        關鍵不是不信任 agent，是把「產出」和「同意」拆成兩個動作 ——
        中間那個空隙，就是你還來得及反悔的空間。
      </>
    ),
  },
] as const

export function PairCompare() {
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0])

  return (
    <div className="border border-rule">
      <div className="rule-b flex flex-wrap gap-1.5 px-4 py-2.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m)}
            className={`rounded-[2px] border px-2.5 py-[4px] text-[12.5px] transition-colors ${
              mode.id === m.id
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <CommitGraph key={mode.id} repo={mode.build()} />

      <div className="rule-t px-4 py-4">
        <p className="label mb-1.5">結果</p>
        <p className="font-display mb-2 text-[18px] leading-[1.4]">
          {mode.verdict}
        </p>
        <p className="prose max-w-[62ch] text-[14.5px] leading-[1.9] text-ink-2">
          {mode.body}
        </p>
      </div>
    </div>
  )
}
