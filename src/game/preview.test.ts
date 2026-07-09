import { expect, it } from 'vitest'
import { previewFen } from './preview'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

it('applies a single uci move', () => {
  expect(previewFen(START, ['e2e4'])).toBe(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  )
})

it('applies a sequence of uci moves', () => {
  const fen = previewFen(START, ['e2e4', 'e7e5', 'g1f3'])
  expect(fen).toContain(' b ')
  expect(fen!.startsWith('rnbqkbnr/pppp1ppp')).toBe(true)
})

it('returns the base position for an empty move list', () => {
  expect(previewFen(START, [])).toBe(START)
})

it('handles promotion moves', () => {
  const fen = previewFen('8/P6k/8/8/8/8/8/7K w - - 0 1', ['a7a8q'])
  expect(fen).toContain('Q7/7k')
})

it('returns null for an illegal move instead of throwing', () => {
  expect(previewFen(START, ['e2e5'])).toBeNull()
})

it('returns null for an invalid base position', () => {
  expect(previewFen('garbage', ['e2e4'])).toBeNull()
})
