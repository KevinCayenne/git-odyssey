import { CommitGraph } from '@/components/graph/CommitGraph'
import {
  Cta,
  Figure,
  Ledger,
  Marginal,
  Page,
  SectionHead,
  WithMargin,
} from '@/components/editorial'
import { gitflowDemo, pairDemo } from '@/lib/quests/demos'

const CONTENTS = [
  {
    key: 'start',
    term: '01 入門',
    note: '沒碰過 git',
    def: (
      <>
        八步走完第一個 commit，按「下一步」就好，不用打字。
        加上最少要記的六個詞。完全沒碰過的話從這裡開始。
      </>
    ),
  },
  {
    key: 'flow',
    term: '02 指令圖',
    note: '每個指令一張',
    def: (
      <>
        每個常用指令一張會動的流程圖：東西從哪一格搬到哪一格、
        歷史那邊同時發生什麼。忘記某個指令在幹嘛的時候翻這裡。
      </>
    ),
  },
  {
    key: 'play',
    term: '03 沙盒',
    note: '隨便亂搞',
    def: (
      <>
        一個真的會算的 git。打指令，看歷史在眼前分岔、合流、被改寫。
        弄壞了按重來，沒有任何後果。
      </>
    ),
  },
  {
    key: 'quests',
    term: '04 關卡',
    note: '八關',
    def: (
      <>
        從第一個 commit 一路走到完整的 gitflow。每一關都是一個具體的場面，
        不是指令表。
      </>
    ),
  },
  {
    key: 'pair',
    term: '05 人與 AI',
    note: '協作',
    def: (
      <>
        當 agent 也會 commit 的時候，分支、審查、衝突各自變成什麼。
        這是這個站真正想講的事。
      </>
    ),
  },
  {
    key: 'lifeflow',
    term: '06 生活流',
    note: '搬出程式碼',
    def: (
      <>
        gitflow 那套分法，拿來想事情意外地好用 —— 特別是關於「怎麼放棄一個嘗試」。
      </>
    ),
  },
]

export default function Home() {
  return (
    <Page>
      {/* ------------------------------------------------ 卷首 */}
      <section className="pt-14 pb-16 md:pt-24 md:pb-24">
        <p className="label mb-8">卷首 · 00</p>

        <h1 className="font-display max-w-[11em] text-[2.5rem] leading-[1.18] tracking-tight md:text-[4rem] md:leading-[1.12]">
          版本控制在管的
          <br />
          從來不是檔案。
        </h1>

        <div className="prose mt-9 max-w-[46ch] text-[1.0312rem] leading-[1.95] md:mt-12">
          <p>
            是決定。每一次 commit，你其實都在回答同一個問題：
            <strong>這一組改動，算不算一件事？</strong>
            git 不替你回答，它只負責在你回答之後，把答案完整地留著 ——
            連同你當時為什麼這樣想。
          </p>
          <p>
            而現在鍵盤前面坐的不一定是人。agent 打字比你快、一次動的範圍比你大，
            也比你更不知道你在意什麼。所以「誰決定留下什麼」不但沒有變得比較不重要，
            反而是整條流程裡唯一不能外包的一格。
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Cta href="/quests/first-commit" mark>
            從第一關開始
          </Cta>
          <Cta href="/play">直接進沙盒</Cta>
        </div>
      </section>

      {/* ------------------------------------------------ 圖 */}
      <section className="pb-20">
        <Figure caption="這是一整輪 gitflow：發版、定裝、急件插隊。看不懂沒關係 —— 第 07 關結束的時候，這張圖會是你自己打出來的。">
          <CommitGraph repo={gitflowDemo()} />
        </Figure>
      </section>

      {/* ------------------------------------------------ 目錄 */}
      <section className="pb-20">
        <SectionHead num="目錄" title="這裡有什麼" />
        <div className="mt-6">
          <Ledger rows={CONTENTS} />
        </div>
      </section>

      {/* ------------------------------------------------ 論點一 */}
      <section className="pb-20">
        <SectionHead
          num="論點 A"
          title="AI 沒有讓 git 變得比較不重要"
          lead="它讓 git 從「工程師的工具」變成「人跟機器之間的合約」。"
        />
        <WithMargin
          margin={
            <Marginal label="圖上怎麼看">
              圓點是人做的 commit，菱形是 agent 做的。挑形狀不挑顏色，
              因為顏色已經在講分支了 —— 一張圖一次只該用一種編碼講一件事。
            </Marginal>
          }
        >
          <div className="prose mt-6 max-w-[58ch] text-[0.9688rem] leading-[1.95]">
            <p>
              讓 agent 直接在 main 上動手，等於讓一個工作極快、但不知道你在意什麼的人，
              直接改你正在用的東西。它八成是對的。問題在那個「八成」。
            </p>
            <p>
              分支解決的正是這件事：它把「產出」和「同意」拆成兩個動作。agent
              在自己的分支裡想做多少就做多少，你看完再決定要不要收。合併的那一點，
              就是你簽名的地方 —— 這也是為什麼那些流程會堅持用{' '}
              <code>--no-ff</code>，好讓那個簽名留在歷史上，不要被快轉抹掉。
            </p>
          </div>
          <div className="mt-8">
            <Figure caption="agent/refactor 那條線上是兩個菱形，最後在 main 上合流。那個空心的合流點，就是人按下同意的位置。">
              <CommitGraph repo={pairDemo()} />
            </Figure>
          </div>
          <div className="mt-6">
            <Cta href="/pair">看完整的協作模式</Cta>
          </div>
        </WithMargin>
      </section>

      {/* ------------------------------------------------ 論點二 */}
      <section className="pb-8">
        <SectionHead
          num="論點 B"
          title="Gitflow 真正教你的，是怎麼放棄"
          lead="一條分支被砍掉不叫失敗，叫做「試過了，資料收到了，不採用」。"
        />
        <div className="prose mt-6 max-w-[58ch] text-[0.9688rem] leading-[1.95]">
          <p>
            大部分人不敢試新東西，不是因為懶，是因為心裡沒有那條可以砍掉的分支 ——
            一旦開始就等於承諾，於是乾脆不開始。
          </p>
          <p>
            gitflow 把「還在試」「正在整合」「準備要出」「已經在用」分成四種不同的線，
            每一種有各自的規矩。這個分法拿來想生活裡的事意外地順：哪些習慣還在觀察期、
            哪些已經穩定到不用每天重新決定、哪件急事該繞過所有計畫直接處理。
          </p>
        </div>
        <div className="mt-6">
          <Cta href="/lifeflow">把它搬進生活</Cta>
        </div>
      </section>
    </Page>
  )
}
