import type { Metadata } from 'next'

import { Cta, Marginal, Page, SectionHead, WithMargin } from '@/components/editorial'
import { FlowCard } from '@/components/flow/FlowCard'
import { PlacesLegend } from '@/components/flow/PlacesLegend'
import { FLOWS, OLD_NEW, ROUTES, SECTIONS } from '@/lib/quests/flows'

export const metadata: Metadata = {
  title: '指令流程圖',
  description:
    '每個常用 git 指令一張會動的流程圖：東西從哪一格搬到哪一格、歷史那邊同時發生什麼。',
}

function OldNewTable() {
  return (
    <div className="rule-t">
      <div className="rule-b hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 py-2 md:grid">
        <span className="label-plain">你想做的事</span>
        <span className="label-plain">舊寫法（還是能用）</span>
        <span className="label-plain">現在建議這樣寫</span>
      </div>
      {OLD_NEW.map((row) => (
        <div key={row.intent} className="rule-b py-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="text-[0.9375rem] leading-[1.7] text-ink">{row.intent}</span>
            <code className="num text-[0.8125rem] leading-[1.7] text-ink-3 line-through decoration-rule">
              {row.old}
            </code>
            <code className="num text-[0.8125rem] leading-[1.7] text-vermilion">{row.now}</code>
          </div>
          <p className="mt-1.5 max-w-[64ch] text-[0.875rem] leading-[1.8] text-ink-2">
            {row.note}
          </p>
        </div>
      ))}
    </div>
  )
}

function RouteTable() {
  return (
    <dl className="rule-t">
      {ROUTES.map((r) => (
        <div key={r.want} className="rule-b py-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
            <dt className="text-[0.9375rem] leading-[1.8] text-ink">
              <span className="num mr-2 text-[0.6875rem] text-ink-3">我想</span>
              {r.want}
            </dt>
            <dd>
              <code className="num block text-[0.875rem] leading-[1.6] text-vermilion">
                {r.answer}
              </code>
              <p className="mt-1 text-[0.8125rem] leading-[1.75] text-ink-3">{r.because}</p>
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

export default function FlowPage() {
  return (
    <Page>
      <section className="pt-12 pb-12 md:pt-16">
        <p className="label mb-6">指令流程圖 · 02</p>
        <h1 className="font-display max-w-[14em] text-[2rem] leading-[1.2] md:text-[2.875rem]">
          每個指令都是
          <br />
          把東西從一個地方搬到另一個地方。
        </h1>
        <div className="prose mt-7 max-w-[52ch] text-[1.0625rem] leading-[1.95]">
          <p>
            git 的指令看起來有幾百個，但它們幹的事只有一種：
            把東西從某一格搬到另一格。搞清楚有哪幾格、每個指令搬的是哪一段，
            剩下的就是查手冊而已。
          </p>
          <p>
            下面每一個指令都有一張會動的圖。按播放看它搬，或者點下面的段落跳著看。
            {' '}
            <strong>圖裡的每一步都是真的餵進引擎跑出來的</strong> ——
            測試會把引擎實際改到的格子跟圖上的箭頭對一遍，對不起來就過不了 CI。
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 地圖 */}
      <section className="pb-14">
        <SectionHead
          num="○"
          title="先認得這幾個地方"
          lead="五個地方排成一條線，外加一個掛在旁邊的口袋。這個順序不是隨便排的 —— 它本身就是一個記憶點。"
        />
        <div className="mt-6 border border-rule bg-paper-2/30 px-2 py-4">
          <PlacesLegend />
        </div>
        <WithMargin
          margin={
            <Marginal label="最常搞混的一組">
              「origin/main」跟「遠端」是兩格，不是一格。
              origin/main 只是你上次 fetch 的時候抄回來的快照 ——
              它可能已經過期了，而且你不 fetch 它就永遠不會自己更新。
            </Marginal>
          }
        >
          <div className="prose mt-7 max-w-[56ch] text-[1rem] leading-[1.95]">
            <p>
              <strong>往右是把東西交出去，往左是把東西拿回來。</strong>
              add、commit、push 一路往右；fetch、pull、restore、reset
              一路往左。光看箭頭指哪邊，你就已經猜得到一半了。
            </p>
            <p>
              口袋（stash）畫在旁邊而不是線上，因為它真的不在那條路上 ——
              它是一個「先擱著」的地方，東西進去了不會自己往任何方向走。
            </p>
          </div>
        </WithMargin>
      </section>

      {/* ------------------------------------------------ 指令 */}
      {SECTIONS.map((section) => (
        <section key={section.num} className="pb-12">
          <SectionHead num={section.num} title={section.title} lead={section.lead} />
          <div className="mt-2">
            {section.slugs.map((slug) => (
              <FlowCard key={slug} slug={slug} />
            ))}
          </div>

          {section.num === 'C' && (
            <div className="mt-10">
              <SectionHead
                num="C·附"
                title="checkout 還是 switch"
                lead="2019 年 git 把 checkout 一個人幹的兩件事拆成 switch 和 restore。舊的沒有被廢掉，也不會被廢掉 —— 所以新的拿來寫，舊的拿來讀得懂別人在幹嘛。"
              />
              <div className="mt-6">
                <OldNewTable />
              </div>
              <p className="mt-4 max-w-[62ch] text-[0.9375rem] leading-[1.85] text-ink-3">
                為什麼要拆？因為 <code className="num">git checkout main</code> 跟{' '}
                <code className="num">git checkout -- main</code>{' '}
                差兩個橫線，做的卻是完全不同的兩件事，其中一件會刪掉你沒存的工作。
                一個名字扛兩件事，遲早有人踩到。
              </p>
            </div>
          )}
        </section>
      ))}

      {/* ------------------------------------------------ 決策 */}
      <section className="pb-14">
        <SectionHead
          num="E"
          title="卡住的時候從這裡找路"
          lead="先講你想做什麼，再回頭找指令 —— 而不是先想指令名字。"
        />
        <div className="mt-6">
          <RouteTable />
        </div>
      </section>

      {/* ------------------------------------------------ 收尾 */}
      <section className="pb-8">
        <div className="border border-rule px-5 py-6 md:px-8 md:py-8">
          <p className="label mb-3">看完之後</p>
          <p className="font-display max-w-[28ch] text-[1.375rem] leading-[1.45] md:text-[1.75rem]">
            圖看得再熟，手還是會抖。
          </p>
          <div className="prose mt-4 max-w-[56ch] text-[1rem] leading-[1.95]">
            <p>
              這頁是拿來查的，不是拿來背的。真正記得住的方式是去打一次、打錯一次、
              然後發現它其實救得回來。沙盒裡打壞不用付任何代價。
            </p>
            <p>
              這 {FLOWS.length} 個指令，沙盒全部都吃得下。
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/play" mark>
              去沙盒亂打
            </Cta>
            <Cta href="/quests">或照關卡一關一關打</Cta>
          </div>
        </div>
      </section>
    </Page>
  )
}
