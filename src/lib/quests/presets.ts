import { scenario } from './build'
import { gitflowDemo, pairDemo } from './demos'
import type { Repo, OutLine } from '../git/types'

/** 沙盒的五個開場。講師頁的示範連結靠 id 指到這裡。 */
export interface Preset {
  id: string
  label: string
  note: string
  build: () => Repo
  intro: OutLine[]
}

const conflictScene = (): Repo =>
  scenario([
    'git init',
    'write plan.md 這一版先做搜尋。',
    'git add .',
    'git commit -m "訂下這一版的範圍"',
    'git switch -c agent/replan',
    'become ai',
    'write plan.md 這一版先做匯出，搜尋放到下一版。',
    'git add .',
    'git commit -m "調整優先順序"',
    'become me',
    'git switch main',
    'write plan.md 這一版先做搜尋，匯出也要。',
    'git add .',
    'git commit -m "兩個都要"',
  ])

export const PRESETS: Preset[] = [
  {
    id: 'blank',
    label: '空白',
    note: '什麼都沒有，從 git init 開始',
    build: () => scenario([]),
    intro: [
      { kind: 'title', text: '一個空資料夾。' },
      { kind: 'hint', text: 'git init 開始，或按上面的按鈕換一個現成的場景進來。打 help 看指令清單。' },
    ],
  },
  {
    id: 'history',
    label: '已經有一段歷史',
    note: '三個 commit 和一條分支',
    build: () =>
      scenario([
        'git init',
        'write app.md 第一版',
        'git add .',
        'git commit -m "先讓它能跑"',
        'write app.md 第一版\\n加了設定檔',
        'write config.md port = 3000',
        'git add .',
        'git commit -m "拉出設定檔"',
        'git switch -c feature/search',
        'write search.md 搜尋',
        'git add .',
        'git commit -m "搜尋做一半"',
        'git switch main',
      ]),
    intro: [
      { kind: 'title', text: 'main 上有兩個 commit，feature/search 上還有一個。' },
      { kind: 'hint', text: '適合拿來玩 merge、rebase、reset、cherry-pick，看它們各自把圖弄成什麼樣子。' },
    ],
  },
  {
    id: 'agent',
    label: 'agent 開了一條線',
    note: '人和 AI 各做各的',
    build: pairDemo,
    intro: [
      { kind: 'title', text: '菱形是 agent 做的 commit，圓點是你的。' },
      { kind: 'hint', text: '試試 become ai 換成 agent 身分再 commit，看圖上多出什麼形狀。' },
    ],
  },
  {
    id: 'conflict',
    label: '撞在一起了',
    note: '兩邊都改了同一行',
    build: conflictScene,
    intro: [
      { kind: 'title', text: 'main 和 agent/replan 都改了 plan.md 的同一行。' },
      { kind: 'hint', text: 'git merge agent/replan 會卡住。那是這個場景的重點，不是意外。' },
    ],
  },
  {
    id: 'gitflow',
    label: 'gitflow 現場',
    note: '五條軌道都在',
    build: gitflowDemo,
    intro: [
      { kind: 'title', text: '完整的 gitflow：main / hotfix / release / develop / feature。' },
      { kind: 'hint', text: '左邊的軌道由上往下就是穩定度排序。試著再開一條 hotfix 補到 main 上。' },
    ],
  },
]
