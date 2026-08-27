/**
 * 常用指令的流程圖。
 *
 * 骨子裡只有一句話：**每個 git 指令都是把東西從一個地方搬到另一個地方。**
 * 把地方畫出來、把搬運畫成會動的，大部分「這個指令到底做了什麼」的困惑就散了。
 *
 * 每一條 flow 都附一段真的餵進引擎的腳本，測試會跑過一遍，
 * 再把引擎實際改到的格子跟這裡宣告的 touches 對起來 ——
 * 所以畫面上的箭頭不可能跟引擎講的不一樣。
 */

import { run, simulateRemotePush } from '../git/commands'
import { emptyRepo } from '../git/repo'
import type { Repo, Tree } from '../git/types'

/** 東西可以待的地方。順序就是圖上由左到右的順序。 */
export type Place = 'work' | 'index' | 'local' | 'tracking' | 'remote' | 'stash'

export interface PlaceInfo {
  key: Place
  name: string
  sub: string
  note: string
}

/**
 * 由左到右排。這個順序本身就是一個記憶點：
 * 往右是把東西交出去，往左是把東西拿回來。
 */
export const PLACES: PlaceInfo[] = [
  {
    key: 'work',
    name: '工作目錄',
    sub: 'working tree',
    note: '你眼前正在動的檔案',
  },
  {
    key: 'index',
    name: '暫存區',
    sub: 'index / staging',
    note: '你打算收成同一個 commit 的',
  },
  {
    key: 'local',
    name: '本地歷史',
    sub: '.git',
    note: '已經記下來、找得回來的',
  },
  {
    key: 'tracking',
    name: 'origin/main',
    sub: 'remote-tracking',
    note: '你以為遠端長什麼樣',
  },
  {
    key: 'remote',
    name: '遠端',
    sub: 'origin',
    note: '遠端真正的樣子',
  },
  {
    key: 'stash',
    name: '口袋',
    sub: 'stash',
    note: '暫時放旁邊的半成品',
  },
]

export interface Move {
  from: Place
  to: Place
  /** 這一段在搬什麼 */
  carries: string
  /** 播到這一段的時候，下面那行字 */
  caption: string
  /** 會蓋掉東西的搬運，畫成警告色 */
  danger?: boolean
}

export interface Flow {
  slug: string
  /** 展示用的指令 */
  command: string
  /** 一句話：它在做什麼 */
  gloss: string
  /** 畫在圖上的箭頭 */
  moves: Move[]
  /** 這個指令真的會改到哪幾格。測試拿引擎跑過的結果來對。 */
  touches: Place[]
  /** 只是讀、不會改的格子 */
  reads: Place[]
  /** 什麼時候會用到它 */
  when: string
  /** 最常踩的那個坑 */
  gotcha: string
  /** 真的送進引擎的腳本 */
  demo: Demo
}

export interface Demo {
  setup: string[]
  /** 讓遠端先跑到前面去（模擬別人推了東西） */
  ahead?: { branch: string; message: string; changes: Tree }
  run: string
}

/* ------------------------------------------------------------------ */

const BASE = [
  'git init',
  'write plan.md 這一版要做的事：搜尋',
  'git add .',
  'git commit -m "訂下這一版的範圍"',
]

const PUSHED = [...BASE, 'git push -u origin main']

const TWO = [
  ...BASE,
  'write plan.md 這一版要做的事：搜尋\\n還有匯出',
  'git add .',
  'git commit -m "加上匯出"',
]

const STASHABLE = [
  ...BASE,
  'write plan.md 這一版要做的事：搜尋\\n寫到一半',
  'write notes.md 順手記下來的',
  'git add notes.md',
]

const BRANCHED = [
  ...BASE,
  'git switch -c feature/搜尋',
  'write search.md 搜尋做到一半',
  'git add .',
  'git commit -m "先做出搜尋框"',
  'git switch main',
]

/** 兩邊都往前走過。少了這個，merge 只會 fast-forward，演不出合流點。 */
const DIVERGED = [
  ...BRANCHED,
  'write readme.md 這個專案在做什麼',
  'git add .',
  'git commit -m "補上專案說明"',
]

/* ------------------------------------------------------------------ */

