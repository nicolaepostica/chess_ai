import type { Score } from '../engine/uci'

/** Logistic curve: 400 centipawns ≈ 76% expected score. */
export function whiteWinProbability(score: Score): number {
  if (score.type === 'mate') return score.value > 0 ? 1 : 0
  return 1 / (1 + Math.pow(10, -score.value / 400))
}

export function formatScore(score: Score): string {
  if (score.type === 'mate') {
    return score.value >= 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`
  }
  const pawns = score.value / 100
  if (pawns === 0) return '0.00'
  return `${pawns > 0 ? '+' : '-'}${Math.abs(pawns).toFixed(2)}`
}

export function EvalBar({ score, orientation }: { score: Score | null; orientation: 'white' | 'black' }) {
  const whiteShare = score ? whiteWinProbability(score) : 0.5
  const whiteHeight = `${whiteShare * 100}%`

  return (
    <div
      data-testid="eval-bar"
      className="eval-bar"
      style={{
        display: 'flex',
        flexDirection: orientation === 'white' ? 'column-reverse' : 'column',
        width: '24px',
        height: 'min(80vh, 640px)',
        background: '#403d39',
        position: 'relative',
      }}
    >
      <div style={{ height: whiteHeight, background: '#f0f0f0', transition: 'height 200ms' }} />
      <span
        style={{
          position: 'absolute',
          inset: 'auto 0 4px 0',
          textAlign: 'center',
          fontSize: '10px',
          color: '#111',
        }}
      >
        {score ? formatScore(score) : '…'}
      </span>
    </div>
  )
}
