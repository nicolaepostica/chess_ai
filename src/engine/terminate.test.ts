import { expect, it } from 'vitest'
import { createEngine } from './engine'
import type { EngineTransport } from './transport'

function fakeTransport(): EngineTransport & { emit(line: string): void } {
  let handler: (line: string) => void = () => {}
  return {
    send: () => {},
    onLine: (h) => {
      handler = h
    },
    terminate: () => {},
    emit: (line) => handler(line),
  }
}

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const DEEP = { depth: 40, multiPV: 1, chess960: false }

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

it('releases an in-flight analyze when the engine is terminated', async () => {
  const transport = fakeTransport()
  const engine = createEngine(transport)

  let finished = false
  const consume = (async () => {
    for await (const _ of engine.analyze(FEN, DEEP)) {
      // drain
    }
    finished = true
  })()

  transport.emit('info depth 5 multipv 1 score cp 20 pv e2e4')
  await settle()

  // A terminated worker never sends bestmove. Without an explicit release the
  // generator stays suspended and its finally never runs.
  engine.terminate()

  const outcome = await Promise.race([
    consume.then(() => 'finished'),
    new Promise((resolve) => setTimeout(() => resolve('hung'), 500)),
  ])

  expect(outcome).toBe('finished')
  expect(finished).toBe(true)
})

it('runs the consumer finally block so callers can clean up', async () => {
  const transport = fakeTransport()
  const engine = createEngine(transport)

  let cleanedUp = false
  const consume = (async () => {
    try {
      for await (const _ of engine.analyze(FEN, DEEP)) {
        // drain
      }
    } finally {
      cleanedUp = true
    }
  })()

  await settle()
  engine.terminate()
  await consume

  expect(cleanedUp).toBe(true)
})
