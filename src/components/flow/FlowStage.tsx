'use client'

import { useMemo } from 'react'

import { PLACES, type Flow, type Place } from '@/lib/quests/flows'
import { PRESENT_SCALE, usePresent } from '@/lib/present'

import type { Beat, Frame } from './player'

/**
 * 東西在五個地方之間搬來搬去 —— 這張圖就是全部。
 *
 * 由左到右的順序不是隨便排的：往右是把東西交出去，往左是把東西拿回來。
 * 記住這一條，光看箭頭指哪邊就猜得到指令在幹嘛。
 */

/* 幾何全部寫在 viewBox 座標裡，外面用寬度去縮 ——
   所以手機上是整張變小，不是被切掉。 */
const BOX_W = 148
const STEP = 176
const BOX_TOP = 58
const BOX_H = 62
const BOX_BOT = BOX_TOP + BOX_H
const CHANNEL = 26 // 上方的搬運通道
const LOWER = 142 // 下方的搬運通道（口袋用）
const STASH_TOP = 158
const STASH_H = 54
const PAD = 10

const RAIL: Place[] = ['work', 'index', 'local', 'tracking', 'remote']

const VB_W = PAD + BOX_W / 2 + STEP * (RAIL.length - 1) + BOX_W / 2 + PAD
const VB_H_PLAIN = BOX_BOT + 16
const VB_H_STASH = STASH_TOP + STASH_H + 10

function railX(place: Place): number {
  const i = RAIL.indexOf(place)
  if (i >= 0) return PAD + BOX_W / 2 + i * STEP
  // 口袋掛在工作目錄跟暫存區中間的下方
  return PAD + BOX_W / 2 + STEP * 0.5
}

/** 一段搬運畫成的折線。轉角是直角 —— 這是圖表，不是流水。 */
function polyline(from: Place, to: Place): [number, number][] {
  const x1 = railX(from)
  const x2 = railX(to)

  if (from === 'stash' || to === 'stash') {
    const railSide = from === 'stash' ? to : from
    const rx = railX(railSide)
    const sx = railX('stash')
    const down: [number, number][] = [
      [rx, BOX_BOT],
      [rx, LOWER],
      [sx, LOWER],
      [sx, STASH_TOP],
    ]
    return from === 'stash' ? [...down].reverse() : down
  }

  if (from === to) {
    // 原地打轉：東西沒有離開這一格，但這一格裡多了什麼
    return [
      [x1 - 30, BOX_TOP],
      [x1 - 30, CHANNEL],
      [x1 + 30, CHANNEL],
      [x1 + 30, BOX_TOP],
    ]
  }

  return [
    [x1, BOX_TOP],
    [x1, CHANNEL],
    [x2, CHANNEL],
    [x2, BOX_TOP],
  ]
}

function lengths(points: [number, number][]): { total: number; cum: number[] } {
  const cum = [0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    total += Math.hypot(b[0] - a[0], b[1] - a[1])
    cum.push(total)
  }
  return { total, cum }
}

function pointAt(points: [number, number][], t: number): [number, number] {
  const { total, cum } = lengths(points)
  const want = total * Math.max(0, Math.min(1, t))
  for (let i = 1; i < points.length; i++) {
    if (cum[i]! >= want) {
      const a = points[i - 1]!
      const b = points[i]!
      const span = cum[i]! - cum[i - 1]!
      const f = span === 0 ? 0 : (want - cum[i - 1]!) / span
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    }
  }
  return points[points.length - 1]!
}

function d(points: [number, number][]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
}

function Arrow({
  at,
  towards,
  color,
  opacity,
}: {
  at: [number, number]
  towards: [number, number]
  color: string
  opacity: number
}) {
  const angle = (Math.atan2(at[1] - towards[1], at[0] - towards[0]) * 180) / Math.PI
  return (
    <polygon
      points="0,0 -9,-4.2 -9,4.2"
      fill={color}
      opacity={opacity}
      transform={`translate(${at[0]} ${at[1]}) rotate(${angle})`}
    />
  )
}

