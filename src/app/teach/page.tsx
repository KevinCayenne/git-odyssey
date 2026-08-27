import type { Metadata } from 'next'
import Link from 'next/link'

import { Cta, Ledger, Marginal, Page, SectionHead, WithMargin } from '@/components/editorial'
import {
  DEMOS,
  demoResultHref,
  demoStartHref,
  type Demo,
} from '@/lib/quests/demos-teaching'

export const metadata: Metadata = {
  title: '講師手冊',
  description:
    '五段課堂示範、一份排課表，以及怎麼收作業。每段示範都有現成的連結，點開就是那個場面。',
}

const USES = [
  {
    key: 'live',
    term: '你在台上示範',
    note: '/play',
    def: (
      <>
        五個開場按鈕就是五個備好的場面，不用當場慢慢鋪陳。指令有快捷鈕可以用點的，
        投影時不會打錯字；打壞了按「倒帶」，換班級按「重來」。右下角有「投影」，
        字和圖會整個放大。
      </>
    ),
  },
  {
    key: 'primer',
    term: '零基礎開場',
    note: '/start',
    def: (
      <>
        班上有完全沒碰過的人就從這頁開始。中間那個八步走查是投影用的 ——
        你按「下一步」，三格會跟著亮，底下跑的是真引擎。
        最後那張六個詞的表可以先叫大家收藏，卡住時翻回去。
      </>
    ),
  },
  {
    key: 'flow',
    term: '指令查得到',
    note: '/flow',
    def: (
      <>
        每個常用指令一張會動的流程圖。學生問「那 rebase 到底在幹嘛」的時候，
        直接投影那一張按播放，比講三分鐘有用。每張圖旁邊都有「什麼時候用」
        和「最常踩的坑」，也可以整頁當講義發下去。
      </>
    ),
  },
  {
    key: 'self',
    term: '學生自己走',
    note: '/quests',
    def: (
      <>
        目標會自動打勾，你不用一個一個檢查。提示要按了才出現、按完提示才給答案 ——
        快的學生不會被拖住，慢的也不會卡死。
      </>
    ),
  },
  {
    key: 'read',
    term: '指定閱讀 / 討論',
    note: '/pair · /lifeflow',
    def: (
      <>
        這兩頁是文章不是練習，適合當課後閱讀或翻轉教室的討論題。
        <code>/pair</code> 中段那個對照元件按兩下就切換，很適合當開場提問。
      </>
    ),
  },
]

const SCHEDULE = [
  ['10 分', '卷首 + 給他們看 gitflow 那張圖：「下課前你會看懂它」'],
  ['15 分', '零基礎的班：投影「入門」的八步走查，邊按邊講三格'],
  ['10 分', '投影「指令圖」的 A 節：add / commit 各播一次，把三格講死'],
  ['15 分', '示範 01、02 → 學生自己走第 01、02 關'],
  ['20 分', '示範 03 → 學生自己解第 03 關（衝突）'],
  ['15 分', '示範 04、05 → 講「人與 AI」那頁的四種相處模式'],
  ['15 分', '學生走第 07 關（完整 gitflow），回頭看開場那張圖'],
  ['5 分', '「生活流」收尾，或指定回家看'],
]

