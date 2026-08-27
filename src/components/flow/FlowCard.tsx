'use client'

import { useMemo } from 'react'

import { layoutGraph } from '@/lib/git/layout'
import { useReducedMotion } from '@/lib/motion'
import { flowBySlug, runFlow } from '@/lib/quests/flows'

import { FlowStage } from './FlowStage'
import { MiniGraph } from './MiniGraph'
import { buildBeats, usePlayer } from './player'

/** 前後兩張圖長得一樣的話，那張小圖就沒東西好演，不要佔位置 */
function graphMoves(before: ReturnType<typeof runFlow>['before'], after: ReturnType<typeof runFlow>['after']) {
  const key = (r: typeof before) => {
    const l = layoutGraph(r)
    return JSON.stringify(l.nodes.map((n) => [n.oid, n.x, n.lane, n.refs]).sort())
  }
  return key(before) !== key(after)
}

/* 頁面是 server component，所以這裡只收一個字串，資料在 client 這邊查 */
export function FlowCard({ slug }: { slug: string }) {
  const flow = flowBySlug(slug)!
  const reduced = useReducedMotion()
  const beats = useMemo(() => buildBeats(flow), [flow])
  const { p, playing, frame, play, pause, replay, seek, watch } = usePlayer(
    beats.length,
    reduced,
  )

  const { before, after } = useMemo(() => runFlow(flow), [flow])
  const showGraph = useMemo(() => graphMoves(before, after), [before, after])

  // 圖要在「東西落進歷史」的那一拍變，不是整段慢慢變
  const graphBeat = useMemo(() => {
    const i = beats.findLastIndex((b) => b.kind === 'move' && b.move.to === 'local')
    return i >= 0 ? i : beats.length - 1
  }, [beats])

  const g = Math.max(0, Math.min(1, p - graphBeat))
  const current = beats[frame.index]

  return (
    <article ref={watch} className="rule-b py-8 first:pt-2">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,286px)] lg:gap-10">
        <div className="min-w-0">
          {/* 指令 */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <code className="num text-[1.0625rem] leading-[1.5] text-ink">{flow.command}</code>
            <span className="text-[0.9375rem] leading-[1.7] text-ink-2">{flow.gloss}</span>
          </div>

          {/* 圖 */}
          <div className="mt-4 border border-rule bg-paper-2/30 px-2 py-3">
            <FlowStage flow={flow} beats={beats} frame={frame} />

            {showGraph && (
              <div className="rule-t mt-3 pt-3">
                <p className="label mb-1 px-2">歷史這邊同時發生的事</p>
                <MiniGraph before={before} after={after} g={g} />
              </div>
            )}
          </div>

          {/* 旁白 */}
          <p className="mt-3 min-h-[3.4em] max-w-[56ch] text-[0.9375rem] leading-[1.8] text-ink-2">
            {current ? (
              <>
                <span
                  className={`num mr-2 text-[0.6875rem] ${
                    current.kind === 'move' && current.move.danger
                      ? 'text-ochre'
                      : 'text-vermilion'
                  }`}
                >
                  {String(frame.index + 1).padStart(2, '0')}
                </span>
                {current.caption}
              </>
            ) : (
              <span className="text-ink-3">這個指令不搬東西。</span>
            )}
          </p>

          {/* 控制 */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              onClick={playing ? pause : play}
              className="btn btn-quiet"
              aria-label={playing ? '暫停' : '播放'}
            >
              {playing ? '暫停' : frame.done ? '再播一次' : '播放'}
            </button>

            {beats.length > 1 && (
              <div className="flex items-center gap-1.5">
                {beats.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => seek(i)}
                    title={b.caption}
                    aria-label={`第 ${i + 1} 段`}
                    className={`h-[3px] w-7 transition-colors ${
                      i < frame.index || frame.done
                        ? 'bg-vermilion'
                        : i === frame.index
                          ? 'bg-vermilion/45'
                          : 'bg-rule'
                    }`}
                  />
                ))}
              </div>
            )}

            {beats.length > 1 && (
              <button
                onClick={replay}
                className="label hover:text-ink transition-colors"
              >
                從頭
              </button>
            )}
          </div>
        </div>

        {/* 什麼時候用、會踩什麼坑 */}
        <div className="flex flex-col gap-4 lg:pt-1">
          <div className="border-l border-rule pl-4">
            <p className="label mb-1">什麼時候用</p>
            <p className="text-[0.875rem] leading-[1.8] text-ink-2">{flow.when}</p>
          </div>
          <div className="border-l border-vermilion pl-4">
            <p className="label mb-1">最常踩的坑</p>
            <p className="text-[0.875rem] leading-[1.8] text-ink-2">{flow.gotcha}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
