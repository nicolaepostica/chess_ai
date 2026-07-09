import { describe, expect, it } from 'vitest'
import { createGame, getState, isValidFen, legalDests, tryMove } from './game'
import { loadPgn, toPgn } from './pgn'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'

describe('game', () => {
  it('starts from the standard position', () => {
    const state = getState(createGame())
    expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(state.turn).toBe('w')
    expect(state.isGameOver).toBe(false)
  })

  it('accepts a legal move and rejects an illegal one', () => {
    const game = createGame()
    expect(tryMove(game, 'e2', 'e4')).toBe(true)
    expect(getState(game).turn).toBe('b')
    expect(tryMove(game, 'e4', 'e8')).toBe(false)
    expect(getState(game).history).toEqual(['e4'])
  })

  it('detects checkmate', () => {
    const game = createGame(MATE_IN_ONE)
    expect(tryMove(game, 'a1', 'a8')).toBe(true)
    expect(getState(game).isGameOver).toBe(true)
  })

  it('lists legal destinations per square for chessground', () => {
    const dests = legalDests(createGame())
    expect(dests.get('e2')).toEqual(['e3', 'e4'])
    expect(dests.get('g1')).toEqual(['f3', 'h3'])
    expect(dests.has('e1')).toBe(false)
  })

  it('validates FEN without throwing', () => {
    expect(isValidFen(MATE_IN_ONE)).toBe(true)
    expect(isValidFen('garbage')).toBe(false)
    expect(isValidFen('')).toBe(false)
  })
})

describe('pgn', () => {
  it('round-trips a short game', () => {
    const game = createGame()
    tryMove(game, 'e2', 'e4')
    tryMove(game, 'e7', 'e5')

    const loaded = loadPgn(toPgn(game))
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(getState(loaded.game).history).toEqual(['e4', 'e5'])
  })

  it('reports an error for unparsable pgn instead of throwing', () => {
    const loaded = loadPgn('1. e4 e5 2. Qxq9 ##')
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.error).toBeTruthy()
  })
})
