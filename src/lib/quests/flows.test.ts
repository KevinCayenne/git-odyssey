import assert from 'node:assert/strict'
import { test } from 'node:test'

import { layoutGraph } from '../git/layout'
import { headOid } from '../git/repo'
import type { Repo } from '../git/types'
import {
  FLOWS,
  OLD_NEW,
  PLACES,
  ROUTES,
  SECTIONS,
  flowBySlug,
  observePlaces,
  runFlow,
  type Place,
} from './flows'

const PLACE_KEYS = new Set<Place>(PLACES.map((p) => p.key))

test('每個指令的示範腳本都真的跑得動', () => {
  for (const flow of FLOWS) {
    assert.doesNotThrow(() => runFlow(flow), `${flow.slug} 的腳本掛了`)
  }
})

test('圖上畫的箭頭跟引擎實際改到的格子一致', () => {
  for (const flow of FLOWS) {
    const { before, after } = runFlow(flow)
    const observed = observePlaces(before, after)
    assert.deepEqual(
      [...observed].sort(),
      [...flow.touches].sort(),
      `${flow.slug}：引擎動到 [${observed.join(', ')}]，但流程圖宣告 [${flow.touches.join(', ')}]`,
    )
  }
})

test('會改到東西的指令一定畫得出箭頭，只是看的一定畫不出來', () => {
  for (const flow of FLOWS) {
    if (flow.touches.length > 0) {
      assert.ok(flow.moves.length > 0, `${flow.slug} 有改到東西卻沒有任何箭頭`)
    } else {
      const real = flow.moves.filter((m) => m.from !== m.to)
      assert.equal(real.length, 0, `${flow.slug} 什麼都沒改，不該畫跨格的箭頭`)
      assert.ok(flow.reads.length > 0 || flow.slug === 'init', `${flow.slug} 該說明它在讀哪一格`)
    }
  }
})

test('箭頭的終點一定落在這個指令真的會改到的格子上', () => {
  for (const flow of FLOWS) {
    for (const m of flow.moves) {
      assert.ok(PLACE_KEYS.has(m.from), `${flow.slug} 的起點 ${m.from} 不是合法的格子`)
      assert.ok(PLACE_KEYS.has(m.to), `${flow.slug} 的終點 ${m.to} 不是合法的格子`)
      if (m.from === m.to) continue
      assert.ok(
        flow.touches.includes(m.to),
        `${flow.slug} 畫了一條箭頭指向 ${m.to}，但那一格其實沒被改到`,
      )
    }
  }
})

test('每一條箭頭都有話可講', () => {
  for (const flow of FLOWS) {
    for (const m of flow.moves) {
      assert.ok(m.carries.length > 0, `${flow.slug} 有一條箭頭沒說在搬什麼`)
      assert.ok(m.caption.length > 8, `${flow.slug} 有一條箭頭的說明太薄`)
    }
    assert.ok(flow.when.length > 8, `${flow.slug} 沒說什麼時候用`)
    assert.ok(flow.gotcha.length > 8, `${flow.slug} 沒說會踩什麼坑`)
    assert.ok(flow.gloss.length > 4, `${flow.slug} 沒有一句話的解釋`)
  }
})

test('分節把每個指令都收進去了，而且沒有重複', () => {
  const seen = new Set<string>()
  for (const section of SECTIONS) {
    for (const slug of section.slugs) {
      assert.ok(flowBySlug(slug), `${section.title} 指到不存在的 ${slug}`)
      assert.ok(!seen.has(slug), `${slug} 出現在不只一節裡`)
      seen.add(slug)
    }
  }
  for (const flow of FLOWS) {
    assert.ok(seen.has(flow.slug), `${flow.slug} 沒有被任何一節收進去`)
  }
  assert.equal(new Set(FLOWS.map((f) => f.slug)).size, FLOWS.length, 'slug 撞名了')
})

test('該畫出歷史變化的指令，圖真的會不一樣', () => {
  // 這幾個的重點就在 DAG 怎麼變。畫不出差別的話，那張小圖就是在騙人。
  for (const slug of ['commit', 'branch', 'merge', 'rebase', 'tag', 'revert', 'cherry-pick']) {
    const flow = flowBySlug(slug)!
    const { before, after } = runFlow(flow)
    const a = layoutGraph(before)
    const b = layoutGraph(after)
    const key = (l: ReturnType<typeof layoutGraph>) =>
      JSON.stringify(l.nodes.map((n) => [n.oid, n.x, n.lane, n.refs]).sort())
    assert.notEqual(key(a), key(b), `${slug} 前後的圖長得一樣，那就沒東西好演了`)
  }
})

