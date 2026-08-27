import assert from 'node:assert/strict'
import { test } from 'node:test'

import { run } from '../git/commands'
import type { Repo } from '../git/types'
import { QUESTS } from './data'

/**
 * 每一關都必須真的過得了。
 *
 * 關卡的目標檢查是用手寫的判斷式，很容易寫出一個「聽起來對、但永遠不會成立」
 * 的條件。所以每一關都附一條走得通的路，這裡整條跑一遍，逐項確認亮燈。
 */

function play(repo: Repo, commands: string[]): Repo {
  let cur = repo
  for (const line of commands) {
    // 衝突會回 err，那是關卡的一部分，不是腳本壞掉
    cur = run(cur, line).repo
  }
  return cur
}

test('關卡編號不重複、slug 唯一', () => {
  const slugs = QUESTS.map((q) => q.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  const nums = QUESTS.map((q) => q.num)
  assert.equal(new Set(nums).size, nums.length)
})

for (const quest of QUESTS) {
  test(`${quest.num} ${quest.title}：場景組得起來`, () => {
    const repo = quest.setup()
    assert.equal(repo.actor, 'human', '關卡不該一開始就掛在 agent 身上')
    assert.ok(quest.objectives.length > 0)
    assert.ok(quest.hints.length > 0)
    assert.ok(quest.scene.length > 0)
    assert.ok(quest.closing.length > 0)
  })

  test(`${quest.num} ${quest.title}：一開始不會誤判成已完成`, () => {
    const repo = quest.setup()
    const passed = quest.objectives.filter((o) => o.check(repo))
    assert.notEqual(
      passed.length,
      quest.objectives.length,
      '所有目標一開始就是綠的，這關等於沒有關',
    )
  })

  test(`${quest.num} ${quest.title}：解法真的能過關`, () => {
    const final = play(quest.setup(), quest.solution)
    for (const o of quest.objectives) {
      assert.equal(o.check(final), true, `目標「${o.label}」沒有亮`)
    }
  })
}

test('第 03 關真的會撞到衝突，不是自動合併過去', () => {
  const quest = QUESTS.find((q) => q.slug === 'conflict')!
  const afterMerge = run(quest.setup(), 'git merge agent/rewrite-intro')
  assert.equal(afterMerge.repo.pending?.kind, 'merge')
  assert.ok((afterMerge.repo.pending?.conflicts.length ?? 0) > 0)
})

test('第 04 關真的會被 origin 擋一次 push', () => {
  const quest = QUESTS.find((q) => q.slug === 'agent-room')!
  const merged = play(quest.setup(), [
    'git merge --no-ff agent/tidy-config',
  ])
  const rejected = run(merged, 'git push')
  assert.equal(rejected.lines[0]?.kind, 'err')
  assert.equal(rejected.mutated, false)
})

test('第 06 關的 rebase 不留合流點', () => {
  const quest = QUESTS.find((q) => q.slug === 'rebase')!
  const final = play(quest.setup(), quest.solution)
  const tip = final.branches['feature/search']!
  const seen = new Set<string>()
  const stack = [tip]
  while (stack.length) {
    const cur = stack.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const c = final.commits[cur]!
    assert.ok(c.parents.length <= 1, 'rebase 之後不該有 merge commit')
    stack.push(...c.parents)
  }
})
