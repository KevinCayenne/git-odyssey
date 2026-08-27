'use client'

import { useState } from 'react'

import { simulateRemotePush } from '@/lib/git/commands'
import type { OutLine, Repo } from '@/lib/git/types'
import { scenario } from '@/lib/quests/build'
import { gitflowDemo, pairDemo } from '@/lib/quests/demos'
import type { SandboxEvent } from '@/lib/quests/types'

import { Sandbox } from './Sandbox'

interface Preset {
  id: string
  label: string
  note: string
  build: () => Repo
  intro: OutLine[]
}

const conflictScene = (): Repo =>
  scenario([
    'git init',
    'write plan.md 這一版先做搜尋。',
    'git add .',
    'git commit -m "訂下這一版的範圍"',
    'git switch -c agent/replan',
    'become ai',
    'write plan.md 這一版先做匯出，搜尋放到下一版。',
    'git add .',
    'git commit -m "調整優先順序"',
    'become me',
    'git switch main',
    'write plan.md 這一版先做搜尋，匯出也要。',
    'git add .',
    'git commit -m "兩個都要"',
  ])

const PRESETS: Preset[] = [
  {
    id: 'blank',
    label: '空白',
    note: '什麼都沒有，從 git init 開始',
    build: () => scenario([]),
    intro: [
      { kind: 'title', text: '一個空資料夾。' },
      { kind: 'hint', text: 'git init 開始，或按上面的按鈕換一個現成的場景進來。打 help 看指令清單。' },
    ],
  },
  {
    id: 'history',
    label: '已經有一段歷史',
    note: '三個 commit 和一條分支',
    build: () =>
      scenario([
        'git init',
        'write app.md 第一版',
        'git add .',
        'git commit -m "先讓它能跑"',
        'write app.md 第一版\\n加了設定檔',
        'write config.md port = 3000',
        'git add .',
        'git commit -m "拉出設定檔"',
        'git switch -c feature/search',
        'write search.md 搜尋',
        'git add .',
        'git commit -m "搜尋做一半"',
        'git switch main',
      ]),
    intro: [
      { kind: 'title', text: 'main 上有兩個 commit，feature/search 上還有一個。' },
      { kind: 'hint', text: '適合拿來玩 merge、rebase、reset、cherry-pick，看它們各自把圖弄成什麼樣子。' },
    ],
  },
  {
    id: 'agent',
    label: 'agent 開了一條線',
    note: '人和 AI 各做各的',
    build: pairDemo,
    intro: [
      { kind: 'title', text: '菱形是 agent 做的 commit，圓點是你的。' },
      { kind: 'hint', text: '試試 become ai 換成 agent 身分再 commit，看圖上多出什麼形狀。' },
    ],
  },
  {
    id: 'conflict',
    label: '撞在一起了',
    note: '兩邊都改了同一行',
    build: conflictScene,
    intro: [
      { kind: 'title', text: 'main 和 agent/replan 都改了 plan.md 的同一行。' },
      { kind: 'hint', text: 'git merge agent/replan 會卡住。那是這個場景的重點，不是意外。' },
    ],
  },
  {
    id: 'gitflow',
    label: 'gitflow 現場',
    note: '五條軌道都在',
    build: gitflowDemo,
    intro: [
      { kind: 'title', text: '完整的 gitflow：main / hotfix / release / develop / feature。' },
      { kind: 'hint', text: '左邊的軌道由上往下就是穩定度排序。試著再開一條 hotfix 補到 main 上。' },
    ],
  },
]

const EVENTS: SandboxEvent[] = [
  {
    id: 'agent-push',
    label: 'agent 推了東西到 origin',
    note: '遠端動了，但你的本地一動也沒動。git fetch 之後才看得到 —— 這就是 fetch 跟 pull 的差別。',
    apply: (repo) =>
      simulateRemotePush(
        repo,
        'main',
        'agent：順手補上錯誤處理',
        { 'errors.md': '統一的錯誤處理' },
        'agent',
      ),
  },
  {
    id: 'teammate-push',
    label: '同事推了東西到 origin',
    note: '再試一次 git push 就會被擋下來。那不是刁難，是在保護對方的 commit 不被你蓋掉。',
    apply: (repo) =>
      simulateRemotePush(
        repo,
        'main',
        '同事：補上安裝說明',
        { 'README.md': '安裝：npm install' },
        'human',
      ),
  },
]

const QUICK = [
  'git status',
  'git log --oneline --all',
  'git add .',
  'git diff',
  'git branch -a',
  'git reflog',
  'ls',
  'help',
]

export function PlaySandbox() {
  const [preset, setPreset] = useState<Preset>(PRESETS[0]!)

  return (
    <div>
      <div className="rule-b flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2.5">
        <span className="label mr-1">開場</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p)}
            title={p.note}
            className={`rounded-[2px] border px-2 py-[3px] text-[12.5px] transition-colors ${
              preset.id === p.id
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Sandbox
        key={preset.id}
        initial={preset.build}
        intro={preset.intro}
        quickCommands={QUICK}
        events={EVENTS}
      />
    </div>
  )
}
