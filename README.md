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
| `/teach` | 講師手冊：五段課堂示範、排課表、怎麼收作業 |

## 拿來上課

`/teach` 那頁是給站在台上的人用的，重點在三個機制：

**把一段操作編進網址。** 沙盒右下角的「複製這一段的連結」會把你打過的每一步
編成 `?s=…`。別人點開會重播整段 —— 連終端機的逐行輸出都會長回來，
而且是可以繼續往下打的活狀態，不是截圖。

老師拿來出題（把場面弄好，貼連結給全班），學生拿來交作業或問「我卡在這裡」。
存的是指令不是快照，所以連結很短：八關的解法全部串起來也不到 2 KB。

**投影模式。** 右下角的「投影」把字和圖整個放大，顏色和結構不變。

**進度匯出。** 關卡列表上的「複製進度」產生一段可以貼進表單的清單。
進度存在瀏覽器的 localStorage，換裝置就沒了 —— 上課前提醒一句。

課堂示範腳本寫在 `src/lib/quests/demos-teaching.ts`，**每次 CI 都會被跑過一遍**，
確認指令還有效、該卡住的地方真的會卡住。連結由 `encodeSession` 現算，
所以腳本改了連結一定跟著對。

## 部署

沒有後端、沒有 API route，所以哪裡都放得下。

**Vercel** —— 連上 repo 就好，不用設定。

**GitHub Pages** —— `.github/workflows/pages.yml` 已經寫好了。
到 repo 的 Settings → Pages 把 Source 設成 GitHub Actions，push 到 `main` 就會部署。
子路徑（`/<repo>`）由 `actions/configure-pages` 自動帶進 `BASE_PATH`。

**其他靜態空間** ——

```bash
STATIC_EXPORT=1 BASE_PATH=/子路徑 npm run build   # 產出在 out/
```

`BASE_PATH` 只有在網址不是掛根目錄的時候才需要。

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

- **中文指定微軟正黑體**。它是 Windows 內建的專有字型，不能自架，所以只能寫在字型堆疊
  最前面：有裝的人看得到，沒裝的往後掉到思源黑體（我們自己載的網路字型，同樣是黑體，
  字面感覺很近）。拉丁字是 Fraunces，指令和數字一律 JetBrains Mono
- 中西混排的標題 —— 拉丁走襯線、中文走黑體 —— 在中文編輯設計裡是常見作法
- **沒有陰影、沒有漸層、圓角最多 2px**。結構靠 1px 的線和留白撐著
- 紙色底加一層幾乎看不見的顆粒；日／夜兩套色票都手調過
- 中文段落用首行縮排接續，不是空行

色票取自印刷用色：朱、靛、苔、赭、紫，分別對應 main、develop、feature、release、hotfix。

## 技術

Next.js 16（App Router、Turbopack）、React 19、TypeScript strict
（含 `noUncheckedIndexedAccess`）、Tailwind CSS v4。全站靜態輸出，沒有後端。
進度存在瀏覽器的 localStorage 裡，沒有帳號。

CSS 有一個地方值得記住：自訂樣式全部包在 `@layer base` / `@layer components` 裡。
Tailwind v4 把工具類放進 `@layer utilities`，而層疊層的規則是「沒有分層的樣式一律
贏過有分層的」—— 跟特異性無關，`:where()` 也救不了。掉出層外的話，
`className="label hover:text-ink"` 的 hover 會安靜地失效，
`border-moss` 也會被 `* { border-color }` 蓋掉：看起來活著，其實是死的。
`npm run e2e` 有一段專門守這條線。
