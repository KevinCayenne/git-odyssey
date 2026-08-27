import { generations, headOid, refsAt } from './repo'
import type { Commit, Oid, Repo } from './types'

/**
 * 把 DAG 攤平成一張橫向的圖。
 *
 * x 軸是「世代」—— 離第一個 commit 有多遠。
 * y 軸是「哪條線」—— 而且刻意讓它跟 gitflow 的圖長得一樣：
 * 穩定的在上面，實驗性的在下面。看久了，分支的位置本身就是一種記憶。
 */

export interface GraphNode {
  oid: Oid
  commit: Commit
  x: number
  lane: number
  refs: string[]
  isHead: boolean
  /** 只有 origin/* 指著、本地分支還走不到的 commit */
  remoteOnly: boolean
}

export interface GraphEdge {
  id: string
  from: GraphNode
  to: GraphNode
  /** merge commit 的第二個以後的父親，畫成匯流的曲線 */
  incoming: boolean
}

export interface LaneInfo {
  index: number
  label: string
  kind: BranchKind
}

export interface GraphLayout {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lanes: LaneInfo[]
  columns: number
}

export type BranchKind = 'main' | 'hotfix' | 'release' | 'develop' | 'feature' | 'loose'

export function branchKind(name: string): BranchKind {
  const n = name.replace(/^origin\//, '')
  if (n === 'main' || n === 'master' || n === 'trunk') return 'main'
  if (n.startsWith('hotfix')) return 'hotfix'
  if (n.startsWith('release')) return 'release'
  if (n === 'develop' || n === 'dev') return 'develop'
  return 'feature'
}

/** 由上往下的順序。穩定的在上，越往下越是還在長的東西。 */
const KIND_ORDER: Record<BranchKind, number> = {
  main: 0,
  hotfix: 1,
  release: 2,
  develop: 3,
  feature: 4,
  loose: 5,
}

/** 誰先來認領 commit。main 先認，所以主幹永遠是最上面那條直線。 */
function claimOrder(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const d = KIND_ORDER[branchKind(a)] - KIND_ORDER[branchKind(b)]
    return d !== 0 ? d : a.localeCompare(b)
  })
}

export function layoutGraph(repo: Repo): GraphLayout {
  const gens = generations(repo)
  const head = headOid(repo)

  const localBranches = Object.keys(repo.branches)
  const owner: Record<Oid, string> = {}

  // 沿著第一個父親往回走。merge commit 的第一個父親就是「當時你站的那條線」，
  // 所以這樣走出來的正好是每條分支自己的主幹。
  for (const name of claimOrder(localBranches)) {
    let cur: Oid | null = repo.branches[name] ?? null
    while (cur && !owner[cur]) {
      owner[cur] = name
      const c: Commit | undefined = repo.commits[cur]
      cur = c?.parents[0] ?? null
    }
  }

  // fetch 回來但還沒合併的東西，掛在自己的線上
  for (const name of claimOrder(Object.keys(repo.tracking))) {
    let cur: Oid | null = repo.tracking[name] ?? null
    while (cur && !owner[cur]) {
      owner[cur] = `origin/${name}`
      const c: Commit | undefined = repo.commits[cur]
      cur = c?.parents[0] ?? null
    }
  }

  const reachable = new Set(Object.keys(owner))

  // detached HEAD 上做的 commit 沒有分支接住，但畫得出來
  if (head && !owner[head]) {
    let cur: Oid | null = head
    while (cur && !owner[cur]) {
      owner[cur] = 'HEAD'
      reachable.add(cur)
      const c: Commit | undefined = repo.commits[cur]
      cur = c?.parents[0] ?? null
    }
  }

  const laneNames = [...new Set(Object.values(owner))].sort((a, b) => {
    const ka = a === 'HEAD' ? 'loose' : branchKind(a)
    const kb = b === 'HEAD' ? 'loose' : branchKind(b)
    const d = KIND_ORDER[ka] - KIND_ORDER[kb]
    if (d !== 0) return d
    return a.localeCompare(b)
  })

  const laneOf: Record<string, number> = {}
  laneNames.forEach((name, i) => {
    laneOf[name] = i
  })

  const lanes: LaneInfo[] = laneNames.map((name, i) => ({
    index: i,
    label: name,
    kind: name === 'HEAD' ? 'loose' : branchKind(name),
  }))

  const localReachable = new Set<Oid>()
  for (const name of localBranches) {
    const tip: Oid | null = repo.branches[name] ?? null
    const stack: Oid[] = tip ? [tip] : []
    while (stack.length) {
      const o = stack.pop()!
      if (localReachable.has(o)) continue
      localReachable.add(o)
      const c = repo.commits[o]
      if (c) stack.push(...c.parents)
    }
  }

  const nodes: GraphNode[] = []
  const byOid: Record<Oid, GraphNode> = {}

  for (const oid of reachable) {
    const commit = repo.commits[oid]
    if (!commit) continue
    const laneName = owner[oid] ?? 'HEAD'
    const node: GraphNode = {
      oid,
      commit,
      x: gens[oid] ?? 0,
      lane: laneOf[laneName] ?? 0,
      refs: refsAt(repo, oid),
      isHead: head === oid,
      remoteOnly: !localReachable.has(oid),
    }
    nodes.push(node)
    byOid[oid] = node
  }

  const edges: GraphEdge[] = []
  for (const node of nodes) {
    node.commit.parents.forEach((p, i) => {
      const parent = byOid[p]
      if (!parent) return
      edges.push({
        id: `${p}->${node.oid}`,
        from: parent,
        to: node,
        incoming: i > 0,
      })
    })
  }

  nodes.sort((a, b) => a.x - b.x || a.lane - b.lane)

  return {
    nodes,
    edges,
    lanes,
    columns: nodes.reduce((m, n) => Math.max(m, n.x), 0) + 1,
  }
}