export const FLOWS: Flow[] = [
  /* --------------------------------------------- A 每天都會用到的 */
  {
    slug: 'init',
    command: 'git init',
    gloss: '在這個資料夾裡開一本空白帳本',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '.git',
        caption: '它什麼都沒搬。只是把場地準備好，從現在開始的改動「可以」被記住。',
      },
    ],
    touches: [],
    reads: [],
    when: '一個新專案的第一個指令。整個專案生命裡通常只打一次。',
    gotcha: '打完之後你的檔案一個都還沒被記住。init 只是開帳本，記帳要 add 加 commit。',
    demo: { setup: [], run: 'git init' },
  },
  {
    slug: 'status',
    command: 'git status',
    gloss: '把三格現在各有什麼攤開來給你看',
    moves: [],
    touches: [],
    reads: ['work', 'index', 'local'],
    when: '任何時候。卡住的時候先打它，比想半天有用。',
    gotcha: '沒有坑。這是唯一一個你可以無腦亂打的指令 —— 它不會改到任何東西。',
    demo: { setup: [...BASE, 'write plan.md 這一版要做的事：搜尋\\n順手改了一行'], run: 'git status' },
  },
  {
    slug: 'add',
    command: 'git add <檔案>',
    gloss: '挑出這次要記的東西',
    moves: [
      {
        from: 'work',
        to: 'index',
        carries: '改好的檔案',
        caption: '把改動從工作目錄挑進暫存區 —— 等於說「這幾個屬於同一件事」。',
      },
    ],
    touches: ['index'],
    reads: ['work'],
    when: 'commit 前的必經一步。改了五個檔案但只有三個是同一件事，就只 add 那三個。',
    gotcha: 'add 之後再改同一個檔案，改的那部分不會自動跟上 —— 暫存區記的是你 add 的那一刻。',
    demo: { setup: [...BASE, 'write notes.md 開會記到的東西'], run: 'git add .' },
  },
  {
    slug: 'commit',
    command: 'git commit -m "訊息"',
    gloss: '把暫存區收成歷史上的一個點',
    moves: [
      {
        from: 'index',
        to: 'local',
        carries: '一個 commit',
        caption: '暫存區裡的東西打包成一個點，接在你現在站的位置後面。',
      },
    ],
    touches: ['local'],
    reads: ['index'],
    when: '一件事做完、或做到一個「講得出來是什麼」的段落。',
    gotcha: '只有暫存區裡的東西會被收進去。改了但沒 add 的，commit 完還留在工作目錄。',
    demo: { setup: [...BASE, 'write notes.md 開會記到的東西', 'git add .'], run: 'git commit -m "補上會議記錄"' },
  },
  {
    slug: 'diff',
    command: 'git diff',
    gloss: '比對兩格之間差在哪幾行',
    moves: [],
    touches: [],
    reads: ['work', 'index'],
    when: 'add 之前先看一眼自己到底改了什麼。養成這個習慣，commit 訊息會好寫很多。',
    gotcha: '預設比的是「工作目錄 vs 暫存區」。已經 add 過的東西不會出現 —— 那要用 git diff --staged。',
    demo: { setup: [...BASE, 'write plan.md 這一版要做的事：搜尋\\n還有匯出'], run: 'git diff' },
  },
  {
    slug: 'log',
    command: 'git log',
    gloss: '把歷史從近到遠念一遍',
    moves: [],
    touches: [],
    reads: ['local'],
    when: '想知道這條線上發生過什麼、或找某個 commit 的編號。',
    gotcha: '它只念得到你現在站的這條線走得到的地方。別條分支上的東西不會出現。',
    demo: { setup: TWO, run: 'git log' },
  },

  /* --------------------------------------------- B 跟別人同步 */
  {
    slug: 'push',
    command: 'git push -u origin main',
    gloss: '把你本地的 commit 送上遠端',
    moves: [
      {
        from: 'local',
        to: 'remote',
        carries: '你的 commit',
        caption: '本地歷史上的新點複製一份到遠端。注意你這條線一步都沒動 —— 是遠端追上你，不是你動了。',
      },
      {
        from: 'remote',
        to: 'tracking',
        carries: 'origin/main 的新位置',
        caption: '推完之後，本地那張「origin/main 在哪」的便利貼也跟著更新。',
      },
    ],
    touches: ['tracking', 'remote'],
    reads: ['local'],
    when: '做完一段、想讓別人看得到的時候。也是備份 —— 沒 push 的東西只活在你這台電腦上。',
    gotcha: '別人先你一步推了東西，push 會被擋下來。那是保護，不是刁難：先 pull 把它接進來再推。',
    demo: { setup: BASE, run: 'git push -u origin main' },
  },
  {
    slug: 'fetch',
    command: 'git fetch',
    gloss: '把「別人做了什麼」抄回來，但先不動你',
    moves: [
      {
        from: 'remote',
        to: 'tracking',
        carries: '別人的 commit',
        caption: '遠端的新東西下載到本地，記在 origin/main 這張便利貼上。',
      },
    ],
    touches: ['tracking'],
    reads: ['remote'],
    when: '想先知道別人做了什麼、但還不想被影響的時候。最安全的同步方式。',
    gotcha: 'fetch 完你的分支一動也沒動 —— 這是特色不是 bug。要接進來還要再 merge 或 rebase。',
    demo: {
      setup: PUSHED,
      ahead: { branch: 'main', message: '同事補了匯出的規格', changes: { 'export.md': '匯出格式先支援 CSV' } },
      run: 'git fetch',
    },
  },
  {
    slug: 'pull',
    command: 'git pull',
    gloss: 'fetch 加 merge，一次做完',
    moves: [
      {
        from: 'remote',
        to: 'tracking',
        carries: '別人的 commit',
        caption: '第一段跟 fetch 一模一樣：先把遠端的東西抄回來。',
      },
      {
        from: 'tracking',
        to: 'local',
        carries: '一個合流點',
        caption: '第二段是 merge：把抄回來的接上你這條線。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '合併後的檔案',
        caption: '合併的結果寫回工作目錄 —— 你眼前的檔案這時候才真的變了。',
      },
    ],
    touches: ['work', 'index', 'local', 'tracking'],
    reads: ['remote'],
    when: '每天開工第一件事。開始改之前先把別人的東西接進來，衝突會小很多。',
    gotcha: '手邊還有沒 commit 的改動時 pull，很容易撞在一起。先 commit 或先 stash 再 pull。',
    demo: {
      setup: [
        ...PUSHED,
        'write notes.md 我這邊也做了一點',
        'git add .',
        'git commit -m "補上我這邊的筆記"',
      ],
      ahead: { branch: 'main', message: '同事補了匯出的規格', changes: { 'export.md': '匯出格式先支援 CSV' } },
      run: 'git pull',
    },
  },
  {
    slug: 'pull-rebase',
    command: 'git pull --rebase',
    gloss: '一樣是接進來，但不留合流點',
    moves: [
      {
        from: 'remote',
        to: 'tracking',
        carries: '別人的 commit',
        caption: '一樣先抄回來，跟 fetch 那一段沒有分別。差別全在下一段。',
      },
      {
        from: 'tracking',
        to: 'local',
        carries: '你的 commit 被重抄一次',
        caption: '不是接一個新點，是把你自己的 commit 拆下來、重新接到別人的後面。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '重播後的檔案',
        caption: '結果寫回工作目錄。歷史變成一條直線，看起來像你本來就接在後面做的。',
      },
    ],
    touches: ['work', 'index', 'local', 'tracking'],
    reads: ['remote'],
    when: '想要一條乾淨直線的歷史時。很多團隊把它設成 pull 的預設。',
    gotcha: '它會改寫你本地那幾個 commit 的編號。已經 push 出去的東西不要這樣搞。',
    demo: {
      setup: [
        ...PUSHED,
        'write notes.md 我這邊也做了一點',
        'git add .',
        'git commit -m "補上我這邊的筆記"',
      ],
      ahead: { branch: 'main', message: '同事補了匯出的規格', changes: { 'export.md': '匯出格式先支援 CSV' } },
      run: 'git pull --rebase',
    },
  },

  /* --------------------------------------------- C 分頭做事 */
  {
    slug: 'branch',
    command: 'git branch <名字>',
    gloss: '在現在的位置貼一張新的便利貼',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '一個新名字',
        caption: '沒有複製任何檔案 —— 只是在你站的那個 commit 上多貼一張標籤。所以它幾乎不花時間。',
      },
    ],
    touches: ['local'],
    reads: [],
    when: '要開始試一條新路線的時候。開分支很便宜，不要捨不得開。',
    gotcha: 'branch 只是開，不會把你帶過去。要站上去得再 git switch。',
    demo: { setup: BASE, run: 'git branch feature/搜尋' },
  },
  {
    slug: 'switch',
    command: 'git switch <分支>',
    gloss: '換一條線站，順便把三格換成那條線的樣子',
    moves: [
      {
        from: 'local',
        to: 'index',
        carries: '那條線的檔案',
        caption: 'HEAD 指到另一條分支，那個 commit 的內容鋪進暫存區。',
      },
      {
        from: 'index',
        to: 'work',
        carries: '那條線的檔案',
        caption: '再鋪進工作目錄 —— 你眼前的檔案整組換掉了。',
      },
    ],
    touches: ['index', 'local', 'work'],
    reads: [],
    when: '要換去做另一件事的時候。git switch -c <名字> 可以一步開、一步站上去。',
    gotcha: '手邊有沒 commit 的改動時它可能不讓你走，或是把改動帶著跑。先 commit 或 stash 比較乾淨。',
    demo: { setup: BRANCHED, run: 'git switch feature/搜尋' },
  },
  {
    slug: 'checkout',
    command: 'git checkout <分支>',
    gloss: 'switch 的舊名字。同一件事，只是這個名字還兼差',
    moves: [
      {
        from: 'local',
        to: 'index',
        carries: '那條線的檔案',
        caption: '換分支的時候，它做的事跟 git switch 一模一樣 —— 一步都不差。',
      },
      {
        from: 'index',
        to: 'work',
        carries: '那條線的檔案',
        caption: '差別不在做什麼，在這個名字底下還藏著另一件完全不同的事。',
      },
    ],
    touches: ['index', 'local', 'work'],
    reads: [],
    when: '你會在網路上、在同事的終端機裡、在三年前的教學文章裡看到它。認得就好。',
    gotcha: 'git checkout <分支> 是換線，git checkout -- <檔案> 是丟掉改動 —— 兩件完全不同的事共用一個名字。少打那兩個橫線，換來的可能是刪掉一整天的工作。',
    demo: { setup: BRANCHED, run: 'git checkout feature/搜尋' },
  },
  {
    slug: 'merge',
    command: 'git merge <分支>',
    gloss: '把另一條線接回你現在這條',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '一個合流點',
        caption: '兩條線的內容做三方合併，結果收成一個有兩個父親的新 commit。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '合併後的檔案',
        caption: '合併結果寫回工作目錄和暫存區。',
      },
    ],
    touches: ['work', 'index', 'local'],
    reads: [],
    when: '一條 feature 做完、要收回 develop 或 main 的時候。',
    gotcha: '兩邊改到同一行就會停下來問你。那叫衝突，不是錯誤 —— 它只是不敢替你決定。',
    demo: { setup: DIVERGED, run: 'git merge feature/搜尋' },
  },
  {
    slug: 'rebase',
    command: 'git rebase <分支>',
    gloss: '把你的 commit 拆下來，重新接到別人後面',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '重抄一次的 commit',
        caption: '不是接一個點，是一顆一顆重播。編號會全部換掉 —— 它們是新的 commit。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '重播後的檔案',
        caption: '重播完的結果鋪回工作目錄。',
      },
    ],
    touches: ['work', 'index', 'local'],
    reads: [],
    when: '想讓歷史是一條直線、好讀好 review 的時候。',
    gotcha: '它改寫歷史。只在還沒推出去的分支上做 —— 別人已經拉走的東西被你重寫，那邊會炸。',
    demo: {
      setup: [
        ...BASE,
        'git switch -c feature/搜尋',
        'write search.md 搜尋做到一半',
        'git add .',
        'git commit -m "先做出搜尋框"',
        'git switch main',
        'write plan.md 這一版要做的事：搜尋\\n匯出也要',
        'git add .',
        'git commit -m "main 這邊也往前走了"',
        'git switch feature/搜尋',
      ],
      run: 'git rebase main',
    },
  },
  {
    slug: 'tag',
    command: 'git tag <名字>',
    gloss: '在某個 commit 上釘一個永久的名字',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: 'v1.0',
        caption: '跟 branch 一樣是一張標籤，差別在它釘死不動 —— 分支會跟著你往前走，tag 不會。',
      },
    ],
    touches: ['local'],
    reads: [],
    when: '出版本的時候。之後要回頭找「當時上線的是哪一版」就靠它。',
    gotcha: 'tag 預設不會跟著 git push 上去，要另外推。',
    demo: { setup: TWO, run: 'git tag v1.0' },
  },

  /* --------------------------------------------- D 出事了要回頭 */
  {
    slug: 'restore',
    command: 'git restore <檔案>',
    gloss: '把手邊改壞的那個檔案丟掉，換回暫存區那版',
    moves: [
      {
        from: 'index',
        to: 'work',
        carries: '乾淨的那版',
        caption: '暫存區的內容蓋回工作目錄。你剛剛改的那些就這樣沒了。',
        danger: true,
      },
    ],
    touches: ['work'],
    reads: ['index'],
    when: '改壞了、想從頭來過的時候。只影響你指名的那個檔案。',
    gotcha: '被蓋掉的改動沒有任何地方留著 —— 它從來沒被 git 記過。這個指令沒有後悔藥。舊寫法 git checkout -- <檔案> 做的是同一件事。',
    demo: { setup: [...BASE, 'write plan.md 手滑刪掉了一半'], run: 'git restore plan.md' },
  },
  {
    slug: 'reset-hard',
    command: 'git reset --hard HEAD~1',
    gloss: '把 HEAD 往回搬，三格一起蓋掉',
    moves: [
      {
        from: 'local',
        to: 'index',
        carries: '舊那版的檔案',
        caption: 'HEAD 退回上一個 commit，那個時候的內容鋪回暫存區。',
        danger: true,
      },
      {
        from: 'index',
        to: 'work',
        carries: '舊那版的檔案',
        caption: '也鋪回工作目錄。沒 commit 過的東西真的不見了。',
        danger: true,
      },
    ],
    touches: ['work', 'index', 'local'],
    reads: [],
    when: '最近一個 commit 根本不該存在的時候。--soft 只退 HEAD、--mixed 連暫存區、--hard 三格全退。',
    gotcha: '沒 commit 過的沒救。但 commit 過的還在 —— git reflog 找得到剛剛那個編號，救得回來。',
    demo: { setup: TWO, run: 'git reset --hard HEAD~1' },
  },
  {
    slug: 'stash',
    command: 'git stash',
    gloss: '把做到一半的收進口袋，桌面立刻乾淨',
    moves: [
      {
        from: 'work',
        to: 'stash',
        carries: '半成品',
        caption: '工作目錄和暫存區的改動整組收進口袋，三格回到上一個 commit 的樣子。',
      },
    ],
    touches: ['work', 'index', 'stash'],
    reads: [],
    when: '做到一半有急事插隊。收起來、去處理、回來再 git stash pop 拿出來。',
    gotcha: '口袋是堆疊的，收好幾次會疊起來。放太久會忘記裡面有什麼 —— git stash list 看一下。',
    demo: { setup: STASHABLE, run: 'git stash' },
  },
  {
    slug: 'stash-pop',
    command: 'git stash pop',
    gloss: '把口袋裡的拿回桌面',
    moves: [
      {
        from: 'stash',
        to: 'work',
        carries: '剛剛那個半成品',
        caption: '收起來的改動放回工作目錄和暫存區，同時從口袋裡拿掉。',
      },
    ],
    touches: ['work', 'index', 'stash'],
    reads: [],
    when: '急事處理完、要接回原本做到一半的東西。',
    gotcha: 'pop 是拿出來就不留，apply 是拿出來還留一份。不確定的時候用 apply 比較保險。',
    demo: {
      setup: [...STASHABLE, 'git stash'],
      run: 'git stash pop',
    },
  },
  {
    slug: 'revert',
    command: 'git revert <commit>',
    gloss: '做一個「把那次改動反過來」的新 commit',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '一個反向的 commit',
        caption: '不刪掉任何東西，而是往前多做一個把它抵銷掉的點。歷史上兩個都看得到。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '抵銷後的檔案',
        caption: '結果鋪回工作目錄。',
      },
    ],
    touches: ['work', 'index', 'local'],
    reads: [],
    when: '要撤銷一個「已經 push 出去」的 commit。這是唯一安全的做法。',
    gotcha: '別人已經拿走的歷史不能用 reset 砍。revert 之所以難看又囉唆，正是因為它不改寫歷史。',
    demo: { setup: TWO, run: 'git revert HEAD' },
  },
  {
    slug: 'cherry-pick',
    command: 'git cherry-pick <commit>',
    gloss: '只把某一顆 commit 抄過來',
    moves: [
      {
        from: 'local',
        to: 'local',
        carries: '抄過來的那顆',
        caption: '從別條線上挑一個 commit，把它的改動重做一次接在你這條線後面。編號會是新的。',
      },
      {
        from: 'local',
        to: 'work',
        carries: '抄過來的檔案',
        caption: '結果鋪回工作目錄。',
      },
    ],
    touches: ['work', 'index', 'local'],
    reads: [],
    when: 'hotfix 補在 main 上、也要補一份到 develop 的時候。或是想從別的分支只拿一個修正。',
    gotcha: '同一個改動會在歷史上出現兩次（編號不同）。之後 merge 那條線的時候可能會撞。',
    demo: { setup: BRANCHED, run: 'git cherry-pick feature/搜尋' },
  },
]

