import assert from 'node:assert/strict'
import { test } from 'node:test'

import { run } from '../git/commands'
import type { Repo } from '../git/types'
import { DEMOS, demoResultHref, demoStartHref } from './demos-teaching'
import { SANDBOX_EVENTS } from './events'
import { PRESETS } from './presets'
import { decodeSession, eventIdOf, isEventStep } from '../share'

/** 照著沙盒的規則重播一段示範，回傳每一步的輸出 */
function play(start: Repo, steps: string[]) {
  let repo = start
  const errors: Array<{ step: string; text: string }> = []
  for (const step of steps) {
    if (isEventStep(step)) {
      const event = SANDBOX_EVENTS.find((e) => e.id === eventIdOf(step))
      assert.ok(event, `示範用到不存在的事件：${step}`)
      repo = event!.apply(repo)
      continue
    }
    const result = run(repo, step)
    for (const line of result.lines) {
      if (line.kind === 'err') errors.push({ step, text: line.text })
    }
    repo = result.repo
  }
  return { repo, errors }
}

test('每個示範都指到真的存在的開場', () => {
  for (const demo of DEMOS) {
    assert.ok(
      PRESETS.some((p) => p.id === demo.preset),
      `${demo.num} 指到不存在的開場：${demo.preset}`,
    )
  }
})

test('示範腳本在課堂上不會突然報錯', () => {
  // 第 03、04 兩段的「錯誤」正是要給學生看的東西，其他段不該有紅字
  const expectErrors: Record<string, number> = {
    'conflict-is-not-broken': 1, // git merge 撞到衝突
    'fetch-is-not-pull': 1, // git push 被擋下來
  }

  for (const demo of DEMOS) {
    const preset = PRESETS.find((p) => p.id === demo.preset)!
    const { errors } = play(preset.build(), demo.steps)
    assert.equal(
      errors.length,
      expectErrors[demo.id] ?? 0,
      `${demo.num}「${demo.title}」的紅字數量不對：${errors.map((e) => `${e.step} → ${e.text}`).join('；')}`,
    )
  }
})

test('第 03 段真的會卡在衝突上', () => {
  const demo = DEMOS.find((d) => d.id === 'conflict-is-not-broken')!
  const preset = PRESETS.find((p) => p.id === demo.preset)!
  const { repo } = play(preset.build(), demo.steps)
  assert.equal(repo.pending?.kind, 'merge')
  assert.ok((repo.pending?.conflicts.length ?? 0) > 0)
})

test('第 04 段跑完，遠端的東西真的進來了', () => {
  const demo = DEMOS.find((d) => d.id === 'fetch-is-not-pull')!
  const preset = PRESETS.find((p) => p.id === demo.preset)!
  const { repo } = play(preset.build(), demo.steps)
  assert.ok(repo.work['errors.md'], 'pull 之後應該拿到 agent 推的檔案')
})

test('第 05 段留下一個合流點', () => {
  const demo = DEMOS.find((d) => d.id === 'no-ff')!
  const preset = PRESETS.find((p) => p.id === demo.preset)!
  const { repo } = play(preset.build(), demo.steps)
  const tip = repo.branches['main']!
  assert.equal(repo.commits[tip]!.parents.length, 2)
})

test('產出來的連結解得回原本的步驟', () => {
  for (const demo of DEMOS) {
    assert.equal(demoStartHref(demo), `/play?p=${demo.preset}`)
    const href = demoResultHref(demo)
    const code = new URL(href, 'https://x').searchParams.get('s')!
    assert.deepEqual(decodeSession(code), demo.steps, `${demo.num} 的連結對不上`)
  }
})
