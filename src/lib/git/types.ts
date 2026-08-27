/**
 * 一顆夠小、但不說謊的 git。
 *
 * 這裡刻意不做「假裝有分支」的捷徑：commit 是真的 DAG，合併是真的三方合併，
 * 衝突是真的兩邊都動了同一個檔案。學到的東西才帶得回真實的終端機。
 */

export type Oid = string

/** 檔名 → 內容。整棵樹每次都完整快照，reposi 很小，划得來。 */
export type Tree = Record<string, string>

/** 誰按下了那個 enter。這份專案裡，這件事跟指令本身一樣重要。 */
export type Actor = 'human' | 'agent'

export interface Commit {
  id: Oid
  parents: Oid[]
  message: string
  /** 實際打字的人 */
  actor: Actor
  /** 有人請 AI 寫、但自己 review 過的 commit，兩個都掛上去 */
  coAuthored: boolean
  tree: Tree
  /** 邏輯時鐘，不是牆上的時間 —— 沙盒要能重播 */
  time: number
}

export type HeadRef =
  | { type: 'branch'; name: string }
  | { type: 'detached'; oid: Oid }

/** 中途停下來的狀態：合併卡住、rebase 卡住、cherry-pick 卡住 */
export interface PendingOp {
  kind: 'merge' | 'rebase' | 'cherry-pick' | 'revert'
  /** 正在被套用的那個 commit */
  incoming: Oid | null
  incomingLabel: string
  conflicts: string[]
  /** rebase 專用：還沒重播完的隊伍 */
  queue: Oid[]
  onto: Oid | null
  returnBranch: string | null
}

export interface StashEntry {
  message: string
  work: Tree
  index: Tree
  base: Oid
}

export interface ReflogEntry {
  oid: Oid
  action: string
  time: number
}

export interface Repo {
  initialized: boolean
  commits: Record<Oid, Commit>
  branches: Record<string, Oid>
  tags: Record<string, Oid>
  /** 模擬 origin 伺服器上的真實情況。沒 fetch 之前，你看不到它。 */
  remote: Record<string, Oid>
  /** 本地快取的 origin/*。fetch 才會更新 —— 這就是「我以為的遠端」。 */
  tracking: Record<string, Oid>
  /** 本地分支 → 遠端分支（git push -u 建立的關係） */
  upstream: Record<string, string>
  head: HeadRef
  work: Tree
  index: Tree
  pending: PendingOp | null
  stash: StashEntry[]
  reflog: ReflogEntry[]
  clock: number
  /** 目前是誰坐在鍵盤前 */
  actor: Actor
}

export type LineKind = 'out' | 'err' | 'warn' | 'ok' | 'hint' | 'dim' | 'title'

export interface OutLine {
  kind: LineKind
  text: string
}

export interface RunResult {
  repo: Repo
  lines: OutLine[]
  /** 有沒有真的改到 repo（用來決定要不要記 undo） */
  mutated: boolean
}