/* ------------------------------------------------------------------ */

export interface Section {
  num: string
  title: string
  lead: string
  slugs: string[]
}

export const SECTIONS: Section[] = [
  {
    num: 'A',
    title: '每天都會用到的',
    lead: '這六個佔掉日常九成以上。前兩個不會改到任何東西，可以放心亂打。',
    slugs: ['init', 'status', 'add', 'commit', 'diff', 'log'],
  },
  {
    num: 'B',
    title: '跟別人同步',
    lead: '注意「遠端」跟「origin/main」是兩個不同的格子。分不清楚它們，就永遠搞不懂 fetch 跟 pull 差在哪。',
    slugs: ['push', 'fetch', 'pull', 'pull-rebase'],
  },
  {
    num: 'C',
    title: '分頭做事',
    lead: '分支便宜到不像話 —— 因為它只是一張便利貼，不是一份複製品。',
    slugs: ['branch', 'switch', 'checkout', 'merge', 'rebase', 'tag'],
  },
  {
    num: 'D',
    title: '出事了要回頭',
    lead: '先問一句：那個東西 commit 過嗎？commit 過的幾乎都救得回來，沒 commit 過的常常真的沒了。',
    slugs: ['restore', 'reset-hard', 'stash', 'stash-pop', 'revert', 'cherry-pick'],
  },
]

