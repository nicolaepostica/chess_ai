import { useEffect, useRef, useState } from 'react'
import { createEngine, type AnalyzeOptions, type Engine } from '../engine/engine'
import { createWorkerTransport, isMultiThreaded } from '../engine/transport'
import type { EvalUpdate, Score } from '../engine/uci'

export type AnalysisState = {
  lines: EvalUpdate[]
  depth: number
  stale: boolean
  multiThreaded: boolean
  error: string | null
}

const THROTTLE_MS = 100

/** UCI reports the score from the side-to-move's perspective. The bar needs it from White's. */
function toWhitePerspective(score: Score, blackToMove: boolean): Score {
  return blackToMove ? { type: score.type, value: -score.value } : score
}

export function useAnalysis(fen: string, options: AnalyzeOptions): AnalysisState {
  const engineRef = useRef<Engine | null>(null)
  const restarts = useRef(0)
  const [engineGeneration, setEngineGeneration] = useState(0)
  const [lines, setLines] = useState<EvalUpdate[]>([])
  const [depth, setDepth] = useState(0)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleError = () => {
      if (restarts.current >= 1) {
        setError('The engine crashed. Please reload the page.')
        return
      }
      restarts.current += 1
      setEngineGeneration((generation) => generation + 1)
    }

    engineRef.current = createEngine(createWorkerTransport(undefined, handleError))
    return () => {
      engineRef.current?.terminate()
      engineRef.current = null
    }
  }, [engineGeneration])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const blackToMove = fen.split(' ')[1] === 'b'
    let cancelled = false
    setStale(true)

    // The engine emits hundreds of updates per second; buffer them and flush to
    // React at most once per THROTTLE_MS.
    const pending = new Map<number, EvalUpdate>()
    let flushTimer: ReturnType<typeof setInterval> | null = null

    const flush = () => {
      if (pending.size === 0) return
      const snapshot = [...pending.values()].sort((a, b) => a.multipv - b.multipv)
      setLines(snapshot)
      setDepth(Math.max(...snapshot.map((line) => line.depth)))
      setStale(false)
    }

    const run = async () => {
      flushTimer = setInterval(flush, THROTTLE_MS)
      try {
        for await (const update of engine.analyze(fen, options)) {
          if (cancelled) break
          pending.set(update.multipv, {
            ...update,
            score: toWhitePerspective(update.score, blackToMove),
          })
        }
      } finally {
        if (flushTimer) clearInterval(flushTimer)
        if (!cancelled) flush()
      }
    }

    void run()

    return () => {
      cancelled = true
      engine.stop()
    }
  }, [fen, options.depth, options.multiPV, options.chess960, engineGeneration])

  return { lines, depth, stale, multiThreaded: isMultiThreaded(), error }
}
