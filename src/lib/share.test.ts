import assert from 'node:assert/strict'
import { test } from 'node:test'

import { run } from './git/commands'
import type { Repo } from './git/types'
import { QUESTS } from './quests/data'
import { decodeSession, encodeSession, eventIdOf, isEventStep } from './share'

function replay(start: Repo, steps: string[]): Repo {
  let repo = start
  for (const step of steps) repo = run(repo, step).repo
  return repo
}

test('編碼後解回來要一模一樣，中文也是', () => {
  const steps = [
    'git init',
    'write 一天.md 六點半起床，跑步二十分鐘',
    'git add .',
    'git commit -m "第一天：撐住了"',
    '@agent-push',
  ]
  assert.deepEqual(decodeSession(encodeSession(steps)), steps)
})

test('空的操作紀錄不會生出垃圾', () => {
  assert.equal(encodeSession([]), '')
  assert.deepEqual(decodeSession(''), [])
})

test('壞掉的連結不會炸，只會當作沒帶參數', () => {
  assert.deepEqual(decodeSession('這不是 base64!!!'), [])
  assert.deepEqual(decodeSession('%%%%'), [])
})

test('編出來的碼可以直接放進網址，不用再逃脫一次', () => {
  const code = encodeSession(['write 說明.md 中文內容', 'git add .'])
  assert.equal(encodeURIComponent(code), code)
  assert.match(code, /^[A-Za-z0-9_-]+$/)
})

test('事件那幾行認得出來', () => {
  assert.equal(isEventStep('@agent-push'), true)
  assert.equal(eventIdOf('@agent-push'), 'agent-push')
  assert.equal(isEventStep('git status'), false)
})

test('重播一段分享連結，會回到一模一樣的 repo', () => {
  for (const quest of QUESTS) {
    // 只走純指令的關卡；帶事件的要由沙盒層重播
    const steps = quest.solution
    const direct = replay(quest.setup(), steps)
    const roundTripped = replay(quest.setup(), decodeSession(encodeSession(steps)))

    assert.deepEqual(
      Object.keys(roundTripped.commits).sort(),
      Object.keys(direct.commits).sort(),
      `${quest.num} 的歷史對不上`,
    )
    assert.deepEqual(roundTripped.branches, direct.branches)
    assert.deepEqual(roundTripped.work, direct.work)

    // 而且重播完該關卡要真的算過關 —— 學生貼回來的連結才有意義
    for (const o of quest.objectives) {
      assert.equal(o.check(roundTripped), true, `${quest.num}「${o.label}」沒有亮`)
    }
  }
})

test('一段長度合理的課堂操作，網址不會爆掉', () => {
  const steps = QUESTS.flatMap((q) => q.solution)
  const code = encodeSession(steps)
  assert.ok(steps.length > 40)
  assert.ok(code.length < 6000, `八關全部串起來也只有 ${code.length} 字`)
})
