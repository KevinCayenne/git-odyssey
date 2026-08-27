import type { Tree } from './types'

export interface DiffLine {
  sign: ' ' | '+' | '-'
  text: string
}

/** 經典 LCS。檔案都很小，二維表格便宜得很。 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')
  const n = a.length
  const m = b.length

  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  )
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ sign: ' ', text: a[i]! })
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ sign: '-', text: a[i]! })
      i++
    } else {
      out.push({ sign: '+', text: b[j]! })
      j++
    }
  }
  while (i < n) out.push({ sign: '-', text: a[i++]! })
  while (j < m) out.push({ sign: '+', text: b[j++]! })

  return out
}

export interface FileDiff {
  path: string
  status: 'new' | 'deleted' | 'modified'
  lines: DiffLine[]
}

export function diffTree(before: Tree, after: Tree): FileDiff[] {
  const files = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  const out: FileDiff[] = []
  for (const path of files) {
    const a = before[path]
    const b = after[path]
    if (a === b) continue
    out.push({
      path,
      status: a === undefined ? 'new' : b === undefined ? 'deleted' : 'modified',
      lines: diffLines(a ?? '', b ?? ''),
    })
  }
  return out
}
