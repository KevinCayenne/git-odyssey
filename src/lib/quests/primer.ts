/**
 * 給第一次碰 git 的人。
 *
 * 這裡的每一步都是真的餵進引擎跑的指令，不是寫在文件裡的示意 ——
 * 所以畫面上三格的變化，跟學生自己在沙盒裡打出來的一模一樣。
 * 測試會把整串跑一遍，確認沒有任何一步會噴錯。
 */

export type Focus = 'none' | 'work' | 'index' | 'history'

export interface Step {
  id: string
  /** 這一步在講什麼 */
  title: string
  /** 一句話解釋剛剛發生了什麼。寫給沒碰過的人看。 */
  body: string
  /** 真的送進引擎的指令。空字串代表這一步只是看，不動任何東西。 */
  command: string
  /** 這一步之後，哪一格是重點 */
  focus: Focus
  /** 老師可以直接念的一句 */
  say?: string
}

export const STEPS: Step[] = [
  {
    id: 'empty',
    title: '一個空資料夾',
    body: '什麼都還沒發生。這個資料夾現在跟你電腦裡其他資料夾沒有兩樣 —— 你在裡面改的東西，改掉就沒了。',
    command: '',
    focus: 'none',
    say: '先看清楚起點：這裡沒有任何「以前的版本」可以回去。',
  },
  {
    id: 'init',
    title: '開一本帳本',
    body: 'git init 在這個資料夾裡開了一本空白帳本。從這一刻起，這裡發生的改變都「可以」被記住 —— 但還不會自動記，要你開口。',
    command: 'git init',
    focus: 'none',
    say: '注意它什麼都沒記。它只是準備好了。',
  },
  {
    id: 'write',
    title: '動手改東西',
    body: '你寫了一個檔案。看右邊：第一格亮了。這一格叫「工作目錄」，就是你眼前正在動的東西 —— 跟你平常編輯檔案完全一樣，git 只是在旁邊看著。',
    command: 'write 筆記.md 今天想到的事',
    focus: 'work',
    say: '這時候如果電腦當機，這個檔案還在，但 git 一點紀錄都沒有。',
  },
  {
    id: 'add',
    title: '挑出這次要記的',
    body: 'git add 把檔案從第一格送到第二格。第二格叫「暫存區」，意思是「我打算把這些收成同一件事」。這一步是 git 最常被跳過、也最常被誤會的地方。',
    command: 'git add 筆記.md',
    focus: 'index',
    say: '為什麼要多這一格？因為你改了五個檔案，可能只有三個屬於同一件事。',
  },
  {
    id: 'commit',
    title: '寫進歷史',
    body: 'git commit 把第二格的東西收成一個點，放進第三格。左邊的圖上長出了第一個圓點 —— 那就是這個 repo 的第一段歷史，而且從此永遠找得回來。',
    command: 'git commit -m "開始記錄想法"',
    focus: 'history',
    say: 'commit 不是存檔。存檔是「我怕不見」，commit 是「我決定這一組改動是一件事」。',
  },
  {
    id: 'again',
    title: '再走一次',
    body: '同樣的三步：改東西、挑出來、寫進去。圖上多了第二個點，接在第一個後面。你之後做的每一件事，骨架都是這三步。',
    command: 'write 筆記.md 今天想到的事\\n還有明天要做的',
    focus: 'work',
    say: '看第一格又亮了 —— 因為檔案跟上次記下來的不一樣了。',
  },
  {
    id: 'add2',
    title: '再挑一次',
    body: '再一次 git add。第二格又有東西了。',
    command: 'git add .',
    focus: 'index',
    say: 'git add . 的那個點是「全部」的意思，省得一個一個打。',
  },
  {
    id: 'commit2',
    title: '第二段歷史',
    body: '兩個點連成一條線。這條線就是這個 repo 的歷史 —— 有先後、有內容、有你當時寫下的理由。',
    command: 'git commit -m "補上明天的待辦"',
    focus: 'history',
    say: '到這裡，你已經會 git 最核心的動作了。剩下的都是這個的變化。',
  },
]

/* ------------------------------------------------------------------ */

export interface Term {
  word: string
  reading: string
  short: string
  detail: string
}

/** 最少要記的幾個詞。多的以後再說，這幾個先夠用。 */
export const GLOSSARY: Term[] = [
  {
    word: 'repository',
    reading: '倉庫 / repo',
    short: '一個被 git 看著的資料夾',
    detail:
      '就是你的專案資料夾，只是裡面多了一個看不見的 .git —— 那本帳本。平常講「開一個 repo」，意思是「讓 git 開始看著這個資料夾」。',
  },
  {
    word: 'commit',
    reading: '提交',
    short: '一次「我決定把現在這個狀態留下來」',
    detail:
      '當名詞是歷史上的一個點，當動詞是留下它的動作。每個 commit 記著：改了什麼、誰改的、什麼時候、以及你寫的那句為什麼。',
  },
  {
    word: 'branch',
    reading: '分支',
    short: '一張貼在某個 commit 上的便利貼',
    detail:
      '它幾乎不佔空間，所以可以隨便開。開一條分支＝「我想從這裡試試看別的走法，但先不要影響原本那條」。',
  },
  {
    word: 'merge',
    reading: '合併',
    short: '把兩條分開走的線接回同一條',
    detail:
      '兩邊改的是不同地方，git 自己接得起來。兩邊改了同一個地方，它會停下來問你 —— 那叫衝突，不是錯誤。',
  },
  {
    word: 'remote',
    reading: '遠端',
    short: '放在別的地方的同一個 repo',
    detail:
      '通常在 GitHub 上，預設叫 origin。你把東西 push 上去，別人 pull 下來 —— 這就是「多個人共用一份程式碼」實際發生的方式。',
  },
  {
    word: 'HEAD',
    reading: '（不用翻）',
    short: '你現在站在哪裡',
    detail:
      'git 幾乎所有指令都是相對於 HEAD 在動的。搞不清楚狀況的時候，先問「我現在在哪條分支上、在哪個 commit 上」，通常就解開了。',
  },
]

/* ------------------------------------------------------------------ */

export interface CommandShape {
  part: string
  label: string
  note: string
}

/** 拆給沒打過指令的人看：一行指令是由哪幾塊組成的 */
export const COMMAND_ANATOMY: CommandShape[] = [
  { part: 'git', label: '程式名', note: '你要叫哪個程式做事' },
  { part: 'commit', label: '子指令', note: '要它做哪一件事' },
  { part: '-m', label: '選項', note: '前面有短橫線的都是選項，用來調整行為' },
  { part: '"開始記錄想法"', label: '值', note: '這個選項要帶的內容' },
]
