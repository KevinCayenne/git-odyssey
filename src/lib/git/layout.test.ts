import assert from 'node:assert/strict'
import { test } from 'node:test'

import { layoutGraph } from './layout'
import { gitflowDemo, lifeDemo, pairDemo } from '../quests/demos'

test('gitflow 的五條軌道一條都不能少', () => {
  const g = layoutGraph(gitflowDemo())
  const labels = g.lanes.map((l) => l.label)
  assert.deepEqual(labels, [
    'main',
    'hotfix/login',
    'release/1.1',
    'develop',
    'feature/export',
  ])
  // 由上往下＝由穩定到還在動，這個順序本身就是在教 gitflow
  assert.deepEqual(
    g.lanes.map((l) => l.kind),
    ['main', 'hotfix', 'release', 'develop', 'feature'],
  )
})

test('主幹留在最上面那條線上', () => {
  const g = layoutGraph(gitflowDemo())
  const mainLane = g.lanes.find((l) => l.label === 'main')!.index
  assert.equal(mainLane, 0)
  // 第一個 commit 和最後一個 commit 都該在 main 那條線上
  const sorted = [...g.nodes].sort((a, b) => a.x - b.x)
  assert.equal(sorted[0]!.lane, mainLane)
  assert.equal(sorted[sorted.length - 1]!.lane, mainLane)
})

test('每個 commit 都有位置，每條邊兩端都接得到', () => {
  for (const build of [gitflowDemo, pairDemo, lifeDemo]) {
    const g = layoutGraph(build())
    const ids = new Set(g.nodes.map((n) => n.oid))
    for (const e of g.edges) {
      assert.ok(ids.has(e.from.oid) && ids.has(e.to.oid))
      // 子節點永遠在父節點右邊
      assert.ok(e.to.x > e.from.x, `${e.id} 的方向反了`)
    }
    assert.ok(g.columns > 0)
  }
})

test('agent 的 commit 在圖上分得出來', () => {
  const g = layoutGraph(pairDemo())
  const agents = g.nodes.filter((n) => n.commit.actor === 'agent')
  assert.equal(agents.length, 2)
  const lane = g.lanes[agents[0]!.lane]!
  assert.equal(lane.label, 'agent/refactor')
})