/* ------------------------------------------------------------------ */

/**
 * checkout 拆成兩半的那件事。
 *
 * git 2.23（2019）把 checkout 一個人幹的兩件事拆成 switch 和 restore。
 * 舊的沒有被廢掉，也不會被廢掉 —— 全世界的教學文章和肌肉記憶都還在用它。
 * 所以這裡兩邊都列：新的拿來寫，舊的拿來讀得懂別人在幹嘛。
 */
export interface OldNew {
  intent: string
  old: string
  now: string
  note: string
}

export const OLD_NEW: OldNew[] = [
  {
    intent: '換到另一條分支',
    old: 'git checkout <分支>',
    now: 'git switch <分支>',
    note: '完全一樣的動作。',
  },
  {
    intent: '開一條新分支並站上去',
    old: 'git checkout -b <分支>',
    now: 'git switch -c <分支>',
    note: '-b 變成 -c（create）。',
  },
  {
    intent: '丟掉手邊改壞的檔案',
    old: 'git checkout -- <檔案>',
    now: 'git restore <檔案>',
    note: '就是這個用法讓 checkout 變得危險 —— 少打那兩個橫線就變成換分支。',
  },
  {
    intent: '把檔案退出暫存區',
    old: 'git reset HEAD <檔案>',
    now: 'git restore --staged <檔案>',
    note: '新寫法看得出來只動暫存區，不會讓人以為 HEAD 要跑掉。',
  },
]

