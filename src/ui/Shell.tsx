import type { ReactNode } from 'react'
import { Nav } from './Nav'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-white/2 backdrop-blur">
        <div className="flex h-15 items-center gap-7 px-6">
          <span className="font-display text-lg font-bold whitespace-nowrap">
            Chess<span className="text-accent">Analyzer</span>
          </span>
          <Nav />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
