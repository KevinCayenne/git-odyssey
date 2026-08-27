import assert from 'node:assert/strict'
import { test } from 'node:test'

import { run, simulateRemotePush } from './commands'
import { emptyRepo, headOid, isAncestor, status } from './repo'
import type { Repo } from './types'

/** 連續跑一串指令，回傳最後的 repo。任何一行噴錯就當場失敗。 */
function script(lines: string[], start: Repo = emptyRepo()): Repo {
  let repo = start
  for (const line of lines) {
    const res = run(repo, line)
    const bad = res.lines.find((l) => l.kind === 'err')
    assert.equal(bad, undefined, `「${line}」失敗了：${bad?.text}`)
    repo = res.repo
  }
  return repo
}

test('第一個 commit 生出 main', () => {
  const repo = script([
    'git init',
    'write readme.md hello',
    'git add .',
    'git commit -m "第一步"',
  ])
  assert.ok(repo.branches.main)
  assert.equal(Object.keys(repo.commits).length, 1)
  assert.equal(status(repo).clean, true)
})

test('沒 add 就 commit 會被擋下來', () => {
  const repo = script(['git init', 'write a.md x'])
  const res = run(repo, 'git commit -m "空的"')
  assert.equal(res.lines[0]?.kind, 'err')
  assert.equal(res.mutated, false)
})

test('分支分岔後各自往前', () => {
  const repo = script([
    'git init',
    'write base.md 0',
    'git add .',
    'git commit -m "base"',
    'git switch -c feature',
    'write feature.md 1',
    'git add .',
    'git commit -m "feature 的工作"',
    'git switch main',
    'write main.md 2',
    'git add .',
    'git commit -m "main 的工作"',
  ])
  assert.notEqual(repo.branches.main, repo.branches.feature)
  // 各自看不到對方
  assert.equal(isAncestor(repo, repo.branches.feature!, repo.branches.main!), false)
  // 切回 main 之後，feature 的檔案不該還躺在工作目錄裡
  assert.equal(repo.work['feature.md'], undefined)
  assert.equal(repo.work['main.md'], '2')
})

test('沒有碰到同一個檔案 → 自動合併，產生兩個父親的 commit', () => {
  const repo = script([
    'git init',
    'write base.md 0',
    'git add .',
    'git commit -m "base"',
    'git switch -c feature',
    'write feature.md 1',
    'git add .',
    'git commit -m "f"',
    'git switch main',
    'write other.md 2',
    'git add .',
    'git commit -m "m"',
    'git merge feature',
  ])
  const head = repo.commits[headOid(repo)!]!
  assert.equal(head.parents.length, 2)
  assert.equal(repo.work['feature.md'], '1')
  assert.equal(repo.work['other.md'], '2')
})

test('快轉不會生出多餘的 merge commit', () => {
  const repo = script([
    'git init',
    'write a.md 0',
    'git add .',
    'git commit -m "base"',
    'git switch -c feature',
    'write a.md 1',
    'git add .',
    'git commit -m "f"',
    'git switch main',
    'git merge feature',
  ])
  assert.equal(repo.branches.main, repo.branches.feature)
  assert.equal(Object.keys(repo.commits).length, 2)
})

test('兩邊改同一個檔案 → 卡住，解完才能 commit', () => {
  let repo = script([
    'git init',
    'write plan.md 原本',
    'git add .',
    'git commit -m "base"',
    'git switch -c ai/rewrite',
    'write plan.md AI改的',
    'git add .',
    'git commit -m "agent 的版本"',
    'git switch main',
    'write plan.md 我改的',
    'git add .',
    'git commit -m "我的版本"',
  ])

  const merged = run(repo, 'git merge ai/rewrite')
  repo = merged.repo
  assert.equal(repo.pending?.kind, 'merge')
  assert.deepEqual(repo.pending?.conflicts, ['plan.md'])
  assert.match(repo.work['plan.md']!, /HEAD/)

  // 還沒解就 commit → 擋下
  assert.equal(run(repo, 'git commit -m "硬幹"').lines[0]?.kind, 'err')

  // 標記還在就 add → 也擋下（這是最容易犯的錯）
  assert.equal(run(repo, 'git add plan.md').lines[0]?.kind, 'err')

  repo = script(['write plan.md 我們談過了', 'git add plan.md', 'git commit -m "談完的版本"'], repo)
  assert.equal(repo.pending, null)
  assert.equal(repo.commits[headOid(repo)!]!.parents.length, 2)
  assert.equal(repo.work['plan.md'], '我們談過了')
})

