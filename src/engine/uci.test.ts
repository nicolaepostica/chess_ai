import { describe, expect, it } from 'vitest'
import { parseUciLine } from './uci'

describe('parseUciLine', () => {
  it('parses an info line with a centipawn score', () => {
    const line =
      'info depth 12 seldepth 17 multipv 3 score cp 616 nodes 29259 nps 328752 hashfull 7 time 89 pv a1e1 h7h6 g1f1'
    expect(parseUciLine(line)).toEqual({
      kind: 'info',
      update: {
        depth: 12,
        multipv: 3,
        score: { type: 'cp', value: 616 },
        pv: ['a1e1', 'h7h6', 'g1f1'],
      },
    })
  })

  it('parses an info line with a mate score', () => {
    const line = 'info depth 1 seldepth 2 multipv 1 score mate 1 nodes 82 nps 8200 time 10 pv a1a8'
    expect(parseUciLine(line)).toEqual({
      kind: 'info',
      update: {
        depth: 1,
        multipv: 1,
        score: { type: 'mate', value: 1 },
        pv: ['a1a8'],
      },
    })
  })

  it('defaults multipv to 1 when the engine omits it', () => {
    const line = 'info depth 5 score cp 20 nodes 100 pv e2e4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.multipv).toBe(1)
  })

  it('does not confuse seldepth with depth', () => {
    const line = 'info seldepth 30 depth 4 score cp 10 pv e2e4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.depth).toBe(4)
  })

  it('parses a negative mate score (the side to move is getting mated)', () => {
    const line = 'info depth 8 multipv 1 score mate -3 pv e1e2'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.score).toEqual({ type: 'mate', value: -3 })
  })

  it('tolerates lowerbound between the score and the next token', () => {
    const line = 'info depth 9 multipv 1 score cp 33 lowerbound nodes 500 pv d2d4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.score).toEqual({ type: 'cp', value: 33 })
  })

  it('parses bestmove', () => {
    expect(parseUciLine('bestmove a1a8')).toEqual({ kind: 'bestmove', move: 'a1a8' })
  })

  it('parses bestmove with a ponder move', () => {
    expect(parseUciLine('bestmove e2e4 ponder e7e5')).toEqual({ kind: 'bestmove', move: 'e2e4' })
  })

  it('parses handshake replies', () => {
    expect(parseUciLine('uciok')).toEqual({ kind: 'uciok' })
    expect(parseUciLine('readyok')).toEqual({ kind: 'readyok' })
  })

  it('returns other for info lines without a score or pv', () => {
    expect(parseUciLine('info depth 1 currmove e2e4 currmovenumber 1').kind).toBe('other')
    expect(parseUciLine('info string NNUE evaluation using nn-x.nnue').kind).toBe('other')
    expect(parseUciLine('info depth 20 score cp 15 nodes 100').kind).toBe('other')
  })

  it('returns other for engine banner and option lines', () => {
    expect(parseUciLine('Stockfish 18 Lite WASM by the Stockfish developers').kind).toBe('other')
    expect(parseUciLine('option name MultiPV type spin default 1 min 1 max 500').kind).toBe('other')
  })

  it('returns other for bestmove without a move', () => {
    expect(parseUciLine('bestmove').kind).toBe('other')
  })
})
