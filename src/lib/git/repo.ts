import type { Actor, Commit, Oid, Repo, Tree } from './types'

/* ------------------------------------------------------------------ */
/* 雜湊                                                                */
/* ------------------------------------------------------------------ */

/** FNV-1a。不是 SHA-1，但是穩定、可重播、看起來像 git 的東西。 */
export function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const a = h.toString(16).padStart(8, '0')
  let g = 0x2fd6a1b7
  for (let i = input.length - 1; i >= 0; i--) {
    g ^= input.charCodeAt(i)
    g = Math.imul(g, 0x01000193) >>> 0
  }
  return (a + g.toString(16).padStart(8, '0')).slice(0, 7)
}

function treeSignature(tree: Tree): string {
  return Object.keys(tree)
    .sort()
    .map((k) => `${k} ${tree[k]}`)
    .join('')
}

export function commitId(
  parents: Oid[],
  message: string,
  tree: Tree,
  time: number,
): Oid {
  return hash(`${parents.join(',')}|${message}|${time}|${treeSignature(tree)}`)
}

/* ------------------------------------------------------------------ */
/* 建立                                                                */
/* ------------------------------------------------------------------ */

export function emptyRepo(): Repo {
  return {
    initialized: false,
    commits: {},
    branches: {},
    tags: {},
    remote: {},
    tracking: {},
    upstream: {},
    head: { type: 'branch', name: 'main' },
    work: {},
    index: {},
    pending: null,
    stash: [],
    reflog: [],
    clock: 0,
    actor: 'human',
  }
}

export function clone(repo: Repo): Repo {
  return structuredClone(repo)
}

/* ------------------------------------------------------------------ */
/* 讀取                                                                */
/* ------------------------------------------------------------------ */

export function headOid(repo: Repo): Oid | null {
  if (repo.head.type === 'detached') return repo.head.oid
  return repo.branches[repo.head.name] ?? null
}

export function headBranch(repo: Repo): string | null {
  return repo.head.type === 'branch' ? repo.head.name : null
}

export function getCommit(repo: Repo, oid: Oid | null): Commit | null {
  if (!oid) return null
  return repo.commits[oid] ?? null
}

export function treeAt(repo: Repo, oid: Oid | null): Tree {
  const c = getCommit(repo, oid)
  return c ? { ...c.tree } : {}
}

export function headTree(repo: Repo): Tree {
  return treeAt(repo, headOid(repo))
}

/**
 * 把使用者打的東西解成 oid。
 * 認得：分支名、tag、HEAD、完整/前綴 hash、以及 `X~n` / `X^` / `X^2`。
 */
export function resolveRev(repo: Repo, rev: string): Oid | null {
  if (!rev) return null

  // 後綴運算子：一路剝下來
  const m = rev.match(/^(.*?)((?:[~^]\d*)+)$/)
  if (m && m[1] && m[2]) {
    let oid = resolveRev(repo, m[1])
    const ops = m[2].match(/[~^]\d*/g) ?? []
    for (const op of ops) {
      if (!oid) return null
      const commit = repo.commits[oid]
      if (!commit) return null
      const n = op.length > 1 ? Number(op.slice(1)) : 1
      if (op.startsWith('~')) {
        let cur: Oid | null = oid
        for (let i = 0; i < n; i++) {
          const c: Commit | undefined = cur ? repo.commits[cur] : undefined
          cur = c?.parents[0] ?? null
        }
        oid = cur
      } else {
        oid = commit.parents[n - 1] ?? null
      }
    }
    return oid
  }

  if (rev === 'HEAD' || rev === '@') return headOid(repo)
  if (repo.branches[rev]) return repo.branches[rev]!
  if (repo.tags[rev]) return repo.tags[rev]!

  const remoteMatch = rev.match(/^origin\/(.+)$/)
  if (remoteMatch?.[1] && repo.tracking[remoteMatch[1]]) {
    return repo.tracking[remoteMatch[1]]!
  }

  if (repo.commits[rev]) return rev
  const candidates = Object.keys(repo.commits).filter((id) => id.startsWith(rev))
  if (candidates.length === 1) return candidates[0]!

  return null
}

