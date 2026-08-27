'use client'

import { useSyncExternalStore } from 'react'

/**
 * 有人把系統設定成「減少動態效果」。那不是偏好，通常是前庭失調或偏頭痛。
 *
 * 所以這裡不是把動畫變快，是整個跳過 —— 直接顯示終點狀態。
 * 流程圖的資訊全部畫得出來，動畫只是把順序講清楚而已，跳過不會少看到東西。
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
