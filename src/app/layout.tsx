import type { Metadata, Viewport } from 'next'
import { Fraunces, JetBrains_Mono, Noto_Sans_TC } from 'next/font/google'

import { SiteFrame } from '@/components/chrome/SiteFrame'

import './globals.css'

/* 中文指定微軟正黑體。它是 Windows 內建的專有字型，不能自架，
   所以只能寫在字型堆疊最前面 —— 有裝的人看得到，沒裝的人往後掉。
   思源黑體就是那個接住其他平台的網路字型：同樣是黑體，字面感覺很近。

   拉丁字沿用 Fraunces，指令和數字沿用 JetBrains Mono。 */

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
})

const sansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans-tc',
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
const themeBoot = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('odyssey-theme');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t)}if(localStorage.getItem('odyssey-present')==='1'){d.setAttribute('data-present','1')}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-Hant"
      className={`${fraunces.variable} ${sansTC.variable} ${mono.variable}`}
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
