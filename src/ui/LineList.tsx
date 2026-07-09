import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'

export function LineList({ lines }: { lines: EvalUpdate[] }) {
  if (lines.length === 0) return <p>Analyzing…</p>

  return (
    <ol className="line-list">
      {lines.map((line) => (
        <li key={line.multipv}>
          <strong>{formatScore(line.score)}</strong> <span>{line.pv.slice(0, 8).join(' ')}</span>
        </li>
      ))}
    </ol>
  )
}
