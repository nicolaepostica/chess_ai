import { expect, it } from 'vitest'
import { composeFen, EMPTY_PLACEMENT, validatePlacement } from './editor'

it('composes a full fen from a placement and a side to move', () => {
  expect(composeFen('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'w')).toBe('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')
  expect(composeFen('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'b')).toBe('6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1')
})

it('accepts a legal placement', () => {
  const result = validatePlacement('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'w')
  expect(result).toEqual({ ok: true, fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1' })
})

it('rejects an empty board', () => {
  const result = validatePlacement(EMPTY_PLACEMENT, 'w')
  expect(result.ok).toBe(false)
})

it('rejects a position missing a king', () => {
  const result = validatePlacement('6k1/5ppp/8/8/8/8/5PPP/R7', 'w')
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeTruthy()
})
