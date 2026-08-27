import type { Metadata } from 'next'

import {
  Cta,
  Figure,
  Ledger,
  Marginal,
  Page,
  SectionHead,
  WithMargin,
} from '@/components/editorial'
import { CommitGraph } from '@/components/graph/CommitGraph'
import { PairCompare } from '@/components/pair/PairCompare'
import { pairDemo } from '@/lib/quests/demos'

export const metadata: Metadata = {
  title: '人與 AI',
  description:
    '當 agent 也會 commit 的時候，分支、審查、衝突各自變成什麼。四種相處模式和一份可以帶走的規矩。',
}

const MODES = [
  {
    key: 'shared',
    term: '共用工作目錄',
    note: '最常見',
    def: (
      <>
        agent 直接改你眼前的檔案，你邊看邊接受。快，但沒有任何中間狀態 ——
        改到一半反悔就只能靠編輯器的 undo。適合小修小補，不適合放它跑三十分鐘。
      </>
    ),
  },
  {
    key: 'staged',
    term: '你來按 commit',
    note: '小改動',
    def: (
      <>
        agent 改，你用 <code>git diff</code> 逐段看過，再自己決定要 add
        哪些、分成幾個 commit。歷史會很乾淨，但你得全程在場。
      </>
    ),
  },
  {
    key: 'branch',
    term: 'agent 有自己的分支',
    note: '建議的預設',
    def: (
      <>
        <code>agent/*</code> 開頭的分支，它在裡面自由發揮。你看完再{' '}
        <code>merge --no-ff</code>。成本只多一個切換分支的動作，
        換到的是「隨時可以整條丟掉」。
      </>
    ),
  },
  {
    key: 'pr',
    term: '開 PR、跑 CI',
    note: '多人專案',
    def: (
      <>
        agent 推到遠端、開 PR，測試和檢查先跑一遍，人再看。
        審查的成本從你身上移到機器上，你只處理機器攔不下來的那一類問題。
      </>
    ),
  },
]

const RULES = [
  {
    key: 'r1',
    term: '分支名帶身分',
    note: 'agent/*',
    def: (
      <>
        三個月後翻歷史的時候，你會想知道這段是誰寫的。名字裡就講清楚，
        比翻 commit 作者快。
      </>
    ),
  },
  {
    key: 'r2',
    term: 'commit 小一點',
    note: '可挑選',
    def: (
      <>
        一個 commit 一件事，是為了讓它可以被單獨 revert 或 cherry-pick。
        agent 傾向一次交一大包 —— 明確要求它拆開，這是少數值得堅持的要求。
      </>
    ),
  },
  {
    key: 'r3',
    term: '訊息由你補「為什麼」',
    note: '不能外包',
    def: (
      <>
        agent 寫得出「改了什麼」，因為它看得到 diff。它寫不出「為什麼」，
        因為它不在你當時的處境裡。草稿讓它產，送出去之前自己讀一遍。
      </>
    ),
  },
  {
    key: 'r4',
    term: '合併點不要快轉掉',
    note: '--no-ff',
    def: (
      <>
        快轉之後，歷史看起來就像那些 commit 一直都在 main 上，
        「有人審過」這件事會消失。合流點就是你簽名的地方。
      </>
    ),
  },
  {
    key: 'r5',
    term: '已經出門的歷史只能往前修',
    note: 'revert not reset',
    def: (
      <>
        agent 有時候會很乾脆地建議 <code>--force</code>。判準跟人一樣：
        這條線有沒有別人也在上面？有的話就別。
      </>
    ),
  },
]

export default function PairPage() {
  return (
    <Page>
      <section className="pt-12 pb-14 md:pt-16">
        <p className="label mb-6">人與 AI · 05</p>
        <h1 className="font-display max-w-[16em] text-[2rem] leading-[1.2] md:text-[2.875rem]">
          它打字比你快。
          <br />
          所以你更需要一個能反悔的地方。
        </h1>
        <div className="prose mt-7 max-w-[52ch] text-[0.9688rem] leading-[1.95]">
          <p>
            過去 git 解決的是「多個人怎麼共用一份程式碼」。現在多了一種參與者：
            它產出速度快上一個量級，一次動的範圍也大得多，
            但它不知道你在意什麼、也不知道三個月前那個看起來多餘的判斷式為什麼還留著。
          </p>
          <p>
            這不是信不信任的問題，是<strong>速度差</strong>的問題。
            當產出變便宜，決定就變成瓶頸 —— 而 git 剛好整套都是為了「記錄決定」設計的。
          </p>
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="A"
          title="同一批改動，兩種放法"
          lead="agent 做了三件事，其中一件把金鑰寫死了。差別不在它做得好不好，在於出事之後你手上還有沒有東西可以挑。"
        />
        <div className="mt-6">
          <PairCompare />
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="B"
          title="四種相處模式"
          lead="沒有哪一種永遠對。差別是「你想在哪一個環節在場」。"
        />
        <div className="mt-6">
          <Ledger rows={MODES} />
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="C"
          title="衝突會變多，那是好消息"
          lead="它代表兩邊真的都在動同一塊地方，而且有人及時發現了。"
        />
        <WithMargin
          margin={
            <Marginal label="怎麼練">
              第 03 關就是這個場面：你和 agent 同時改了 README 的第一行。
              解一次，就不會再怕它了。
            </Marginal>
          }
        >
          <div className="prose mt-6 max-w-[58ch] text-[0.9688rem] leading-[1.95]">
            <p>
              很多人第一次遇到衝突會慌，覺得自己把東西弄壞了。恰好相反：
              git 停下來，是因為它<strong>拒絕替你猜</strong>。
              它把兩個版本原封不動攤開，然後等一個人來決定。
            </p>
            <p>
              真正該擔心的是另一種情況 —— 兩邊改的是不同檔案，所以自動合併過了，
              但合起來的結果邏輯上是矛盾的。那種 git 攔不住，只有測試和人攔得住。
              所以衝突多不是問題，衝突太少反而該檢查一下你們是不是根本沒在動同一個東西。
            </p>
            <p>
              解衝突的時候有個小習慣值得養成：先看懂對方為什麼那樣改，
              再決定留誰。就算對方是機器 —— 特別是對方是機器的時候，
              因為它不會來跟你爭辯，它只會安靜地接受你刪掉它的版本。
            </p>
          </div>
        </WithMargin>
      </section>

      <section className="pb-16">
        <SectionHead
          num="D"
          title="一份可以直接帶走的規矩"
          lead="五條。都很短，因為記不住的規矩等於沒有。"
        />
        <div className="mt-6">
          <Ledger rows={RULES} />
        </div>
      </section>

      <section className="pb-8">
        <SectionHead
          num="E"
          title="讀懂這張圖"
          lead="圓點是人、菱形是 agent、空心圓是合流點。形狀分身分，顏色分軌道 —— 一張圖一次只用一種編碼講一件事。"
        />
        <div className="mt-6">
          <Figure caption="agent/refactor 上兩個菱形，main 上一個圓點，最後在 main 合流。那個合流點是人按下同意的位置。">
            <CommitGraph repo={pairDemo()} />
          </Figure>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Cta href="/quests/conflict" mark>
            去解一次真的衝突
          </Cta>
          <Cta href="/quests/agent-room">給 agent 一個房間</Cta>
        </div>
      </section>
    </Page>
  )
}