/** 「我想…」→ 用哪個。卡住的時候從這裡找路。 */
export interface Route {
  want: string
  answer: string
  because: string
}

export const ROUTES: Route[] = [
  {
    want: '我改壞了，想回到剛剛存的那版',
    answer: 'git restore <檔案>',
    because: '只丟掉工作目錄的改動，歷史一點都不會動。',
  },
  {
    want: '我 add 錯了，想把它退出暫存區',
    answer: 'git restore --staged <檔案>',
    because: '檔案本身不動，只是從暫存區拿下來。',
  },
  {
    want: '上一個 commit 訊息打錯了',
    answer: 'git commit --amend',
    because: '會換掉那顆 commit 的編號。還沒 push 出去才這樣做。',
  },
  {
    want: '上一個 commit 根本不該存在，而且還沒推出去',
    answer: 'git reset --hard HEAD~1',
    because: '整顆丟掉。真的丟掉之後還能用 git reflog 撈回來。',
  },
  {
    want: '要撤銷的那個 commit 已經推出去了',
    answer: 'git revert <commit>',
    because: '不能改寫別人已經拿走的歷史，只能往前做一個抵銷掉它的點。',
  },
  {
    want: '做到一半有急事，但不想留一個半成品的 commit',
    answer: 'git stash',
    because: '收進口袋，桌面立刻乾淨。回來 git stash pop。',
  },
  {
    want: '推不上去，說遠端有我沒有的東西',
    answer: 'git pull（再 push）',
    because: '有人先你一步推了。接進來、處理掉衝突，再推。',
  },
  {
    want: '想知道別人做了什麼，但先不要影響我',
    answer: 'git fetch',
    because: '只更新 origin/*，你的分支一動也不動。',
  },
  {
    want: '完全不知道現在是什麼狀況',
    answer: 'git status',
    because: '三格各有什麼、站在哪條線上、下一步能做什麼，它都會講。',
  },
]

