'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { layoutGraph, type BranchKind, type GraphNode } from '@/lib/git/layout'
import type { Repo } from '@/lib/git/types'
import { PRESENT_SCALE, usePresent } from '@/lib/present'

const COL_W = 84
const ROW_H = 64
const PAD_X = 46
const PAD_Y = 40

const LANE_COLOR: Record<BranchKind, string> = {
  main: 'var(--vermilion)',
  develop: 'var(--indigo)',
  feature: 'var(--moss)',
  release: 'var(--ochre)',
  hotfix: 'var(--plum)',
  loose: 'var(--ink-3)',
}

const KIND_NOTE: Record<BranchKind, string> = {
  main: '出得去的東西',
  develop: '正在整合的',
  feature: '還在長的',
  release: '準備要出的',
  hotfix: '插隊的急件',
  loose: '沒有名字接住',
}

export function CommitGraph({
  repo,
  className = '',
}: {
  repo: Repo
  className?: string
}) {
  const graph = useMemo(() => layoutGraph(repo), [repo])
  const { present } = usePresent()
  const [selected, setSelected] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // 投影模式下整張圖等比放大。節點大小是 SVG 座標，只能用倍率撐，
  // 沒辦法交給 CSS 的字級去帶。
  const k = present ? PRESENT_SCALE : 1
  const colW = COL_W * k
  const rowH = ROW_H * k
  const padX = PAD_X * k
  const padY = PAD_Y * k
  const lastColumns = useRef<number | null>(null)

  // 歷史往右邊長，所以長出新東西的時候把視線帶過去。
  // 第一次不算 —— 一進場就自己捲到底，反而會把開頭那幾個 commit 藏起來。
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const prev = lastColumns.current
    lastColumns.current = graph.columns
    if (prev !== null && graph.columns > prev) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    }
  }, [graph.columns])

  const width = Math.max(padX * 2 + (graph.columns - 1) * colW, 320)
  const height = Math.max(padY * 2 + (graph.lanes.length - 1) * rowH, 140 * k)

  const x = (n: GraphNode) => padX + n.x * colW
  const y = (n: GraphNode) => padY + n.lane * rowH

  const detail = graph.nodes.find((n) => n.oid === selected) ?? null

  if (!graph.nodes.length) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <p className="text-ink-3 text-[15px] text-center max-w-[34ch] leading-[1.9]">
          還沒有任何 commit。
          <br />
          <span className="text-[13px]">
            歷史是空的 —— 但空的歷史跟沒有歷史不一樣。
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-stretch">
        {/* 左邊的軌道名稱固定不動，右邊才捲 */}
        <div
          className={`shrink-0 border-r border-rule bg-paper ${
            present ? 'w-[220px]' : 'w-[126px] sm:w-[176px]'
          }`}
          style={{ paddingTop: padY - 11 * k }}
        >
          {graph.lanes.map((lane) => (
            <div
              key={lane.index}
              className="flex items-start gap-2 pr-2 pl-3 sm:pr-3 sm:pl-4"
              style={{ height: rowH }}
            >
              <span
                className="mt-[6px] block shrink-0 rounded-[1px]"
                style={{ background: LANE_COLOR[lane.kind], width: 9 * k, height: 9 * k }}
              />
              <span className="min-w-0">
                <span className="present-lane num block truncate text-[11px] leading-[1.5] text-ink">
                  {lane.label}
                </span>
                <span className="present-lane-note block text-[11px] leading-[1.4] text-ink-3">
                  {KIND_NOTE[lane.kind]}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div ref={scroller} className="scroll-thin flex-1 overflow-x-auto">
          <div className="relative" style={{ width, height }}>
            <svg
              width={width}
              height={height}
              className="absolute inset-0"
              aria-hidden
            >
              {/* 每條軌道一條虛線，像有格線的稿紙 */}
              {graph.lanes.map((lane) => (
                <line
                  key={lane.index}
                  x1={0}
                  x2={width}
                  y1={padY + lane.index * rowH}
                  y2={padY + lane.index * rowH}
                  stroke="var(--rule)"
                  strokeWidth={1}
                  strokeDasharray="1 7"
                  opacity={0.65}
                />
              ))}

              {graph.edges.map((e) => {
                const x1 = x(e.from)
                const y1 = y(e.from)
                const x2 = x(e.to)
                const y2 = y(e.to)
                const kind = graph.lanes[e.incoming ? e.from.lane : e.to.lane]?.kind ?? 'loose'
                const dx = Math.max((x2 - x1) / 2, 18)
                const d =
                  y1 === y2
                    ? `M ${x1} ${y1} L ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                return (
                  <path
                    key={e.id}
                    d={d}
                    fill="none"
                    stroke={LANE_COLOR[kind]}
                    strokeWidth={(e.incoming ? 1.25 : 1.75) * k}
                    strokeDasharray={e.to.remoteOnly ? '4 3' : undefined}
                    opacity={e.incoming ? 0.55 : 0.85}
                  />
                )
              })}

              {graph.nodes.map((n) => {
                const cx = x(n)
                const cy = y(n)
                const color = LANE_COLOR[graph.lanes[n.lane]?.kind ?? 'loose']
                const isMerge = n.commit.parents.length > 1
                const isAgent = n.commit.actor === 'agent'

                return (
                  <g key={n.oid} className="node-in">
                    {n.isHead && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11 * k}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth={1 * k}
                      />
                    )}
                    {isMerge ? (
                      <>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={7 * k}
                          fill="var(--paper)"
                          stroke={color}
                          strokeWidth={2 * k}
                        />
                        <circle cx={cx} cy={cy} r={2 * k} fill={color} />
                      </>
                    ) : isAgent ? (
                      /* AI 做的 commit 是菱形。不用顏色分，因為顏色已經在講分支了 */
                      <rect
                        x={cx - 5.6 * k}
                        y={cy - 5.6 * k}
                        width={11.2 * k}
                        height={11.2 * k}
                        transform={`rotate(45 ${cx} ${cy})`}
                        fill={n.remoteOnly ? 'var(--paper)' : color}
                        stroke={color}
                        strokeWidth={1.5 * k}
                        strokeDasharray={n.remoteOnly ? '2 2' : undefined}
                      />
                    ) : (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5.5 * k}
                        fill={n.remoteOnly ? 'var(--paper)' : color}
                        stroke={color}
                        strokeWidth={1.5 * k}
                        strokeDasharray={n.remoteOnly ? '2 2' : undefined}
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            {/* 文字用 HTML 疊上去 —— SVG 的字排不好看 */}
            {graph.nodes.map((n) => (
              <div key={n.oid}>
                {n.refs.length > 0 && (
                  <div
                    className="pointer-events-none absolute flex -translate-x-1/2 flex-wrap justify-center gap-1"
                    style={{ left: x(n), top: y(n) - 34 * k, width: colW * 1.9 }}
                  >
                    {n.refs.map((r) => (
                      <span
                        key={r}
                        className="present-ref num rounded-[2px] border px-1 py-[1px] text-[9.5px] leading-[1.5]"
                        style={{
                          borderColor: LANE_COLOR[graph.lanes[n.lane]?.kind ?? 'loose'],
                          color: LANE_COLOR[graph.lanes[n.lane]?.kind ?? 'loose'],
                          background: 'var(--paper)',
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSelected(n.oid === selected ? null : n.oid)}
                  className="present-oid num absolute -translate-x-1/2 text-[9.5px] leading-none text-ink-3 hover:text-ink"
                  style={{ left: x(n), top: y(n) + 14 * k }}
                  title={n.commit.message}
                >
                  {n.oid}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rule-t flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-2.5">
        {detail ? (
          <>
            <span className="num text-[11px] text-ink-3">{detail.oid}</span>
            <span className="present-detail text-[14px] text-ink">
              {detail.commit.message}
            </span>
            <span className="label">
              {detail.commit.actor === 'agent' ? 'AI 代理' : '你'}
              {detail.commit.parents.length > 1 ? ' · 合流點' : ''}
              {detail.remoteOnly ? ' · 只在 origin 上' : ''}
            </span>
          </>
        ) : (
          <span className="label">
            ● 你寫的　◆ AI 寫的　◎ 合流　⟳ 圈起來的是 HEAD　虛線＝抓回來但還沒併進來
          </span>
        )}
      </div>
    </div>
  )
}
