import type { ReactNode } from 'react'

export function Card({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface px-[18px] py-4">
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <h2 className="font-display text-[15px] font-medium text-fg">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
