import { encodeSession } from '../share'

/**
 * 課堂示範腳本。
 *
 * 每一段都是「在真實 repo 裡要鋪很久、在這裡三十秒」的場面。
 * 指令是照著打的順序寫的，結尾的連結由 encodeSession 現算 ——
 * 所以腳本改了，連結一定跟著對，不會有人手抄錯一個字。
 */

export interface Demo {
  id: string
  num: string
  title: string
  /** 這一段要讓學生「看到」什麼 */
  point: string
  /** 沙盒的開場 */
  preset: string
  steps: string[]
  /** 可以直接照念的一句話 */
  line: string
  /** 打完之後帶出來的討論 */
  after: string
}

export const DEMOS: Demo[] = [
  {
    id: 'three-boxes',
    num: '01',
    title: '讓他們看到暫存區真的存在',
    point:
      '很多人是在這一刻才第一次相信 staging area 不是抽象概念。一行一行打，指著右邊三格依序亮起來。',
    preset: 'blank',
    steps: [
      'git init',
      'write a.md 第一行',
      'git add .',
      'git commit -m "先記一筆"',
    ],
    line: 'commit 不是存檔。存檔是「我怕不見」，commit 是「我決定這一組改動是一件事」。',
    after:
      '問他們：如果 write 之後直接 commit 會怎樣？讓他們自己撞一次那個「暫存區是空的」錯誤訊息。',
  },
  {
    id: 'branch-is-not-a-copy',
    num: '02',
    title: '分支不是複製資料夾',
    point:
      '最後那行 cat 會讓檔案內容整個變回去。這個「啊」的聲音比任何比喻有用。',
    preset: 'blank',
    steps: [
      'git init',
      'write recipe.md 先炒蛋，再炒飯',
      'git add .',
      'git commit -m "現在的做法"',
      'git switch -c 試試看',
      'write recipe.md 飯先炒香，最後才拌蛋',
      'git add .',
      'git commit -m "換個順序"',
      'git switch main',
      'cat recipe.md',
    ],
    line: '分支只是一張貼在某個 commit 上的便利貼。開一條幾乎免費 —— 貴的從來不是開分支，是你不敢試。',
    after:
      '順著問：那如果我在 experiment 上做到一半，想先回 main 處理急事怎麼辦？帶到 stash 或直接 commit。',
  },
  {
    id: 'conflict-is-not-broken',
    num: '03',
    title: '衝突不是你弄壞了',
    point:
      '這個開場特意設計成你和 AI 改了同一行。cat 出來的標記上半是你的、下半是它的。',
    preset: 'conflict',
    steps: ['git merge agent/replan', 'cat plan.md'],
    line: 'git 不是壞掉，它是拒絕替你猜。它把兩個版本原封不動攤在你面前，然後等一個人來決定。',
    after:
      '接著讓學生自己解：write plan.md 你決定的版本 → git add → git commit。強調那個 commit 有兩個父親。',
  },
  {
    id: 'fetch-is-not-pull',
    num: '04',
    title: 'fetch 和 pull 的差別',
    point:
      '「推不上去」在真實課堂很難重現。這裡按一個紫色按鈕就有 —— 而且錯誤訊息會說清楚為什麼。',
    preset: 'history',
    steps: [
      'git push -u origin main',
      '@agent-push',
      'git status',
      'git fetch',
      'git push',
      'git pull',
    ],
    line: 'git 擋下你的 push，不是在刁難你，是在保護對方的 commit 不被你蓋掉。',
    after:
      '指著圖上那條虛線：fetch 之後 origin/main 動了，但你的 main 一動也沒動。這就是兩個指令的全部差別。',
  },
  {
    id: 'no-ff',
    num: '05',
    title: '為什麼要 --no-ff',
    point:
      '同一批 AI 改動，一邊直接長在 main 上、一邊在自己的分支。不用講解，兩張圖自己會說。',
    preset: 'agent',
    steps: [
      'git switch -c agent/refactor2',
      'become ai',
      'write cache.md 加了快取層',
      'git add .',
      'git commit -m "加上快取"',
      'become me',
      'git switch main',
      'git merge --no-ff agent/refactor2',
    ],
    line: '快轉之後，歷史看起來就像那些 commit 一直都在 main 上，「有人審過」這件事會消失。合流點就是你簽名的地方。',
    after:
      '搭配「人與 AI」那頁中段的對照元件，按兩下切換，一次看完兩種放法的後果。',
  },
]

export function demoStartHref(demo: Demo): string {
  return `/play?p=${demo.preset}`
}

export function demoResultHref(demo: Demo): string {
  return `/play?p=${demo.preset}&s=${encodeSession(demo.steps)}`
}
