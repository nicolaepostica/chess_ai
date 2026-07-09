import type { EvalUpdate } from '../engine/uci'
import type { Arrow } from './Board'

const BRUSHES = ['green', 'paleGreen', 'paleGrey'] as const

export function linesToArrows(lines: EvalUpdate[]): Arrow[] {
  return lines
    .slice(0, BRUSHES.length)
    .filter((line) => line.pv.length > 0)
    .map((line, index) => {
      const move = line.pv[0]
      return {
        orig: move.slice(0, 2),
        dest: move.slice(2, 4),
        brush: BRUSHES[index],
      }
    })
}
