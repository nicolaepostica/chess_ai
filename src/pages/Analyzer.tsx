import { useCallback, useMemo, useState } from 'react'
import type { Chess } from 'chess.js'
import type { EvalUpdate } from '../engine/uci'
import { createGame, getState, legalDests, tryMove } from '../game/game'
import { previewFen } from '../game/preview'
import { useAnalysis } from '../hooks/useAnalysis'
import { useSettings } from '../hooks/useSettings'
import { Board } from '../ui/Board'
import { Card } from '../ui/Card'
import { DepthBadge } from '../ui/DepthBadge'
import { EvalBar } from '../ui/EvalBar'
import { LineList } from '../ui/LineList'
import { PositionEditor } from '../ui/PositionEditor'
import { PositionInput } from '../ui/PositionInput'
import { SettingsPanel } from '../ui/SettingsPanel'
import { linesToArrows } from '../ui/arrows'
import { SECONDARY_BUTTON } from '../ui/buttonStyles'

export function Analyzer() {
  const [game, setGame] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))
  const [preview, setPreview] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

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

  const applyEditedFen = useCallback(
    (fen: string) => {
      setEditing(false)
      setPreview(null)
      loadGame(createGame(fen))
    },
    [loadGame],
  )

  const best = analysis.lines[0] ?? null

  if (editing) {
    return (
      <PositionEditor
        initialFen={state.fen}
        onApply={applyEditedFen}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const ALERT = 'rounded-lg border border-accent-alt/40 bg-accent-alt/10 p-3 text-sm'

  return (
    <div className="flex flex-col gap-6">
      {/* Сообщения живут НАД колонками. Внутри wide:flex-row они встали бы
          третьей колонкой рядом с доской. */}
      {!analysis.multiThreaded && (
        <p role="alert" className={ALERT}>
          Multi-threaded engine unavailable (no cross-origin isolation). Falling back to the slower
          single-threaded build.
        </p>
      )}
      {analysis.error && (
        <p role="alert" className={ALERT}>
          {analysis.error}
        </p>
      )}

      <div className="flex flex-col gap-6 wide:flex-row wide:items-start">
        <div className="flex shrink-0 gap-2.5">
          <EvalBar score={best?.score ?? null} orientation="white" />
          <Board
            fen={displayFen}
            dests={previewing ? new Map() : dests}
            orientation="white"
            turn={displayTurn}
            arrows={arrows}
            onMove={onMove}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card
            title="Stockfish 18"
            aside={<DepthBadge reached={analysis.depth} target={settings.depth} />}
          >
            {/* Гасим только числа. Ползунки настроек не устарели, гасить их незачем. */}
            <div className={analysis.stale ? 'opacity-50' : undefined}>
              <LineList lines={analysis.lines} onSelect={selectLine} />
            </div>
            {previewing && (
              <button type="button" className={`mt-3 ${SECONDARY_BUTTON}`} onClick={() => setPreview(null)}>
                Back to game
              </button>
            )}
          </Card>

          <Card title="Settings">
            <SettingsPanel settings={settings} onChange={updateSettings} />
          </Card>

          <Card title="Position">
            <PositionInput onLoad={loadGame} />
            <button type="button" className={`mt-3 ${SECONDARY_BUTTON}`} onClick={() => setEditing(true)}>
              Edit position
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
