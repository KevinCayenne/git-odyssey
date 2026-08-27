import { simulateRemotePush } from '../git/commands'
import {
  getCommit,
  hasConflictMarkers,
  headOid,
  isAncestor,
  isClean,
} from '../git/repo'
import type { Repo } from '../git/types'

import { scenario } from './build'
import type { Quest } from './types'

/* ------------------------------------------------------------------ */
/* 檢查用的小工具                                                       */
/* ------------------------------------------------------------------ */

const head = (repo: Repo) => getCommit(repo, headOid(repo))

const commitCount = (repo: Repo) => Object.keys(repo.commits).length

const branchHas = (repo: Repo, branch: string, oid: string | undefined) => {
  const tip = repo.branches[branch]
  return Boolean(tip && oid && isAncestor(repo, oid, tip))
}

const mergedInto = (repo: Repo, source: string, target: string) => {
  const s = repo.branches[source]
  const t = repo.branches[target]
  return Boolean(s && t && isAncestor(repo, s, t))
}

const branchesMatching = (repo: Repo, prefix: string) =>
  Object.keys(repo.branches).filter((b) => b.startsWith(prefix))

/**
 * 「開過這種分支嗎」—— 就算後來砍掉了也算。
 * reflog 是唯一還記得這件事的地方，這也正好是這個關卡想教的。
 */
const everOpened = (repo: Repo, prefix: string) =>
  branchesMatching(repo, prefix).length > 0 ||
  repo.reflog.some((e) => e.action.includes('建立') && e.action.includes(prefix))

/** 從某個點往回找，路上有沒有合流點（兩個以上父親的 commit） */
const hasMergeCommit = (repo: Repo, tip: string | undefined) => {
  if (!tip) return false
  const seen = new Set<string>()
  const stack = [tip]
  while (stack.length) {
    const cur = stack.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const c = repo.commits[cur]
    if (!c) continue
    if (c.parents.length > 1) return true
    stack.push(...c.parents)
  }
  return false
}

/** 從某個點往回找，有沒有符合條件的 commit */
const historyHas = (
  repo: Repo,
  tip: string | undefined,
  match: (c: { message: string; tree: Record<string, string> }) => boolean,
) => {
  if (!tip) return false
  const seen = new Set<string>()
  const stack = [tip]
  while (stack.length) {
    const cur = stack.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const c = repo.commits[cur]
    if (!c) continue
    if (match(c)) return true
    stack.push(...c.parents)
  }
  return false
}

/* ================================================================== */
/* 關卡                                                                */
/* ================================================================== */

