import { createRequire } from 'node:module'
import type { EngineTransport } from './transport'

const require = createRequire(import.meta.url)

/** Tests only. This file never reaches the browser. */
export async function createNodeTransport(flavor = 'lite-single'): Promise<EngineTransport> {
  const initEngine = require('stockfish') as (flavor?: string) => Promise<{
    sendCommand(command: string): void
    listener: (line: string) => void
  }>

  const engine = await initEngine(flavor)
  let handler: (line: string) => void = () => {}
  engine.listener = (line) => handler(line)

  return {
    send: (command) => engine.sendCommand(command),
    onLine: (next) => {
      handler = next
    },
    terminate: () => {},
  }
}
