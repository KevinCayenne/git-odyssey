import type { Metadata } from 'next'

import {
  Cta,
  Figure,
  Marginal,
  Page,
  SectionHead,
  WithMargin,
} from '@/components/editorial'
import { CommitGraph } from '@/components/graph/CommitGraph'
import { lifeDemo } from '@/lib/quests/demos'

export const metadata: Metadata = {
  title: '生活流',
  description:
    'gitflow 那套分法拿來想事情意外地好用 —— 特別是關於「怎麼放棄一個嘗試」。',
}

const MAP = [
  {
    branch: 'main',
    color: 'var(--vermilion)',
    life: '你現在真的在過的生活',
    rule: '只放已經穩定、不用每天重新決定的事。改動前要有把握，改壞了影響是真的。',
  },
  {
    branch: 'develop',
    color: 'var(--indigo)',
    life: '正在調整中的版本',
    rule: '新東西先在這裡合起來看，確認彼此不打架。還不保證撐得住，但方向定了。',
  },
  {
    branch: 'feature/*',
    color: 'var(--moss)',
    life: '一個還在試的習慣或想法',
    rule: '可以同時開好幾條。壽命要短 —— 開太久會跟現實脫節，合不回去。',
  },
  {
    branch: 'release/*',
    color: 'var(--ochre)',
    life: '試行期、觀察期',
    rule: '只修不加。這段時間唯一的任務是確認它撐不撐得住，不是繼續塞新東西。',
  },
  {
    branch: 'hotfix/*',
    color: 'var(--plum)',
    life: '突發事件',
    rule: '繞過所有排隊，直接處理。但處理完要記得合回 develop —— 不然下次還會再犯。',
  },
]

function FlowMap() {
  return (
    <div className="rule-t">
      {MAP.map((row) => (
        <div
          key={row.branch}
          className="rule-b grid grid-cols-1 gap-x-6 gap-y-1.5 py-4 md:grid-cols-[minmax(0,140px)_minmax(0,200px)_minmax(0,1fr)]"
        >
          <div className="flex items-baseline gap-2">
            <span
              className="block h-[9px] w-[9px] shrink-0 translate-y-[-1px] rounded-[1px]"
              style={{ background: row.color }}
            />
            <span className="num text-[13px] text-ink">{row.branch}</span>
          </div>
          <div className="font-display text-[16px] leading-[1.5]">{row.life}</div>
          <div className="text-[14px] leading-[1.85] text-ink-2">{row.rule}</div>
        </div>
      ))}
    </div>
  )
}

