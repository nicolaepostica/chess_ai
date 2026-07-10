import { parseUciLine, type EvalUpdate, type UciMessage } from './uci'
import type { EngineTransport } from './transport'

export type AnalyzeOptions = {
  depth: number
  multiPV: number
  chess960: boolean
}

export interface Engine {
  analyze(fen: string, options: AnalyzeOptions): AsyncIterable<EvalUpdate>
  stop(): void
  terminate(): void
}

type Subscriber = (message: UciMessage) => void

export function createEngine(transport: EngineTransport): Engine {
  const subscribers = new Set<Subscriber>()

  // A terminated worker will never send `bestmove`, so a suspended analyze()
  // would await it forever and never run its finally block. Terminate releases
  // them explicitly.
  const aborts = new Set<() => void>()

  transport.onLine((line) => {
    const message = parseUciLine(line)
    for (const subscriber of [...subscribers]) subscriber(message)
  })

  transport.send('uci')

  // Searches run strictly one at a time. Each search waits for the previous one
  // to see its bestmove — otherwise the engine replies to the old position.
  let previousSearch: Promise<void> = Promise.resolve()
  let searchActive = false

  function stop(): void {
    if (searchActive) transport.send('stop')
  }

  async function* analyze(fen: string, options: AnalyzeOptions): AsyncIterable<EvalUpdate> {
    const waitForPrevious = previousSearch
    let releaseThisSearch!: () => void
    previousSearch = new Promise<void>((resolve) => {
      releaseThisSearch = resolve
    })
    await waitForPrevious

    const queue: EvalUpdate[] = []
    let bestmoveSeen = false
    let wake: (() => void) | null = null

    let resolveBestmove!: () => void
    const bestmove = new Promise<void>((resolve) => {
      resolveBestmove = resolve
    })

    const subscriber: Subscriber = (message) => {
      if (message.kind === 'info') {
        queue.push(message.update)
        wake?.()
      } else if (message.kind === 'bestmove') {
        bestmoveSeen = true
        resolveBestmove()
        wake?.()
      }
    }

    const abort = () => {
      bestmoveSeen = true
      resolveBestmove()
      wake?.()
    }

    aborts.add(abort)
    subscribers.add(subscriber)
    searchActive = true

    transport.send(`setoption name UCI_Chess960 value ${options.chess960}`)
    transport.send(`setoption name MultiPV value ${options.multiPV}`)
    transport.send(`position fen ${fen}`)
    transport.send(`go depth ${options.depth}`)

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!
          continue
        }
        if (bestmoveSeen) return
        await new Promise<void>((resolve) => {
          wake = () => {
            wake = null
            resolve()
          }
        })
      }
    } finally {
      // Reached both on normal completion and when the consumer breaks out of
      // the loop. In the second case the engine is still thinking.
      aborts.delete(abort)
      if (!bestmoveSeen) transport.send('stop')
      await bestmove
      subscribers.delete(subscriber)
      searchActive = false
      releaseThisSearch()
    }
  }

  return {
    analyze,
    stop,
    terminate: () => {
      // Copy first: aborting resumes a generator, which deletes itself from the set.
      for (const abort of [...aborts]) abort()
      subscribers.clear()
      transport.terminate()
    },
  }
}
