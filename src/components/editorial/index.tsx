import Link from 'next/link'

/** 版面的骨架。全站共用同一組留白，頁面之間才不會各長各的。 */

export function Page({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`mx-auto w-full px-5 md:px-10 ${wide ? 'max-w-[1400px]' : 'max-w-[1080px]'}`}
    >
      {children}
    </div>
  )
}

/** 一整頁寬、被線框起來的區塊（沙盒用） */
export function Bleed({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-0 md:px-10">
      <div className="border-y border-rule md:border">{children}</div>
    </div>
  )
}

export function SectionHead({
  num,
  title,
  lead,
}: {
  num: string
  title: string
  lead?: string
}) {
  return (
    <div className="rule-b flex flex-col gap-3 pb-4 md:flex-row md:items-baseline md:gap-8">
      <span className="num shrink-0 text-[11px] text-vermilion">{num}</span>
      <div className="min-w-0">
        <h2 className="font-display text-[26px] leading-[1.3] md:text-[30px]">
          {title}
        </h2>
        {lead && (
          <p className="mt-1.5 max-w-[54ch] text-[15px] leading-[1.85] text-ink-2">
            {lead}
          </p>
        )}
      </div>
    </div>
  )
}

/** 側註。寬螢幕時貼在右邊的空白處，窄螢幕就變成正文裡的一段小字。 */
export function Marginal({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <aside className="border-l border-rule py-1 pl-4 text-[13px] leading-[1.8] text-ink-2">
      {label && <span className="label mb-1 block">{label}</span>}
      {children}
    </aside>
  )
}

/** 兩欄：正文 + 側註槽 */
export function WithMargin({
  children,
  margin,
}: {
  children: React.ReactNode
  margin?: React.ReactNode
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,236px)] lg:gap-12">
      <div className="min-w-0">{children}</div>
      <div className="lg:pt-1">{margin}</div>
    </div>
  )
}

export function Figure({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <figure className="border border-rule">
      <div className="overflow-hidden">{children}</div>
      <figcaption className="rule-t px-4 py-2 text-[12.5px] leading-[1.7] text-ink-3">
        {caption}
      </figcaption>
    </figure>
  )
}

/** 條列，但用印刷品的方式：編號在左，內容在右，中間一條線 */
export function Ledger({
  rows,
}: {
  rows: Array<{ key: string; term: string; def: React.ReactNode; note?: string }>
}) {
  return (
    <dl className="rule-t">
      {rows.map((row) => (
        <div
          key={row.key}
          className="rule-b grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[minmax(0,196px)_minmax(0,1fr)] sm:gap-6"
        >
          <dt>
            <span className="num block text-[13px] leading-[1.6] text-ink">
              {row.term}
            </span>
            {row.note && (
              <span className="label-plain mt-0.5 block">{row.note}</span>
            )}
          </dt>
          <dd className="text-[14.5px] leading-[1.85] text-ink-2">{row.def}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Cta({
  href,
  children,
  mark = false,
}: {
  href: string
  children: React.ReactNode
  mark?: boolean
}) {
  return (
    <Link href={href} className={`btn ${mark ? 'btn-mark' : ''}`}>
      {children}
      <span aria-hidden>→</span>
    </Link>
  )
}
