# Git Odyssey — 分岔的時間

一個可以動手的 git 學習前端。看得見歷史怎麼分岔、怎麼合流、怎麼被改寫，
也看得見人跟 AI 各自在上面留下了什麼。

重點放在兩件事：

- **人和 AI 怎麼共用一個 repo** —— 當 agent 也會 commit 的時候，分支、審查、衝突各自變成什麼
- **Gitflow 怎麼融入生活** —— 那套分法拿來想事情意外地好用，特別是關於「怎麼放棄一個嘗試」

## 跑起來

```bash
npm install
npm run dev        # http://localhost:3000
```

其他指令：

```bash
npm run build      # 全站靜態輸出
npm test           # 引擎、關卡、圖形佈局的單元測試
npm run typecheck
npm run lint
npm run e2e        # 用真的瀏覽器把關卡打一遍（需要先跑起 server）
```

`npm run e2e` 預設連 `http://localhost:3000`，可以用 `BASE_URL` 換掉；
沒跑過 `npx playwright install` 的環境可以用 `CHROME_PATH` 指定瀏覽器。

## 這裡面有什麼

| 路徑 | 內容 |
| --- | --- |
| `/` | 卷首。整站的論點和目錄 |
| `/play` | 沙盒。五種開場，隨便亂搞 |
| `/quests` | 八個關卡，從第一個 commit 到完整的 gitflow |
| `/pair` | 人與 AI：四種相處模式、一份可以帶走的規矩 |
| `/lifeflow` | 生活流：gitflow 的分支語彙搬出程式碼之後 |

## 架構

```
src/lib/git/          一顆夠小、但不說謊的 git
  types.ts            資料模型
  repo.ts             走訪、共同祖先、三方合併、狀態
  commands.ts         指令解析與執行
  layout.ts           把 DAG 攤成橫向的圖
  diff.ts             LCS 行級差異
src/lib/quests/       關卡定義、場景腳本、示範用的 repo
src/components/       圖、終端機、沙盒、版面元件
src/app/              五個路由
```

### 引擎不是假的

`src/lib/git` 是一顆真的在算的 git：commit 是真的 DAG，合併是真的三方合併
（`mergeTrees` 同時被 merge、rebase、cherry-pick、revert 共用），
衝突是真的兩邊都動了同一個檔案，遠端的 `origin/*` 只有 `git fetch` 才會動。

所以它會在你以為不會出事的地方出事 —— 那正是它的用途。

每個 commit 會記下是人打的還是 agent 打的（`become me` / `become ai` 切換），
圖上用形狀分：圓點是人、菱形是 agent、空心圓是合流點。
顏色留給軌道用 —— 一張圖一次只用一種編碼講一件事。

### 圖的軌道順序就是 gitflow 的形狀

`layout.ts` 沿著第一個父親往回走來決定每個 commit 屬於哪條線，
認領順序照「誰是誰的娘家」排（main → develop → release → hotfix → feature），
顯示順序照穩定度排（越上面越穩定）。所以畫出來會自然長成教科書上那張 gitflow 圖。

### 關卡不可能出現過不了的目標

每一關都附一條走得通的解法腳本，測試會整條跑一遍、逐項確認目標亮燈，
同時檢查一進場一個綠勾都不該有。寫壞的檢查條件會在 CI 就被抓到，不會出現在使用者面前。

## 設計

排版走印刷品的路線，刻意避開現在網頁預設的那種樣子：

- **全站沒有一個無襯線字**。標題是 Fraunces（開了 `WONK` 軸，字會微微歪，像鉛字），
  中文用思源宋體，指令和數字一律 JetBrains Mono
- **沒有陰影、沒有漸層、圓角最多 2px**。結構靠 1px 的線和留白撐著
- 紙色底加一層幾乎看不見的顆粒；日／夜兩套色票都手調過
- 中文段落用首行縮排接續，不是空行

色票取自印刷用色：朱、靛、苔、赭、紫，分別對應 main、develop、feature、release、hotfix。

## 技術

Next.js 16（App Router、Turbopack）、React 19、TypeScript strict
（含 `noUncheckedIndexedAccess`）、Tailwind CSS v4。全站靜態輸出，沒有後端。
進度存在瀏覽器的 localStorage 裡，沒有帳號。
