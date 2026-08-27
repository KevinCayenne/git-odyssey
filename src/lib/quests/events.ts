import { simulateRemotePush } from '../git/commands'
import type { SandboxEvent } from './types'

/**
 * 「別人動了」的按鈕。
 *
 * 放在這裡而不是元件裡，是因為分享連結會用 id 記住按過哪些事件，
 * 重播和測試都要拿得到同一份定義。
 */
export const SANDBOX_EVENTS: SandboxEvent[] = [
  {
    id: 'agent-push',
    label: 'agent 推了東西到 origin',
    note: '遠端動了，但你的本地一動也沒動。git fetch 之後才看得到 —— 這就是 fetch 跟 pull 的差別。',
    apply: (repo) =>
      simulateRemotePush(
        repo,
        'main',
        'agent：順手補上錯誤處理',
        { 'errors.md': '統一的錯誤處理' },
        'agent',
      ),
  },
  {
    id: 'teammate-push',
    label: '同事推了東西到 origin',
    note: '再試一次 git push 就會被擋下來。那不是刁難，是在保護對方的 commit 不被你蓋掉。',
    apply: (repo) =>
      simulateRemotePush(
        repo,
        'main',
        '同事：補上安裝說明',
        { 'README.md': '安裝：npm install' },
        'human',
      ),
  },
]
