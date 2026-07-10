import { Chess, validateFen } from 'chess.js'

export type Square = string

export type GameState = {
  fen: string
  history: string[]
  turn: 'w' | 'b'
  isGameOver: boolean
}

export function createGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess()
}

export function isValidFen(fen: string): boolean {
  return validateFen(fen).ok
}

export function tryMove(game: Chess, from: Square, to: Square, promotion = 'q'): boolean {
  try {
    game.move({ from, to, promotion })
    return true
  } catch {
    // chess.js throws on an illegal move. For us this is not exceptional: the
    // user just dragged a piece to the wrong square.
    return false
  }
}

export function getState(game: Chess): GameState {
  return {
    fen: game.fen(),
    history: game.history(),
    turn: game.turn(),
    isGameOver: game.isGameOver(),
  }
}

/** chessground expects Map<from, to[]>. */
export function legalDests(game: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>()
  for (const move of game.moves({ verbose: true })) {
    const existing = dests.get(move.from)
    if (existing) existing.push(move.to)
    else dests.set(move.from, [move.to])
  }
  return dests
}
