import type { BranchKind } from '@/lib/git/layout'

/** 顏色只講一件事：這是哪一條軌道。形狀才講是誰做的。 */
export const LANE_COLOR: Record<BranchKind, string> = {
  main: 'var(--vermilion)',
  develop: 'var(--indigo)',
  feature: 'var(--moss)',
  release: 'var(--ochre)',
  hotfix: 'var(--plum)',
  loose: 'var(--ink-3)',
}
