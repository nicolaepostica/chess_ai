import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { useEffect, useRef, useState } from 'react'
import { EMPTY_PLACEMENT, validatePlacement } from '../game/editor'
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
    <section className="position-editor">
      <div className="board-wrap" ref={element} />

      <div className="palette">
        <button type="button" onClick={() => setSelected(null)} aria-pressed={selected === null}>
          Eraser
        </button>
        {PIECES.map((piece) => (
          <button
            key={piece.key}
            type="button"
            aria-pressed={selected?.key === piece.key}
            onClick={() => setSelected(piece)}
          >
            {piece.label}
          </button>
        ))}
      </div>

      <div className="editor-controls">
        <button type="button" onClick={() => api.current?.set({ fen: EMPTY_PLACEMENT })}>
          Clear board
        </button>
        <label>
          <input type="radio" checked={turn === 'w'} onChange={() => setTurn('w')} /> White to move
        </label>
        <label>
          <input type="radio" checked={turn === 'b'} onChange={() => setTurn('b')} /> Black to move
        </label>
        <button type="button" onClick={apply}>
          Apply
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