export default function LifeflowPage() {
  return (
    <Page>
      <section className="pt-12 pb-14 md:pt-16">
        <p className="label mb-6">生活流 · 04</p>
        <h1 className="font-display max-w-[11em] text-[32px] leading-[1.2] md:text-[46px]">
          分支真正教你的，
          <br />
          是怎麼放棄。
        </h1>
        <div className="prose mt-7 max-w-[52ch] text-[15.5px] leading-[1.95]">
          <p>
            大部分人不敢試新東西，不是因為懶。是因為心裡沒有那條可以砍掉的分支 ——
            一旦開始就像是承諾了什麼，中途停下來會被自己判定成失敗，
            於是乾脆不開始。
          </p>
          <p>
            git 的世界裡沒有這種負擔。開一條分支的成本接近零，
            砍掉一條分支也不叫失敗 ——
            <strong>叫做「試過了，資料收到了，不採用」</strong>。
            這個心理位置的差別，比任何指令都值得帶走。
          </p>
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="A"
          title="對照表"
          lead="左邊的顏色跟圖上的軌道是同一套。看久了，分支的位置本身就會變成一種直覺：越上面越穩定，越下面越是還在動的東西。"
        />
        <div className="mt-6">
          <FlowMap />
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="B"
          title="一個月，畫出來長這樣"
          lead="兩條實驗習慣：晨跑撐過兩週、收進生活了；戒咖啡才試三天，還在觀察，先掛著。"
        />
        <div className="mt-6">
          <Figure caption="feature/晨跑 在 develop 合流之後，跟著整批進了 main —— 那個合流點就是它正式變成生活一部分的日子。feature/戒咖啡 還懸在下面，什麼都還沒決定，那也完全沒問題。">
            <CommitGraph repo={lifeDemo()} />
          </Figure>
        </div>
      </section>

      <section className="pb-16">
        <SectionHead num="C" title="三個真的用得上的地方" />
        <WithMargin
          margin={
            <Marginal label="動手練">
              第 08 關就是這個：開一條實驗分支、記兩天、然後做出決定。
              收進來或砍掉都算過關 —— 因為那本來就是兩個一樣好的答案。
            </Marginal>
          }
        >
          <div className="mt-6 space-y-8">
            <div>
              <h3 className="font-display text-[19px] leading-[1.4]">
                一、習慣實驗有了明確的結束條件
              </h3>
              <div className="prose mt-2 max-w-[58ch] text-[15px] leading-[1.9]">
                <p>
                  開分支的時候就先講好觀察期多長。時間到了只有兩個結果：合併，或砍掉。
                  沒有「再看看」這個選項 —— 那是分支開太久的主因，
                  而開太久的分支合不回去，因為現實已經跑到別的地方了。
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-[19px] leading-[1.4]">
                二、承認「學到一半」是一種正當狀態
              </h3>
              <div className="prose mt-2 max-w-[58ch] text-[15px] leading-[1.9]">
                <p>
                  develop 存在的意義，就是承認有些東西已經進來了、
                  但還不到可以拿出去用的程度。生活裡很多焦慮來自把這兩層混在一起：
                  剛學會一點就要求自己表現得像已經熟練。
                  分開之後，「還在 develop 上」是一句可以對自己說的話。
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-[19px] leading-[1.4]">
                三、急件處理完要合回去
              </h3>
              <div className="prose mt-2 max-w-[58ch] text-[15px] leading-[1.9]">
                <p>
                  hotfix 最容易被忘記的不是修，是修完之後要把它合回 develop。
                  在生活裡對應的是：突發狀況處理完了，
                  但你為了處理它學到的東西沒有被寫回日常安排裡，
                  所以同一件事下個月會再發生一次。
                </p>
              </div>
            </div>
          </div>
        </WithMargin>
      </section>

      <section className="pb-16">
        <SectionHead
          num="D"
          title="不要照抄的地方"
          lead="這是比喻，不是規格。老實講一下它哪裡會壞掉。"
        />
        <div className="prose mt-6 max-w-[58ch] text-[15.5px] leading-[1.95]">
          <p>
            第一，生活沒有 <code>revert</code>。程式碼可以乾淨地抵銷一個 commit，
            說過的話、花掉的時間不行。所以在生活這邊，
            分支的價值幾乎全在「事前」—— 讓你敢試，而不是讓你能還原。
          </p>
          <p>
            第二，別把整套流程搬過來。gitflow 對很多軟體團隊來說都太重了，
            對一個人的生活更是。真正有用的是那個核心分法：
            一條線放已經確定的，一條線放正在整合的，中間隔一個明確的「我同意」。
            其他的都可以丟。
          </p>
          <p>
            第三，不要真的開一個 repo 來管人生。
            這件事的重點是那個結構怎麼影響你想事情的方式，
            不是又多一個要維護的系統。
          </p>
        </div>
      </section>

      <section className="pb-8">
        <div className="border border-rule px-5 py-6 md:px-8 md:py-8">
          <p className="label mb-3">帶走這一句</p>
          <p className="font-display max-w-[24ch] text-[24px] leading-[1.45] md:text-[30px]">
            先分岔，再決定。
            <br />
            決定之前不用承諾，決定之後留下紀錄。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/quests/life" mark>
              第 08 關：把這套搬進生活
            </Cta>
            <Cta href="/quests/gitflow">先走完一整輪 gitflow</Cta>
          </div>
        </div>
      </section>
    </Page>
  )
}
