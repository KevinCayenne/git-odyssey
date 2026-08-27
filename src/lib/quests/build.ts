import { run } from '../git/commands'
import { emptyRepo } from '../git/repo'
import type { Repo } from '../git/types'

export class ScenarioError extends Error {}

/**
 * 用引擎自己跑一遍指令來組出場景。
 *
 * 這樣關卡的起始狀態不可能跟引擎的規則對不上 —— 因為它就是照規則長出來的。
 */
export function buildRepo(script: string[], start: Repo = emptyRepo()): Repo {
  let repo = start
  for (const line of script) {
    const result = run(repo, line)
    const bad = result.lines.find((l) => l.kind === 'err')
    if (bad) {
      throw new ScenarioError(`場景腳本在「${line}」出錯：${bad.text}`)
    }
    repo = result.repo
  }
  return repo
}

/** 跑完之後把身分交還給人類，免得關卡一開始就掛著 agent。 */
export function scenario(script: string[]): Repo {
  return buildRepo([...script, 'become me'])
}
