import { useCallback, useMemo, useState } from 'react'
import { createGame, getState, legalDests, tryMove } from './game/game'
import { Board } from './ui/Board'

export function App() {
  const [game] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const dests = useMemo(() => legalDests(game), [state.fen])

  const onMove = useCallback(
    (from: string, to: string) => {
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  return (
    <main>
      <h1>Chess Analyzer</h1>
      <Board
        fen={state.fen}
        dests={dests}
        orientation="white"
        turn={state.turn === 'w' ? 'white' : 'black'}
        onMove={onMove}
      />
    </main>
  )
}
