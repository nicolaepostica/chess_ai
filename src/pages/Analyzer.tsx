import { useCallback, useMemo, useState } from 'react'
import type { Chess } from 'chess.js'
import type { EvalUpdate } from '../engine/uci'
import { createGame, getState, legalDests, tryMove } from '../game/game'
import { previewFen } from '../game/preview'
import { useAnalysis } from '../hooks/useAnalysis'
import { useSettings } from '../hooks/useSettings'
import { Board } from '../ui/Board'
import { EvalBar } from '../ui/EvalBar'
import { LineList } from '../ui/LineList'
import { PositionInput } from '../ui/PositionInput'
import { PositionEditor } from '../ui/PositionEditor'
import { SettingsPanel } from '../ui/SettingsPanel'
import { linesToArrows } from '../ui/arrows'

export function Analyzer() {
  const [game, setGame] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const [preview, setPreview] = useState<string | null>(null)

  const dests = useMemo(() => legalDests(game), [state.fen])
  const [settings, updateSettings] = useSettings()
  const displayFen = preview ?? state.fen
  const previewing = preview !== null
  const displayTurn = displayFen.split(' ')[1] === 'w' ? 'white' : 'black'
  const analysis = useAnalysis(displayFen, settings)
  const arrows = useMemo(() => linesToArrows(analysis.lines), [analysis.lines])

  // Lines describe the position on screen, so walk them from there — not from
  // the game position, which may be several plies behind during a preview.
  // An unplayable line leaves the board where it is rather than snapping back.
  const selectLine = useCallback(
    (line: EvalUpdate, plyCount: number) => {
      const next = previewFen(displayFen, line.pv.slice(0, plyCount))
      if (next) setPreview(next)
    },
    [displayFen],
  )

  const onMove = useCallback(
    (from: string, to: string) => {
      setPreview(null)
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  const loadGame = useCallback((next: Chess) => {
    setPreview(null)
    setGame(next)
    setState(getState(next))
  }, [])

  const [editing, setEditing] = useState(false)

  const applyEditedFen = useCallback(
    (fen: string) => {
      setEditing(false)
      setPreview(null)
      loadGame(createGame(fen))
    },
    [loadGame],
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
      {analysis.error && <p role="alert">{analysis.error}</p>}
      {editing ? (
        <PositionEditor
          initialFen={state.fen}
          onApply={applyEditedFen}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <EvalBar score={best?.score ?? null} orientation="white" />
            <Board
              fen={displayFen}
              dests={previewing ? new Map() : dests}
              orientation="white"
              turn={displayTurn}
              arrows={arrows}
              onMove={onMove}
            />
            <div style={{ opacity: analysis.stale ? 0.5 : 1 }}>
              <SettingsPanel settings={settings} onChange={updateSettings} />
              <p>Depth: {analysis.depth}</p>
              <LineList lines={analysis.lines} onSelect={selectLine} />
            </div>
          </div>
          {previewing && (
            <button type="button" onClick={() => setPreview(null)}>
              Back to game
            </button>
          )}
          <button type="button" onClick={() => setEditing(true)}>
            Edit position
          </button>
        </>
      )}
      <PositionInput onLoad={loadGame} />
    </main>
  )
}
