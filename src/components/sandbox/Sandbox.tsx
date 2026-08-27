'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { run } from '@/lib/git/commands'
import type { OutLine, Repo } from '@/lib/git/types'
import type { Objective, SandboxEvent } from '@/lib/quests/types'

import { CommitGraph } from '@/components/graph/CommitGraph'
import { Terminal, type TerminalEntry } from '@/components/terminal/Terminal'
import { WorkspacePanel } from './WorkspacePanel'

export interface SandboxProps {
  initial: () => Repo
  intro?: OutLine[]
  quickCommands?: string[]
  objectives?: Objective[]
  events?: SandboxEvent[]
  onComplete?: () => void
  /** 側欄（關卡說明）。給了就變兩欄。 */
  aside?: React.ReactNode
}

const MAX_UNDO = 40

export function Sandbox({
  initial,
  intro = [],
  quickCommands = [],
  objectives = [],
  events = [],
  onComplete,
  aside,
}: SandboxProps) {
  const [repo, setRepo] = useState<Repo>(initial)
  const [entries, setEntries] = useState<TerminalEntry[]>(
    intro.length ? [{ id: 0, input: '', actor: 'human', lines: intro }] : [],
  )
  const [usedEvents, setUsedEvents] = useState<string[]>([])
  const undoStack = useRef<Repo[]>([])
  const nextId = useRef(1)
  const announced = useRef(false)

  const push = useCallback((prev: Repo) => {
    undoStack.current.push(prev)
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
  }, [])

  const done = useMemo(
    () => objectives.map((o) => o.check(repo)),
    [objectives, repo],
  )
  const allDone = objectives.length > 0 && done.every(Boolean)

  useEffect(() => {
    if (!allDone || announced.current) return
    announced.current = true
    onComplete?.()
  }, [allDone, onComplete])

  const execute = useCallback(
    (command: string) => {
      setRepo((prev) => {
        const result = run(prev, command)
        setEntries((es) => [
          ...es,
          {
            id: nextId.current++,
            input: command,
            actor: prev.actor,
            lines: result.lines,
          },
        ])
        if (result.mutated) push(prev)
        return result.repo
      })
    },
    [push],
  )

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    setRepo(prev)
    setEntries((es) => [
      ...es,
      {
        id: nextId.current++,
        input: '',
        actor: 'human',
        lines: [{ kind: 'dim', text: '（倒帶一步。真的 git 沒有這個按鈕，但有 reflog。）' }],
      },
    ])
  }, [])

  const reset = useCallback(() => {
    undoStack.current = []
    announced.current = false
    setUsedEvents([])
    setRepo(initial())
    setEntries(
      intro.length ? [{ id: nextId.current++, input: '', actor: 'human', lines: intro }] : [],
    )
  }, [initial, intro])

  const fireEvent = useCallback((event: SandboxEvent) => {
    setRepo((prev) => {
      push(prev)
      return event.apply(prev)
    })
    setUsedEvents((u) => [...u, event.id])
    setEntries((es) => [
      ...es,
      {
        id: nextId.current++,
        input: '',
        actor: 'agent',
        lines: [
          { kind: 'title', text: `⟢ ${event.label}` },
          { kind: 'hint', text: event.note },
        ],
      },
    ])
  }, [push])

  const toggleActor = useCallback(() => {
    execute(repo.actor === 'agent' ? 'become me' : 'become ai')
  }, [execute, repo.actor])

  const visibleEvents = events.filter(
    (e) => !(e.once && usedEvents.includes(e.id)),
  )

  return (
    <div className={aside ? 'grid gap-0 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]' : ''}>
      {aside && (
        <div className="border-b border-rule lg:border-r lg:border-b-0">{aside}</div>
      )}

      <div className="flex min-w-0 flex-col">
        {objectives.length > 0 && (
          <div className="rule-b flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5">
            {objectives.map((o, i) => (
              <span key={o.id} className="flex items-baseline gap-1.5">
                <span
                  className={`num text-[11px] ${done[i] ? 'text-moss' : 'text-ink-3'}`}
                >
                  {done[i] ? '✓' : '○'}
                </span>
                <span
                  className={`text-[13px] ${done[i] ? 'text-ink-3 line-through decoration-ink-3/50' : 'text-ink'}`}
                >
                  {o.label}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="rule-b bg-paper-2/40">
          <CommitGraph repo={repo} />
        </div>

        <div className="grid min-h-[380px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="flex min-w-0 flex-col">
            {(quickCommands.length > 0 || visibleEvents.length > 0) && (
              <div className="rule-b flex flex-wrap items-center gap-1.5 px-4 py-2">
                {quickCommands.map((c) => (
                  <button
                    key={c}
                    onClick={() => execute(c)}
                    className="num rounded-[2px] border border-rule px-1.5 py-[2px] text-[11px] text-ink-2 transition-colors hover:border-ink-3 hover:bg-paper-2 hover:text-ink"
                  >
                    {c}
                  </button>
                ))}
                {visibleEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => fireEvent(e)}
                    className="rounded-[2px] border border-plum/60 px-1.5 py-[2px] text-[11.5px] text-plum transition-colors hover:bg-plum hover:text-paper"
                    title={e.note}
                  >
                    ⟢ {e.label}
                  </button>
                ))}
              </div>
            )}
            <Terminal
              repo={repo}
              entries={entries}
              onSubmit={execute}
              className="min-h-[300px] flex-1"
            />
          </div>

          <div className="flex flex-col border-t border-rule lg:border-t-0 lg:border-l">
            <div className="rule-b flex items-center justify-between gap-2 px-4 py-2">
              <button
                onClick={toggleActor}
                className={`num rounded-[2px] border px-2 py-[3px] text-[11px] transition-colors ${
                  repo.actor === 'agent'
                    ? 'border-plum bg-plum text-paper'
                    : 'border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
                }`}
                title="換一個人坐到鍵盤前面。commit 會記得是誰。"
              >
                {repo.actor === 'agent' ? 'AI 代理在操作' : '你在操作'}
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={undo}
                  className="label hover:text-ink transition-colors"
                >
                  倒帶
                </button>
                <span className="label">/</span>
                <button
                  onClick={reset}
                  className="label hover:text-ink transition-colors"
                >
                  重來
                </button>
              </div>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              <WorkspacePanel repo={repo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
