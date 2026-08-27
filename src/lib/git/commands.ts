import { diffTree } from './diff'
import {
  ancestors,
  checkoutTree,
  clone,
  generations,
  getCommit,
  hasConflictMarkers,
  headBranch,
  headOid,
  headTree,
  isAncestor,
  logRef,
  mergeBase,
  mergeTrees,
  moveHead,
  recordCommit,
  refsAt,
  resolveRev,
  status,
  treeAt,
  walk,
} from './repo'
import type { Commit, Oid, OutLine, Repo, RunResult, Tree } from './types'

class GitError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.hint = hint
  }
}

const fail = (message: string, hint?: string): never => {
  throw new GitError(message, hint)
}

/* ------------------------------------------------------------------ */
/* 斷詞                                                                */
/* ------------------------------------------------------------------ */

export function tokenize(input: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: '"' | "'" | null = null
  let has = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      has = true
      continue
    }
    if (/\s/.test(ch)) {
      if (cur || has) out.push(cur)
      cur = ''
      has = false
      continue
    }
    cur += ch
  }
  if (cur || has) out.push(cur)
  return out
}

/* ------------------------------------------------------------------ */
/* 輸出小工具                                                          */
/* ------------------------------------------------------------------ */

const L = {
  out: (text: string): OutLine => ({ kind: 'out', text }),
  dim: (text: string): OutLine => ({ kind: 'dim', text }),
  ok: (text: string): OutLine => ({ kind: 'ok', text }),
  err: (text: string): OutLine => ({ kind: 'err', text }),
  warn: (text: string): OutLine => ({ kind: 'warn', text }),
  hint: (text: string): OutLine => ({ kind: 'hint', text }),
  title: (text: string): OutLine => ({ kind: 'title', text }),
  blank: (): OutLine => ({ kind: 'out', text: '' }),
}

function decorate(repo: Repo, oid: Oid): string {
  const refs = refsAt(repo, oid)
  const hb = headBranch(repo)
  const parts: string[] = []
  if (headOid(repo) === oid) {
    parts.push(hb ? `HEAD -> ${hb}` : 'HEAD')
  }
  for (const r of refs) if (r !== hb) parts.push(r)
  return parts.length ? ` (${parts.join(', ')})` : ''
}

