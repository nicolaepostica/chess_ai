import { expect, it } from 'vitest'
import { createNodeTransport } from './transport.node'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'

it('sends commands to the engine and receives its output', async () => {
  const transport = await createNodeTransport()

  const bestmove = new Promise<string>((resolve) => {
    transport.onLine((line) => {
      if (line.startsWith('bestmove')) resolve(line)
    })
  })

  transport.send('uci')
  transport.send(`position fen ${MATE_IN_ONE}`)
  transport.send('go depth 8')

  expect(await bestmove).toBe('bestmove a1a8')
})
