import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'

export type LineListProps = {
  lines: EvalUpdate[]
  onSelect: (line: EvalUpdate, plyCount: number) => void
}

export function LineList({ lines, onSelect }: LineListProps) {
  if (lines.length === 0) return <p className="py-2 text-sm text-fg-muted">Analyzing…</p>

  return (
    <ol className="line-list">
      {lines.map((line, index) => (
        <li
          key={line.multipv}
          className={`flex items-baseline gap-3 py-[7px] ${
            index > 0 ? 'border-t border-white/5' : ''
          }`}
        >
          <span className="w-2.5 shrink-0 text-xs text-fg-muted tabular-nums">{line.multipv}</span>
          <span
            className={`w-11 shrink-0 text-right font-mono text-[13px] tabular-nums ${
              index === 0 ? 'font-semibold text-accent' : 'text-fg-secondary'
            }`}
          >
            {formatScore(line.score)}
          </span>
          <span
            className={`flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[13px] ${
              index === 0 ? 'text-fg' : 'text-fg-secondary'
            }`}
          >
            {line.pv.slice(0, 8).map((move, ply) => (
              <button
                key={`${move}-${ply}`}
                type="button"
                className="pv-move rounded px-1 py-px hover:bg-white/6"
                onClick={() => onSelect(line, ply + 1)}
              >
                {move}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ol>
  )
}
