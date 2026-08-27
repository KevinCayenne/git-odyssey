import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// CHROME_PATH 給沒有跑過 playwright install 的環境用（例如 CI 沙盒）
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
)
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
const page = await context.newPage()

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

async function type(cmd) {
  await page.fill('input[aria-label="git 指令"]', cmd)
  await page.press('input[aria-label="git 指令"]', 'Enter')
  await page.waitForTimeout(130)
}

async function objectives() {
  return page.$$eval('input[aria-label="git 指令"]', () => []).then(async () => {
    return page.evaluate(() => {
      const marks = [...document.querySelectorAll('span.num')]
        .filter((s) => s.textContent === '✓' || s.textContent === '○')
        .map((s) => s.textContent)
      return marks
    })
  })
}

// --- 第 01 關：從頭做一次 ---
await page.goto(`${BASE}/quests/first-commit`, { waitUntil: 'networkidle' })
console.log('01 進場：', (await objectives()).join(''))

for (const c of ['git init', 'write notes.md 今天想到的事', 'git add .', 'git commit -m "開始記錄想法"']) {
  await type(c)
}
await page.waitForTimeout(400)
console.log('01 打完：', (await objectives()).join(''))
const cleared = await page.locator('text=過關').count()
console.log('01 過關面板：', cleared > 0 ? 'yes' : 'NO')

// --- 第 03 關：衝突 ---
await page.goto(`${BASE}/quests/conflict`, { waitUntil: 'networkidle' })
console.log('03 進場：', (await objectives()).join(''))
await type('git merge agent/rewrite-intro')
const conflictShown = await page.locator('text=衝突').count()
console.log('03 衝突有顯示：', conflictShown > 0 ? 'yes' : 'NO')
await type('write README.md 這是我週末寫來自動化重複工作的小工具。')
await type('git add README.md')
await type('git commit -m "兩邊各取一半"')
await page.waitForTimeout(400)
console.log('03 打完：', (await objectives()).join(''))

// --- 沙盒：切換開場 + 事件按鈕 ---
await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' })
await page.click('text=gitflow 現場')
await page.waitForTimeout(500)
const lanes = await page.locator('.num.block.truncate').count()
console.log('沙盒 gitflow 軌道數：', lanes)
await page.click('text=已經有一段歷史')
await page.waitForTimeout(300)
await page.click('text=agent 推了東西到 origin')
await page.waitForTimeout(300)
await type('git fetch')
await page.waitForTimeout(300)
const fetched = await page.locator('text=origin/main').count()
console.log('fetch 後看得到 origin/main：', fetched > 0 ? 'yes' : 'NO')

// --- 主題切換 ---
await page.click('button[aria-label="切換日／夜"]')
await page.waitForTimeout(300)
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
console.log('主題切換後：', theme)

// --- 分享連結：打一段、複製、換一個分頁點開，狀態要一模一樣 ---
await page.goto(`${BASE}/play`, { waitUntil: 'networkidle' })
await page.click('text=已經有一段歷史')
await page.waitForTimeout(300)
const script = [
  'git switch feature/search',
  'write extra.md 分享測試',
  'git add .',
  'git commit -m "看看連結傳不傳得過去"',
  'git status',
  'git switch main',
  'git merge --no-ff feature/search',
]
for (const c of script) await type(c)
await page.waitForTimeout(300)

const before = await page.evaluate(() =>
  [...document.querySelectorAll('.present-oid')].map((e) => e.textContent).join(','),
)
await page.click('text=/複製這一段的連結/')
await page.waitForTimeout(500)
const shared = await page.evaluate(() => navigator.clipboard.readText())
check('分享連結有 s 參數', shared.includes('s='), shared.slice(0, 60) + '…')

const fresh = await context.newPage()
await fresh.goto(shared, { waitUntil: 'networkidle' })
await fresh.waitForTimeout(700)
const after = await fresh.evaluate(() =>
  [...document.querySelectorAll('.present-oid')].map((e) => e.textContent).join(','),
)
check('點開連結重現出一模一樣的歷史', before === after && before.length > 0)
const echoed = await fresh.evaluate(() =>
  [...document.querySelectorAll('.term-echo')].map((e) => e.textContent),
)
check(
  '連結重現了整段終端機紀錄',
  script.every((c) => echoed.includes(c)),
  `${echoed.length}/${script.length} 行`,
)
check(
  '唯讀指令也留在紀錄裡（那是教學內容，不是雜訊）',
  echoed.includes('git status'),
)
await fresh.close()

// --- 投影模式 ---
await page.click('text=投影')
await page.waitForTimeout(300)
const present = await page.evaluate(
  () => document.documentElement.getAttribute('data-present'),
)
const fontSize = await page.evaluate(() => {
  const el = document.querySelector('.term')
  return el ? parseFloat(getComputedStyle(el).fontSize) : 0
})
check('投影模式打開', present === '1')
check('終端機字級真的變大', fontSize >= 16, `${fontSize}px`)
await page.click('text=投影')
await page.waitForTimeout(200)

// --- 講師頁的示範連結 ---
await page.goto(`${BASE}/teach`, { waitUntil: 'networkidle' })
const jump = page.getByRole('link', { name: '直接跳到結果' })
const jumpLinks = await jump.count()
check('講師頁列出五段示範', jumpLinks === 5, `找到 ${jumpLinks} 個`)
await jump.nth(2).click()
await page.waitForTimeout(900)
const conflictShownAgain = await page.locator('text=/衝突/').count()
check('第 03 段的連結點開就卡在衝突上', conflictShownAgain > 0)

// --- 層疊層回歸測試 ---
// 自訂樣式一旦掉出 @layer，Tailwind 的工具類就蓋不過去，
// 所有小按鈕的 hover 和語意色邊框會安靜地失效。這裡守住那條線。
await page.goto(`${BASE}/play?p=gitflow`, { waitUntil: 'networkidle' })
const themeBtn = page.locator('button[aria-label="切換日／夜"]')
const restColor = await themeBtn.evaluate((e) => getComputedStyle(e).color)
await themeBtn.hover()
await page.waitForTimeout(250)
const hoverColor = await themeBtn.evaluate((e) => getComputedStyle(e).color)
check('小按鈕的 hover 真的會變色', restColor !== hoverColor, `${restColor} → ${hoverColor}`)

const presentBtn = page.locator('button[title*="放大字和圖"]')
await presentBtn.click()
await page.waitForTimeout(250)
const activeColor = await presentBtn.evaluate((e) => getComputedStyle(e).color)
check('啟用中的狀態看得出來', activeColor !== restColor, activeColor)
await presentBtn.click()

const eventBorder = await page
  .locator('button:has-text("agent 推了東西到 origin")')
  .first()
  .evaluate((e) => getComputedStyle(e).borderTopColor)
const ruleBorder = await page
  .locator('.rule-b')
  .first()
  .evaluate((e) => getComputedStyle(e).borderBottomColor)
check('語意色邊框沒有被通用邊框色蓋掉', eventBorder !== ruleBorder, eventBorder)

check('沒有瀏覽器錯誤', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(failures ? `\n${failures} 項沒過` : '\n全部通過')
process.exit(failures ? 1 : 0)
