import type { Metadata } from 'next'
import Link from 'next/link'

import { Page } from '@/components/editorial'
import { QuestIndex } from '@/components/quests/QuestIndex'

export const metadata: Metadata = {
  title: '關卡',
  description: '八個具體的場面，從第一個 commit 一路走到完整的 gitflow。',
}

export default function QuestsPage() {
  return (
    <Page>
      <section className="pt-12 pb-10 md:pt-16">
        <p className="label mb-6">關卡 · 04</p>
        <h1 className="font-display max-w-[14em] text-[2rem] leading-[1.22] md:text-[2.75rem]">
          八個會讓你卡住的場面。
        </h1>
        <div className="prose mt-6 max-w-[52ch] text-[0.9688rem] leading-[1.95]">
          <p>
            每一關都是一個具體的處境，不是指令表 ——
            兩個人同時改了同一句話、agent 推了一批東西上去、
            某個 commit 把密鑰寫死了而它已經出門了。
          </p>
          <p>
            關卡會自己檢查你有沒有做到，但不會告訴你該打什麼。
            提示要按了才出現，答案在提示用完之後才給。
            這個順序是故意的。
          </p>
        </div>

        <div className="mt-7 border border-rule px-5 py-4">
          <p className="label mb-1.5">完全沒碰過 git？</p>
          <p className="max-w-[56ch] text-[0.9688rem] leading-[1.9] text-ink-2">
            第 01 關一開始就會叫你打 <code className="num">git init</code>。
            如果那行字對你來說已經是門檻，先去
            <Link
              href="/start"
              className="mx-1 underline decoration-vermilion underline-offset-[3px]"
            >
              入門
            </Link>
            —— 八步、不用打字，走完再回來。
          </p>
        </div>
      </section>

      <section className="pb-6">
        <QuestIndex />
      </section>
    </Page>
  )
}
