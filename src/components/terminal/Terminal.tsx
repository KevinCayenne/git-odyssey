'use client'

import { useEffect, useRef, useState } from 'react'

import { headBranch, headOid } from '@/lib/git/repo'
import type { LineKind, OutLine, Repo } from '@/lib/git/types'

export interface TerminalEntry {
  id: number
  input: string
  actor: 'human' | 'agent'
  lines: OutLine[]
}

const LINE_CLASS: Record<LineKind, string> = {
  out: 'term-out',
  dim: 'term-dim',
  ok: 'term-ok',
  err: 'term-err',
  warn: 'term-warn',
  hint: 'term-hint',
  title: 'term-title',
}

const COMPLETIONS = [
  'git init',
  'git status',
  'git add .',
  'git commit -m ""',
  'git log --oneline --all',
  'git branch',
  'git switch -c ',
  'git switch ',
  'git merge ',
  'git rebase ',
  'git cherry-pick ',
  'git revert ',
  'git reset --hard ',
  'git reflog',
  'git stash',
  'git stash pop',
  'git tag ',
  'git diff',
  'git show ',
  'git fetch',
  'git pull',
  'git push -u origin ',
  'write ',
  'cat ',
  'ls',
  'become ai',
  'become me',
  'help',
]

export function Terminal({
  repo,
  entries,
  onSubmit,
  className = '',
}: {
  repo: Repo
  entries: TerminalEntry[]
  onSubmit: (command: string) => void
  className?: string
}) {
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  const history = entries.map((e) => e.input).filter(Boolean)

  const submit = () => {
    const cmd = value.trim()
    if (!cmd) return
    onSubmit(cmd)
    setValue('')
    setCursor(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = cursor < 0 ? history.length - 1 : Math.max(0, cursor - 1)
      if (history[next] !== undefined) {
        setCursor(next)
        setValue(history[next]!)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (cursor < 0) return
      const next = cursor + 1
      if (next >= history.length) {
        setCursor(-1)
        setValue('')
      } else {
        setCursor(next)
        setValue(history[next]!)
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (!value) return
      const hit = COMPLETIONS.find((c) => c.startsWith(value) && c !== value)
      if (hit) setValue(hit)
    }
  }

  const branch = headBranch(repo)
  const detached = repo.head.type === 'detached'
  const where = detached
    ? `detached ${headOid(repo)?.slice(0, 7) ?? ''}`
    : (branch ?? 'main')

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="term">
          {entries.map((entry) => (
            <div key={entry.id} className="mb-2.5">
              {entry.input && (
                <div className="flex gap-2">
                  <Prompt actor={entry.actor} compact />
                  <span className="term-echo break-all">{entry.input}</span>
                </div>
              )}
              {entry.lines.map((line, i) => (
                <div
                  key={i}
                  className={`${LINE_CLASS[line.kind]} whitespace-pre-wrap break-words`}
                >
                  {line.text || ' '}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rule-t flex items-center gap-2 px-4 py-2.5">
        <Prompt actor={repo.actor} where={where} />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="git 指令"
          placeholder="打 help 看能用什麼"
          className="term flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3/70"
        />
      </div>
    </div>
  )
}

function Prompt({
  actor,
  where,
  compact = false,
}: {
  actor: 'human' | 'agent'
  where?: string
  compact?: boolean
}) {
  const agent = actor === 'agent'
  return (
    <span className="term shrink-0 select-none whitespace-nowrap">
      {!compact && (
        <span className={agent ? 'text-plum' : 'text-ink-3'}>
          {agent ? 'agent' : 'you'}
        </span>
      )}
      {!compact && where && <span className="text-ink-3">:{where}</span>}
      <span className={agent ? 'text-plum' : 'text-vermilion'}>
        {compact ? '›' : ' $'}
      </span>
    </span>
  )
}
