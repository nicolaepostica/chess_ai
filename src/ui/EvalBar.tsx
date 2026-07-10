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

export function EvalBar({
  score,
  orientation,
}: {
  score: Score | null
  orientation: 'white' | 'black'
}) {
  const whiteShare = score ? whiteWinProbability(score) : 0.5

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
      {/*
        Подпись прижата к низу, а что под ней — светлая заливка белых или тёмный
        корпус бара — зависит от ориентации и доли белых. Ни константный цвет, ни
        порог по доле здесь не работают: граница «залито/не залито» задаётся
        высотой подписи в пикселях, делённой на высоту бара, а бар меняет размер
        от ~300px до 640px. Поэтому под текстом всегда лежит собственная тёмная
        плашка: 16.3:1 на корпусе, 10.9:1 на заливке. Геометрию знать не нужно.
      */}
      <span className="absolute inset-x-0.5 bottom-1 rounded-sm bg-well/85 py-px text-center font-mono text-[10px] font-semibold text-fg tabular-nums">
        {score ? formatScore(score) : '…'}
      </span>
    </div>
  )
}
