'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { run } from '@/lib/git/commands'
import type { OutLine, Repo } from '@/lib/git/types'
import { usePresent } from '@/lib/present'
import {
  EVENT_PREFIX,
  MAX_CODE_LENGTH,
  encodeSession,
  eventIdOf,
  isEventStep,
} from '@/lib/share'
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
  /** 從網址帶進來的操作紀錄，進場先重播一遍 */
  replay?: string[]
  /** 產生分享連結時要一起帶上的參數（例如沙盒的開場） */
  extraParams?: Record<string, string>
  /** 側欄（關卡說明）。給了就變兩欄。 */
  aside?: React.ReactNode
}

const MAX_UNDO = 40

interface Seed {
  repo: Repo
  entries: TerminalEntry[]
  steps: string[]
  nextId: number
}

/**
 * 把「進場狀態」算出來。
 *
 * 有帶操作紀錄的話就整段重播 —— 連終端機的逐行輸出都會長回來，
 * 所以學生點開連結看到的是整個過程，不是一個結果。
 */
function seed(
  initial: () => Repo,
  intro: OutLine[],
  replay: string[],
  events: SandboxEvent[],
): Seed {
  let repo = initial()
  let nextId = 1
  const entries: TerminalEntry[] = intro.length
    ? [{ id: 0, input: '', actor: 'human', lines: intro }]
    : []
  const steps: string[] = []

  for (const step of replay) {
    if (isEventStep(step)) {
      const event = events.find((e) => e.id === eventIdOf(step))
      if (!event) continue
      repo = event.apply(repo)
      entries.push({
        id: nextId++,
        input: '',
        actor: 'agent',
        lines: [
          { kind: 'title', text: `⟢ ${event.label}` },
          { kind: 'hint', text: event.note },
        ],
      })
      steps.push(step)
      continue
    }

    const result = run(repo, step)
    entries.push({ id: nextId++, input: step, actor: repo.actor, lines: result.lines })
    repo = result.repo
    steps.push(step)
  }

  return { repo, entries, steps, nextId }
}