export const QUESTS: Quest[] = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'first-commit',
    num: '01',
    title: '把一件事記下來',
    kicker: 'init · add · commit',
    tags: ['基礎'],
    scene: [
      '你打開一個空資料夾，想開始寫點東西。這一刻之前，這裡發生的任何改變都不會被記得 —— 你存檔、覆蓋、再存檔，舊的就消失了。',
      'git init 之後不一樣。從那之後，只要你開口說一次「這個狀態我要留著」，它就會被留著，而且永遠找得回來。',
      '但 git 不會自動幫你留。它有意設計成要你動手挑：哪些改動是同一件事？這個挑選的動作叫 git add，而按下 git commit 的那一刻，你不是在存檔，你是在下一個判斷。',
    ],
    setup: () => scenario([]),
    intro: [
      { kind: 'title', text: '一個空資料夾。什麼都還沒發生。' },
      { kind: 'hint', text: '先 git init，然後 write 一個檔案，把它 add 進暫存區，再 commit。右邊那三格會即時跟著動 —— 看著它動比背指令有用。' },
    ],
    quickCommands: ['git init', 'git status', 'git add .', 'ls'],
    objectives: [
      {
        id: 'init',
        label: '開一本帳本',
        check: (r) => r.initialized,
      },
      {
        id: 'file',
        label: '寫下一個檔案',
        check: (r) => Object.keys(r.work).length > 0,
      },
      {
        id: 'commit',
        label: '把它寫進歷史',
        check: (r) => commitCount(r) >= 1,
      },
      {
        id: 'message',
        label: 'commit 訊息不要只是「update」',
        check: (r) => {
          const c = head(r)
          if (!c) return false
          const m = c.message.trim()
          return m.length >= 4 && !/^(update|fix|wip|test|.)$/i.test(m)
        },
      },
    ],
    hints: [
      'git init 之後，先 write notes.md 今天想到的事',
      'git status 會告訴你 git 現在看到什麼、下一步可以做什麼。卡住的時候先打它。',
      'git add notes.md 再 git commit -m "開始記錄想法"',
    ],
    solution: [
      'git init',
      'write notes.md 今天想到的事',
      'git add .',
      'git commit -m "開始記錄想法"',
    ],
    closing: [
      '你剛剛做的四個動作，是之後每一件事的骨架：改東西、挑出這次要記的、寫下為什麼、留下來。',
      'commit 訊息值得多花十秒。三個月後回來翻歷史的人是你，而 diff 只會告訴你「改了什麼」，只有訊息說得出「為什麼」。這也是 AI 目前最幫不上忙的一格 —— 它看得到 diff，看不到你當時在想什麼。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'branch',
    num: '02',
    title: '想試試看，但還不想決定',
    kicker: 'branch · switch',
    tags: ['基礎'],
    scene: [
      '有個念頭：也許整個結構應該換一種寫法。可能會更好，也可能兩小時後你發現是災難。',
      '沒有 git 的時候，這種念頭很貴 —— 你得先備份一份、改壞了再手動改回來，於是大部分人乾脆不試。',
      '分支讓「試試看」變成幾乎免費的動作。它只是一張貼在某個 commit 上的便利貼，開一條的成本接近零。真正的成本從來不是開分支，是你不敢試。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write recipe.md 蛋炒飯：先炒蛋，盛起來，炒飯，再倒回去',
        'git add .',
        'git commit -m "記下現在的做法"',
      ]),
    intro: [
      { kind: 'title', text: 'main 上有一份現在可以用的做法。' },
      { kind: 'hint', text: '你想試一個不一樣的版本，但不想弄壞現在這份。開一條分支，在上面改，然後切回來看看 main 有沒有被動到。' },
    ],
    quickCommands: [
      'git switch -c experiment',
      'git switch main',
      'cat recipe.md',
      'git log --oneline --all',
    ],
    objectives: [
      {
        id: 'branch',
        label: '開一條新分支',
        check: (r) => Object.keys(r.branches).length >= 2,
      },
      {
        id: 'work',
        label: '在新分支上留下 commit',
        check: (r) => commitCount(r) >= 2 && Object.keys(r.branches).length >= 2,
      },
      {
        id: 'back',
        label: '切回 main，確認它完全沒被動到',
        check: (r) =>
          commitCount(r) >= 2 &&
          r.head.type === 'branch' &&
          r.head.name === 'main' &&
          r.work['recipe.md'] === '蛋炒飯：先炒蛋，盛起來，炒飯，再倒回去',
      },
    ],
    hints: [
      'git switch -c experiment 一次做完「開分支」和「站上去」',
      '在 experiment 上 write recipe.md 換一個做法，然後 add + commit',
      'git switch main，再 cat recipe.md —— 你會看到它一個字都沒變',
    ],
    solution: [
      'git switch -c experiment',
      'write recipe.md 蛋炒飯：飯先炒香，最後才拌進蛋',
      'git add .',
      'git commit -m "試看看反過來的順序"',
      'git switch main',
    ],
    closing: [
      '切回 main 的時候，整個工作目錄被換掉了。這是很多人第一次真的「感覺到」分支存在：不是抽象的圖，是你眼前的檔案內容真的變了。',
      '在跟 AI 一起工作的時候，這件事會變得更重要。你讓 agent 去改一整個模組，最安全的做法不是叫它小心一點，是給它一條自己的分支 —— 它改壞了，你切回來，什麼都沒發生過。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'conflict',
    num: '03',
    title: '你們同時改了同一句話',
    kicker: 'merge · conflict',
    tags: ['人與 AI'],
    scene: [
      '你請 agent 幫忙把說明文件的開頭重寫得更清楚一點。它做了。與此同時，你自己也順手改了同一段。',
      '兩邊都改了同一行，而且改得不一樣。git 停下來，說它不知道該留哪一個。',
      '很多人第一次遇到衝突會慌，覺得自己把東西弄壞了。沒有。git 在做的事情剛好相反 —— 它拒絕替你猜。它把兩個版本原封不動攤在你面前，然後等你決定。這是整個工具裡最誠實的一段。',
      'AI 進入工作流之後，這種場面只會更多，不會更少：它改得比你快，改動範圍也比你大。所以「怎麼解衝突」正在從偶爾的意外，變成每天的基本功。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write README.md 這是一個工具。\\n它可以做很多事。',
        'git add .',
        'git commit -m "先寫個 README"',
        'git switch -c agent/rewrite-intro',
        'become ai',
        'write README.md 這是一個把重複的事情自動化的小工具。\\n它可以做很多事。',
        'git add .',
        'git commit -m "改寫開頭，講清楚它到底是什麼"',
        'become me',
        'git switch main',
        'write README.md 這是我週末寫來自己用的東西。\\n它可以做很多事。',
        'git add .',
        'git commit -m "開頭改成第一人稱"',
      ]),
    intro: [
      { kind: 'title', text: '兩條線都動了 README.md 的第一行。' },
      { kind: 'out', text: 'main：你改成第一人稱。' },
      { kind: 'out', text: 'agent/rewrite-intro：AI 改成功能導向的說法。' },
      { kind: 'hint', text: 'git merge agent/rewrite-intro 試試看。它會卡住 —— 那正是這一關要你看的東西。' },
    ],
    quickCommands: [
      'git merge agent/rewrite-intro',
      'cat README.md',
      'git status',
      'git add README.md',
    ],
    objectives: [
      {
        id: 'merged',
        label: '讓兩條線合流',
        check: (r) =>
          mergedInto(r, 'agent/rewrite-intro', 'main') &&
          hasMergeCommit(r, r.branches['main']),
      },
      {
        id: 'resolved',
        label: '檔案裡沒有留下衝突標記',
        check: (r) => {
          const content = r.work['README.md']
          return (
            hasMergeCommit(r, r.branches['main']) &&
            content !== undefined &&
            !hasConflictMarkers(content)
          )
        },
      },
      {
        id: 'clean',
        label: '收乾淨，沒有半途而廢的狀態',
        check: (r) =>
          hasMergeCommit(r, r.branches['main']) && isClean(r) && r.pending === null,
      },
    ],
    hints: [
      'git merge agent/rewrite-intro 之後，cat README.md 看看 git 塞了什麼進去',
      '那些 <<<<<<< 和 ======= 是給你看的記號，不是內容。上半是你的、下半是對方的。',
      '想清楚要留什麼，write README.md 你決定的版本，然後 git add README.md',
      '最後 git commit —— 這個 commit 會有兩個父親，因為它是兩條歷史交會的地方',
    ],
    solution: [
      'git merge agent/rewrite-intro',
      'write README.md 這是我週末寫來自動化重複工作的小工具。\\n它可以做很多事。',
      'git add README.md',
      'git commit -m "兩邊各取一半，講法留我的語氣"',
    ],
    closing: [
      '你剛剛做的事，git 幫不上忙的部分正是最重要的部分：判斷。它能算出「哪裡撞到了」，但「哪個講法比較好」只有你知道。',
      '這也是跟 AI 協作的縮影。它負責產出速度，你負責決定方向。衝突標記出現的地方，就是這兩件事碰頭的地方 —— 那個位置永遠需要一個人。',
      '順帶一提：如果你剛剛偷懶，直接把整段刪掉了事，git 也不會攔你。它從頭到尾只在乎你有沒有做決定，不在乎決定得好不好。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'agent-room',
    num: '04',
    title: '給 agent 一個自己的房間',
    kicker: 'branch 隔離 · --no-ff · pull 再 push',
    tags: ['人與 AI'],
    scene: [
      '讓 AI 直接在 main 上動手，等於讓一個工作很快、但不知道你在意什麼的人，直接改你正在用的東西。它八成是對的。八成。',
      '比較好的做法是給它一條分支。它在裡面做多少事都不影響你，你看完再決定要不要收。這條分支不是不信任，是把「產出」和「同意」分成兩個動作。',
      '這一關還有一個轉折：在你看 agent 的東西的時候，遠端的 main 已經被推上了別的東西。你會撞到那個「推不上去」的訊息 —— 它是 git 最常被誤會的錯誤之一，其實它只是在保護別人的工作。',
    ],
    setup: () => {
      const base = scenario([
        'git init',
        'write app.md 這是主程式',
        'write config.md port = 3000',
        'git add .',
        'git commit -m "第一版能跑了"',
        'git push -u origin main',
        'git switch -c agent/tidy-config',
        'become ai',
        'write config.md port = 3000\\ntimeout = 30',
        'git add .',
        'git commit -m "設定加上 timeout"',
        'write notes.md 設定值之後應該搬到環境變數',
        'git add .',
        'git commit -m "留一張待辦紙條"',
        'become me',
        'git switch main',
      ])
      // 你在看 agent 的分支的時候，別人已經推東西上去了
      return simulateRemotePush(
        base,
        'main',
        '把 README 補上安裝步驟',
        { 'README.md': '安裝：npm install' },
        'human',
      )
    },
    intro: [
      { kind: 'title', text: 'agent/tidy-config 上有兩個 AI 做的 commit（圖上是菱形）。' },
      { kind: 'hint', text: '先看清楚它改了什麼，再決定要不要收。收的時候用 --no-ff，讓「你同意了」這件事留在歷史上。最後推上去 —— 你會遇到一點阻力。' },
    ],
    quickCommands: [
      'git log --oneline --all',
      'git show agent/tidy-config',
      'git merge --no-ff agent/tidy-config',
      'git push',
      'git pull',
    ],
    objectives: [
      {
        id: 'review-merge',
        label: '把 agent 的分支收進 main，並留下合流點',
        check: (r) =>
          mergedInto(r, 'agent/tidy-config', 'main') &&
          hasMergeCommit(r, r.branches['main']),
      },
      {
        id: 'caught-up',
        label: '把別人先推上去的東西接進來',
        check: (r) => r.work['README.md'] !== undefined,
      },
      {
        id: 'pushed',
        label: '推上去，跟 origin 對齊',
        check: (r) =>
          Boolean(r.branches['main']) &&
          r.remote['main'] === r.branches['main'],
      },
    ],
    hints: [
      'git show agent/tidy-config 看它到底改了什麼 —— review 是這條流程的重點，不是形式',
      'git merge --no-ff agent/tidy-config：--no-ff 會強迫產生合流點，就算可以快轉也一樣',
      'git push 會被擋下來。訊息說 origin 上有你沒有的東西 —— 先 git pull 把它接進來',
      'pull 完再 push 一次',
    ],
    solution: [
      'git show agent/tidy-config',
      'git merge --no-ff agent/tidy-config',
      'git push',
      'git pull',
      'git push',
    ],
    closing: [
      '為什麼要 --no-ff？因為快轉之後，歷史看起來就像那些 commit 一直都在 main 上，「有人審過」這件事消失了。加上 --no-ff，那個合流點就是你簽名的地方。',
      '被擋下來的那次 push 也值得記住。git 拒絕你，是因為接受了就會讓別人的 commit 從遠端消失。它擋的不是你，是資料遺失。',
      '真的想用 --force 之前先問一句：這條線有沒有別人也在上面？答案是有的話，就別。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'undo',
    num: '05',
    title: '後悔的四種姿勢',
    kicker: 'revert · reset · reflog',
    tags: ['人與 AI'],
    scene: [
      'agent 一口氣改了一整輪，大部分很好，但其中一個 commit 把一組密鑰直接寫死在設定檔裡。這個 commit 已經推出去了，別人也拉過了。',
      '這時候有兩條路。reset 是把指標往回搬，假裝那段歷史沒發生過 —— 在你自己的機器上很好用，但這段歷史別人手上也有一份，你一改，他們下次 pull 就會撞牆。',
      'revert 反過來：它承認那個 commit 存在，然後往前走一步抵銷它。歷史變長，但沒有人會爆炸。',
      '判準很簡單，記住就夠了：還沒給別人看過的歷史，你想怎麼改都行；已經出門的歷史，只能往前修，不能往回改。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write app.md 主程式',
        'write config.md port = 3000',
        'git add .',
        'git commit -m "第一版"',
        'become ai',
        'write app.md 主程式\\n加了快取層',
        'git add .',
        'git commit -m "加上快取，讀取快了三倍"',
        'write config.md port = 3000\\napi_key = sk-live-9f2b7c14ee',
        'git add .',
        'git commit -m "把設定補齊"',
        'become me',
        'git push -u origin main',
      ]),
    intro: [
      { kind: 'title', text: '最後一個 commit 把 api_key 寫死在 config.md 裡了。' },
      { kind: 'out', text: '而且已經 push 出去，別人手上也有一份。' },
      { kind: 'hint', text: 'git show HEAD 看清楚災情。然後想一下：這段歷史已經出門了，你要用哪一招？' },
    ],
    quickCommands: [
      'git show HEAD',
      'git log --oneline',
      'git revert HEAD',
      'git reflog',
    ],
    objectives: [
      {
        id: 'gone',
        label: '設定檔裡不再有那把寫死的密鑰',
        check: (r) =>
          commitCount(r) >= 4 && !(r.work['config.md'] ?? '').includes('sk-live'),
      },
      {
        id: 'kept',
        label: '快取那個 commit 要留著，它是好的',
        check: (r) => commitCount(r) >= 4 && (r.work['app.md'] ?? '').includes('快取'),
      },
      {
        id: 'safe',
        label: '用往前抵銷的方式，不要抹掉別人手上的歷史',
        check: (r) => {
          const tip = headOid(r)
          if (!tip) return false
          const reverted = historyHas(r, tip, (c) => c.message.startsWith('Revert'))
          // 而且那個壞掉的 commit 還好好地留在歷史上，沒被抹掉
          const stillThere = historyHas(r, tip, (c) =>
            Boolean(c.tree['config.md']?.includes('sk-live')),
          )
          return reverted && stillThere
        },
      },
    ],
    hints: [
      'git log --oneline 先看清楚哪個 commit 是兇手',
      'git revert HEAD 會做出一個新的 commit，內容是把上一個抵銷掉',
      '想試試 reset 也可以 —— 試完再 git reflog，你會看到剛剛「消失」的東西其實還在',
      '（現實提醒：密鑰一旦推出去就等於外洩了，revert 只是止血，該做的是去換一把新的。）',
    ],
    solution: [
      'git show HEAD',
      'git revert HEAD',
    ],
    closing: [
      'reset 跟 revert 的差別不是危險程度，是「這段歷史有沒有離開過你的電腦」。',
      'reflog 值得單獨記住：它記錄 HEAD 去過的每一個地方，只存在你本機。大部分「我把東西弄不見了」的驚慌，在 git reflog 之後就結束了。',
      '至於 AI 產出的那一大批改動 —— 它們通常是好的，偶爾夾一顆地雷。所以重點不是要不要用，是有沒有一個能一顆一顆挑掉的機制。git 就是那個機制。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'rebase',
    num: '06',
    title: '把歷史整理成看得懂的樣子',
    kicker: 'rebase · amend · 訊息怎麼寫',
    tags: ['進階'],
    scene: [
      '你的分支開出去以後，main 又往前跑了。同時，分支上的 commit 訊息是「update」「fix」「update again」—— 大概是機器產的，或是你當時懶得想。',
      'rebase 做的事是：把你的 commit 一個一個照抄到新的基準點上。注意是「照抄」，抄出來的是全新的 commit，hash 全部都變了。所以在還沒給別人看過的分支上做很安全，在共用的分支上做會出事。',
      '順手把訊息也修一下。commit 訊息寫「update」等於沒寫 —— diff 本來就看得到改了什麼，訊息要回答的是「為什麼」。這剛好是 AI 最不擅長的一格：它看得到你改了哪幾行，看不到你當時在跟什麼問題搏鬥。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write app.md 主程式',
        'git add .',
        'git commit -m "第一版"',
        'git switch -c feature/search',
        'become ai',
        'write search.md 搜尋功能：先做最笨的版本',
        'git add .',
        'git commit -m "update"',
        'write search.md 搜尋功能：先做最笨的版本\\n加上關鍵字比對',
        'git add .',
        'git commit -m "update again"',
        'become me',
        'git switch main',
        'write app.md 主程式\\n改了啟動流程',
        'git add .',
        'git commit -m "調整啟動流程"',
        'git switch feature/search',
      ]),
    intro: [
      { kind: 'title', text: 'feature/search 落後了，而且訊息寫得像沒寫。' },
      { kind: 'hint', text: '先 git rebase main 把它接到最新的 main 後面，再用 git commit --amend 把最後那個訊息改成人看得懂的話。' },
    ],
    quickCommands: [
      'git log --oneline --all',
      'git rebase main',
      'git commit --amend -m ""',
      'git log --oneline',
    ],
    objectives: [
      {
        id: 'linear',
        label: '接到 main 後面，歷史變成一條直線',
        check: (r) => {
          const m = r.branches['main']
          const f = r.branches['feature/search']
          return Boolean(m && f && isAncestor(r, m, f) && m !== f)
        },
      },
      {
        id: 'no-merge',
        label: '過程中沒有生出合流點',
        check: (r) => {
          const m = r.branches['main']
          const f = r.branches['feature/search']
          if (!m || !f || m === f || !isAncestor(r, m, f)) return false
          return !hasMergeCommit(r, f)
        },
      },
      {
        id: 'message',
        label: '把最後一個 commit 的訊息改成人看得懂的',
        check: (r) => {
          const f = r.branches['feature/search']
          const c = f ? r.commits[f] : undefined
          if (!c) return false
          const m = c.message.trim()
          return m.length >= 6 && !/^(update|fix|wip)/i.test(m)
        },
      },
    ],
    hints: [
      'git rebase main —— 看著圖，你的兩個 commit 會被搬到 main 的後面',
      '搬完之後，那兩個 commit 的 hash 全變了。它們是複製品，不是原件。',
      'git commit --amend -m "搜尋支援關鍵字比對" 改掉最後一個訊息',
      'amend 也一樣是造新的取代舊的 —— 所以已經推出去的 commit 別 amend',
    ],
    solution: [
      'git rebase main',
      'git commit --amend -m "搜尋支援關鍵字比對"',
    ],
    closing: [
      'rebase 換來的是一條乾淨的直線，代價是所有 hash 都變了。判準跟上一關一樣：這些 commit 有沒有出過門？',
      '「先 rebase 再合併」在很多團隊是預設做法，因為線性的歷史比較好讀、好 bisect。但也有團隊刻意保留合流點，因為那記錄了真實發生的事。兩種都對，重點是整團講好同一套。',
      '至於訊息 —— 讓 AI 產草稿沒問題，但送出去之前自己讀一遍。它寫的是 diff 的摘要，你要補的是那句「為什麼」。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'gitflow',
    num: '07',
    title: 'Gitflow 走完整整一圈',
    kicker: 'develop · feature · release · hotfix',
    tags: ['流程'],
    scene: [
      'Gitflow 常被說太重。它確實不適合每天發十次版的產品。但它值得走過一次，因為它把一個問題拆得非常清楚：「做好了」和「可以出了」不是同一件事。',
      'main 上只放已經出門的東西。develop 是正在整合、但還不保證能出的版本。feature 是還在長的東西。release 是最後的定裝期 —— 只修不加。hotfix 是繞過所有排隊、直接補到 main 上的急件。',
      '注意看左邊的軌道順序：越上面越穩定，越下面越是還在動的東西。這個排法不是裝飾，它就是這套流程的形狀。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write app.md v1 能跑了',
        'git add .',
        'git commit -m "v1 上線"',
        'git tag v1.0',
        'git switch -c develop',
      ]),
    intro: [
      { kind: 'title', text: 'main 上是已經上線的 v1.0，develop 剛開好。' },
      { kind: 'hint', text: '順序是：從 develop 開 feature → 做完併回 develop → 開 release 定裝 → release 併進 main 並打 tag。慢慢走，看圖怎麼長。' },
    ],
    quickCommands: [
      'git switch -c feature/export',
      'git switch develop',
      'git merge --no-ff feature/export',
      'git switch -c release/1.1',
      'git switch main',
      'git merge --no-ff release/1.1',
      'git tag v1.1',
    ],
    objectives: [
      {
        id: 'feature',
        label: '從 develop 開一條 feature，並在上面做事',
        check: (r) => everOpened(r, 'feature/') && commitCount(r) >= 2,
      },
      {
        id: 'into-develop',
        label: 'feature 併回 develop',
        check: (r) =>
          branchesMatching(r, 'feature/').some((b) => mergedInto(r, b, 'develop')),
      },
      {
        id: 'release',
        label: '從 develop 切一條 release 出來',
        check: (r) => branchesMatching(r, 'release/').length > 0,
      },
      {
        id: 'shipped',
        label: 'release 併進 main，並且打上版本標籤',
        check: (r) => {
          const shipped = branchesMatching(r, 'release/').some((b) =>
            mergedInto(r, b, 'main'),
          )
          const tagged = Object.entries(r.tags).some(
            ([name, oid]) =>
              name !== 'v1.0' && branchHas(r, 'main', oid),
          )
          return shipped && tagged
        },
      },
    ],
    hints: [
      'git switch develop 之後 git switch -c feature/export，在上面 write 東西再 commit',
      '回到 develop：git switch develop，然後 git merge --no-ff feature/export',
      'git switch -c release/1.1 —— 定裝期只修 bug，不加功能',
      'git switch main、git merge --no-ff release/1.1、git tag v1.1',
      '（真實流程還會把 release 併回 develop 一次，免得定裝期的修正在下一版消失）',
    ],
    solution: [
      'git switch develop',
      'git switch -c feature/export',
      'write export.md 匯出成 CSV',
      'git add .',
      'git commit -m "加上匯出功能"',
      'git switch develop',
      'git merge --no-ff feature/export',
      'git switch -c release/1.1',
      'write CHANGELOG.md 1.1：新增匯出',
      'git add .',
      'git commit -m "整理 1.1 的變更說明"',
      'git switch main',
      'git merge --no-ff release/1.1',
      'git tag v1.1',
    ],
    closing: [
      '走完一圈之後回頭看那張圖：它跟教科書上的 gitflow 圖長得一樣，因為軌道本來就是照穩定度排的。',
      '要不要用整套 gitflow 是團隊的選擇。但裡面那個核心分法幾乎在哪都適用：一條線只放已經確定的東西，另一條線放正在整合的東西，中間隔一個明確的「同意」動作。',
      '把 agent 放進這張圖也很自然：它在 feature 層做事，人在 develop 那一層決定收不收。速度和把關各自有位置，不用互相牽制。',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'life',
    num: '08',
    title: '把這套搬進生活裡',
    kicker: '分支當成一種想事情的方式',
    tags: ['流程'],
    scene: [
      '這一關沒有新指令。要練的是把剛剛學會的形狀，套到不是程式碼的東西上。',
      '對照表大概是這樣：main 是你現在真的在過的生活 —— 已經穩定運作、不用每天重新決定的部分。develop 是你正在調整的版本。feature/ 是一個還在試的習慣。release 是試行期：不再加新東西，只觀察它撐不撐得住。hotfix 是突發事件，繞過所有計畫直接處理。',
      '這個比喻真正有用的地方不是浪漫，是它讓「放棄」變成一個正常動作。一條分支砍掉不叫失敗，叫做「試過了，資料收到了，不採用」。大部分人不敢試新東西，是因為心裡沒有那條可以砍掉的分支。',
      '所以這一關的目標是：開一條實驗分支，在上面留下兩天的紀錄，然後做出決定 —— 收進來，或是砍掉。兩個都算過關。',
    ],
    setup: () =>
      scenario([
        'git init',
        'write 一天.md 早上八點半起床，通勤，工作到六點，晚上滑手機',
        'git add .',
        'git commit -m "現在的生活，能跑"',
        'git switch -c develop',
      ]),
    intro: [
      { kind: 'title', text: 'main 上是你現在的生活。develop 是你打算調整的版本。' },
      { kind: 'hint', text: '開一條 feature/ 分支代表一個想試的習慣，在上面 commit 兩次（兩天），然後決定：git merge 收進 develop，或 git branch -d 砍掉。' },
    ],
    quickCommands: [
      'git switch -c feature/早起',
      'git switch develop',
      'git merge --no-ff feature/早起',
      'git branch -d feature/早起',
      'git log --oneline --all',
    ],
    objectives: [
      {
        id: 'experiment',
        label: '開一條實驗分支',
        check: (r) => everOpened(r, 'feature/'),
      },
      {
        id: 'two-days',
        label: '在上面留下兩次紀錄',
        check: (r) => commitCount(r) >= 3,
      },
      {
        id: 'decided',
        label: '做出決定：收進 develop，或砍掉不留',
        check: (r) => {
          const merged = branchesMatching(r, 'feature/').some((b) =>
            mergedInto(r, b, 'develop'),
          )
          const deleted =
            everOpened(r, 'feature/') && branchesMatching(r, 'feature/').length === 0
          return merged || deleted
        },
      },
    ],
    hints: [
      'git switch -c feature/早起，然後 write 一天.md 六點半起床…… 再 commit',
      '第二天再改一次、再 commit 一次 —— 兩個 commit 就是兩天的資料',
      '覺得可行：git switch develop 然後 git merge --no-ff feature/早起',
      '覺得不行：git switch develop 然後 git branch -d feature/早起 —— 這一樣算過關',
    ],
    solution: [
      'git switch -c feature/早起',
      'write 一天.md 六點半起床，跑步二十分鐘，通勤，工作到六點',
      'git add .',
      'git commit -m "第一天：六點半起床，撐住了"',
      'write 一天.md 六點半起床，跑步二十分鐘，通勤，工作到六點，十一點睡',
      'git add .',
      'git commit -m "第二天：補上固定的睡覺時間"',
      'git switch develop',
      'git merge --no-ff feature/早起',
    ],
    closing: [
      '如果你選了砍掉：那條分支消失了，但 reflog 還記得它存在過。試過而不採用，跟沒試過，是完全不同的兩件事。',
      '如果你選了合併：那個合流點就是你按下同意的地方。一個月後回頭看，你會知道這個習慣是哪一天正式變成生活的一部分。',
      '這套東西真正給人的，不是版本控制，是一種對待改變的姿態：先分岔，再決定；決定之前不用承諾，決定之後留下紀錄。程式碼是這樣，其他事情也可以是這樣。',
    ],
  },
]

export const QUEST_MAP = new Map(QUESTS.map((q) => [q.slug, q]))

export function getQuest(slug: string): Quest | undefined {
  return QUEST_MAP.get(slug)
}

/** 給關卡頁用的：這一關卡在哪，下一關是哪一關 */
export function questNeighbours(slug: string) {
  const i = QUESTS.findIndex((q) => q.slug === slug)
  return {
    prev: i > 0 ? QUESTS[i - 1] : undefined,
    next: i >= 0 && i < QUESTS.length - 1 ? QUESTS[i + 1] : undefined,
  }
}
