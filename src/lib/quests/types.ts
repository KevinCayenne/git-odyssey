import type { OutLine, Repo } from '../git/types'

export interface Objective {
  id: string
  label: string
  check: (repo: Repo) => boolean
}

/** 沙盒裡「別人動了」的按鈕：同事推了東西、agent 開了 PR、老闆插隊。 */
export interface SandboxEvent {
  id: string
  label: string
  note: string
  apply: (repo: Repo) => Repo
  /** 按過就消失 */
  once?: boolean
}

export interface Quest {
  slug: string
  num: string
  title: string
  kicker: string
  /** 這一關在講什麼，用人話 */
  scene: string[]
  setup: () => Repo
  intro: OutLine[]
  objectives: Objective[]
  hints: string[]
  quickCommands: string[]
  events?: SandboxEvent[]
  /** 過關後才顯示：把剛剛做的事接回真實生活 */
  closing: string[]
  /** 一條走得通的路。測試會跑它，確保每一關真的過得了。 */
  solution: string[]
  tags: string[]
}