test('switch 跟 checkout 換分支時做的事一模一樣', () => {
  const sw = runFlow(flowBySlug('switch')!)
  const co = runFlow(flowBySlug('checkout')!)
  assert.deepEqual(sw.after.work, co.after.work)
  assert.deepEqual(sw.after.index, co.after.index)
  assert.deepEqual(sw.after.head, co.after.head)
  assert.deepEqual(
    observePlaces(sw.before, sw.after).sort(),
    observePlaces(co.before, co.after).sort(),
  )
})

test('新舊寫法對照表裡的新寫法都是引擎認得的', () => {
  assert.ok(OLD_NEW.length >= 4)
  for (const row of OLD_NEW) {
    assert.ok(row.old.startsWith('git '), `${row.intent} 的舊寫法怪怪的`)
    assert.ok(row.now.startsWith('git '), `${row.intent} 的新寫法怪怪的`)
    assert.notEqual(row.old, row.now, `${row.intent} 新舊一樣就不用列了`)
    assert.ok(row.note.length > 4, `${row.intent} 少了一句說明`)
  }
})

test('決策表指到的指令都真的存在', () => {
  assert.ok(ROUTES.length >= 6)
  for (const r of ROUTES) {
    assert.ok(r.answer.includes('git '), `${r.want} 沒給出指令`)
    assert.ok(r.because.length > 8, `${r.want} 沒說為什麼`)
  }
})

/* ------------------------------------------------------------------ */

function tipParents(repo: Repo): number {
  return repo.commits[headOid(repo)!]!.parents.length
}

function oids(repo: Repo): string[] {
  return Object.keys(repo.commits).sort()
}

test('跑出來的結果就是旁白講的那個形狀', () => {
  // merge：要真的長出一個有兩個父親的點。只是 fast-forward 的話，
  // 「收成一個合流點」那句旁白就是在騙人。
  const merge = runFlow(flowBySlug('merge')!)
  assert.equal(tipParents(merge.after), 2, 'merge 演成 fast-forward 了')

  // pull：兩邊都往前走過，所以也該有合流點
  const pull = runFlow(flowBySlug('pull')!)
  assert.equal(tipParents(pull.after), 2, 'pull 演成 fast-forward 了')

  // rebase：是重抄不是接點，編號要全換掉，而且不會多出合流點
  const rebase = runFlow(flowBySlug('rebase')!)
  assert.equal(tipParents(rebase.after), 1, 'rebase 不該產生合流點')
  assert.notDeepEqual(oids(rebase.before), oids(rebase.after), 'rebase 該重抄出新的 commit')

  // pull --rebase 同理
  const pr = runFlow(flowBySlug('pull-rebase')!)
  assert.equal(tipParents(pr.after), 1, 'pull --rebase 不該產生合流點')

  // cherry-pick / revert：都是往前多做一顆，不是把舊的挖掉
  for (const slug of ['cherry-pick', 'revert']) {
    const r = runFlow(flowBySlug(slug)!)
    assert.equal(
      Object.keys(r.after.commits).length,
      Object.keys(r.before.commits).length + 1,
      `${slug} 該剛好多出一顆 commit`,
    )
  }

  // reset --hard：HEAD 往回搬，但被搬掉的那顆還在（reflog 撈得回來就是靠這個）
  const reset = runFlow(flowBySlug('reset-hard')!)
  assert.notEqual(headOid(reset.before), headOid(reset.after), 'reset 該把 HEAD 搬走')
  assert.deepEqual(oids(reset.before), oids(reset.after), 'reset --hard 不該真的刪掉 commit')

  // fetch：只動 origin/*，本地分支一步都不能動
  const fetch = runFlow(flowBySlug('fetch')!)
  assert.deepEqual(fetch.before.branches, fetch.after.branches, 'fetch 動到了本地分支')
  assert.notDeepEqual(fetch.before.tracking, fetch.after.tracking, 'fetch 該更新 origin/*')

  // push：反過來 —— 本地一步都沒動，是遠端追上來
  const push = runFlow(flowBySlug('push')!)
  assert.deepEqual(push.before.branches, push.after.branches, 'push 不該動到本地分支')
  assert.notDeepEqual(push.before.remote, push.after.remote, 'push 該把東西送上遠端')
})

test('換分支真的會換掉眼前的檔案', () => {
  for (const slug of ['switch', 'checkout']) {
    const { before, after } = runFlow(flowBySlug(slug)!)
    assert.notDeepEqual(before.work, after.work, `${slug} 該把工作目錄整組換掉`)
  }
})
