'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useSyncExternalStore } from 'react'

const NAV = [
  { href: '/', num: '00', label: '卷首' },
  { href: '/play', num: '01', label: '沙盒' },
  { href: '/quests', num: '02', label: '關卡' },
  { href: '/pair', num: '03', label: '人與 AI' },
  { href: '/lifeflow', num: '04', label: '生活流' },
  { href: '/teach', num: '05', label: '講師' },
]

type Theme = 'light' | 'dark'

/* 主題的真相在 <html> 的 data-theme 上，不在 React 裡 ——
   因為它在 React 醒來之前就已經被 layout 裡那段 script 設好了。 */

const THEME_EVENT = 'odyssey:theme'

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', onChange)
  return () => {
    window.removeEventListener(THEME_EVENT, onChange)
    mq.removeEventListener('change', onChange)
  }
}

function readTheme(): Theme {
  const set = document.documentElement.getAttribute('data-theme')
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme)

  const flip = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('odyssey-theme', next)
    } catch {
      // 無痕模式之類的，換得成就好，記不記得住是其次
    }
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  return (
    <button
      onClick={flip}
      className="label hover:text-ink transition-colors"
      aria-label="切換日／夜"
      suppressHydrationWarning
    >
      {theme === 'dark' ? '夜' : '日'}
    </button>
  )
}

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="rule-b sticky top-0 z-50 bg-paper/94 backdrop-blur-[2px]">
        <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
          <div className="flex items-baseline justify-between gap-6 py-3">
            <Link href="/" className="group shrink-0">
              <span className="font-display text-[1rem] font-semibold tracking-tight sm:text-[1.1875rem]">
                Git Odyssey
              </span>
              <span className="label ml-3 hidden sm:inline">分岔的時間</span>
            </Link>

            <nav className="scroll-thin flex items-baseline gap-3 overflow-x-auto md:gap-7">
              {NAV.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-baseline gap-1 whitespace-nowrap sm:gap-1.5"
                  >
                    <span
                      className={`num text-[0.625rem] ${active ? 'text-vermilion' : 'text-ink-3'}`}
                    >
                      {item.num}
                    </span>
                    <span
                      className={`text-[0.8125rem] transition-colors sm:text-[0.875rem] ${
                        active
                          ? 'text-ink border-b border-vermilion'
                          : 'text-ink-2 group-hover:text-ink'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="rule-t mt-16">
        <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10 py-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-[52ch]">
              <p className="label mb-3">版權頁</p>
              <p className="text-[0.875rem] leading-[1.9] text-ink-2">
                中文指定微軟正黑體。它是 Windows 內建的字，不能自架 ——
                沒有的平台會掉到思源黑體。拉丁字是 Fraunces，指令一律 JetBrains
                Mono。沒有一道陰影，版面靠線和留白站著。
              </p>
              <p className="text-[0.875rem] leading-[1.9] text-ink-2 mt-3">
                沙盒裡的 git 是真的在算：三方合併、共同祖先、rebase
                重播，全都跑同一套邏輯。所以它會在你以為不會出事的地方出事。
              </p>
            </div>
            <p className="num text-[0.6875rem] text-ink-3 md:text-right leading-[2]">
              git-odyssey
              <br />
              一個關於「歷史怎麼被寫下來」的練習場
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
