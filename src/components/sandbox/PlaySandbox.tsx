'use client'

import { useState } from 'react'

import { useQueryParam } from '@/lib/query'
import { decodeSession } from '@/lib/share'
import { SANDBOX_EVENTS } from '@/lib/quests/events'
import { PRESETS } from '@/lib/quests/presets'

import { Sandbox } from './Sandbox'

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
  const urlPreset = useQueryParam('p')
  const code = useQueryParam('s')
  // 使用者一旦自己按了開場按鈕，網址帶的那段操作就不算數了
  const [manual, setManual] = useState<string | null>(null)

  const activeId =
    manual ?? (PRESETS.some((p) => p.id === urlPreset) ? urlPreset : PRESETS[0]!.id)
  const preset = PRESETS.find((p) => p.id === activeId) ?? PRESETS[0]!
  const replay = manual === null ? decodeSession(code) : []

  return (
    <div>
      <div className="rule-b flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2.5">
        <span className="label mr-1">開場</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setManual(p.id)}
            title={p.note}
            className={`rounded-[2px] border px-2 py-[3px] text-[0.7812rem] transition-colors ${
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
        key={`${preset.id}:${manual === null ? code : 'fresh'}`}
        initial={preset.build}
        intro={preset.intro}
        quickCommands={QUICK}
        events={SANDBOX_EVENTS}
        replay={replay}
        extraParams={{ p: preset.id }}
      />
    </div>
  )
}
