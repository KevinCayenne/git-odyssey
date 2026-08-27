'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { PLACES, type Flow, type Move, type Place } from '@/lib/quests/flows'

/**
 * 動畫的節拍器。
 *
 * 位置只有一個數字 p ∈ [0, 拍數]：整數部分是第幾拍，小數部分是那一拍走到哪。
 * 一個數字就夠了，所以「播放」「單步」「重播」「拖到某一拍」全都是同一件事。
 */

export type Beat =
  | { kind: 'move'; move: Move; caption: string }
  | { kind: 'read'; place: Place; caption: string }

/** 每一拍多久。最後這一小段停著不動，讓人把字看完。 */
const BEAT_MS = 1600
const HOLD = 0.3

export function buildBeats(flow: Flow): Beat[] {
  if (flow.moves.length) {
    return flow.moves.map((move) => ({ kind: 'move', move, caption: move.caption }))
  }
  // 只讀不搬的指令也要有東西可以演 —— 演的正是「它什麼都沒動」。
  return flow.reads.map((place) => {
    const info = PLACES.find((p) => p.key === place)!
    return {
      kind: 'read' as const,
      place,
      caption: `讀一眼「${info.name}」：${info.note}。一個字都沒有被改到。`,
    }
  })
}

export interface Frame {
  /** 現在在第幾拍 */
  index: number
  /** 這一拍走到哪，0 到 1 */
  t: number
  /** 全部播完了 */
  done: boolean
}

export function frameAt(p: number, beats: number): Frame {
  if (beats === 0) return { index: 0, t: 1, done: true }
  const index = Math.min(Math.floor(p), beats - 1)
  const frac = Math.min(1, p - index)
  return { index, t: Math.min(1, frac / (1 - HOLD)), done: p >= beats }
}

export interface Player {
  p: number
  playing: boolean
  frame: Frame
  play: () => void
  pause: () => void
  replay: () => void
  seek: (beat: number) => void
  /** 進場的時候自動播一次用的：掛在最外層的容器上 */
  watch: (node: HTMLElement | null) => void
}

export function usePlayer(beats: number, reduced: boolean): Player {
  const [p, setP] = useState(reduced ? beats : 0)
  const [playing, setPlaying] = useState(false)
  const pRef = useRef(p)
  const played = useRef(false)
  const node = useRef<HTMLElement | null>(null)

  const set = useCallback((next: number) => {
    pRef.current = next
    setP(next)
  }, [])

  const play = useCallback(() => {
    if (reduced) {
      set(beats)
      return
    }
    if (pRef.current >= beats) set(0)
    setPlaying(true)
  }, [beats, reduced, set])

  const pause = useCallback(() => setPlaying(false), [])

  const replay = useCallback(() => {
    set(0)
    if (reduced) set(beats)
    else setPlaying(true)
  }, [beats, reduced, set])

  const seek = useCallback(
    (beat: number) => {
      setPlaying(false)
      set(Math.max(0, Math.min(beats, beat + 1)))
    },
    [beats, set],
  )

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      const next = Math.min(pRef.current + dt / BEAT_MS, beats)
      pRef.current = next
      setP(next)
      if (next >= beats) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, beats])

  // 捲到才播，而且只自動播一次。
  // 二十張圖同時在動的頁面沒有人看得下去。
  useEffect(() => {
    const el = node.current
    if (!el || reduced || played.current) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !played.current) {
            played.current = true
            play()
            io.disconnect()
          }
        }
      },
      { threshold: 0.55 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [play, reduced])

  const watch = useCallback((next: HTMLElement | null) => {
    node.current = next
  }, [])

  // reduced 是水合之後才問得到的，所以不能只靠初始值 —— 每一次算的時候都讓它說了算
  const shown = reduced ? beats : p
  return { p: shown, playing, frame: frameAt(shown, beats), play, pause, replay, seek, watch }
}