function actorLabel(c: Commit): string {
  return c.actor === 'agent' ? 'AI 代理' : '你'
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

export function run(input: Repo, raw: string): RunResult {
  const trimmed = raw.trim()
  if (!trimmed) return { repo: input, lines: [], mutated: false }

  const repo = clone(input)
  const before = JSON.stringify(input)
  const argv = tokenize(trimmed)

  try {
    const lines = dispatch(repo, argv)
    return { repo, lines, mutated: JSON.stringify(repo) !== before }
  } catch (e) {
    if (e instanceof GitError) {
      const lines = [L.err(e.message)]
      if (e.hint) lines.push(L.hint(e.hint))
      return { repo: input, lines, mutated: false }
    }
    throw e
  }
}

function dispatch(repo: Repo, argv: string[]): OutLine[] {
  const cmd = argv[0]!
  const rest = argv.slice(1)

  switch (cmd) {
    case 'git':
      return git(repo, rest)
    case 'write':
      return write(repo, rest)
    case 'append':
      return append(repo, rest)
    case 'touch':
      return write(repo, [rest[0] ?? '', ''])
    case 'rm':
      return remove(repo, rest)
    case 'ls':
      return listFiles(repo)
    case 'cat':
      return catFile(repo, rest)
    case 'become':
      return become(repo, rest)
    case 'help':
      return help(rest)
    default:
      return fail(
        `找不到指令：${cmd}`,
        '打 help 看這個沙盒認得哪些東西。',
      )
  }
}

/* ------------------------------------------------------------------ */
/* 檔案系統（假的，但夠用）                                             */
/* ------------------------------------------------------------------ */

function requirePath(args: string[]): string {
  const p = args[0]
  if (!p) fail('要指定檔名。')
  return p!
}

function write(repo: Repo, args: string[]): OutLine[] {
  const path = requirePath(args)
  const content = args.slice(1).join(' ').replace(/\\n/g, '\n')
  const existed = repo.work[path] !== undefined
  repo.work[path] = content
  return [L.dim(`${existed ? '改寫' : '新建'} ${path}`)]
}

function append(repo: Repo, args: string[]): OutLine[] {
  const path = requirePath(args)
  const content = args.slice(1).join(' ').replace(/\\n/g, '\n')
  const prev = repo.work[path]
  repo.work[path] = prev === undefined || prev === '' ? content : `${prev}\n${content}`
  return [L.dim(`追加到 ${path}`)]
}

function remove(repo: Repo, args: string[]): OutLine[] {
  const path = requirePath(args)
  if (repo.work[path] === undefined) fail(`沒有這個檔案：${path}`)
  delete repo.work[path]
  return [L.dim(`刪除 ${path}`)]
}

function listFiles(repo: Repo): OutLine[] {
  const files = Object.keys(repo.work).sort()
  if (!files.length) return [L.dim('（工作目錄是空的）')]
  return files.map((f) => L.out(f))
}

function catFile(repo: Repo, args: string[]): OutLine[] {
  const path = requirePath(args)
  const content = repo.work[path]
  if (content === undefined) fail(`沒有這個檔案：${path}`)
  if (content === '') return [L.dim('（空檔案）')]
  return content!.split('\n').map((l) => L.out(l))
}

function become(repo: Repo, args: string[]): OutLine[] {
  const who = args[0]
  if (who === 'ai' || who === 'agent') {
    repo.actor = 'agent'
    return [L.ok('現在是 AI 代理在操作這個 repo。它做的每一個 commit 都會留下記號。')]
  }
  if (who === 'me' || who === 'human') {
    repo.actor = 'human'
    return [L.ok('換你了。')]
  }
  return fail('become me 或 become ai')
}

/* ------------------------------------------------------------------ */
/* git                                                                 */
/* ------------------------------------------------------------------ */

function git(repo: Repo, args: string[]): OutLine[] {
  const sub = args[0]
  if (!sub) return help([])
  const rest = args.slice(1)

  if (sub !== 'init' && !repo.initialized) {
    return fail(
      '這裡還不是一個 git repo。',
      'git init —— 這一步做的事，是在資料夾裡開一本空白帳本。',
    )
  }

  switch (sub) {
    case 'init':
      return gitInit(repo)
    case 'status':
      return gitStatus(repo)
    case 'add':
      return gitAdd(repo, rest)
    case 'restore':
      return gitRestore(repo, rest)
    case 'commit':
      return gitCommit(repo, rest)
    case 'log':
      return gitLog(repo, rest)
    case 'show':
      return gitShow(repo, rest)
    case 'diff':
      return gitDiff(repo, rest)
    case 'branch':
      return gitBranch(repo, rest)
    case 'checkout':
      return gitCheckout(repo, rest)
    case 'switch':
      return gitSwitch(repo, rest)
    case 'merge':
      return gitMerge(repo, rest)
    case 'rebase':
      return gitRebase(repo, rest)
    case 'cherry-pick':
      return gitCherryPick(repo, rest)
    case 'revert':
      return gitRevert(repo, rest)
    case 'reset':
      return gitReset(repo, rest)
    case 'tag':
      return gitTag(repo, rest)
    case 'stash':
      return gitStash(repo, rest)
    case 'remote':
      return gitRemote(repo, rest)
    case 'fetch':
      return gitFetch(repo)
    case 'push':
      return gitPush(repo, rest)
    case 'pull':
      return gitPull(repo, rest)
    case 'reflog':
      return gitReflog(repo)
    default:
      return fail(`這個沙盒還不認得 git ${sub}。`, '打 help 看清單。')
  }
}

function gitInit(repo: Repo): OutLine[] {
  if (repo.initialized) return [L.dim('已經是一個 repo 了，什麼都沒發生。')]
  repo.initialized = true
  repo.head = { type: 'branch', name: 'main' }
  return [
    L.ok('初始化完成，目前在 main 上，還沒有任何 commit。'),
    L.hint('從這一刻起，這個資料夾裡發生的每一次改變都可以被記住 —— 只要你開口記。'),
  ]
}

function gitStatus(repo: Repo): OutLine[] {
  const st = status(repo)
  const lines: OutLine[] = []
  const hb = headBranch(repo)
  lines.push(L.out(hb ? `位置：分支 ${hb}` : `位置：detached HEAD ${headOid(repo)?.slice(0, 7)}`))

  if (hb && repo.upstream[hb]) {
    const local = repo.branches[hb] ?? null
    const remote = repo.tracking[repo.upstream[hb]!] ?? null
    const ahead = local ? [...ancestors(repo, local)].filter((o) => !ancestors(repo, remote).has(o)).length : 0
    const behind = remote ? [...ancestors(repo, remote)].filter((o) => !ancestors(repo, local).has(o)).length : 0
    if (ahead || behind) {
      lines.push(L.dim(`相對 origin/${repo.upstream[hb]}：領先 ${ahead}、落後 ${behind}`))
    }
  }

  if (repo.pending) {
    lines.push(L.blank())
    lines.push(L.err(`${repo.pending.kind} 進行到一半：${repo.pending.incomingLabel}`))
  }

  if (st.conflicted.length) {
    lines.push(L.blank())
    lines.push(L.title('兩邊都動過，需要你決定：'))
    for (const f of st.conflicted) lines.push(L.err(`  both modified: ${f}`))
    lines.push(L.hint('打開檔案，把想留下的內容 write 回去，然後 git add 那個檔案。'))
  }

  if (st.staged.length) {
    lines.push(L.blank())
    lines.push(L.title('已經放進暫存區，下一個 commit 會收進去：'))
    for (const e of st.staged) lines.push(L.ok(`  ${kindLabel(e.kind)}: ${e.path}`))
  }

  if (st.unstaged.length) {
    lines.push(L.blank())
    lines.push(L.title('改過但還沒暫存：'))
    for (const e of st.unstaged) lines.push(L.out(`  ${kindLabel(e.kind)}: ${e.path}`))
  }

  if (st.untracked.length) {
    lines.push(L.blank())
    lines.push(L.title('git 還不認識的檔案：'))
    for (const f of st.untracked) lines.push(L.out(`  ${f}`))
  }

  if (st.clean) {
    lines.push(L.blank())
    lines.push(L.dim('工作目錄乾淨。沒有任何未記錄的改變。'))
  }

  return lines
}

function kindLabel(kind: 'new' | 'modified' | 'deleted'): string {
  return kind === 'new' ? '新增' : kind === 'deleted' ? '刪除' : '修改'
}

function gitAdd(repo: Repo, args: string[]): OutLine[] {
  if (!args.length) fail('git add 要指定檔案，或用 git add . 全收。')
  const targets =
    args.includes('.') || args.includes('-A') || args.includes('--all')
      ? [...new Set([...Object.keys(repo.work), ...Object.keys(repo.index)])]
      : args

  const touched: string[] = []
  for (const path of targets) {
    const inWork = repo.work[path]
    const inIndex = repo.index[path]
    if (inWork === undefined && inIndex === undefined) {
      fail(`沒有這個檔案：${path}`)
    }
    if (inWork === undefined) delete repo.index[path]
    else repo.index[path] = inWork!
    touched.push(path)

    if (repo.pending?.conflicts.includes(path)) {
      if (inWork !== undefined && hasConflictMarkers(inWork)) {
        fail(
          `${path} 裡還留著衝突標記。`,
          'git 不會幫你選。把整段改成你真正要的樣子，再 add 一次。',
        )
      }
      repo.pending.conflicts = repo.pending.conflicts.filter((f) => f !== path)
    }
  }

  const lines = [L.dim(`已暫存 ${touched.length} 個檔案`)]
  if (repo.pending && repo.pending.conflicts.length === 0) {
    lines.push(
      L.ok(
        repo.pending.kind === 'merge'
          ? '衝突都解完了。git commit 把這個決定記下來。'
          : `衝突都解完了。git ${repo.pending.kind} --continue 繼續。`,
      ),
    )
  }
  return lines
}

function gitRestore(repo: Repo, args: string[]): OutLine[] {
  const staged = args.includes('--staged')
  const paths = args.filter((a) => !a.startsWith('-'))
  if (!paths.length) fail('git restore 要指定檔案。')
  const head = headTree(repo)
  for (const p of paths) {
    if (staged) {
      if (head[p] === undefined) delete repo.index[p]
      else repo.index[p] = head[p]!
    } else {
      const idx = repo.index[p]
      if (idx === undefined) delete repo.work[p]
      else repo.work[p] = idx
    }
  }
  return [L.dim(staged ? `已取消暫存：${paths.join(', ')}` : `已丟棄改動：${paths.join(', ')}`)]
}

function parseMessage(args: string[]): string | null {
  const i = args.findIndex((a) => a === '-m' || a === '--message')
  if (i >= 0) return args[i + 1] ?? null
  const inline = args.find((a) => a.startsWith('-m'))
  if (inline && inline.length > 2) return inline.slice(2)
  return null
}

function gitCommit(repo: Repo, args: string[]): OutLine[] {
  const amend = args.includes('--amend')
  const message = parseMessage(args)
  const st = status(repo)

  if (repo.pending && repo.pending.conflicts.length) {
    fail(
      `還有 ${repo.pending.conflicts.length} 個檔案沒解完。`,
      'git status 看是哪些。',
    )
  }

  for (const [path, content] of Object.entries(repo.index)) {
    if (hasConflictMarkers(content)) {
      fail(
        `${path} 帶著衝突標記被暫存了。`,
        '這是最常見的意外 —— 標記會原封不動進到歷史裡。先把它清乾淨。',
      )
    }
  }

  if (repo.pending && repo.pending.kind !== 'merge') {
    fail(
      `${repo.pending.kind} 還在進行中。`,
      `用 git ${repo.pending.kind} --continue 或 --abort。`,
    )
  }

  const parent = headOid(repo)

  if (amend) {
    const old = getCommit(repo, parent)
    if (!old) fail('沒有可以修改的 commit。')
    const c = recordCommit(
      repo,
      old!.parents,
      message ?? old!.message,
      repo.index,
      repo.actor,
      repo.actor === 'agent',
    )
    moveHead(repo, c.id, `commit (amend): ${c.message}`)
    return [
      L.ok(`[${headBranch(repo) ?? 'HEAD'} ${c.id}] ${c.message}`),
      L.hint('注意 hash 變了 —— 你不是編輯了那個 commit，你是造了一個新的來取代它。'),
    ]
  }

  if (repo.pending?.kind === 'merge') {
    const incoming = repo.pending.incoming
    if (!incoming) fail('合併狀態壞掉了，git merge --abort 重來。')
    const msg = message ?? `Merge ${repo.pending.incomingLabel}`
    const c = recordCommit(repo, [parent!, incoming!], msg, repo.index, repo.actor, repo.actor === 'agent')
    repo.work = { ...repo.index }
    repo.pending = null
    moveHead(repo, c.id, `merge: ${msg}`)
    return [
      L.ok(`[${headBranch(repo) ?? 'HEAD'} ${c.id}] ${msg}`),
      L.dim('這個 commit 有兩個父親。歷史在這裡合流了。'),
    ]
  }

  if (!st.staged.length) {
    fail(
      '暫存區是空的，沒東西可以 commit。',
      st.unstaged.length || st.untracked.length
        ? 'git add 挑出這次要記錄的東西。commit 不是存檔，是「我決定這一組改動是一件事」。'
        : '先動點什麼：write notes.md 今天想到的事',
    )
  }

  if (!message) fail('要寫 commit 訊息。', 'git commit -m "說清楚你為什麼改，不是改了什麼"')

  const c = recordCommit(
    repo,
    parent ? [parent] : [],
    message!,
    repo.index,
    repo.actor,
    repo.actor === 'agent',
  )
  if (!parent && repo.head.type === 'branch') {
    repo.branches[repo.head.name] = c.id
    logRef(repo, c.id, `commit (initial): ${message}`)
  } else {
    moveHead(repo, c.id, `commit: ${message}`)
  }

  const lines = [
    L.ok(`[${headBranch(repo) ?? 'HEAD'} ${c.id}] ${message}`),
    L.dim(`${st.staged.length} 個檔案，作者：${actorLabel(c)}`),
  ]
  if (c.coAuthored) lines.push(L.dim('Co-Authored-By: AI 代理'))
  return lines
}

function gitLog(repo: Repo, args: string[]): OutLine[] {
  const oneline = args.includes('--oneline')
  const all = args.includes('--all')
  const limitArg = args.find((a) => /^-\d+$/.test(a))
  const limit = limitArg ? Number(limitArg.slice(1)) : 25

  const tips = all
    ? [...Object.values(repo.branches), ...Object.values(repo.tracking), headOid(repo)]
    : [headOid(repo)]
  const commits = walk(repo, tips).slice(0, limit)

  if (!commits.length) return [L.dim('還沒有任何 commit。歷史從第一次 git commit 開始。')]

  const lines: OutLine[] = []
  for (const c of commits) {
    if (oneline) {
      lines.push(L.out(`${c.id}${decorate(repo, c.id)} ${c.message}`))
    } else {
      lines.push(L.title(`commit ${c.id}${decorate(repo, c.id)}`))
      lines.push(L.dim(`Author: ${actorLabel(c)}${c.coAuthored ? '（AI 協作）' : ''}`))
      if (c.parents.length > 1) lines.push(L.dim(`Merge:  ${c.parents.map((p) => p.slice(0, 7)).join(' ')}`))
      lines.push(L.out(`    ${c.message}`))
      lines.push(L.blank())
    }
  }
  return lines
}

function gitShow(repo: Repo, args: string[]): OutLine[] {
  const rev = args.find((a) => !a.startsWith('-')) ?? 'HEAD'
  const oid = resolveRev(repo, rev)
  const c = getCommit(repo, oid)
  if (!c) fail(`找不到 ${rev}。`)

  const lines: OutLine[] = [
    L.title(`commit ${c!.id}${decorate(repo, c!.id)}`),
    L.dim(`Author: ${actorLabel(c!)}${c!.coAuthored ? '（AI 協作）' : ''}`),
    L.out(`    ${c!.message}`),
    L.blank(),
  ]
  const parentTree = treeAt(repo, c!.parents[0] ?? null)
  lines.push(...renderDiff(parentTree, c!.tree))
  return lines
}

function renderDiff(before: Tree, after: Tree): OutLine[] {
  const files = diffTree(before, after)
  if (!files.length) return [L.dim('（沒有內容變化）')]
  const lines: OutLine[] = []
  for (const f of files) {
    lines.push(L.title(`--- ${f.path}`))
    for (const l of f.lines) {
      if (l.sign === '+') lines.push(L.ok(`+ ${l.text}`))
      else if (l.sign === '-') lines.push(L.err(`- ${l.text}`))
      else lines.push(L.dim(`  ${l.text}`))
    }
  }
  return lines
}

function gitDiff(repo: Repo, args: string[]): OutLine[] {
  const staged = args.includes('--staged') || args.includes('--cached')
  return staged
    ? renderDiff(headTree(repo), repo.index)
    : renderDiff(repo.index, repo.work)
}

function gitBranch(repo: Repo, args: string[]): OutLine[] {
  const del = args.findIndex((a) => a === '-d' || a === '-D')
  if (del >= 0) {
    const name = args[del + 1]
    if (!name) fail('要指定要刪掉的分支。')
    if (!repo.branches[name!]) fail(`沒有這個分支：${name}`)
    if (headBranch(repo) === name) fail('不能刪掉你正站著的分支。', '先 git switch 到別的地方。')
    delete repo.branches[name!]
    delete repo.upstream[name!]
    return [L.dim(`刪除分支 ${name}`)]
  }

  const rename = args.indexOf('-m')
  if (rename >= 0) {
    const to = args[rename + 1]
    const from = headBranch(repo)
    if (!to || !from) fail('git branch -m <新名字>')
    repo.branches[to!] = repo.branches[from!]!
    delete repo.branches[from!]
    repo.head = { type: 'branch', name: to! }
    return [L.dim(`${from} 改名為 ${to}`)]
  }

  const name = args.find((a) => !a.startsWith('-'))
  if (!name) {
    const hb = headBranch(repo)
    const lines = Object.keys(repo.branches)
      .sort()
      .map((b) => (b === hb ? L.ok(`* ${b}`) : L.out(`  ${b}`)))
    if (args.includes('-a')) {
      for (const r of Object.keys(repo.tracking).sort()) lines.push(L.dim(`  origin/${r}`))
    }
    return lines.length ? lines : [L.dim('還沒有分支 —— 第一個 commit 會生出 main。')]
  }

  if (repo.branches[name]) fail(`分支 ${name} 已經存在。`)
  const start = args.find((a, i) => i > args.indexOf(name) && !a.startsWith('-'))
  const oid = start ? resolveRev(repo, start) : headOid(repo)
  if (!oid) fail('還沒有 commit，沒有東西可以當起點。')
  repo.branches[name] = oid!
  logRef(repo, oid!, `branch: 建立分支 ${name}`)
  return [
    L.dim(`建立分支 ${name} 於 ${oid!.slice(0, 7)}`),
    L.hint('分支只是一張貼在某個 commit 上的便利貼。它幾乎不佔空間，所以別捨不得開。'),
  ]
}

function switchTo(repo: Repo, target: string, create: boolean): OutLine[] {
  if (create) {
    if (repo.branches[target]) fail(`分支 ${target} 已經存在。`)
    const oid = headOid(repo)
    if (!oid) fail('還沒有 commit。先 git commit 一次。')
    repo.branches[target] = oid!
    repo.head = { type: 'branch', name: target }
    logRef(repo, oid!, `checkout: 建立並切到 ${target}`)
    return [L.ok(`切換到新分支 ${target}`)]
  }

  const isBranch = repo.branches[target] !== undefined
  const oid = resolveRev(repo, target)
  if (!oid) fail(`找不到 ${target}。`, 'git branch 看有哪些分支。')

  const blocked = checkoutTree(repo, treeAt(repo, oid))
  if (blocked.length) {
    fail(
      `這些檔案的改動會被蓋掉：${blocked.join(', ')}`,
      'git commit 收好，或 git stash 先收進口袋。',
    )
  }

  if (isBranch) {
    repo.head = { type: 'branch', name: target }
    logRef(repo, oid!, `checkout: 切到 ${target}`)
    const lines = [L.ok(`切換到分支 ${target}`)]
    const up = repo.upstream[target]
    if (up && repo.tracking[up] && repo.tracking[up] !== repo.branches[target]) {
      lines.push(L.dim(`和 origin/${up} 不同步。`))
    }
    return lines
  }

  repo.head = { type: 'detached', oid: oid! }
  logRef(repo, oid!, `checkout: detached 到 ${oid!.slice(0, 7)}`)
  return [
    L.ok(`HEAD 現在直接指著 ${oid!.slice(0, 7)}`),
    L.hint('這叫 detached HEAD：你站在歷史上的一個點，但腳下沒有分支。在這裡做的 commit 沒有名字接住，離開就找不到了。'),
  ]
}

function gitCheckout(repo: Repo, args: string[]): OutLine[] {
  const bIdx = args.indexOf('-b')
  if (bIdx >= 0) {
    const name = args[bIdx + 1]
    if (!name) fail('git checkout -b <分支名>')
    return switchTo(repo, name!, true)
  }
  const target = args.find((a) => !a.startsWith('-'))
  if (!target) fail('git checkout <分支或 commit>')
  return switchTo(repo, target!, false)
}

function gitSwitch(repo: Repo, args: string[]): OutLine[] {
  const create = args.includes('-c') || args.includes('--create')
  const target = args.find((a) => !a.startsWith('-'))
  if (!target) fail('git switch <分支名>')
  return switchTo(repo, target!, create)
}

/* ------------------------------------------------------------------ */
/* 合流                                                                */
/* ------------------------------------------------------------------ */

function gitMerge(repo: Repo, args: string[]): OutLine[] {
  if (args.includes('--abort')) {
    if (repo.pending?.kind !== 'merge') fail('現在沒有進行中的合併。')
    const head = headTree(repo)
    repo.work = { ...head }
    repo.index = { ...head }
    repo.pending = null
    return [L.ok('合併取消，回到合併前的樣子。')]
  }

  if (repo.pending) fail(`${repo.pending.kind} 還沒結束。`, `git ${repo.pending.kind} --abort 可以放棄。`)

  const noFf = args.includes('--no-ff')
  const target = args.find((a) => !a.startsWith('-'))
  if (!target) fail('git merge <分支>')

  const theirs = resolveRev(repo, target!)
  if (!theirs) fail(`找不到 ${target}。`)
  const ours = headOid(repo)
  if (!ours) fail('這個分支上還沒有 commit。')

  if (isAncestor(repo, theirs!, ours!)) {
    return [L.dim(`${target} 的東西已經都在這裡了，沒事可做。`)]
  }

  if (isAncestor(repo, ours!, theirs!) && !noFf) {
    checkoutTree(repo, treeAt(repo, theirs))
    moveHead(repo, theirs!, `merge ${target}: fast-forward`)
    repo.index = { ...repo.work }
    return [
      L.ok(`快轉到 ${theirs!.slice(0, 7)}`),
      L.hint('沒有分岔，所以不需要合併 commit —— 指標往前滑過去就好。'),
    ]
  }

  const base = mergeBase(repo, ours, theirs)
  const result = mergeTrees(treeAt(repo, base), treeAt(repo, ours), treeAt(repo, theirs), target!)
  repo.work = { ...result.tree }
  repo.index = { ...result.tree }

  if (result.conflicts.length) {
    repo.pending = {
      kind: 'merge',
      incoming: theirs!,
      incomingLabel: target!,
      conflicts: result.conflicts,
      queue: [],
      onto: null,
      returnBranch: headBranch(repo),
    }
    return [
      L.err(`衝突：${result.conflicts.join(', ')}`),
      L.out('自動合併失敗。'),
      L.hint('這不是錯誤，是 git 在說「這句話兩個人都改了，我不知道誰對」。cat 檔案看看，決定，write 回去，git add。'),
    ]
  }

  const msg = `Merge ${target}`
  const c = recordCommit(repo, [ours!, theirs!], msg, result.tree, repo.actor, repo.actor === 'agent')
  moveHead(repo, c.id, `merge ${target}`)
  return [
    L.ok(`合併完成 ${c.id}`),
    L.dim('沒有衝突 —— 兩邊動的是不同的地方。'),
  ]
}

/** base..head 之間、屬於 head 這一側的 commit，舊的在前，跳過 merge commit。 */
function commitsBetween(repo: Repo, base: Oid | null, tip: Oid): Commit[] {
  const baseSet = ancestors(repo, base)
  const list = walk(repo, [tip])
    .filter((c) => !baseSet.has(c.id) && c.parents.length <= 1)
    .sort((a, b) => a.time - b.time)
  return list
}

function applyOne(repo: Repo, c: Commit, label: string): { conflicts: string[]; tree: Tree } {
  const parentTree = treeAt(repo, c.parents[0] ?? null)
  const result = mergeTrees(parentTree, headTree(repo), c.tree, label)
  return { conflicts: result.conflicts, tree: result.tree }
}

function driveRebase(repo: Repo): OutLine[] {
  const lines: OutLine[] = []
  const pending = repo.pending
  if (!pending) return lines

  while (pending.queue.length) {
    const next = pending.queue[0]!
    const c = getCommit(repo, next)
    if (!c) {
      pending.queue.shift()
      continue
    }
    const { conflicts, tree } = applyOne(repo, c!, c!.message)
    repo.work = { ...tree }
    repo.index = { ...tree }
    if (conflicts.length) {
      pending.incoming = c!.id
      pending.incomingLabel = c!.message
      pending.conflicts = conflicts
      lines.push(L.err(`重播「${c!.message}」時卡住了：${conflicts.join(', ')}`))
      lines.push(L.hint('解掉、git add，然後 git rebase --continue。真的不想要了就 git rebase --abort。'))
      return lines
    }
    const nc = recordCommit(repo, [headOid(repo)!], c!.message, tree, c!.actor, c!.coAuthored)
    repo.head = { type: 'detached', oid: nc.id }
    pending.queue.shift()
    lines.push(L.dim(`重播 ${c!.message} → ${nc.id}`))
  }

  const finalOid = headOid(repo)!
  const branch = pending.returnBranch
  if (branch) {
    repo.branches[branch] = finalOid
    repo.head = { type: 'branch', name: branch }
  }
  repo.pending = null
  logRef(repo, finalOid, 'rebase 完成')
  lines.push(L.ok('rebase 完成。'))
  lines.push(L.hint('每個 commit 都是全新的 hash。你沒有搬動歷史，你是照著舊的抄了一份新的。'))
  return lines
}

function gitRebase(repo: Repo, args: string[]): OutLine[] {
  if (args.includes('--abort')) {
    const p = repo.pending
    if (p?.kind !== 'rebase') fail('現在沒有進行中的 rebase。')
    const branch = p!.returnBranch
    if (branch) repo.head = { type: 'branch', name: branch }
    const head = headTree(repo)
    repo.work = { ...head }
    repo.index = { ...head }
    repo.pending = null
    return [L.ok('rebase 取消，分支回到原來的位置。')]
  }

  if (args.includes('--continue')) {
    const p = repo.pending
    if (p?.kind !== 'rebase') fail('現在沒有進行中的 rebase。')
    if (p!.conflicts.length) fail(`還有沒解完的衝突：${p!.conflicts.join(', ')}`)
    const c = getCommit(repo, p!.incoming)
    if (c) {
      const nc = recordCommit(repo, [headOid(repo)!], c.message, repo.index, c.actor, c.coAuthored)
      repo.head = { type: 'detached', oid: nc.id }
      repo.work = { ...repo.index }
      p!.queue.shift()
      p!.conflicts = []
    }
    return driveRebase(repo)
  }

  if (repo.pending) fail(`${repo.pending.kind} 還沒結束。`)

  const target = args.find((a) => !a.startsWith('-'))
  if (!target) fail('git rebase <要接到哪裡>')
  const onto = resolveRev(repo, target!)
  if (!onto) fail(`找不到 ${target}。`)
  const tip = headOid(repo)
  if (!tip) fail('這裡還沒有 commit。')
  const branch = headBranch(repo)

  if (isAncestor(repo, onto!, tip!)) {
    return [L.dim(`已經接在 ${target} 後面了。`)]
  }
  if (isAncestor(repo, tip!, onto!)) {
    checkoutTree(repo, treeAt(repo, onto))
    moveHead(repo, onto!, `rebase: 快轉到 ${target}`)
    repo.index = { ...repo.work }
    return [L.ok(`沒有自己的 commit 要搬，直接快轉到 ${onto!.slice(0, 7)}`)]
  }

  const base = mergeBase(repo, tip, onto)
  const queue = commitsBetween(repo, base, tip!)
  if (!queue.length) return [L.dim('沒有需要重播的 commit。')]

  repo.pending = {
    kind: 'rebase',
    incoming: null,
    incomingLabel: target!,
    conflicts: [],
    queue: queue.map((c) => c.id),
    onto: onto!,
    returnBranch: branch,
  }
  repo.head = { type: 'detached', oid: onto! }
  const t = treeAt(repo, onto)
  repo.work = { ...t }
  repo.index = { ...t }

  const lines: OutLine[] = [L.dim(`要把 ${queue.length} 個 commit 重播到 ${target} 上`)]
  lines.push(...driveRebase(repo))
  return lines
}

function gitCherryPick(repo: Repo, args: string[]): OutLine[] {
  if (args.includes('--abort')) {
    if (repo.pending?.kind !== 'cherry-pick') fail('現在沒有進行中的 cherry-pick。')
    const head = headTree(repo)
    repo.work = { ...head }
    repo.index = { ...head }
    repo.pending = null
    return [L.ok('cherry-pick 取消。')]
  }

  if (args.includes('--continue')) {
    const p = repo.pending
    if (p?.kind !== 'cherry-pick') fail('現在沒有進行中的 cherry-pick。')
    if (p!.conflicts.length) fail(`還有沒解完的衝突：${p!.conflicts.join(', ')}`)
    const c = getCommit(repo, p!.incoming)!
    const nc = recordCommit(repo, [headOid(repo)!], c.message, repo.index, c.actor, c.coAuthored)
    repo.work = { ...repo.index }
    repo.pending = null
    moveHead(repo, nc.id, `cherry-pick: ${c.message}`)
    return [L.ok(`揀選完成 ${nc.id}`)]
  }

  if (repo.pending) fail(`${repo.pending.kind} 還沒結束。`)

  const rev = args.find((a) => !a.startsWith('-'))
  if (!rev) fail('git cherry-pick <commit>')
  const oid = resolveRev(repo, rev!)
  const c = getCommit(repo, oid)
  if (!c) fail(`找不到 ${rev}。`)

  const { conflicts, tree } = applyOne(repo, c!, c!.message)
  repo.work = { ...tree }
  repo.index = { ...tree }

  if (conflicts.length) {
    repo.pending = {
      kind: 'cherry-pick',
      incoming: c!.id,
      incomingLabel: c!.message,
      conflicts,
      queue: [],
      onto: null,
      returnBranch: headBranch(repo),
    }
    return [
      L.err(`衝突：${conflicts.join(', ')}`),
      L.hint('解完 git add，再 git cherry-pick --continue。'),
    ]
  }

  const nc = recordCommit(repo, [headOid(repo)!], c!.message, tree, c!.actor, c!.coAuthored)
  moveHead(repo, nc.id, `cherry-pick: ${c!.message}`)
  return [
    L.ok(`[${headBranch(repo) ?? 'HEAD'} ${nc.id}] ${c!.message}`),
    L.hint('只把那一個改動搬過來，其他都留在原地。急件常常長這樣。'),
  ]
}

function gitRevert(repo: Repo, args: string[]): OutLine[] {
  const rev = args.find((a) => !a.startsWith('-')) ?? 'HEAD'
  const oid = resolveRev(repo, rev)
  const c = getCommit(repo, oid)
  if (!c) fail(`找不到 ${rev}。`)

  const parentTree = treeAt(repo, c!.parents[0] ?? null)
  const result = mergeTrees(c!.tree, headTree(repo), parentTree, `revert ${c!.id}`)
  if (result.conflicts.length) {
    fail(
      `沒辦法乾淨地反轉：${result.conflicts.join(', ')}`,
      '那段程式後來又被改過了。這種時候通常要手動處理。',
    )
  }

  const msg = `Revert "${c!.message}"`
  const nc = recordCommit(repo, [headOid(repo)!], msg, result.tree, repo.actor, repo.actor === 'agent')
  repo.work = { ...result.tree }
  repo.index = { ...result.tree }
  moveHead(repo, nc.id, `revert: ${c!.message}`)
  return [
    L.ok(`[${headBranch(repo) ?? 'HEAD'} ${nc.id}] ${msg}`),
    L.hint('原本那個 commit 還在。你是往前走一步來抵銷它，不是把它從歷史裡挖掉 —— 所以別人不會被你搞爆。'),
  ]
}

function gitReset(repo: Repo, args: string[]): OutLine[] {
  const mode = args.includes('--soft')
    ? 'soft'
    : args.includes('--hard')
      ? 'hard'
      : 'mixed'
  const rev = args.find((a) => !a.startsWith('-')) ?? 'HEAD'
  const oid = resolveRev(repo, rev)
  if (!oid) fail(`找不到 ${rev}。`)

  const target = treeAt(repo, oid)
  const lost = headOid(repo)
  moveHead(repo, oid!, `reset --${mode} ${rev}`)

  if (mode === 'mixed') repo.index = { ...target }
  if (mode === 'hard') {
    repo.index = { ...target }
    repo.work = { ...target }
  }

  const lines = [L.ok(`HEAD 移到 ${oid!.slice(0, 7)}（--${mode}）`)]
  if (mode === 'soft') lines.push(L.dim('改動都還在暫存區，等著被重新包成一個 commit。'))
  if (mode === 'hard') {
    lines.push(L.warn('工作目錄被覆蓋了。沒 commit 過的東西真的不見了。'))
    if (lost) lines.push(L.hint(`但 commit 過的還在：git reflog 找得到 ${lost.slice(0, 7)}。`))
  }
  return lines
}

function gitTag(repo: Repo, args: string[]): OutLine[] {
  const del = args.indexOf('-d')
  if (del >= 0) {
    const name = args[del + 1]
    if (!name || !repo.tags[name]) fail(`沒有這個標籤：${name}`)
    delete repo.tags[name!]
    return [L.dim(`刪除標籤 ${name}`)]
  }
  const positional = args.filter((a) => !a.startsWith('-'))
  const name = positional[0]
  if (!name) {
    const names = Object.keys(repo.tags).sort()
    return names.length ? names.map((n) => L.out(n)) : [L.dim('還沒有標籤。')]
  }
  const oid = positional[1] ? resolveRev(repo, positional[1]!) : headOid(repo)
  if (!oid) fail('找不到要標的 commit。')
  repo.tags[name] = oid!
  return [
    L.ok(`標籤 ${name} → ${oid!.slice(0, 7)}`),
    L.hint('分支會跟著你走，標籤釘在原地不動。「v1.0 那天的樣子」用標籤。'),
  ]
}

function gitStash(repo: Repo, args: string[]): OutLine[] {
  const sub = args[0] ?? 'push'

  if (sub === 'list') {
    if (!repo.stash.length) return [L.dim('口袋是空的。')]
    return repo.stash.map((s, i) => L.out(`stash@{${i}}: ${s.message}`))
  }

  if (sub === 'pop' || sub === 'apply') {
    const entry = repo.stash[0]
    if (!entry) fail('口袋是空的。')
    repo.work = { ...entry!.work }
    repo.index = { ...entry!.index }
    if (sub === 'pop') repo.stash.shift()
    return [L.ok(`拿回 ${entry!.message}`)]
  }

  const st = status(repo)
  if (st.clean) return [L.dim('沒有東西需要收起來。')]
  const head = headTree(repo)
  repo.stash.unshift({
    message: args.slice(1).join(' ') || `WIP on ${headBranch(repo) ?? 'HEAD'}`,
    work: { ...repo.work },
    index: { ...repo.index },
    base: headOid(repo) ?? '',
  })
  repo.work = { ...head }
  repo.index = { ...head }
  return [
    L.ok('改動收進口袋，工作目錄乾淨了。'),
    L.hint('急事插隊的時候用這個。git stash pop 拿回來。'),
  ]
}

/* ------------------------------------------------------------------ */
/* 遠端                                                                */
/* ------------------------------------------------------------------ */

function gitRemote(repo: Repo, args: string[]): OutLine[] {
  if (args.includes('-v')) {
    return [
      L.out('origin  sandbox://origin (fetch)'),
      L.out('origin  sandbox://origin (push)'),
      L.blank(),
      L.title('遠端目前的樣子（你要 fetch 才會看到）：'),
      ...Object.entries(repo.remote).map(([b, o]) => L.dim(`  ${b} → ${o.slice(0, 7)}`)),
    ]
  }
  return [L.out('origin')]
}

function gitFetch(repo: Repo): OutLine[] {
  const changed: string[] = []
  for (const [b, oid] of Object.entries(repo.remote)) {
    if (repo.tracking[b] !== oid) {
      repo.tracking[b] = oid
      changed.push(b)
    }
  }
  if (!changed.length) return [L.dim('origin 沒有新東西。')]
  return [
    L.ok(`更新了 ${changed.map((b) => `origin/${b}`).join('、')}`),
    L.hint('注意：你的分支一動也沒動。fetch 只是把「別人做了什麼」抄回來給你看。'),
  ]
}

function gitPush(repo: Repo, args: string[]): OutLine[] {
  const setUpstream = args.includes('-u') || args.includes('--set-upstream')
  const force = args.includes('-f') || args.includes('--force')
  const positional = args.filter((a) => !a.startsWith('-'))
  const maybeBranch = positional[1] ?? headBranch(repo)
  if (!maybeBranch) fail('detached HEAD 沒辦法 push。')
  const branch = maybeBranch as string

  const local = repo.branches[branch]
  if (local === undefined) fail(`沒有這個分支：${branch}`)
  const localOid = local as string

  const remote = repo.remote[branch]
  if (remote && !isAncestor(repo, remote, localOid) && !force) {
    return [
      L.err(`推不上去：origin/${branch} 上有你本地沒有的 commit。`),
      L.hint('有人（或某個 agent）先你一步推了東西。git pull 把它接進來，再推。'),
    ]
  }

  repo.remote[branch] = localOid
  repo.tracking[branch] = localOid
  if (setUpstream) repo.upstream[branch] = branch

  const lines = [L.ok(`${branch} → origin/${branch}  ${localOid.slice(0, 7)}`)]
  if (force) lines.push(L.warn('你用了 --force。任何人只要 pull 過舊的那條線，現在都會出事。'))
  if (setUpstream) lines.push(L.dim(`以後這條分支 git push 就好，不用再打完整的。`))
  return lines
}

function gitPull(repo: Repo, args: string[]): OutLine[] {
  const lines = gitFetch(repo)
  const branch = headBranch(repo)
  if (!branch) fail('detached HEAD 沒辦法 pull。')
  const remoteOid = repo.tracking[branch!]
  if (!remoteOid) return [...lines, L.dim(`origin 上還沒有 ${branch}。`)]
  const rebase = args.includes('--rebase')
  return [...lines, L.blank(), ...(rebase ? gitRebase(repo, [`origin/${branch}`]) : gitMerge(repo, [`origin/${branch}`]))]
}

function gitReflog(repo: Repo): OutLine[] {
  if (!repo.reflog.length) return [L.dim('還沒有任何紀錄。')]
  return [
    L.title('HEAD 去過的地方（只存在你的電腦裡）：'),
    ...repo.reflog.map((e, i) => L.out(`${e.oid.slice(0, 7)}  HEAD@{${i}}  ${e.action}`)),
    L.hint('以為弄丟的東西，八成在這裡。git reset --hard <hash> 就回去了。'),
  ]
}

/* ------------------------------------------------------------------ */
/* help                                                                */
/* ------------------------------------------------------------------ */

const HELP: Array<[string, string]> = [
  ['write <檔案> <內容>', '寫一個檔案（append 是追加、rm 是刪除）'],
  ['ls / cat <檔案>', '看看工作目錄裡有什麼'],
  ['become me / become ai', '換人操作 —— commit 會記下是誰做的'],
  ['git init / status / add / commit', '記錄的四件事'],
  ['git log --oneline --all', '看歷史'],
  ['git branch / switch -c / checkout', '開分支、換分支'],
  ['git merge / rebase / cherry-pick', '三種把改動搬到一起的方式'],
  ['git reset / revert / reflog / stash', '後悔的四種姿勢'],
  ['git fetch / pull / push -u origin <分支>', '和別人（或 agent）交換工作'],
  ['git diff / show / tag', '看清楚到底改了什麼'],
]

function help(args: string[]): OutLine[] {
  void args
  return [
    L.title('這個沙盒認得的東西'),
    L.blank(),
    ...HELP.map(([cmd, desc]) => L.out(`${cmd.padEnd(34, ' ')}${desc}`)),
    L.blank(),
    L.hint('每個指令的錯誤訊息都寫了為什麼。撞牆的時候記得看。'),
  ]
}

/* ------------------------------------------------------------------ */
/* 給關卡用的：遠端那頭有人動了                                          */
/* ------------------------------------------------------------------ */

export function simulateRemotePush(
  input: Repo,
  branch: string,
  message: string,
  changes: Tree,
  actor: 'human' | 'agent' = 'agent',
): Repo {
  const repo = clone(input)
  const parent = repo.remote[branch] ?? repo.branches[branch] ?? null
  const tree: Tree = { ...treeAt(repo, parent), ...changes }
  const c = recordCommit(repo, parent ? [parent] : [], message, tree, actor, actor === 'agent')
  repo.remote[branch] = c.id
  return repo
}

export { generations }
