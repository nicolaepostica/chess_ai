export type Score = { type: 'cp' | 'mate'; value: number }

export type EvalUpdate = {
  depth: number
  multipv: number
  score: Score
  pv: string[]
}

export type UciMessage =
  | { kind: 'info'; update: EvalUpdate }
  | { kind: 'bestmove'; move: string }
  | { kind: 'uciok' }
  | { kind: 'readyok' }
  | { kind: 'other' }

const OTHER: UciMessage = { kind: 'other' }

export function parseUciLine(line: string): UciMessage {
  const trimmed = line.trim()

  if (trimmed === 'uciok') return { kind: 'uciok' }
  if (trimmed === 'readyok') return { kind: 'readyok' }

  if (trimmed === 'bestmove' || trimmed.startsWith('bestmove ')) {
    const move = trimmed.split(/\s+/)[1]
    return move ? { kind: 'bestmove', move } : OTHER
  }

  if (!trimmed.startsWith('info ')) return OTHER

  const tokens = trimmed.split(/\s+/)
  const scoreIndex = tokens.indexOf('score')
  const pvIndex = tokens.indexOf('pv')
  const depth = readInt(tokens, 'depth')

  if (depth === null || scoreIndex === -1 || pvIndex === -1) return OTHER

  const scoreType = tokens[scoreIndex + 1]
  const scoreValue = Number(tokens[scoreIndex + 2])
  if (scoreType !== 'cp' && scoreType !== 'mate') return OTHER
  if (!Number.isFinite(scoreValue)) return OTHER

  const pv = tokens.slice(pvIndex + 1)
  if (pv.length === 0) return OTHER

  return {
    kind: 'info',
    update: {
      depth,
      multipv: readInt(tokens, 'multipv') ?? 1,
      score: { type: scoreType, value: scoreValue },
      pv,
    },
  }
}

function readInt(tokens: string[], key: string): number | null {
  const index = tokens.indexOf(key)
  if (index === -1) return null
  const value = Number(tokens[index + 1])
  return Number.isInteger(value) ? value : null
}
