import { createRequire } from 'node:module'
import type { EngineTransport } from './transport'

const require = createRequire(import.meta.url)

type StockfishEngine = {
  sendCommand(command: string): void
  listener: (line: string) => void
}

// The stockfish npm package wraps an Emscripten module that cannot be
// re-instantiated within a single Node process: a second initEngine() call
// reuses the cached module-level state and the WASM link step fails with
// "memory import must be a WebAssembly.Memory object". Vitest runs all tests
// in a file in one process and each test creates a fresh transport, so we
// initialize the engine exactly once and multiplex its single `listener`
// across transports. This is safe because only one search runs at a time.
let enginePromise: Promise<StockfishEngine> | null = null
let activeHandler: (line: string) => void = () => {}

function loadEngine(flavor: string): Promise<StockfishEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const initEngine = require('stockfish') as (flavor?: string) => Promise<StockfishEngine>
      const engine = await initEngine(flavor)
      engine.listener = (line) => activeHandler(line)
      return engine
    })()
  }
  return enginePromise
}

/** Tests only. This file never reaches the browser. */
export async function createNodeTransport(flavor = 'lite-single'): Promise<EngineTransport> {
  const engine = await loadEngine(flavor)
  return {
    send: (command) => engine.sendCommand(command),
    onLine: (next) => {
      activeHandler = next
    },
    terminate: () => {},
  }
}