function DemoCard({ demo }: { demo: Demo }) {
  return (
    <article className="rule-b py-7 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="num text-[0.6875rem] text-vermilion">{demo.num}</span>
        <h3 className="font-display text-[1.3125rem] leading-[1.35]">{demo.title}</h3>
      </div>

      <p className="mt-2 max-w-[62ch] text-[0.9062rem] leading-[1.85] text-ink-2">
        {demo.point}
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <ol className="border border-rule">
          {demo.steps.map((step, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2.5 border-b border-rule-soft px-3 py-1.5 last:border-b-0"
            >
              <span className="num shrink-0 text-[0.625rem] text-ink-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              {step.startsWith('@') ? (
                <span className="text-[0.7812rem] text-plum">
                  ⟢ 按下事件按鈕（agent 推了東西到 origin）
                </span>
              ) : (
                <span className="num text-[0.7812rem] text-ink">{step}</span>
              )}
            </li>
          ))}
        </ol>

        <div>
          <p className="label mb-1.5">可以直接念的一句</p>
          <p className="font-display max-w-[38ch] text-[1.0625rem] leading-[1.6]">
            「{demo.line}」
          </p>
          <p className="mt-4 max-w-[52ch] text-[0.875rem] leading-[1.85] text-ink-2">
            <span className="label mr-2">接著問</span>
            {demo.after}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={demoStartHref(demo)} className="btn btn-mark">
              開場備好，我自己打
              <span aria-hidden>→</span>
            </Link>
            <Link href={demoResultHref(demo)} className="btn btn-quiet">
              直接跳到結果
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function TeachPage() {
  return (
    <Page>
      <section className="pt-12 pb-14 md:pt-16">
        <p className="label mb-6">講師手冊 · 07</p>
        <h1 className="font-display max-w-[13em] text-[2rem] leading-[1.2] md:text-[2.875rem]">
          課堂上鋪不出來的場面，
          <br />
          這裡點一下就有。
        </h1>
        <div className="prose mt-7 max-w-[52ch] text-[0.9688rem] leading-[1.95]">
          <p>
            這頁是給站在台上的人用的。下面五段示範各自對應一個「學生一定會卡住」的地方，
            每段都有現成的連結：一個把開場備好讓你自己打，一個直接跳到結果。
          </p>
          <p>
            這些腳本不是寫在文件裡的死字 ——
            <strong>它們每次建置都會被跑過一遍</strong>，
            確認指令都還有效、該卡住的地方真的會卡住。所以不會發生你上課打到一半發現
            某個指令改掉了的狀況。
          </p>
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="A"
          title="三種用法，可以混著來"
          lead="同一個網站，看你要站在哪個位置。"
        />
        <div className="mt-6">
          <Ledger rows={USES} />
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="B"
          title="五段課堂示範"
          lead="都很短。挑一段能講十分鐘，五段全用大概是一堂課。"
        />
        <div className="mt-8">
          {DEMOS.map((demo) => (
            <DemoCard key={demo.id} demo={demo} />
          ))}
        </div>
      </section>

      <section className="pb-16">
        <SectionHead num="C" title="一個九十分鐘的排法" />
        <div className="rule-t mt-6">
          {SCHEDULE.map(([time, what]) => (
            <div
              key={time}
              className="rule-b grid grid-cols-1 gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[minmax(0,90px)_minmax(0,1fr)]"
            >
              <span className="num text-[0.7812rem] text-ink-3">{time}</span>
              <span className="text-[0.9062rem] leading-[1.85] text-ink-2">{what}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <SectionHead
          num="D"
          title="怎麼收作業"
          lead="沒有帳號、沒有後端，所以用最土但最可靠的方式。"
        />
        <WithMargin
          margin={
            <Marginal label="老實說">
              進度存在學生自己的瀏覽器裡。換一台電腦、清掉瀏覽資料，紀錄就沒了 ——
              上課前提醒一句會省掉很多麻煩。
            </Marginal>
          }
        >
          <div className="prose mt-6 max-w-[58ch] text-[0.9688rem] leading-[1.95]">
            <p>
              <strong>要看過程</strong>：沙盒右下角有「複製這一段的連結」。它把學生打過的每一步
              編進網址，你點開會看到一模一樣的終端機紀錄和圖 ——
              不是截圖，是可以繼續往下打的活狀態。當作作業繳交很剛好，
              也很適合學生拿來問「我卡在這裡」。
            </p>
            <p>
              <strong>要看完成度</strong>：關卡列表上有「複製進度」，會產生一段八行的清單，
              貼到表單或聊天室就好。
            </p>
            <p>
              <strong>你自己出題</strong>：在沙盒裡把場面弄成你要的樣子，複製連結貼給全班。
              他們點開就是同一個起點，不用你唸一串指令讓大家跟著打。
            </p>
          </div>
        </WithMargin>
      </section>

      <section className="pb-8">
        <div className="border border-rule px-5 py-6 md:px-8">
          <p className="label mb-3">上課前檢查</p>
          <ul className="space-y-2">
            {[
              '打開「投影」，確認教室後排看得清楚',
              '日／夜挑一個 —— 投影機通常「日」比較清楚，個人螢幕「夜」比較舒服',
              '先把要用的示範連結開在分頁裡，上課不用回來這頁翻',
              '班上有零基礎的人 → 先走一遍「入門」的八步，不然第 01 關就會卡住',
              '提醒學生進度存在自己的瀏覽器，不要中途換電腦',
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.9062rem] leading-[1.85]">
                <span className="num shrink-0 text-[0.6875rem] text-ink-3">○</span>
                <span className="text-ink-2">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/play" mark>
              去沙盒
            </Cta>
            <Cta href="/quests">看關卡列表</Cta>
          </div>
        </div>
      </section>
    </Page>
  )
}
