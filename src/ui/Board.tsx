import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { DrawShape } from 'chessground/draw'
import type { Dests } from 'chessground/types'
import { useEffect, useRef } from 'react'
import type { Square } from '../game/game'
import './board.css'

// game/ speaks in plain string squares; chessground's Key is a literal union of
// the 64 squares. The cast belongs here at the ui/ boundary, where the two
// worlds meet. Our squares are always valid keys, so the cast is sound.
const asDests = (dests: Map<Square, Square[]>): Dests => dests as Dests
const asShapes = (arrows: Arrow[]): DrawShape[] => arrows as unknown as DrawShape[]

export type Arrow = {
  orig: Square
  dest: Square
  brush: 'green' | 'paleGreen' | 'paleGrey'
}

export type BoardProps = {
  fen: string
  dests: Map<Square, Square[]>
  orientation: 'white' | 'black'
  turn: 'white' | 'black'
  arrows?: Arrow[]
  onMove: (from: Square, to: Square) => void
}

export function Board({ fen, dests, orientation, turn, arrows = [], onMove }: BoardProps) {
  const element = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)

  // onMove is recreated on every render; keep it in a ref so we don't
  // reinitialize the board.
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    if (!element.current) return
    api.current = Chessground(element.current, {
      fen,
      orientation,
      turnColor: turn,
      movable: {
        free: false,
        color: turn,
        dests: asDests(dests),
        events: {
          after: (from, to) => onMoveRef.current(from, to),
        },
      },
    })
    return () => {
      api.current?.destroy()
      api.current = null
    }
    // Initialize exactly once. Updates flow through api.set below.
  }, [])

  useEffect(() => {
    api.current?.set({
      fen,
      orientation,
      turnColor: turn,
      movable: { free: false, color: turn, dests: asDests(dests) },
    })
  }, [fen, orientation, turn, dests])

  useEffect(() => {
    api.current?.setAutoShapes(asShapes(arrows))
  }, [arrows])

  return <div className="board-wrap" ref={element} />
}
