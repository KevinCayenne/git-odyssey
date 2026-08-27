'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * 過關紀錄。存在瀏覽器裡，沒有帳號、沒有伺服器。
 *
 * getSnapshot 必須每次回同一個參考，不然 React 會判定狀態一直在變 ——
 * 所以這裡自己做了一層快取，只有 localStorage 的字串真的變了才換新陣列。
 */

const KEY = 'odyssey-progress'
const EVENT = 'odyssey:progress'

const EMPTY: string[] = []

let cachedRaw: string | null | undefined
let cachedValue: string[] = EMPTY

function read(): string[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cachedValue
  cachedRaw = raw
  if (!raw) {
    cachedValue = EMPTY
    return cachedValue
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    cachedValue = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : EMPTY
  } catch {
    cachedValue = EMPTY
  }
  return cachedValue
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function write(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 存不下就算了，不值得為了進度條擋住使用者
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useProgress() {
  const done = useSyncExternalStore(subscribe, read, () => EMPTY)

  const mark = useCallback((slug: string) => {
    const current = read()
    if (current.includes(slug)) return
    write([...current, slug])
  }, [])

  const clear = useCallback(() => write([]), [])

  return { done, mark, clear }
}
