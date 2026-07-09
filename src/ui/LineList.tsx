import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'
import './line-list.css'

export type LineListProps = {
  lines: EvalUpdate[]
  onSelect: (line: EvalUpdate, plyCount: number) => void
}

export function LineList({ lines, onSelect }: LineListProps) {
  if (lines.length === 0) return <p>Analyzing…</p>

  return (
    <ol className="line-list">
      {lines.map((line) => (
        <li key={line.multipv}>
          <strong>{formatScore(line.score)}</strong>{' '}
          {line.pv.slice(0, 8).map((move, index) => (
            <button
              key={`${move}-${index}`}
              type="button"
              className="pv-move"
              onClick={() => onSelect(line, index + 1)}
            >
              {move}
            </button>
          ))}
        </li>
      ))}
    </ol>
  )
}
