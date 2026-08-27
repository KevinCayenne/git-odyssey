import type { Metadata } from 'next'

import { Cta, Marginal, Page, SectionHead, WithMargin } from '@/components/editorial'
import { Walkthrough } from '@/components/primer/Walkthrough'
import { COMMAND_ANATOMY, GLOSSARY } from '@/lib/quests/primer'

export const metadata: Metadata = {
  title: '入門',
  description:
    '給第一次碰 git 的人。八步走完第一個 commit，加上最少要記的六個詞。',
}

const MESSY_FOLDER = [
  '報告.docx',
  '報告_修改版.docx',
  '報告_最終版.docx',
  '報告_最終版2.docx',
  '報告_最終版_真的最後.docx',
  '報告_最終版_真的最後_老師改過.docx',
]

function Glossary() {
  return (
    <dl className="rule-t">
      {GLOSSARY.map((t) => (
        <div key={t.word} className="rule-b py-5">
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
            <dt>
              <span className="num block text-[0.9375rem] text-ink">{t.word}</span>
              <span className="mt-0.5 block text-[0.8125rem] text-ink-3">
                {t.reading}
              </span>
            </dt>
            <dd>
              <p className="font-display text-[1.0625rem] leading-[1.5]">
                {t.short}
              </p>
              <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] leading-[1.85] text-ink-2">
                {t.detail}
              </p>
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

export default function StartPage() {
  return (
    <Page>
      <section className="pt-12 pb-14 md:pt-16">
        <p className="label mb-6">入門 · 01</p>
        <h1 className="font-display max-w-[13em] text-[2rem] leading-[1.2] md:text-[2.875rem]">
          你已經在用一種
          <br />
          很爛的版本控制了。
        </h1>
        <div className="prose mt-7 max-w-[52ch] text-[1.0625rem] leading-[1.95]">
          <p>
            這頁是給完全沒碰過 git 的人。不需要先會寫程式，也不需要先懂什麼是終端機 ——
            那些等一下會講。
          </p>
          <p>
            讀完加上動手按完，大概二十分鐘。之後你會知道 git
            在解決什麼問題、會親眼看過一個 commit 是怎麼生出來的，
            也會有一張看得懂的詞彙表可以隨時翻回來。
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ A */}
      <section className="pb-16">
        <SectionHead
          num="A"
          title="git 在解決什麼問題"
          lead="先不要管它是什麼。先看它要處理的那個麻煩 —— 你一定遇過。"
        />
        <WithMargin
          margin={
            <Marginal label="為什麼會這樣">
              不是因為懶。是因為你不確定新的一定比舊的好，
              所以不敢覆蓋掉舊的 —— 那是一個完全合理的反應。
            </Marginal>
          }
        >
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <ul className="border border-rule">
              {MESSY_FOLDER.map((f, i) => (
                <li
                  key={f}
                  className={`num border-b border-rule-soft px-3 py-2 text-[0.8125rem] last:border-b-0 ${
                    i >= 4 ? 'text-vermilion' : 'text-ink-2'
                  }`}
                >
                  {f}
                </li>
              ))}
            </ul>

            <div className="prose text-[1rem] leading-[1.95]">
              <p>
                這就是版本控制 —— 只是做得很爛的版本控制。它會壞在幾個地方：
                過兩週你分不出哪個才是最新的；你不知道每一版之間差在哪；
                更不知道當初為什麼要改。而且如果有第二個人一起改，就徹底沒救了。
              </p>
              <p>
                <strong>git 做的是同一件事，只是做對了。</strong>
                資料夾裡永遠只有一個「報告.docx」，但你決定要留的每一個版本都還在，
                而且知道先後順序、知道每一版改了哪幾行、知道你當時寫下的理由。
              </p>
              <p>
                關鍵在「你決定要留」。git
                不會自動幫你存每一次改動，它有意設計成要你開口 ——
                因為它記的不是檔案的每一秒，是你認為值得標記的那些時刻。
              </p>
            </div>
          </div>
        </WithMargin>
      </section>

      {/* ------------------------------------------------ B */}
      <section className="pb-16">
        <SectionHead
          num="B"
          title="跟著走一次"
          lead="八步，走完你就做出了第一個 commit。按「下一步」就好，不用打字 —— 但底下跑的是真的 git，看到的東西跟你自己動手打出來的一模一樣。"
        />
        <div className="mt-6">
          <Walkthrough />
        </div>
        <p className="mt-4 max-w-[62ch] text-[0.9375rem] leading-[1.85] text-ink-3">
          三格那張圖值得多看幾眼。之後不管遇到什麼指令，
          先問「這一步是把東西從哪一格搬到哪一格」，大部分的困惑就散了。
        </p>
      </section>

      {/* ------------------------------------------------ C */}
      <section className="pb-16">
        <SectionHead
          num="C"
          title="「打一個指令」是什麼意思"
          lead="如果你從來沒開過終端機，這一段給你。"
        />
        <WithMargin
          margin={
            <Marginal label="關於錯誤訊息">
              紅字不是在罵你。它是這個程式唯一能跟你說話的方式，
              而且通常已經把下一步寫在裡面了 —— 讀它，不要跳過它。
            </Marginal>
          }
        >
          <div className="prose mt-6 max-w-[58ch] text-[1rem] leading-[1.95]">
            <p>
              終端機就是一個你用打字叫電腦做事的地方。跟點選單比起來它沒有比較難，
              只是把「按哪裡」換成「寫哪個字」—— 好處是那句字可以抄給別人、可以存起來、
              可以講清楚你到底做了什麼。
            </p>
            <p>一行指令通常長這樣，拆開來只有四塊：</p>
          </div>

          <div className="rule-t mt-5">
            {COMMAND_ANATOMY.map((c) => (
              <div
                key={c.part}
                className="rule-b grid grid-cols-1 gap-x-6 gap-y-1 py-3 sm:grid-cols-[minmax(0,180px)_minmax(0,110px)_minmax(0,1fr)]"
              >
                <span className="num text-[0.875rem] text-ink">{c.part}</span>
                <span className="label-plain">{c.label}</span>
                <span className="text-[0.9375rem] leading-[1.8] text-ink-2">
                  {c.note}
                </span>
              </div>
            ))}
          </div>

          <div className="prose mt-6 max-w-[58ch] text-[1rem] leading-[1.95]">
            <p>
              這個站的沙盒就是一個假的終端機，打錯不會有任何後果 ——
              所以在這裡養成一個習慣：<strong>不確定的時候先打 <code>git status</code></strong>。
              它會告訴你現在三格各有什麼、你站在哪條分支上、下一步可以做什麼。
              卡住的時候先打它，比想半天有用。
            </p>
          </div>
        </WithMargin>
      </section>

      {/* ------------------------------------------------ D */}
      <section className="pb-16" id="glossary">
        <SectionHead
          num="D"
          title="最少要記的六個詞"
          lead="其他的以後遇到再說。這六個先夠你走完所有關卡 —— 卡住的時候翻回這裡。"
        />
        <div className="mt-6">
          <Glossary />
        </div>
      </section>

      {/* ------------------------------------------------ E */}
      <section className="pb-8">
        <div className="border border-rule px-5 py-6 md:px-8 md:py-8">
          <p className="label mb-3">最後一件事</p>
          <p className="font-display max-w-[26ch] text-[1.375rem] leading-[1.45] md:text-[1.75rem]">
            你不用先懂全部才能開始。
          </p>
          <div className="prose mt-4 max-w-[56ch] text-[1rem] leading-[1.95]">
            <p>
              沒有人是先讀完文件才會用 git 的。大家都是先做出一個 commit、
              再做出一條分支、然後在某次撞牆之後才真的懂 merge 是什麼。
            </p>
            <p>
              所以下一步不是繼續讀，是去撞一次。第 01
              關就是你剛剛按過的那八步，只是這次要你自己打。
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/quests/first-commit" mark>
              去做第一個 commit
            </Cta>
            <Cta href="/play">或先隨便亂按</Cta>
          </div>
        </div>
      </section>
    </Page>
  )
}
