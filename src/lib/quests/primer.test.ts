import assert from 'node:assert/strict'
import { test } from 'node:test'

import { run } from '../git/commands'
import { emptyRepo, headOid, status } from '../git/repo'
import type { Repo } from '../git/types'
import { COMMAND_ANATOMY, GLOSSARY, STEPS } from './primer'

/** 照著入門頁的步驟一路走，回傳每一步之後的 repo */
function walk(): { repo: Repo; step: (typeof STEPS)[number] }[] {
  let repo = emptyRepo()
  const trail: { repo: Repo; step: (typeof STEPS)[number] }[] = []
  for (const step of STEPS) {
    if (step.command) {
      const result = run(repo, step.command)
      const bad = result.lines.find((l) => l.kind === 'err')
      assert.equal(
        bad,
        undefined,
        `「${step.title}」這一步噴錯了：${step.command} → ${bad?.text}`,
      )
      repo = result.repo
    }
    trail.push({ repo, step })
  }
  return trail
}

test('入門的每一步都真的跑得動', () => {
  const trail = walk()
  assert.equal(trail.length, STEPS.length)
})

test('三格的變化跟解說講的一致', () => {
  const trail = walk()
  const at = (id: string) => trail.find((t) => t.step.id === id)!.repo

  // 開帳本之前，還不是 repo
  assert.equal(at('empty').initialized, false)
  assert.equal(at('init').initialized, true)

  // 寫檔案 → 只有工作目錄有東西，暫存區還是空的
  const written = status(at('write'))
  assert.deepEqual(written.untracked, ['筆記.md'])
  assert.equal(written.staged.length, 0)

  // add → 進到暫存區，但還沒有任何 commit
  const added = status(at('add'))
  assert.equal(added.untracked.length, 0)
  assert.deepEqual(
    added.staged.map((e) => e.path),
    ['筆記.md'],
  )
  assert.equal(headOid(at('add')), null, 'add 不該產生歷史')

  // commit → 歷史上有第一個點，三格乾淨
  const first = at('commit')
  assert.equal(Object.keys(first.commits).length, 1)
  assert.equal(status(first).clean, true)

  // 第二輪之後是兩個點，而且連成一條線
  const second = at('commit2')
  assert.equal(Object.keys(second.commits).length, 2)
  const tip = second.commits[headOid(second)!]!
  assert.equal(tip.parents.length, 1, '第二個 commit 要接在第一個後面')
  assert.equal(status(second).clean, true)
})

test('每一步的 focus 對得上它實際動到的格子', () => {
  for (const step of STEPS) {
    if (step.command.startsWith('git commit')) {
      assert.equal(step.focus, 'history', `${step.id} 應該指向歷史`)
    } else if (step.command.startsWith('git add')) {
      assert.equal(step.focus, 'index', `${step.id} 應該指向暫存區`)
    } else if (step.command.startsWith('write')) {
      assert.equal(step.focus, 'work', `${step.id} 應該指向工作目錄`)
    }
  }
})

test('詞彙表沒有漏掉會用到的詞', () => {
  const words = GLOSSARY.map((t) => t.word)
  for (const need of ['repository', 'commit', 'branch', 'merge', 'remote', 'HEAD']) {
    assert.ok(words.includes(need), `詞彙表少了 ${need}`)
  }
  for (const t of GLOSSARY) {
    assert.ok(t.short.length > 0 && t.detail.length > 20, `${t.word} 的說明太薄`)
  }
})

test('指令拆解拼回來是一行真的能跑的指令', () => {
  const line = COMMAND_ANATOMY.map((c) => c.part).join(' ')
  assert.equal(line, 'git commit -m "開始記錄想法"')

  // 真的餵進引擎確認它會動
  let repo = emptyRepo()
  for (const cmd of ['git init', 'write a.md x', 'git add .', line]) {
    const res = run(repo, cmd)
    assert.equal(res.lines.find((l) => l.kind === 'err'), undefined, cmd)
    repo = res.repo
  }
  assert.equal(Object.keys(repo.commits).length, 1)
})