/** 這個 oid 身上掛了哪些名字（畫圖用） */
export function refsAt(repo: Repo, oid: Oid): string[] {
  const out: string[] = []
  for (const [name, target] of Object.entries(repo.branches)) {
    if (target === oid) out.push(name)
  }
  for (const [name, target] of Object.entries(repo.tracking)) {
    if (target === oid) out.push(`origin/${name}`)
  }
  for (const [name, target] of Object.entries(repo.tags)) {
    if (target === oid) out.push(`tag: ${name}`)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 走訪                                                                */
/* ------------------------------------------------------------------ */

export function ancestors(repo: Repo, oid: Oid | null): Set<Oid> {
  const seen = new Set<Oid>()
  if (!oid) return seen
  const stack = [oid]
  while (stack.length) {
    const cur = stack.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const c = repo.commits[cur]
    if (c) stack.push(...c.parents)
  }
  return seen
}

export function isAncestor(repo: Repo, maybe: Oid, of: Oid): boolean {
  return ancestors(repo, of).has(maybe)
}

/** 兩點的最近共同祖先。多個候選時取世代最深的那個。 */
export function mergeBase(repo: Repo, a: Oid | null, b: Oid | null): Oid | null {
  if (!a || !b) return null
  const aSet = ancestors(repo, a)
  const common: Oid[] = []
  for (const oid of ancestors(repo, b)) {
    if (aSet.has(oid)) common.push(oid)
  }
  if (!common.length) return null
  const gens = generations(repo)
  common.sort((x, y) => (gens[y] ?? 0) - (gens[x] ?? 0))
  return common[0]!
}

/** 每個 commit 離根最遠的距離。圖的 x 軸就是這個。 */
export function generations(repo: Repo): Record<Oid, number> {
  const gen: Record<Oid, number> = {}
  const visit = (oid: Oid, guard: Set<Oid>): number => {
    const cached = gen[oid]
    if (cached !== undefined) return cached
    if (guard.has(oid)) return 0
    guard.add(oid)
    const c = repo.commits[oid]
    let g = 0
    if (c) {
      for (const p of c.parents) g = Math.max(g, visit(p, guard) + 1)
    }
    guard.delete(oid)
    gen[oid] = g
    return g
  }
  for (const oid of Object.keys(repo.commits)) visit(oid, new Set())
  return gen
}

/** 從一群起點往回走，新的在前。 */
export function walk(repo: Repo, tips: (Oid | null)[]): Commit[] {
  const seen = new Set<Oid>()
  const out: Commit[] = []
  const queue: Oid[] = tips.filter((t): t is Oid => Boolean(t))
  const gens = generations(repo)
  while (queue.length) {
    queue.sort((a, b) => {
      const c1 = repo.commits[a]
      const c2 = repo.commits[b]
      const t = (c2?.time ?? 0) - (c1?.time ?? 0)
      return t !== 0 ? t : (gens[b] ?? 0) - (gens[a] ?? 0)
    })
    const cur = queue.shift()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const c = repo.commits[cur]
    if (!c) continue
    out.push(c)
    queue.push(...c.parents.filter((p) => !seen.has(p)))
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 三方合併：merge / rebase / cherry-pick / revert 全部共用這一段        */
/* ------------------------------------------------------------------ */

export interface MergeOutcome {
  tree: Tree
  conflicts: string[]
}

const MARK_OURS = '<'.repeat(7) + ' HEAD'
const MARK_SPLIT = '='.repeat(7)
const MARK_THEIRS = '>'.repeat(7)

export function mergeTrees(
  base: Tree,
  ours: Tree,
  theirs: Tree,
  theirLabel: string,
): MergeOutcome {
  const files = new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ])
  const tree: Tree = {}
  const conflicts: string[] = []

  for (const f of [...files].sort()) {
    const b = base[f]
    const o = ours[f]
    const t = theirs[f]

    if (o === t) {
      if (o !== undefined) tree[f] = o
      continue
    }
    if (o === b) {
      // 只有對方動過
      if (t !== undefined) tree[f] = t
      continue
    }
    if (t === b) {
      // 只有我們動過
      if (o !== undefined) tree[f] = o
      continue
    }
    // 兩邊都動了，而且動得不一樣 —— 這就是衝突，git 不會替你決定
    conflicts.push(f)
    tree[f] = [
      MARK_OURS,
      o ?? '(已刪除)',
      MARK_SPLIT,
      t ?? '(已刪除)',
      `${MARK_THEIRS} ${theirLabel}`,
    ].join('\n')
  }

  return { tree, conflicts }
}

export function hasConflictMarkers(content: string): boolean {
  return content.includes(MARK_OURS) || content.includes(MARK_SPLIT)
}

/* ------------------------------------------------------------------ */
/* 寫入                                                                */
/* ------------------------------------------------------------------ */

export function recordCommit(
  repo: Repo,
  parents: Oid[],
  message: string,
  tree: Tree,
  actor: Actor,
  coAuthored = false,
): Commit {
  repo.clock += 1
  const id = commitId(parents, message, tree, repo.clock)
  const commit: Commit = {
    id,
    parents,
    message,
    actor,
    coAuthored,
    tree: { ...tree },
    time: repo.clock,
  }
  repo.commits[id] = commit
  return commit
}

export function moveHead(repo: Repo, oid: Oid, action: string): void {
  if (repo.head.type === 'branch') {
    repo.branches[repo.head.name] = oid
  } else {
    repo.head = { type: 'detached', oid }
  }
  logRef(repo, oid, action)
}

export function logRef(repo: Repo, oid: Oid, action: string): void {
  repo.clock += 1
  repo.reflog.unshift({ oid, action, time: repo.clock })
  if (repo.reflog.length > 60) repo.reflog.pop()
}

/* ------------------------------------------------------------------ */
/* 狀態                                                                */
/* ------------------------------------------------------------------ */

export interface StatusEntry {
  path: string
  kind: 'new' | 'modified' | 'deleted'
}

export interface RepoStatus {
  staged: StatusEntry[]
  unstaged: StatusEntry[]
  untracked: string[]
  conflicted: string[]
  clean: boolean
}

function diffTrees(from: Tree, to: Tree): StatusEntry[] {
  const out: StatusEntry[] = []
  const files = new Set([...Object.keys(from), ...Object.keys(to)])
  for (const f of [...files].sort()) {
    const a = from[f]
    const b = to[f]
    if (a === b) continue
    if (a === undefined) out.push({ path: f, kind: 'new' })
    else if (b === undefined) out.push({ path: f, kind: 'deleted' })
    else out.push({ path: f, kind: 'modified' })
  }
  return out
}

export function status(repo: Repo): RepoStatus {
  const head = headTree(repo)
  const conflicted = repo.pending?.conflicts ?? []
  const staged = diffTrees(head, repo.index).filter(
    (e) => !conflicted.includes(e.path),
  )
  const all = diffTrees(repo.index, repo.work)
  const unstaged = all.filter(
    (e) => e.kind !== 'new' && !conflicted.includes(e.path),
  )
  const untracked = all
    .filter((e) => e.kind === 'new' && !conflicted.includes(e.path))
    .map((e) => e.path)

  return {
    staged,
    unstaged,
    untracked,
    conflicted,
    clean:
      staged.length === 0 &&
      unstaged.length === 0 &&
      untracked.length === 0 &&
      conflicted.length === 0,
  }
}

export function isClean(repo: Repo): boolean {
  return status(repo).clean
}

/** 換到另一棵樹上。回傳擋路的檔案（空陣列代表可以走）。 */
export function checkoutTree(repo: Repo, target: Tree): string[] {
  const head = headTree(repo)
  const dirty = new Set<string>()
  const touched = new Set([
    ...Object.keys(head),
    ...Object.keys(repo.work),
    ...Object.keys(repo.index),
  ])
  for (const f of touched) {
    if (repo.work[f] !== head[f] || repo.index[f] !== head[f]) dirty.add(f)
  }
  const blocked = [...dirty].filter((f) => target[f] !== head[f])
  if (blocked.length) return blocked.sort()

  const work: Tree = { ...target }
  const index: Tree = { ...target }
  for (const f of dirty) {
    if (repo.work[f] === undefined) delete work[f]
    else work[f] = repo.work[f]!
    if (repo.index[f] === undefined) delete index[f]
    else index[f] = repo.index[f]!
  }
  repo.work = work
  repo.index = index
  return []
}