/* ------------------------------------------------------------------ */
/* 給元件和測試共用：真的把腳本跑出來                                    */
/* ------------------------------------------------------------------ */

export class FlowScriptError extends Error {}

function step(repo: Repo, line: string, where: string): Repo {
  const result = run(repo, line)
  const bad = result.lines.find((l) => l.kind === 'err')
  if (bad) throw new FlowScriptError(`${where}「${line}」出錯：${bad.text}`)
  return result.repo
}

/** 跑完 setup（含遠端先跑到前面），回傳指令打下去之前的狀態 */
export function buildBefore(flow: Flow): Repo {
  let repo = emptyRepo()
  for (const line of flow.demo.setup) {
    repo = step(repo, line, `${flow.slug} 的場景`)
  }
  if (flow.demo.ahead) {
    const { branch, message, changes } = flow.demo.ahead
    repo = simulateRemotePush(repo, branch, message, changes, 'human')
  }
  return repo
}

/** 指令打下去之後的狀態。刻意不吞錯 —— 示範腳本不該有錯。 */
export function runFlow(flow: Flow): { before: Repo; after: Repo } {
  const before = buildBefore(flow)
  const after = step(before, flow.demo.run, `${flow.slug} 的指令`)
  return { before, after }
}

function sameTree(a: Tree, b: Tree): boolean {
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  if (ka.length !== kb.length) return false
  return ka.every((k, i) => k === kb[i] && a[k] === b[k])
}

