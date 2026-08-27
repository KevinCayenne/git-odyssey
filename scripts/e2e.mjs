import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// CHROME_PATH 給沒有跑過 playwright install 的環境用（例如 CI 沙盒）
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
)
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
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

console.log('\n瀏覽器錯誤：', errors.length ? errors.join('\n') : '無')
await browser.close()
