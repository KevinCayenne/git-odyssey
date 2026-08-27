'use client'

import { useSyncExternalStore } from 'react'

/**
 * 讀網址上的參數。
 *
 * 用 useSyncExternalStore 而不是 useSearchParams，是為了讓頁面維持預先產生的
 * 靜態 HTML —— 伺服器端一律回空字串，瀏覽器接手後才換成真的值。
 * 這正是 getServerSnapshot 存在的理由，不會有 hydration 不一致。
 */

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export function useQueryParam(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key) ?? '',
    () => '',
  )
}
