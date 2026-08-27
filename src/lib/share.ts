/**
 * 把一段沙盒操作編進網址。
 *
 * 存的不是 repo 的快照，是「你打過哪些指令」。引擎本來就是可重播的，
 * 所以重放一次就會得到一模一樣的狀態 —— 而且連終端機的逐行輸出都會長回來，
 * 學生點開連結看到的是整段過程，不是一個結果。
 *
 * 以 `@` 開頭的那幾行不是指令，是沙盒事件（例如「agent 推了東西到 origin」），
 * 重播的時候要照樣觸發，不然遠端的狀態會對不上。
 */

export const EVENT_PREFIX = '@'

/** 網址太長瀏覽器和聊天軟體都會出事，超過就別做連結了 */
export const MAX_CODE_LENGTH = 6000

export function encodeSession(steps: string[]): string {
  if (!steps.length) return ''
  const bytes = new TextEncoder().encode(steps.join('\n'))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSession(code: string): string[] {
  if (!code) return []
  try {
    const padded = code.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const text = new TextDecoder().decode(bytes)
    return text ? text.split('\n') : []
  } catch {
    // 壞掉的連結不該讓整頁掛掉，就當作沒有帶參數
    return []
  }
}

export function isEventStep(step: string): boolean {
  return step.startsWith(EVENT_PREFIX)
}

export function eventIdOf(step: string): string {
  return step.slice(EVENT_PREFIX.length)
}
