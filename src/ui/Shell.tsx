import type { ReactNode } from 'react'
import { Nav } from './Nav'

const CONTAINER = 'mx-auto w-full max-w-[1600px] px-3 sm:px-6'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-white/2 backdrop-blur">
        <div className={`${CONTAINER} flex h-15 items-center gap-7`}>
          <span className="font-display text-lg font-bold whitespace-nowrap">
            Chess<span className="text-accent">Analyzer</span>
          </span>
          <Nav />
        </div>
      </header>
      <main className={`${CONTAINER} py-3 sm:py-6`}>{children}</main>
    </div>
  )
}
