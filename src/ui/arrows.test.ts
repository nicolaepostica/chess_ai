import { expect, it } from 'vitest'
import type { EvalUpdate } from '../engine/uci'
import { linesToArrows } from './arrows'

const line = (multipv: number, pv: string[]): EvalUpdate => ({
  depth: 10,
  multipv,
  score: { type: 'cp', value: 0 },
  pv,
})

it('draws the best line in green and the rest paler', () => {
  const arrows = linesToArrows([line(1, ['e2e4']), line(2, ['d2d4']), line(3, ['g1f3'])])
  expect(arrows).toEqual([
    { orig: 'e2', dest: 'e4', brush: 'green' },
    { orig: 'd2', dest: 'd4', brush: 'paleGreen' },
    { orig: 'g1', dest: 'f3', brush: 'paleGrey' },
  ])
})

it('handles promotion moves, which carry a fifth character', () => {
  expect(linesToArrows([line(1, ['e7e8q'])])).toEqual([{ orig: 'e7', dest: 'e8', brush: 'green' }])
})

it('ignores lines with an empty pv', () => {
  expect(linesToArrows([line(1, [])])).toEqual([])
})

it('returns nothing for no lines', () => {
  expect(linesToArrows([])).toEqual([])
})
