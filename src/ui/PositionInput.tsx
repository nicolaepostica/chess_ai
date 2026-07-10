import type { Chess } from 'chess.js'
import { useState } from 'react'
import { createGame, isValidFen } from '../game/game'
import { loadPgn } from '../game/pgn'
import { SECONDARY_BUTTON as BUTTON } from './buttonStyles'

const FIELD =
  'w-full rounded-lg border border-border bg-black/35 px-2.5 py-2 font-mono text-xs text-fg placeholder:text-fg-muted'

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
      setError(`Could not parse PGN: ${result.error}`)
      return
    }
    setError(null)
    onLoad(result.game)
  }

  return (
    <section className="position-input flex flex-col gap-2">
      <label htmlFor="fen-input" className="text-[13px] text-fg-secondary">
        FEN
      </label>
      <input id="fen-input" className={FIELD} value={fen} onChange={(e) => setFen(e.target.value)} />
      <button type="button" className={`${BUTTON} self-start`} onClick={submitFen}>
        Load FEN
      </button>

      <label htmlFor="pgn-input" className="mt-2 text-[13px] text-fg-secondary">
        PGN
      </label>
      <textarea
        id="pgn-input"
        rows={3}
        className={FIELD}
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
      />
      <button type="button" className={`${BUTTON} self-start`} onClick={submitPgn}>
        Load PGN
      </button>

      {error && (
        <p role="alert" className="text-[13px] text-accent-alt">
          {error}
        </p>
      )}
    </section>
  )
}
