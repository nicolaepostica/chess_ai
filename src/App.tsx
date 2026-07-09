import { useCallback, useMemo, useState } from 'react'
import { createGame, getState, legalDests, tryMove } from './game/game'
import { useAnalysis } from './hooks/useAnalysis'
import { Board } from './ui/Board'
import { EvalBar } from './ui/EvalBar'
import { LineList } from './ui/LineList'

const OPTIONS = { depth: 18, multiPV: 3, chess960: false }

export function App() {
  const [game] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const dests = useMemo(() => legalDests(game), [state.fen])
  const analysis = useAnalysis(state.fen, OPTIONS)

  const onMove = useCallback(
    (from: string, to: string) => {
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  const best = analysis.lines[0] ?? null

  return (
    <main>
      <h1>Chess Analyzer</h1>
      {!analysis.multiThreaded && (
        <p role="alert">
          Multi-threaded engine unavailable (no cross-origin isolation). Falling back to the slower
          single-threaded build.
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <EvalBar score={best?.score ?? null} orientation="white" />
        <Board
          fen={state.fen}
          dests={dests}
          orientation="white"
          turn={state.turn === 'w' ? 'white' : 'black'}
          onMove={onMove}
        />
        <div style={{ opacity: analysis.stale ? 0.5 : 1 }}>
          <p>Depth: {analysis.depth}</p>
          <LineList lines={analysis.lines} />
        </div>
      </div>
    </main>
  )
}