export function FlowStage({
  flow,
  beats,
  frame,
}: {
  flow: Flow
  beats: Beat[]
  frame: Frame
}) {
  const { present } = usePresent()

  const usesStash = useMemo(
    () => flow.moves.some((m) => m.from === 'stash' || m.to === 'stash'),
    [flow],
  )
  const vbH = usesStash ? VB_H_STASH : VB_H_PLAIN

  const current = beats[frame.index]
  const activePlaces = new Set<Place>()
  if (current?.kind === 'move') {
    activePlaces.add(current.move.from)
    if (frame.t > 0.55) activePlaces.add(current.move.to)
  } else if (current?.kind === 'read') {
    activePlaces.add(current.place)
  }

  const touched = new Set<Place>(flow.touches)
  const read = new Set<Place>(flow.reads)

  const boxes: Place[] = usesStash ? [...RAIL, 'stash'] : RAIL

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${VB_W} ${vbH}`}
        className="block h-auto w-full"
        style={{ maxWidth: present ? VB_W * PRESENT_SCALE : VB_W }}
        role="img"
        aria-label={`${flow.command}：${flow.gloss}`}
      >
        {/* 底線：把五格串成一條軌 */}
        <line
          x1={PAD}
          x2={VB_W - PAD}
          y1={BOX_BOT + 7}
          y2={BOX_BOT + 7}
          stroke="var(--rule)"
          strokeWidth={1}
          strokeDasharray="1 6"
        />

        {boxes.map((key) => {
          const info = PLACES.find((p) => p.key === key)!
          const cx = railX(key)
          const top = key === 'stash' ? STASH_TOP : BOX_TOP
          const h = key === 'stash' ? STASH_H : BOX_H
          const active = activePlaces.has(key)
          const involved = touched.has(key) || read.has(key) || active
          const stroke = active
            ? 'var(--vermilion)'
            : involved
              ? 'var(--ink-3)'
              : 'var(--rule)'
          return (
            <g key={key} opacity={involved ? 1 : 0.4}>
              <rect
                x={cx - BOX_W / 2}
                y={top}
                width={BOX_W}
                height={h}
                rx={2}
                fill={active ? 'var(--paper-2)' : 'var(--paper)'}
                stroke={stroke}
                strokeWidth={active ? 1.6 : 1}
                style={{ transition: 'stroke 160ms linear, fill 160ms linear' }}
              />
              <text
                x={cx}
                y={top + 23}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}
                fill={active ? 'var(--vermilion)' : 'var(--ink)'}
              >
                {info.name}
              </text>
              <text
                x={cx}
                y={top + 39}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.04em' }}
                fill="var(--ink-3)"
              >
                {info.sub}
              </text>
              {key !== 'stash' && (
                <text
                  x={cx}
                  y={top + 54}
                  textAnchor="middle"
                  style={{ fontFamily: 'var(--font-body)', fontSize: 10.5 }}
                  fill="var(--ink-3)"
                >
                  {info.note}
                </text>
              )}
            </g>
          )
        })}

        {/* 搬運 */}
        {beats.map((beat, i) => {
          if (beat.kind !== 'move') return null
          if (i > frame.index) return null
          const done = i < frame.index || frame.done
          const t = done ? 1 : frame.t
          const pts = polyline(beat.move.from, beat.move.to)
          const { total } = lengths(pts)
          const color = beat.move.danger ? 'var(--ochre)' : 'var(--vermilion)'
          const tip = pointAt(pts, t)
          const tail = pointAt(pts, Math.max(0, t - 0.06))
          const isNow = i === frame.index && !frame.done

          return (
            <g key={i} opacity={isNow ? 1 : 0.42}>
              <path
                d={d(pts)}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="butt"
                strokeDasharray={total}
                strokeDashoffset={total * (1 - t)}
              />
              <Arrow
                at={pointAt(pts, 1)}
                towards={pointAt(pts, 0.94)}
                color={color}
                opacity={Math.max(0, (t - 0.86) / 0.14)}
              />
              {isNow && t < 1 && (
                <>
                  <rect
                    x={tip[0] - 5.5}
                    y={tip[1] - 5.5}
                    width={11}
                    height={11}
                    rx={1}
                    fill={color}
                  />
                  <text
                    x={tip[0]}
                    y={tip[1] - 12}
                    textAnchor={tip[0] > VB_W - 120 ? 'end' : tail[0] > tip[0] ? 'start' : 'middle'}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}
                    fill={color}
                  >
                    {beat.move.carries}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* 只讀不搬的指令：把在看的那一格圈起來 */}
        {beats.map((beat, i) => {
          if (beat.kind !== 'read' || i > frame.index) return null
          const cx = railX(beat.place)
          const isNow = i === frame.index && !frame.done
          return (
            <g key={`r${i}`} opacity={isNow ? 1 : 0.35}>
              <rect
                x={cx - BOX_W / 2 - 5}
                y={BOX_TOP - 5}
                width={BOX_W + 10}
                height={BOX_H + 10}
                rx={2}
                fill="none"
                stroke="var(--indigo)"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <text
                x={cx}
                y={BOX_TOP - 12}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}
                fill="var(--indigo)"
              >
                只是看
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