export function Sandbox({
  initial,
  intro = [],
  quickCommands = [],
  objectives = [],
  events = [],
  onComplete,
  replay = [],
  extraParams,
  aside,
}: SandboxProps) {
  const [state, setState] = useState<Seed>(() => seed(initial, intro, replay, events))
  const { repo, entries, steps } = state

  const [usedEvents, setUsedEvents] = useState<string[]>(() =>
    replay.filter(isEventStep).map(eventIdOf),
  )
  const [copied, setCopied] = useState<'idle' | 'done' | 'toolong'>('idle')
  const { present, toggle: togglePresent } = usePresent()

  const undoStack = useRef<Seed[]>([])
  const announced = useRef(false)

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

  const advance = useCallback(
    (next: (prev: Seed) => Seed, remember: boolean) => {
      setState((prev) => {
        if (remember) {
          undoStack.current.push(prev)
          if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
        }
        return next(prev)
      })
      setCopied('idle')
    },
    [],
  )

  const execute = useCallback(
    (command: string) => {
      advance((prev) => {
        const result = run(prev.repo, command)
        return {
          repo: result.repo,
          entries: [
            ...prev.entries,
            {
              id: prev.nextId,
              input: command,
              actor: prev.repo.actor,
              lines: result.lines,
            },
          ],
          // 每一個打過的指令都記，包括 git status、cat 這種不改東西的 ——
          // 對看連結的人來說，「你當時查了什麼」跟「你改了什麼」一樣重要。
          // 打錯的也留著：學生要問「我卡在這裡」，卡住的那行才是重點。
          steps: [...prev.steps, command],
          nextId: prev.nextId + 1,
        }
      }, true)
    },
    [advance],
  )

  const fireEvent = useCallback(
    (event: SandboxEvent) => {
      advance(
        (prev) => ({
          repo: event.apply(prev.repo),
          entries: [
            ...prev.entries,
            {
              id: prev.nextId,
              input: '',
              actor: 'agent',
              lines: [
                { kind: 'title', text: `⟢ ${event.label}` },
                { kind: 'hint', text: event.note },
              ],
            },
          ],
          steps: [...prev.steps, `${EVENT_PREFIX}${event.id}`],
          nextId: prev.nextId + 1,
        }),
        true,
      )
      setUsedEvents((u) => [...u, event.id])
    },
    [advance],
  )

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    setState({
      ...prev,
      entries: [
        ...prev.entries,
        {
          id: prev.nextId,
          input: '',
          actor: 'human',
          lines: [
            { kind: 'dim', text: '（倒帶一步。真的 git 沒有這個按鈕，但有 reflog。）' },
          ],
        },
      ],
      nextId: prev.nextId + 1,
    })
    setCopied('idle')
  }, [])

  const reset = useCallback(() => {
    undoStack.current = []
    announced.current = false
    setUsedEvents([])
    setCopied('idle')
    setState(seed(initial, intro, [], events))
    if (typeof window !== 'undefined' && window.location.search.includes('s=')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('s')
      window.history.replaceState(null, '', url.toString())
    }
  }, [initial, intro, events])

  const share = useCallback(async () => {
    const code = encodeSession(steps)
    if (code.length > MAX_CODE_LENGTH) {
      setCopied('toolong')
      return
    }
    const url = new URL(window.location.href)
    url.search = ''
    for (const [k, v] of Object.entries(extraParams ?? {})) {
      url.searchParams.set(k, v)
    }
    if (code) url.searchParams.set('s', code)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied('done')
    } catch {
      // 沒有剪貼簿權限的話，至少把網址換過去讓人自己複製
      window.history.replaceState(null, '', url.toString())
      setCopied('done')
    }
  }, [steps, extraParams])

  useEffect(() => {
    if (copied === 'idle') return
    const t = setTimeout(() => setCopied('idle'), 2600)
    return () => clearTimeout(t)
  }, [copied])

  const toggleActor = useCallback(() => {
    execute(repo.actor === 'agent' ? 'become me' : 'become ai')
  }, [execute, repo.actor])

  const visibleEvents = events.filter((e) => !(e.once && usedEvents.includes(e.id)))

  return (
    <div
      className={
        aside ? 'grid gap-0 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]' : ''
      }
    >
      {aside && (
        <div className="border-b border-rule lg:border-r lg:border-b-0">{aside}</div>
      )}

      <div className="flex min-w-0 flex-col">
        {objectives.length > 0 && (
          <div className="rule-b flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5">
            {objectives.map((o, i) => (
              <span key={o.id} className="flex items-baseline gap-1.5">
                <span
                  className={`num text-[0.6875rem] ${done[i] ? 'text-moss' : 'text-ink-3'}`}
                >
                  {done[i] ? '✓' : '○'}
                </span>
                <span
                  className={`present-objective text-[0.8125rem] ${
                    done[i]
                      ? 'text-ink-3 line-through decoration-ink-3/50'
                      : 'text-ink'
                  }`}
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

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="flex min-w-0 flex-col">
            {(quickCommands.length > 0 || visibleEvents.length > 0) && (
              <div className="rule-b flex flex-wrap items-center gap-1.5 px-4 py-2">
                {quickCommands.map((c) => (
                  <button
                    key={c}
                    onClick={() => execute(c)}
                    className="present-chip num rounded-[2px] border border-rule px-1.5 py-[2px] text-[0.6875rem] text-ink-2 transition-colors hover:border-ink-3 hover:bg-paper-2 hover:text-ink"
                  >
                    {c}
                  </button>
                ))}
                {visibleEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => fireEvent(e)}
                    className="present-chip rounded-[2px] border border-plum/60 px-1.5 py-[2px] text-[0.7188rem] text-plum transition-colors hover:bg-plum hover:text-paper"
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
              className="min-h-[280px] flex-1"
            />
          </div>

          <div className="flex flex-col border-t border-rule lg:border-t-0 lg:border-l">
            <div className="rule-b flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <button
                onClick={toggleActor}
                className={`num rounded-[2px] border px-2 py-[3px] text-[0.6875rem] transition-colors ${
                  repo.actor === 'agent'
                    ? 'border-plum bg-plum text-paper'
                    : 'border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
                }`}
                title="換一個人坐到鍵盤前面。commit 會記得是誰。"
              >
                {repo.actor === 'agent' ? 'AI 代理在操作' : '你在操作'}
              </button>
              <div className="flex items-baseline gap-1.5">
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

            <div className="rule-b flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <button
                onClick={share}
                disabled={steps.length === 0}
                className="label hover:text-ink transition-colors disabled:opacity-40 disabled:hover:text-ink-3"
                title="把你剛剛做的每一步編進網址。別人點開會看到一模一樣的過程。"
              >
                {copied === 'done'
                  ? '連結複製好了'
                  : copied === 'toolong'
                    ? '步驟太多，連結會爆'
                    : `複製這一段的連結（${steps.length} 步）`}
              </button>
              <button
                onClick={togglePresent}
                className={`label transition-colors ${
                  present ? 'text-vermilion' : 'hover:text-ink'
                }`}
                title="放大字和圖，給教室後排看"
              >
                投影
              </button>
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
