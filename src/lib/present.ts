'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * 投影模式。字放大、圖放大、版面留白收掉一點 ——
 * 給教室後排看的，不是給一個人讀的。
 *
 * 跟主題一樣，真相放在 <html> 的 data-present 上，React 只是跟著它走。
 */

const KEY = 'odyssey-present'
const EVENT = 'odyssey:present'

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

function read(): boolean {
  return document.documentElement.getAttribute('data-present') === '1'
}

export function usePresent() {
  const present = useSyncExternalStore(subscribe, read, () => false)

  const toggle = useCallback(() => {
    const next = !read()
    if (next) document.documentElement.setAttribute('data-present', '1')
    else document.documentElement.removeAttribute('data-present')
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      // 記不住沒關係，這堂課切得起來就好
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { present, toggle }
}

/** 圖的尺寸是 JS 常數，所以投影模式要用一個倍率把它撐大 */
export const PRESENT_SCALE = 1.4
