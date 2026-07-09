import type { Chess } from 'chess.js'
import { useState } from 'react'
import { createGame, isValidFen } from '../game/game'
import { loadPgn } from '../game/pgn'

export type PositionInputProps = {
  onLoad: (game: Chess) => void
}

export function PositionInput({ onLoad }: PositionInputProps) {
  const [fen, setFen] = useState('')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitFen = () => {
    if (!isValidFen(fen.trim())) {
      setError('Invalid FEN')
      return
    }
    setError(null)
    onLoad(createGame(fen.trim()))
  }

  const submitPgn = () => {
    const result = loadPgn(pgn.trim())
    if (!result.ok) {
      setError(`Failed to parse PGN: ${result.error}`)
      return
    }
    setError(null)
    onLoad(result.game)
  }

  return (
    <section className="position-input">
      <label htmlFor="fen-input">FEN</label>
      <input id="fen-input" value={fen} onChange={(event) => setFen(event.target.value)} />
      <button type="button" onClick={submitFen}>
        Load FEN
      </button>

      <label htmlFor="pgn-input">PGN</label>
      <textarea id="pgn-input" rows={4} value={pgn} onChange={(event) => setPgn(event.target.value)} />
      <button type="button" onClick={submitPgn}>
        Load PGN
      </button>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
