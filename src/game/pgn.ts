import { Chess } from 'chess.js'

export type PgnResult = { ok: true; game: Chess } | { ok: false; error: string }

export function loadPgn(pgn: string): PgnResult {
  const game = new Chess()
  try {
    game.loadPgn(pgn)
    return { ok: true, game }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function toPgn(game: Chess): string {
  return game.pgn()
}
