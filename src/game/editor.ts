import { isValidFen } from './game'

export const EMPTY_PLACEMENT = '8/8/8/8/8/8/8/8'

/**
 * chessground only exposes the piece placement. Castling and en passant rights
 * can't be recovered from it, so the editor zeroes them out.
 */
export function composeFen(placement: string, turn: 'w' | 'b'): string {
  return `${placement} ${turn} - - 0 1`
}

export function validatePlacement(
  placement: string,
  turn: 'w' | 'b',
): { ok: true; fen: string } | { ok: false; error: string } {
  const fen = composeFen(placement, turn)
  if (!isValidFen(fen)) {
    return { ok: false, error: 'Invalid position: both kings must be on the board.' }
  }
  return { ok: true, fen }
}
