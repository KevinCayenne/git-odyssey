import type { Metadata } from 'next'

import { Bleed, Page } from '@/components/editorial'
import { PlaySandbox } from '@/components/sandbox/PlaySandbox'

export const metadata: Metadata = {
  title: '沙盒',
  description: '一個真的會算的 git。打指令，看歷史在眼前分岔、合流、被改寫。',
}

export default function PlayPage() {
  return (
    <>
      <Page>
        <section className="pt-12 pb-8 md:pt-16">
          <p className="label mb-6">沙盒 · 01</p>
          <h1 className="font-display max-w-[14em] text-[2rem] leading-[1.22] md:text-[2.75rem]">
            弄壞它，不會有事。
          </h1>
          <div className="prose mt-6 max-w-[52ch] text-[0.9688rem] leading-[1.95]">
            <p>
              這裡的 git 是真的在算 —— 共同祖先、三方合併、rebase
              重播，全都跑跟真實 git 一樣的邏輯。所以它會在你以為不會出事的地方出事，
              那正是你需要它的原因。
            </p>
            <p>
              上面挑一個開場，下面打指令。左邊那張圖每一步都會跟著動；
              右邊三格是工作目錄、暫存區、和已經寫進歷史的東西。
              大部分人卡住不是忘了指令，是腦袋裡沒有那三格。
            </p>
          </div>
        </section>
      </Page>

      <Bleed>
        <PlaySandbox />
      </Bleed>

      <Page>
        <p className="mt-6 text-[0.8125rem] leading-[1.8] text-ink-3">
          指令都認得 <code className="num">--help</code> 以外的常見寫法：
          <span className="num"> git switch -c</span>、
          <span className="num"> git merge --no-ff</span>、
          <span className="num"> git reset --hard HEAD~2</span>、
          <span className="num"> git rebase --continue</span>。
          檔案用 <span className="num">write 檔名 內容</span> 建立，
          <span className="num"> cat</span> 打開來看。想不起來就打{' '}
          <span className="num">help</span>。
        </p>
      </Page>
    </>
  )
}