function sameRefs(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  if (ka.length !== kb.length) return false
  return ka.every((k, i) => k === kb[i] && a[k] === b[k])
}

function localFingerprint(r: Repo): string {
  return JSON.stringify([
    Object.keys(r.commits).sort(),
    sortedEntries(r.branches),
    sortedEntries(r.tags),
    r.head,
  ])
}

function sortedEntries(m: Record<string, string>): [string, string][] {
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
}

/**
 * 引擎實際上改到了哪幾格。
 *
 * 這是整個流程圖能不能相信的關鍵：圖上畫的箭頭要跟這個對得起來，
 * 對不起來就是圖在說謊，測試會擋下來。
 */
export function observePlaces(before: Repo, after: Repo): Place[] {
  const out: Place[] = []
  if (!sameTree(before.work, after.work)) out.push('work')
  if (!sameTree(before.index, after.index)) out.push('index')
  if (localFingerprint(before) !== localFingerprint(after)) out.push('local')
  if (!sameRefs(before.tracking, after.tracking)) out.push('tracking')
  if (!sameRefs(before.remote, after.remote)) out.push('remote')
  if (JSON.stringify(before.stash) !== JSON.stringify(after.stash)) out.push('stash')
  return out
}

export function flowBySlug(slug: string): Flow | undefined {
  return FLOWS.find((f) => f.slug === slug)
}
