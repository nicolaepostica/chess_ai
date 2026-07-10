import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { useEffect, useRef, useState } from 'react'
import { EMPTY_PLACEMENT, validatePlacement } from '../game/editor'
import { SECONDARY_BUTTON } from './buttonStyles'
import './board.css'

const PIECES = [
  { key: 'wK', role: 'king', color: 'white', label: '♔' },
  { key: 'wQ', role: 'queen', color: 'white', label: '♕' },
  { key: 'wR', role: 'rook', color: 'white', label: '♖' },
  { key: 'wB', role: 'bishop', color: 'white', label: '♗' },
  { key: 'wN', role: 'knight', color: 'white', label: '♘' },
  { key: 'wP', role: 'pawn', color: 'white', label: '♙' },
  { key: 'bK', role: 'king', color: 'black', label: '♚' },
  { key: 'bQ', role: 'queen', color: 'black', label: '♛' },
  { key: 'bR', role: 'rook', color: 'black', label: '♜' },
  { key: 'bB', role: 'bishop', color: 'black', label: '♝' },
  { key: 'bN', role: 'knight', color: 'black', label: '♞' },
  { key: 'bP', role: 'pawn', color: 'black', label: '♟' },
] as const

export type PositionEditorProps = {
  initialFen: string
  onApply: (fen: string) => void
  onCancel: () => void
}

export function PositionEditor({ initialFen, onApply, onCancel }: PositionEditorProps) {
  const element = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const [selected, setSelected] = useState<(typeof PIECES)[number] | null>(null)
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [error, setError] = useState<string | null>(null)

  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    if (!element.current) return
    api.current = Chessground(element.current, {
      fen: initialFen,
      movable: { free: true, color: 'both' },
      draggable: { deleteOnDropOff: true },
      events: {
        select: (square) => {
          const piece = selectedRef.current
          const board = api.current
          if (!board) return
          if (piece) {
            board.setPieces(new Map([[square, { role: piece.role, color: piece.color }]]))
          } else {
            board.setPieces(new Map([[square, undefined]]))
          }
        },
      },
    })
    return () => {
      api.current?.destroy()
      api.current = null
    }
  }, [initialFen])

  const apply = () => {
    const placement = api.current?.getFen() ?? EMPTY_PLACEMENT
    const result = validatePlacement(placement, turn)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onApply(result.fen)
  }

  return (
    <section className="position-editor flex flex-col gap-4">
      <div className="board-wrap board-wrap--solo" ref={element} />

      <div className="palette flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => setSelected(null)}
          className={`rounded-lg border px-3 py-2 text-[13px] ${
            selected === null
              ? 'border-accent/35 bg-accent/10 text-fg'
              : 'border-border bg-white/3 text-fg-secondary hover:text-fg'
          }`}
        >
          Eraser
        </button>
        {PIECES.map((piece) => (
          <button
            key={piece.key}
            type="button"
            aria-pressed={selected?.key === piece.key}
            onClick={() => setSelected(piece)}
            className={`h-10 w-10 rounded-lg border text-xl leading-none ${
              selected?.key === piece.key
                ? 'border-accent/35 bg-accent/10 text-fg'
                : 'border-border bg-white/3 text-fg-secondary hover:text-fg'
            }`}
          >
            {piece.label}
          </button>
        ))}
      </div>

      <div className="editor-controls flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => api.current?.set({ fen: EMPTY_PLACEMENT })}
        >
          Clear board
        </button>

        {/* A shared name makes these a real radio group: arrow keys roam it and
            screen readers announce "1 of 2". */}
        <label className="flex items-center gap-1.5 text-[13px] text-fg-secondary">
          <input
            type="radio"
            name="side-to-move"
            checked={turn === 'w'}
            onChange={() => setTurn('w')}
            className="accent-accent"
          />
          White to move
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-fg-secondary">
          <input
            type="radio"
            name="side-to-move"
            checked={turn === 'b'}
            onChange={() => setTurn('b')}
            className="accent-accent"
          />
          Black to move
        </label>

        <button
          type="button"
          className="rounded-lg border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-bg"
          onClick={apply}
        >
          Apply
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-accent-alt">
          {error}
        </p>
      )}
    </section>
  )
}
