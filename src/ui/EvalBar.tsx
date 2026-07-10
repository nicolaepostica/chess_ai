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

/**
 * Оценка печатается у нижнего края. Что под ней — светлая заливка белых или
 * тёмный корпус бара — зависит от ориентации и от доли белых, поэтому цвет
 * текста обязан выбираться, а не задаваться константой.
 *
 * Порог 0.05 — это запас: подпись занимает около 12px, а бар не бывает ниже
 * ~300px, то есть 4%. При доле меньше порога низ гарантированно не залит.
 */
export function readoutOnFill(whiteShare: number, orientation: 'white' | 'black'): boolean {
  return orientation === 'white' ? whiteShare >= 0.05 : whiteShare >= 0.95
}

export function EvalBar({
  score,
  orientation,
}: {
  score: Score | null
  orientation: 'white' | 'black'
}) {
  const whiteShare = score ? whiteWinProbability(score) : 0.5
  const onFill = readoutOnFill(whiteShare, orientation)

  return (
    <div
      data-testid="eval-bar"
      className={`relative w-7 shrink-0 overflow-hidden rounded-md border border-border bg-well ${
        orientation === 'white' ? 'flex flex-col-reverse' : 'flex flex-col'
      }`}
      style={{ height: 'var(--board-size)' }}
    >
      <div
        className="w-full bg-fg transition-[height] duration-200"
        style={{ height: `${whiteShare * 100}%` }}
      />
      <span
        className={`absolute inset-x-0 bottom-1 text-center font-mono text-[10px] font-semibold tabular-nums ${
          onFill ? 'text-bg' : 'text-fg'
        }`}
      >
        {score ? formatScore(score) : '…'}
      </span>
    </div>
  )
}
