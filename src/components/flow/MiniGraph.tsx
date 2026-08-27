'use client'

import { useMemo } from 'react'

import { LANE_COLOR } from '@/components/graph/laneColor'
import { layoutGraph, type GraphLayout } from '@/lib/git/layout'
import type { Repo } from '@/lib/git/types'
import { PRESENT_SCALE, usePresent } from '@/lib/present'

/**
 * 指令打下去之前和之後的歷史，疊在一起放給你看。
 *
 * 前後兩張圖都是引擎自己算出來的，中間那段是內插 ——
 * 所以 rebase 那幾顆 commit 真的會從舊位置飄到新位置，
 * 分支的名牌真的會滑過去。看一次抵解釋三遍。
 */

const COL_W = 74
const ROW_H = 50
const PAD_X = 46
const PAD_Y = 34
/* 這張圖的座標很小，讓它放大一點再貼上去 —— 不然在一堆內文旁邊會小到看不出在動什麼 */
const ZOOM = 1.7
const MIN_W = 340

interface Spot {
  x: number
  y: number
}

function spots(layout: GraphLayout): Record<string, Spot> {
  const out: Record<string, Spot> = {}
  for (const n of layout.nodes) {
    out[n.oid] = { x: PAD_X + n.x * COL_W, y: PAD_Y + n.lane * ROW_H }
  }
  return out
}

/** 名牌現在貼在哪一顆上 */
function refSpots(layout: GraphLayout, pos: Record<string, Spot>): Record<string, Spot> {
  const out: Record<string, Spot> = {}
  for (const n of layout.nodes) {
    for (const r of n.refs) {
      const p = pos[n.oid]
      if (p) out[r] = p
    }
  }
  return out
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function MiniGraph({
  before,
  after,
  g,
}: {
  before: Repo
  after: Repo
  /** 0 = 打指令之前，1 = 打完之後 */
  g: number
}) {
  const { present } = usePresent()

  const view = useMemo(() => {
    const a = layoutGraph(before)
    const b = layoutGraph(after)
    return { a, b, pa: spots(a), pb: spots(b) }
  }, [before, after])

  const { a, b, pa, pb } = view
  const t = ease(Math.max(0, Math.min(1, g)))

  const colors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const layout of [a, b]) {
      for (const n of layout.nodes) {
        out[n.oid] = LANE_COLOR[layout.lanes[n.lane]?.kind ?? 'loose']
      }
    }
    return out
  }, [a, b])

  const oids = useMemo(
    () => [...new Set([...a.nodes.map((n) => n.oid), ...b.nodes.map((n) => n.oid)])],
    [a, b],
  )

  if (!oids.length) return null

  const width = PAD_X * 2 + (Math.max(a.columns, b.columns) - 1) * COL_W
  const height = PAD_Y * 2 + (Math.max(a.lanes.length, b.lanes.length) - 1) * ROW_H

  /** 一顆 commit 在這個時間點的位置和濃度 */
  const at = (oid: string): { p: Spot; o: number } | null => {
    const from = pa[oid]
    const to = pb[oid]
    if (from && to) return { p: { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }, o: 1 }
    if (from) return { p: from, o: 1 - t } // 被丟掉的
    if (to) return { p: to, o: t } // 新長出來的
    return null
  }

  const edges = [...a.edges, ...b.edges]
  const seenEdge = new Set<string>()

  const refsA = refSpots(a, pa)
  const refsB = refSpots(b, pb)
  const refNames = [...new Set([...Object.keys(refsA), ...Object.keys(refsB)])]

  const headA = a.nodes.find((n) => n.isHead)?.oid
  const headB = b.nodes.find((n) => n.isHead)?.oid
  const head = t < 0.5 ? headA : headB
  const headAt = head ? at(head) : null

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${Math.max(height, 96)}`}
        className="mx-auto block h-auto w-full"
        style={{
          maxWidth: Math.max(width * ZOOM, MIN_W) * (present ? PRESENT_SCALE : 1),
        }}
        aria-hidden
      >
        {edges.map((e) => {
          if (seenEdge.has(e.id)) return null
          seenEdge.add(e.id)
          const from = at(e.from.oid)
          const to = at(e.to.oid)
          if (!from || !to) return null
          const dx = Math.max((to.p.x - from.p.x) / 2, 12)
          const path =
            Math.abs(from.p.y - to.p.y) < 0.5
              ? `M ${from.p.x} ${from.p.y} L ${to.p.x} ${to.p.y}`
              : `M ${from.p.x} ${from.p.y} C ${from.p.x + dx} ${from.p.y}, ${to.p.x - dx} ${to.p.y}, ${to.p.x} ${to.p.y}`
          return (
            <path
              key={e.id}
              d={path}
              fill="none"
              stroke={colors[e.to.oid] ?? 'var(--ink-3)'}
              strokeWidth={e.incoming ? 1 : 1.4}
              opacity={Math.min(from.o, to.o) * (e.incoming ? 0.5 : 0.8)}
            />
          )
        })}

        {headAt && (
          <circle
            cx={headAt.p.x}
            cy={headAt.p.y}
            r={9}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1}
            opacity={headAt.o}
          />
        )}

        {oids.map((oid) => {
          const s = at(oid)
          if (!s) return null
          const color = colors[oid] ?? 'var(--ink-3)'
          const node =
            b.nodes.find((n) => n.oid === oid) ?? a.nodes.find((n) => n.oid === oid)!
          const merge = node.commit.parents.length > 1
          const agent = node.commit.actor === 'agent'
          if (merge) {
            return (
              <g key={oid} opacity={s.o}>
                <circle cx={s.p.x} cy={s.p.y} r={5.5} fill="var(--paper)" stroke={color} strokeWidth={1.8} />
                <circle cx={s.p.x} cy={s.p.y} r={1.6} fill={color} />
              </g>
            )
          }
          if (agent) {
            return (
              <rect
                key={oid}
                x={s.p.x - 4.6}
                y={s.p.y - 4.6}
                width={9.2}
                height={9.2}
                transform={`rotate(45 ${s.p.x} ${s.p.y})`}
                fill={color}
                stroke={color}
                strokeWidth={1.2}
                opacity={s.o}
              />
            )
          }
          return <circle key={oid} cx={s.p.x} cy={s.p.y} r={4.6} fill={color} opacity={s.o} />
        })}

        {(() => {
          // 兩張名牌落在同一顆 commit 上的時候會疊死，所以同一個位置往上排隊
          const stack = new Map<string, number>()
          return refNames.map((name) => {
            const from = refsA[name]
            const to = refsB[name]
            const spot =
              from && to ? { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) } : (from ?? to)!
            const o = from && to ? 1 : from ? 1 - t : t
            const moved = from && to && (from.x !== to.x || from.y !== to.y)
            const slot = `${Math.round(spot.x / 8)}:${Math.round(spot.y / 8)}`
            const row = stack.get(slot) ?? 0
            stack.set(slot, row + 1)
            return (
              <text
                key={name}
                x={spot.x}
                y={spot.y - 12 - row * 11}
                textAnchor="middle"
                opacity={o}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}
                fill={moved ? 'var(--vermilion)' : 'var(--ink-2)'}
              >
                {name}
              </text>
            )
          })
        })()}
      </svg>
    </div>
  )
}
