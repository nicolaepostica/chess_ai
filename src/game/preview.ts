import { Chess } from 'chess.js'

/**
 * Replays UCI moves from a base position and returns the resulting FEN.
 * Mutates nothing: it runs on its own Chess instance.
 */
export function previewFen(baseFen: string, uciMoves: string[]): string | null {
  try {
    const game = new Chess(baseFen)
    for (const move of uciMoves) {
      game.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.length > 4 ? move[4] : undefined,
      })
    }
    return game.fen()
  } catch {
    return null
  }
}
