import type { Metadata, Viewport } from 'next'
import { Fraunces, JetBrains_Mono, Noto_Serif_TC } from 'next/font/google'

import { SiteFrame } from '@/components/chrome/SiteFrame'

import './globals.css'

/* 三種字，都不是預設值：
   Fraunces 有 WONK 軸，字會歪，像鉛字。
   思源宋體撐中文 —— 螢幕上的明體讀起來像書，不像 dashboard。
   JetBrains Mono 只給指令和數字用。全站沒有任何一個無襯線字。 */

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
})

const serifTC = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-serif-tc',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-face',
})

export const metadata: Metadata = {
  title: {
    default: 'Git Odyssey — 分岔的時間',
    template: '%s — Git Odyssey',
  },
  description:
    '一個可以動手的 git 沙盒。看得見歷史怎麼分岔、怎麼合流，也看得見人跟 AI 各自在上面留下什麼。',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2eee3' },
    { media: '(prefers-color-scheme: dark)', color: '#131210' },
  ],
}

/** 在畫面畫出來之前先套好主題，避免閃一下白的。 */
const themeBoot = `(function(){try{var t=localStorage.getItem('odyssey-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-Hant"
      className={`${fraunces.variable} ${serifTC.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  )
}
