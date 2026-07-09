import { useCallback, useMemo, useState } from 'react'
import type { Chess } from 'chess.js'
import { createGame, getState, legalDests, tryMove } from './game/game'
import { useAnalysis } from './hooks/useAnalysis'
import { useSettings } from './hooks/useSettings'
import { Board } from './ui/Board'
import { EvalBar } from './ui/EvalBar'
import { LineList } from './ui/LineList'
import { PositionInput } from './ui/PositionInput'
import { SettingsPanel } from './ui/SettingsPanel'
import { linesToArrows } from './ui/arrows'

export function App() {
  const [game, setGame] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const dests = useMemo(() => legalDests(game), [state.fen])
  const [settings, updateSettings] = useSettings()
  const analysis = useAnalysis(state.fen, settings)
  const arrows = useMemo(() => linesToArrows(analysis.lines), [analysis.lines])

  const onMove = useCallback(
    (from: string, to: string) => {
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  const loadGame = useCallback((next: Chess) => {
    setGame(next)
    setState(getState(next))
  }, [])

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
          arrows={arrows}
          onMove={onMove}
        />
        <div style={{ opacity: analysis.stale ? 0.5 : 1 }}>
          <SettingsPanel settings={settings} onChange={updateSettings} />
          <p>Depth: {analysis.depth}</p>
          <LineList lines={analysis.lines} />
        </div>
      </div>
      <PositionInput onLoad={loadGame} />
    </main>
  )
}
