import { afterEach, expect, it } from 'vitest'
import { createEngine, type Engine } from './engine'
import { createNodeTransport } from './transport.node'
import type { EvalUpdate } from './uci'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

let engine: Engine | null = null

afterEach(() => {
  engine?.terminate()
  engine = null
})

async function collect(iterable: AsyncIterable<EvalUpdate>): Promise<EvalUpdate[]> {
  const updates: EvalUpdate[] = []
  for await (const update of iterable) updates.push(update)
  return updates
}

it('finds mate in one and ends the iteration on bestmove', async () => {
  engine = createEngine(await createNodeTransport())
  const updates = await collect(engine.analyze(MATE_IN_ONE, { depth: 10, multiPV: 1, chess960: false }))

  expect(updates.length).toBeGreaterThan(0)
  const last = updates.at(-1)!
  expect(last.score).toEqual({ type: 'mate', value: 1 })
  expect(last.pv[0]).toBe('a1a8')
})

it('reports the requested number of variations', async () => {
  engine = createEngine(await createNodeTransport())
  const updates = await collect(engine.analyze(START, { depth: 8, multiPV: 3, chess960: false }))

  const seen = new Set(updates.map((update) => update.multipv))
  expect(seen).toEqual(new Set([1, 2, 3]))
})

it('never leaks updates from an abandoned search into the next one', async () => {
  engine = createEngine(await createNodeTransport())

  // Abandon a deep search of the start position after the very first update.
  for await (const _ of engine.analyze(START, { depth: 30, multiPV: 1, chess960: false })) break

  // The next analysis must only talk about the new position.
  const updates = await collect(engine.analyze(MATE_IN_ONE, { depth: 10, multiPV: 1, chess960: false }))
  expect(updates.at(-1)!.score).toEqual({ type: 'mate', value: 1 })
  expect(updates.every((update) => update.pv[0] === 'a1a8')).toBe(true)
})

it('stop() ends the current search early', async () => {
  engine = createEngine(await createNodeTransport())
  const updates: EvalUpdate[] = []

  const iterable = engine.analyze(START, { depth: 40, multiPV: 1, chess960: false })
  setTimeout(() => engine!.stop(), 300)
  for await (const update of iterable) updates.push(update)

  // A depth-40 search would take minutes; it finished, so stop worked.
  expect(updates.length).toBeGreaterThan(0)
  expect(updates.at(-1)!.depth).toBeLessThan(40)
})
