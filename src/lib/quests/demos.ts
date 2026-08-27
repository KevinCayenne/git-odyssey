import type { Repo } from '../git/types'
import { scenario } from './build'

/**
 * 給說明頁用的靜態場景。
 *
 * 都是用引擎跑出來的，不是手畫的圖 —— 所以頁面上看到的形狀，
 * 就是你自己在沙盒裡打那些指令會得到的形狀。
 */

/** 完整的 gitflow：main / hotfix / release / develop / feature 五條軌道 */
export function gitflowDemo(): Repo {
  return scenario([
    'git init',
    'write app.md v1',
    'git add .',
    'git commit -m "v1 上線"',
    'git tag v1.0',
    'git switch -c develop',
    'git switch -c feature/export',
    'write export.md 匯出成 CSV',
    'git add .',
    'git commit -m "加上匯出"',
    'git switch develop',
    'git merge --no-ff feature/export',
    'git switch -c release/1.1',
    'write CHANGELOG.md 1.1 新增匯出',
    'git add .',
    'git commit -m "定裝：只修不加"',
    'git switch main',
    'git merge --no-ff release/1.1',
    'git tag v1.1',
    'git switch -c hotfix/login',
    'write app.md v1\\n登入修好了',
    'git add .',
    'git commit -m "登入壞掉，直接補"',
    'git switch main',
    'git merge --no-ff hotfix/login',
  ])
}

/** 人跟 agent 各走一條線，最後在 main 上合流 */
export function pairDemo(): Repo {
  return scenario([
    'git init',
    'write app.md 主程式',
    'git add .',
    'git commit -m "現在的樣子"',
    'git switch -c agent/refactor',
    'become ai',
    'write app.md 主程式\\n抽成三個函式',
    'git add .',
    'git commit -m "把長函式拆開"',
    'write test.md 補上測試',
    'git add .',
    'git commit -m "補測試"',
    'become me',
    'git switch main',
    'write notes.md 這禮拜要處理的事',
    'git add .',
    'git commit -m "整理待辦"',
    'git merge --no-ff agent/refactor',
  ])
}

/** 一條實驗習慣收進生活、另一條還在觀察 —— 生活流那頁用 */
export function lifeDemo(): Repo {
  return scenario([
    'git init',
    'write 一天.md 八點半起床，通勤，工作，滑手機',
    'git add .',
    'git commit -m "現在的生活，能跑"',
    'git switch -c develop',
    'git switch -c feature/晨跑',
    'write 一天.md 六點半起床，晨跑，通勤，工作',
    'git add .',
    'git commit -m "第一週：撐住了"',
    'write 一天.md 六點半起床，晨跑，通勤，工作，十一點睡',
    'git add .',
    'git commit -m "第二週：連睡覺時間也固定了"',
    'git switch develop',
    'git merge --no-ff feature/晨跑',
    'git switch -c feature/戒咖啡',
    'write 飲料.md 改喝無咖啡因',
    'git add .',
    'git commit -m "試三天"',
    'git switch develop',
    'git switch main',
    'git merge --no-ff develop',
    'git tag 這個月的我',
    'git switch feature/戒咖啡',
  ])
}
