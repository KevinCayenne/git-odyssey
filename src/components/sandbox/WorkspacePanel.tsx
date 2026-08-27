'use client'

import { getCommit, headOid, headTree, status } from '@/lib/git/repo'
import type { Repo } from '@/lib/git/types'

/**
 * 把 git 的三個地方攤在同一個畫面上。
 *
 * 大部分人卡住不是因為忘了指令，是因為腦袋裡沒有這三格。
 * 檔案改了在第一格，git add 送到第二格，git commit 才進第三格 —— 進去了才叫「記住」。
 */

const MARK: Record<string, { sign: string; cls: string }> = {
  new: { sign: '+', cls: 'text-moss' },
  modified: { sign: '~', cls: 'text-ochre' },
  deleted: { sign: '−', cls: 'text-vermilion' },
  same: { sign: '·', cls: 'text-ink-3' },
  conflict: { sign: '!', cls: 'text-vermilion' },
}

function FileRow({
  path,
  kind,
  content,
}: {
  path: string
  kind: keyof typeof MARK
  content?: string
}) {
  const m = MARK[kind]!
  const preview = (content ?? '').split('\n')[0] ?? ''
  return (
    <div className="flex items-baseline gap-2 py-[3px]">
      <span className={`num shrink-0 text-[11px] ${m.cls}`}>{m.sign}</span>
      <span className="num shrink-0 text-[11.5px] text-ink">{path}</span>
      {preview && (
        <span className="truncate text-[11.5px] text-ink-3">{preview}</span>
      )}
    </div>
  )
}

function Zone({
  num,
  title,
  note,
  children,
  empty,
}: {
  num: string
  title: string
  note: string
  children: React.ReactNode
  empty: boolean
}) {
  return (
    <div className="rule-b px-4 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="num text-[10px] text-vermilion">{num}</span>
        <span className="text-[13px] text-ink">{title}</span>
        <span className="text-[11px] text-ink-3">{note}</span>
      </div>
      {empty ? <p className="text-[11.5px] text-ink-3">（空的）</p> : children}
    </div>
  )
}

export function WorkspacePanel({ repo }: { repo: Repo }) {
  const st = status(repo)
  const head = headTree(repo)
  const headCommit = getCommit(repo, headOid(repo))
  const conflicts = new Set(st.conflicted)

  const workFiles = Object.keys(repo.work).sort()
  const dirty = workFiles.filter(
    (f) => conflicts.has(f) || repo.work[f] !== repo.index[f],
  )
  const headFiles = Object.keys(head).sort()

  return (
    <div className="flex h-full flex-col">
      <Zone
        num="01"
        title="工作目錄"
        note="你手上正在動的東西"
        empty={dirty.length === 0}
      >
        {dirty.map((f) => (
          <FileRow
            key={f}
            path={f}
            kind={
              conflicts.has(f)
                ? 'conflict'
                : repo.index[f] === undefined
                  ? 'new'
                  : 'modified'
            }
            content={repo.work[f]}
          />
        ))}
        {dirty.length === 0 && workFiles.length > 0 && (
          <p className="text-[11.5px] text-ink-3">
            {workFiles.length} 個檔案，都跟暫存區一樣
          </p>
        )}
      </Zone>

      <Zone
        num="02"
        title="暫存區"
        note="你打算把哪些收成一件事"
        empty={st.staged.length === 0}
      >
        {st.staged.map((e) => (
          <FileRow
            key={e.path}
            path={e.path}
            kind={e.kind}
            content={repo.index[e.path]}
          />
        ))}
      </Zone>

      <Zone
        num="03"
        title="已經寫進歷史"
        note={headCommit ? headCommit.message : '還沒有 commit'}
        empty={headFiles.length === 0}
      >
        {headFiles.map((f) => (
          <FileRow key={f} path={f} kind="same" content={head[f]} />
        ))}
      </Zone>

      {repo.pending && (
        <div className="mt-auto border-t border-vermilion bg-vermilion/[0.06] px-4 py-3">
          <p className="label mb-1" style={{ color: 'var(--vermilion)' }}>
            {repo.pending.kind} 進行到一半
          </p>
          <p className="text-[12.5px] leading-[1.75] text-ink-2">
            {repo.pending.conflicts.length > 0
              ? `${repo.pending.conflicts.join('、')} 兩邊都動過。決定要留什麼，write 回去，然後 git add。`
              : '衝突解完了，可以繼續了。'}
          </p>
        </div>
      )}
    </div>
  )
}