test('rebase 把 commit 抄成新的一份', () => {
  const before = script([
    'git init',
    'write base.md 0',
    'git add .',
    'git commit -m "base"',
    'git switch -c feature',
    'write f.md 1',
    'git add .',
    'git commit -m "我的功能"',
    'git switch main',
    'write m.md 2',
    'git add .',
    'git commit -m "別人的進度"',
    'git switch feature',
  ])
  const featureBefore = before.branches.feature!
  const repo = script(['git rebase main'], before)

  assert.notEqual(repo.branches.feature, featureBefore)
  // 線性了：main 是 feature 的祖先
  assert.equal(isAncestor(repo, repo.branches.main!, repo.branches.feature!), true)
  const head = repo.commits[repo.branches.feature!]!
  assert.equal(head.message, '我的功能')
  assert.equal(head.parents.length, 1)
  assert.equal(repo.work['m.md'], '2')
})

test('revert 往前走一步來抵銷，不刪歷史', () => {
  const repo = script([
    'git init',
    'write a.md 好的',
    'git add .',
    'git commit -m "base"',
    'write a.md 壞掉的',
    'git add .',
    'git commit -m "壞掉的改動"',
    'git revert HEAD',
  ])
  assert.equal(repo.work['a.md'], '好的')
  assert.equal(Object.keys(repo.commits).length, 3)
})

test('reset --hard 之後 reflog 還找得回來', () => {
  let repo = script([
    'git init',
    'write a.md 1',
    'git add .',
    'git commit -m "一"',
    'write a.md 2',
    'git add .',
    'git commit -m "二"',
  ])
  const lost = headOid(repo)!
  repo = script(['git reset --hard HEAD~1'], repo)
  assert.equal(repo.work['a.md'], '1')
  assert.ok(repo.reflog.some((e) => e.oid === lost))

  repo = script([`git reset --hard ${lost}`], repo)
  assert.equal(repo.work['a.md'], '2')
})

test('cherry-pick 只搬那一個改動', () => {
  const built = script([
    'git init',
    'write app.md 0',
    'git add .',
    'git commit -m "base"',
    'git switch -c work',
    'write big.md 大工程',
    'git add .',
    'git commit -m "還沒好的大工程"',
    'write fix.md 修好了',
    'git add .',
    'git commit -m "順手修的小 bug"',
  ])
  const fixOid = headOid(built)!
  const repo = script(['git switch main', `git cherry-pick ${fixOid}`], built)
  assert.equal(repo.work['fix.md'], '修好了')
  assert.equal(repo.work['big.md'], undefined, '大工程不該被一起帶過來')
})

test('fetch 只更新 origin/*，不動你的分支', () => {
  let repo = script([
    'git init',
    'write a.md 1',
    'git add .',
    'git commit -m "一"',
    'git push -u origin main',
  ])
  const mine = repo.branches.main!

  repo = simulateRemotePush(repo, 'main', 'agent 直接推上去的東西', { 'agent.md': 'x' })
  assert.equal(repo.branches.main, mine, 'push 到遠端不該動到本地')
  assert.equal(repo.tracking.main, mine, '還沒 fetch，origin/main 應該還是舊的')

  repo = script(['git fetch'], repo)
  assert.notEqual(repo.tracking.main, mine)
  assert.equal(repo.branches.main, mine, 'fetch 之後本地分支還是不動')

  // 這時候 push 會被擋下來
  const pushed = run(repo, 'git push')
  assert.equal(pushed.lines[0]?.kind, 'err')

  repo = script(['git pull'], repo)
  assert.equal(repo.work['agent.md'], 'x')
})

test('detached HEAD 會講清楚發生什麼事', () => {
  const built = script([
    'git init',
    'write a.md 1',
    'git add .',
    'git commit -m "一"',
    'write a.md 2',
    'git add .',
    'git commit -m "二"',
  ])
  const res = run(built, 'git checkout HEAD~1')
  assert.equal(res.repo.head.type, 'detached')
  assert.ok(res.lines.some((l) => l.kind === 'hint'))
})

test('stash 把改動收進口袋再拿回來', () => {
  let repo = script([
    'git init',
    'write a.md 1',
    'git add .',
    'git commit -m "一"',
    'write a.md 做到一半',
    'git stash',
  ])
  assert.equal(repo.work['a.md'], '1')
  repo = script(['git stash pop'], repo)
  assert.equal(repo.work['a.md'], '做到一半')
})

test('AI 操作時 commit 會被標記', () => {
  const repo = script([
    'git init',
    'become ai',
    'write a.md 1',
    'git add .',
    'git commit -m "agent 寫的"',
  ])
  const head = repo.commits[headOid(repo)!]!
  assert.equal(head.actor, 'agent')
  assert.equal(head.coAuthored, true)
})

test('切分支時擋住會被蓋掉的改動', () => {
  const built = script([
    'git init',
    'write a.md 1',
    'git add .',
    'git commit -m "一"',
    'git switch -c other',
    'write a.md 2',
    'git add .',
    'git commit -m "二"',
    'git switch main',
    'write a.md 沒存的東西',
  ])
  const res = run(built, 'git switch other')
  assert.equal(res.lines[0]?.kind, 'err')
  assert.equal(res.repo.work['a.md'], '沒存的東西', '擋下來的時候不該動到任何東西')
})
