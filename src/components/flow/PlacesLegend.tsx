'use client'

import { PLACES } from '@/lib/quests/flows'
import { PRESENT_SCALE, usePresent } from '@/lib/present'

/**
 * 整頁只需要記住的那張圖：東西可以待的五個地方，加上旁邊那個口袋。
 *
 * 順序本身就是知識 —— 往右是交出去，往左是拿回來。
 * 後面二十張流程圖全部長在這張上面。
 */

const BOX_W = 150
const STEP = 178
const PAD = 12
const TOP = 74
const H = 74
const RAIL = PLACES.filter((p) => p.key !== 'stash')
const STASH = PLACES.find((p) => p.key === 'stash')!

const VB_W = PAD + BOX_W / 2 + STEP * (RAIL.length - 1) + BOX_W / 2 + PAD
const STASH_TOP = TOP + H + 34
const VB_H = STASH_TOP + 56 + 8

const cx = (i: number) => PAD + BOX_W / 2 + i * STEP

export function PlacesLegend() {
  const { present } = usePresent()

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block h-auto w-full"
        style={{ maxWidth: present ? VB_W * PRESENT_SCALE : VB_W }}
        role="img"
        aria-label="git 的五個地方：工作目錄、暫存區、本地歷史、origin/main、遠端，外加一個口袋"
      >
        {/* 兩個方向 */}
        <g>
          <line
            x1={cx(0)}
            x2={cx(4) - 14}
            y1={26}
            y2={26}
            stroke="var(--vermilion)"
            strokeWidth={1.2}
          />
          <polygon
            points="0,0 -9,-4 -9,4"
            fill="var(--vermilion)"
            transform={`translate(${cx(4)} 26)`}
          />
          <text
            x={cx(2)}
            y={19}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}
            fill="var(--vermilion)"
          >
            往右：把東西交出去
          </text>

          <line
            x1={cx(4)}
            x2={cx(0) + 14}
            y1={46}
            y2={46}
            stroke="var(--indigo)"
            strokeWidth={1.2}
          />
          <polygon
            points="0,0 9,-4 9,4"
            fill="var(--indigo)"
            transform={`translate(${cx(0)} 46)`}
          />
          <text
            x={cx(2)}
            y={59}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}
            fill="var(--indigo)"
          >
            往左：把東西拿回來
          </text>
        </g>

        {RAIL.map((place, i) => (
          <g key={place.key}>
            <rect
              x={cx(i) - BOX_W / 2}
              y={TOP}
              width={BOX_W}
              height={H}
              rx={2}
              fill="var(--paper)"
              stroke="var(--ink-3)"
              strokeWidth={1}
            />
            <text
              x={cx(i)}
              y={TOP + 21}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5 }}
              fill="var(--ink-3)"
            >
              {String(i + 1).padStart(2, '0')}
            </text>
            <text
              x={cx(i)}
              y={TOP + 42}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}
              fill="var(--ink)"
            >
              {place.name}
            </text>
            <text
              x={cx(i)}
              y={TOP + 58}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.04em' }}
              fill="var(--ink-3)"
            >
              {place.sub}
            </text>
            <text
              x={cx(i)}
              y={TOP + 70}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-body)', fontSize: 10.5 }}
              fill="var(--ink-3)"
            >
              {place.note}
            </text>
          </g>
        ))}

        {/* 口袋掛在旁邊，因為它不在那條線上 */}
        <path
          d={`M ${cx(0)} ${TOP + H} L ${cx(0)} ${STASH_TOP - 18} L ${cx(0) + STEP * 0.5} ${STASH_TOP - 18} L ${cx(0) + STEP * 0.5} ${STASH_TOP}`}
          fill="none"
          stroke="var(--rule)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <rect
          x={cx(0) + STEP * 0.5 - BOX_W / 2}
          y={STASH_TOP}
          width={BOX_W}
          height={56}
          rx={2}
          fill="var(--paper)"
          stroke="var(--rule)"
          strokeWidth={1}
        />
        <text
          x={cx(0) + STEP * 0.5}
          y={STASH_TOP + 24}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}
          fill="var(--ink-2)"
        >
          {STASH.name}
        </text>
        <text
          x={cx(0) + STEP * 0.5}
          y={STASH_TOP + 41}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-body)', fontSize: 10.5 }}
          fill="var(--ink-3)"
        >
          {STASH.note}
        </text>
      </svg>
    </div>
  )
}
