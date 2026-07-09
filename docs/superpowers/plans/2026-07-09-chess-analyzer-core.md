# Chess Analyzer Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Локальный браузерный шахматный анализатор: доска, Stockfish 18 в Web Worker, живая оценка позиции, eval-бар, стрелки лучших ходов, ввод FEN/PGN.

**Architecture:** Три модуля с жёсткими границами. `engine/` знает про UCI и WASM, но не про React. `game/` знает про правила шахмат, но не про движок и DOM. `ui/` — React-компоненты, получающие данные пропсами. Их связывает единственный хук `useAnalysis`. Шов `EngineTransport` позволяет движку работать и в браузере (Worker), и в тестах (Node).

**Tech Stack:** Vite, React 19, TypeScript, vitest, `stockfish@18.0.8`, `chess.js@1.4.0`, `chessground@9.2.1`.

**Spec:** `docs/superpowers/specs/2026-07-09-chess-analyzer-design.md`

## Global Constraints

- Все зависимости фиксируются точными версиями: `stockfish@18.0.8`, `chess.js@1.4.0`, `chessground@9.2.1`.
- Сборка движка — только `lite` (7 МБ). Полная сборка (113 МБ) не используется никогда.
- Лицензия проекта — GPL-3.0 (требование Stockfish). Не добавлять зависимости с несовместимыми лицензиями.
- `engine/` не импортирует React. `game/` не импортирует ни `engine/`, ни React. Нарушение этих границ — повод отклонить задачу на ревью.
- Тестовая позиция «мат в один» используется во всём плане: FEN `6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1`, правильный ход `a1a8`, оценка `{ type: 'mate', value: 1 }`.
- Каждая задача заканчивается коммитом.
- Работаем в ветке `main`. Старый бот сохранён в `legacy-chessdotcom-bot`, из него ничего не переиспользуется.

---

### Task 1: Скаффолд проекта и удаление старого кода

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Modify: `.gitignore`
- Create: `scripts/copy-stockfish.js`

**Interfaces:**
- Consumes: ничего.
- Produces: работающий `npm run dev` и `npm test`; файлы движка в `public/stockfish/`.

- [ ] **Step 1: Убедиться, что репозиторий чист**

Старый питоновский бот уже удалён из `main` (коммит «Remove chess.com bot») и
сохранён в ветке `legacy-chessdotcom-bot`. Отдельного шага удаления не требуется
— только проверка исходного состояния.

Run: `git ls-files`
Expected: ровно четыре записи — `.gitignore`, `LICENSE`, `README.md` и два файла
под `docs/`. Если видите `main.py` или `extensions/`, вы не на `main`.

- [ ] **Step 2: Создать `package.json`**

```json
{
  "name": "chess-analyzer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "license": "GPL-3.0",
  "scripts": {
    "dev": "npm run copy-stockfish && vite",
    "build": "npm run copy-stockfish && tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "copy-stockfish": "node scripts/copy-stockfish.js"
  },
  "dependencies": {
    "chess.js": "1.4.0",
    "chessground": "9.2.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "stockfish": "18.0.8",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^4.0.0"
  }
}
```

`stockfish` в devDependencies: в рантайме браузер грузит файлы из `public/`, а не из `node_modules`. Пакету он нужен только для копирования и для Node-тестов.

- [ ] **Step 3: Создать `scripts/copy-stockfish.js`**

Файлы движка (7 МБ) не коммитим — копируем из `node_modules` при каждом `dev`/`build`.

```js
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const binDir = join(dirname(require.resolve('stockfish/package.json')), 'bin')
const outDir = join(process.cwd(), 'public', 'stockfish')

const FILES = [
  'stockfish-18-lite.js',
  'stockfish-18-lite.wasm',
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm',
]

mkdirSync(outDir, { recursive: true })
for (const file of FILES) {
  const src = join(binDir, file)
  if (!existsSync(src)) throw new Error(`Missing engine file: ${src}`)
  copyFileSync(src, join(outDir, file))
}
console.log(`Copied ${FILES.length} engine files to ${outDir}`)
```

- [ ] **Step 4: Создать `vite.config.ts` с заголовками COOP/COEP**

Без этих заголовков `SharedArrayBuffer` недоступен и многопоточная сборка не запустится.

Импорт `defineConfig` идёт из `vitest/config`, а не из `vite`: только он типизирует блок `test`.

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  test: {
    environment: 'node',
    testTimeout: 60_000,
  },
})
```

`testTimeout` поднят: загрузка 7-мегабайтного WASM в Node занимает заметное время.

- [ ] **Step 5: Создать `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 6: Создать `index.html`, `src/main.tsx`, `src/App.tsx`**

`index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chess Analyzer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>Chess Analyzer</h1>
      <p>crossOriginIsolated: {String(window.crossOriginIsolated)}</p>
    </main>
  )
}
```

- [ ] **Step 7: Заменить `.gitignore`**

Существующий файл описывает питоновский проект. Заменить его содержимое целиком:

```gitignore
node_modules/
dist/
public/stockfish/
.DS_Store
```

`public/stockfish/` не коммитим: 14 МБ бинарников, которые `npm run dev`
копирует из `node_modules` сам.

- [ ] **Step 8: Установить зависимости и проверить изоляцию**

```bash
npm install
npm run dev
```

Открыть `http://localhost:5173`. Ожидаемо: страница показывает `crossOriginIsolated: true`.

Если `false` — заголовки не применились, дальше идти нельзя: многопоточный движок не запустится, а причина будет неочевидна.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS, remove legacy python bot"
```

---

### Task 2: Парсер UCI

Самая ломкая часть системы и единственная, которую можно полностью протестировать без движка.

**Files:**
- Create: `src/engine/uci.ts`
- Test: `src/engine/uci.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type Score = { type: 'cp' | 'mate'; value: number }`
  - `type EvalUpdate = { depth: number; multipv: number; score: Score; pv: string[] }`
  - `type UciMessage = { kind: 'info'; update: EvalUpdate } | { kind: 'bestmove'; move: string } | { kind: 'uciok' } | { kind: 'readyok' } | { kind: 'other' }`
  - `function parseUciLine(line: string): UciMessage`

- [ ] **Step 1: Написать падающий тест**

Строки взяты из реального вывода `stockfish@18.0.8`, не выдуманы.

`src/engine/uci.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseUciLine } from './uci'

describe('parseUciLine', () => {
  it('parses an info line with a centipawn score', () => {
    const line =
      'info depth 12 seldepth 17 multipv 3 score cp 616 nodes 29259 nps 328752 hashfull 7 time 89 pv a1e1 h7h6 g1f1'
    expect(parseUciLine(line)).toEqual({
      kind: 'info',
      update: {
        depth: 12,
        multipv: 3,
        score: { type: 'cp', value: 616 },
        pv: ['a1e1', 'h7h6', 'g1f1'],
      },
    })
  })

  it('parses an info line with a mate score', () => {
    const line = 'info depth 1 seldepth 2 multipv 1 score mate 1 nodes 82 nps 8200 time 10 pv a1a8'
    expect(parseUciLine(line)).toEqual({
      kind: 'info',
      update: {
        depth: 1,
        multipv: 1,
        score: { type: 'mate', value: 1 },
        pv: ['a1a8'],
      },
    })
  })

  it('defaults multipv to 1 when the engine omits it', () => {
    const line = 'info depth 5 score cp 20 nodes 100 pv e2e4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.multipv).toBe(1)
  })

  it('does not confuse seldepth with depth', () => {
    const line = 'info seldepth 30 depth 4 score cp 10 pv e2e4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.depth).toBe(4)
  })

  it('parses a negative mate score (the side to move is getting mated)', () => {
    const line = 'info depth 8 multipv 1 score mate -3 pv e1e2'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.score).toEqual({ type: 'mate', value: -3 })
  })

  it('tolerates lowerbound between the score and the next token', () => {
    const line = 'info depth 9 multipv 1 score cp 33 lowerbound nodes 500 pv d2d4'
    const result = parseUciLine(line)
    expect(result.kind === 'info' && result.update.score).toEqual({ type: 'cp', value: 33 })
  })

  it('parses bestmove', () => {
    expect(parseUciLine('bestmove a1a8')).toEqual({ kind: 'bestmove', move: 'a1a8' })
  })

  it('parses bestmove with a ponder move', () => {
    expect(parseUciLine('bestmove e2e4 ponder e7e5')).toEqual({ kind: 'bestmove', move: 'e2e4' })
  })

  it('parses handshake replies', () => {
    expect(parseUciLine('uciok')).toEqual({ kind: 'uciok' })
    expect(parseUciLine('readyok')).toEqual({ kind: 'readyok' })
  })

  it('returns other for info lines without a score or pv', () => {
    expect(parseUciLine('info depth 1 currmove e2e4 currmovenumber 1').kind).toBe('other')
    expect(parseUciLine('info string NNUE evaluation using nn-x.nnue').kind).toBe('other')
    expect(parseUciLine('info depth 20 score cp 15 nodes 100').kind).toBe('other')
  })

  it('returns other for engine banner and option lines', () => {
    expect(parseUciLine('Stockfish 18 Lite WASM by the Stockfish developers').kind).toBe('other')
    expect(parseUciLine('option name MultiPV type spin default 1 min 1 max 500').kind).toBe('other')
  })

  it('returns other for bestmove without a move', () => {
    expect(parseUciLine('bestmove').kind).toBe('other')
  })
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/engine/uci.test.ts`
Expected: FAIL — `Failed to resolve import "./uci"`.

- [ ] **Step 3: Написать минимальную реализацию**

`src/engine/uci.ts`:

```ts
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
```

`tokens.indexOf('depth')` сравнивает токены целиком, поэтому `seldepth` не совпадёт. По той же причине `multipv` не будет принят за `pv`.

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/engine/uci.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/uci.ts src/engine/uci.test.ts
git commit -m "feat(engine): add UCI line parser"
```

---

### Task 3: Транспорт движка

Шов между `engine.ts` и конкретным способом запуска Stockfish. Именно он позволяет тестировать движок в Node без браузера.

**Files:**
- Create: `src/engine/transport.ts`
- Create: `src/engine/transport.node.ts`
- Create: `src/engine/stockfish.d.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `interface EngineTransport { send(command: string): void; onLine(handler: (line: string) => void): void; terminate(): void }`
  - `function createWorkerTransport(scriptUrl: string): EngineTransport`
  - `function selectEngineUrl(): string` — возвращает путь к многопоточной сборке при `crossOriginIsolated`, иначе к однопоточной
  - `async function createNodeTransport(flavor?: string): Promise<EngineTransport>`

- [ ] **Step 1: Создать `src/engine/stockfish.d.ts`**

Пакет `stockfish` не поставляет типов.

```ts
declare module 'stockfish' {
  interface StockfishEngine {
    sendCommand(command: string): void
    listener: (line: string) => void
  }
  function initEngine(flavor?: string): Promise<StockfishEngine>
  export = initEngine
}
```

- [ ] **Step 2: Создать `src/engine/transport.ts`**

```ts
export interface EngineTransport {
  send(command: string): void
  onLine(handler: (line: string) => void): void
  terminate(): void
}

const MULTI_THREADED = '/stockfish/stockfish-18-lite.js'
const SINGLE_THREADED = '/stockfish/stockfish-18-lite-single.js'

/**
 * Многопоточная сборка требует SharedArrayBuffer, который доступен только
 * в cross-origin isolated контексте (заголовки COOP/COEP).
 */
export function selectEngineUrl(): string {
  return globalThis.crossOriginIsolated ? MULTI_THREADED : SINGLE_THREADED
}

export function isMultiThreaded(): boolean {
  return selectEngineUrl() === MULTI_THREADED
}

export function createWorkerTransport(scriptUrl: string = selectEngineUrl()): EngineTransport {
  const worker = new Worker(scriptUrl)
  let handler: (line: string) => void = () => {}

  worker.onmessage = (event: MessageEvent) => {
    if (typeof event.data === 'string') handler(event.data)
  }

  return {
    send: (command) => worker.postMessage(command),
    onLine: (next) => {
      handler = next
    },
    terminate: () => worker.terminate(),
  }
}
```

`stockfish-18-lite.js` сам вызывает `postMessage(line)` для каждой строки вывода — это его штатный режим работы как worker-скрипта. Никакой обёртки писать не нужно.

- [ ] **Step 3: Создать `src/engine/transport.node.ts`**

```ts
import { createRequire } from 'node:module'
import type { EngineTransport } from './transport'

const require = createRequire(import.meta.url)

/** Только для тестов. В браузер этот файл не попадает. */
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
```

- [ ] **Step 4: Написать смоук-тест на Node-транспорт**

Он доказывает, что транспорт действительно говорит с движком, ещё до того, как появится `engine.ts`.

`src/engine/transport.node.test.ts`:

```ts
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
```

- [ ] **Step 5: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/engine/transport.node.test.ts`
Expected: PASS, 1 test. Занимает несколько секунд — грузится 7 МБ WASM.

- [ ] **Step 6: Commit**

```bash
git add src/engine/transport.ts src/engine/transport.node.ts src/engine/transport.node.test.ts src/engine/stockfish.d.ts
git commit -m "feat(engine): add worker and node transports"
```

---

### Task 4: Публичный интерфейс движка

Здесь живёт вся сложность прерывания поиска. Ошибка тут проявится как «оценка от предыдущей позиции» — редко и трудноуловимо.

**Files:**
- Create: `src/engine/engine.ts`
- Test: `src/engine/engine.test.ts`

**Interfaces:**
- Consumes: `parseUciLine`, `EvalUpdate`, `UciMessage` из `./uci`; `EngineTransport` из `./transport`; `createNodeTransport` из `./transport.node` (только в тесте).
- Produces:
  - `type AnalyzeOptions = { depth: number; multiPV: number; chess960: boolean }`
  - `interface Engine { analyze(fen: string, options: AnalyzeOptions): AsyncIterable<EvalUpdate>; stop(): void; terminate(): void }`
  - `function createEngine(transport: EngineTransport): Engine`

- [ ] **Step 1: Написать падающий тест**

`src/engine/engine.test.ts`:

```ts
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

  // Бросаем глубокий анализ стартовой позиции после первого же апдейта.
  for await (const _ of engine.analyze(START, { depth: 30, multiPV: 1, chess960: false })) break

  // Следующий анализ обязан говорить только про новую позицию.
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

  // Поиск на глубину 40 занял бы минуты; он завершился, значит stop сработал.
  expect(updates.length).toBeGreaterThan(0)
  expect(updates.at(-1)!.depth).toBeLessThan(40)
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/engine/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"`.

- [ ] **Step 3: Написать реализацию**

`src/engine/engine.ts`:

```ts
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

  transport.onLine((line) => {
    const message = parseUciLine(line)
    for (const subscriber of [...subscribers]) subscriber(message)
  })

  transport.send('uci')

  // Поиски выполняются строго по одному. Каждый следующий ждёт, пока предыдущий
  // не увидит свой bestmove — иначе движок ответит на старую позицию.
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
      // Сюда попадаем и при нормальном завершении, и когда потребитель
      // прервал цикл через break. Во втором случае движок ещё думает.
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
      subscribers.clear()
      transport.terminate()
    },
  }
}
```

Разбор `finally`: генератор, покинутый через `break`, получает вызов `return()`, который исполняет `finally` и ждёт его завершения. Поэтому `await bestmove` внутри `finally` гарантирует, что мы не отдадим управление следующему `analyze`, пока движок не подтвердит остановку.

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/engine/engine.test.ts`
Expected: PASS, 4 tests.

Если тест «never leaks updates» падает с оценкой не `mate 1` — значит `finally` не дожидается `bestmove`, и движок отвечает на предыдущую позицию. Это ровно тот баг, ради которого тест написан.

- [ ] **Step 5: Commit**

```bash
git add src/engine/engine.ts src/engine/engine.test.ts
git commit -m "feat(engine): add analyze/stop with correct search interruption"
```

---

### Task 5: Модуль партии

**Files:**
- Create: `src/game/game.ts`
- Create: `src/game/pgn.ts`
- Test: `src/game/game.test.ts`

**Interfaces:**
- Consumes: `chess.js`.
- Produces:
  - `type Square = string` (например `'e2'`)
  - `type GameState = { fen: string; history: string[]; turn: 'w' | 'b'; isGameOver: boolean }`
  - `function createGame(fen?: string): Chess`
  - `function tryMove(game: Chess, from: Square, to: Square, promotion?: string): boolean`
  - `function getState(game: Chess): GameState` — намеренно не `describe`, иначе имя столкнётся с `describe` из vitest
  - `function isValidFen(fen: string): boolean`
  - `function legalDests(game: Chess): Map<Square, Square[]>` — формат, который ждёт chessground
  - `function loadPgn(pgn: string): { ok: true; game: Chess } | { ok: false; error: string }` (из `pgn.ts`)
  - `function toPgn(game: Chess): string` (из `pgn.ts`)

- [ ] **Step 1: Написать падающий тест**

`src/game/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createGame, getState, isValidFen, legalDests, tryMove } from './game'
import { loadPgn, toPgn } from './pgn'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'

describe('game', () => {
  it('starts from the standard position', () => {
    const state = getState(createGame())
    expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(state.turn).toBe('w')
    expect(state.isGameOver).toBe(false)
  })

  it('accepts a legal move and rejects an illegal one', () => {
    const game = createGame()
    expect(tryMove(game, 'e2', 'e4')).toBe(true)
    expect(getState(game).turn).toBe('b')
    expect(tryMove(game, 'e4', 'e8')).toBe(false)
    expect(getState(game).history).toEqual(['e4'])
  })

  it('detects checkmate', () => {
    const game = createGame(MATE_IN_ONE)
    expect(tryMove(game, 'a1', 'a8')).toBe(true)
    expect(getState(game).isGameOver).toBe(true)
  })

  it('lists legal destinations per square for chessground', () => {
    const dests = legalDests(createGame())
    expect(dests.get('e2')).toEqual(['e3', 'e4'])
    expect(dests.get('g1')).toEqual(['f3', 'h3'])
    expect(dests.has('e1')).toBe(false)
  })

  it('validates FEN without throwing', () => {
    expect(isValidFen(MATE_IN_ONE)).toBe(true)
    expect(isValidFen('garbage')).toBe(false)
    expect(isValidFen('')).toBe(false)
  })
})

describe('pgn', () => {
  it('round-trips a short game', () => {
    const game = createGame()
    tryMove(game, 'e2', 'e4')
    tryMove(game, 'e7', 'e5')

    const loaded = loadPgn(toPgn(game))
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(getState(loaded.game).history).toEqual(['e4', 'e5'])
  })

  it('reports an error for unparsable pgn instead of throwing', () => {
    const loaded = loadPgn('1. e4 e5 2. Qxq9 ##')
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/game/game.test.ts`
Expected: FAIL — `Failed to resolve import "./game"`.

- [ ] **Step 3: Написать `src/game/game.ts`**

```ts
import { Chess, validateFen } from 'chess.js'

export type Square = string

export type GameState = {
  fen: string
  history: string[]
  turn: 'w' | 'b'
  isGameOver: boolean
}

export function createGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess()
}

export function isValidFen(fen: string): boolean {
  return validateFen(fen).ok
}

export function tryMove(game: Chess, from: Square, to: Square, promotion = 'q'): boolean {
  try {
    game.move({ from, to, promotion })
    return true
  } catch {
    // chess.js бросает на нелегальном ходе. Для нас это не исключительная
    // ситуация: пользователь просто перетащил фигуру не туда.
    return false
  }
}

export function getState(game: Chess): GameState {
  return {
    fen: game.fen(),
    history: game.history(),
    turn: game.turn(),
    isGameOver: game.isGameOver(),
  }
}

/** chessground ожидает Map<откуда, куда[]>. */
export function legalDests(game: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>()
  for (const move of game.moves({ verbose: true })) {
    const existing = dests.get(move.from)
    if (existing) existing.push(move.to)
    else dests.set(move.from, [move.to])
  }
  return dests
}
```

- [ ] **Step 4: Написать `src/game/pgn.ts`**

```ts
import { Chess } from 'chess.js'

export type PgnResult = { ok: true; game: Chess } | { ok: false; error: string }

export function loadPgn(pgn: string): PgnResult {
  const game = new Chess()
  try {
    game.loadPgn(pgn)
    return { ok: true, game }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function toPgn(game: Chess): string {
  return game.pgn()
}
```

- [ ] **Step 5: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/game/game.test.ts`
Expected: PASS, 7 tests.

Если тест `legalDests` падает на порядке ходов — не сортируйте руками, поправьте ожидание теста под реальный порядок `chess.js`. Порядок ходов для chessground не важен.

- [ ] **Step 6: Commit**

```bash
git add src/game/
git commit -m "feat(game): add chess.js wrapper with FEN/PGN handling"
```

---

### Task 6: Компонент доски

Chessground — императивная библиотека. Она сама владеет своим DOM; React не должен его перерисовывать.

**Files:**
- Create: `src/ui/Board.tsx`
- Create: `src/ui/board.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `chessground`, `legalDests` и `Square` из `src/game/game`.
- Produces:
  - `type Arrow = { orig: Square; dest: Square; brush: 'green' | 'paleGreen' | 'paleGrey' }`
  - `type BoardProps = { fen: string; dests: Map<Square, Square[]>; orientation: 'white' | 'black'; turn: 'white' | 'black'; arrows?: Arrow[]; onMove: (from: Square, to: Square) => void }`
  - `function Board(props: BoardProps): JSX.Element`

- [ ] **Step 1: Подключить стили chessground**

`src/ui/board.css`:

```css
@import 'chessground/assets/chessground.base.css';
@import 'chessground/assets/chessground.brown.css';
@import 'chessground/assets/chessground.cburnett.css';

.board-wrap {
  width: min(80vh, 640px);
  aspect-ratio: 1;
}
```

Без всех трёх файлов доска отрендерится как пустой прямоугольник: `base` задаёт геометрию, `brown` — цвет клеток, `cburnett` — фигуры.

- [ ] **Step 2: Написать `src/ui/Board.tsx`**

```tsx
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { useEffect, useRef } from 'react'
import type { Square } from '../game/game'
import './board.css'

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

  // onMove пересоздаётся на каждый рендер; держим его в ref, чтобы
  // не переинициализировать доску.
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
        dests,
        events: {
          after: (from, to) => onMoveRef.current(from, to),
        },
      },
    })
    return () => {
      api.current?.destroy()
      api.current = null
    }
    // Инициализация ровно один раз. Обновления идут через api.set ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.set({
      fen,
      orientation,
      turnColor: turn,
      movable: { free: false, color: turn, dests },
    })
  }, [fen, orientation, turn, dests])

  useEffect(() => {
    api.current?.setAutoShapes(arrows)
  }, [arrows])

  return <div className="board-wrap" ref={element} />
}
```

Два разных `useEffect` — не случайность. Первый создаёт и уничтожает доску, второй синхронизирует состояние. Если слить их в один, доска будет пересоздаваться на каждый ход, теряя анимацию и фокус.

- [ ] **Step 3: Подключить доску в `src/App.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react'
import { createGame, getState, legalDests, tryMove } from './game/game'
import { Board } from './ui/Board'

export function App() {
  const [game] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const dests = useMemo(() => legalDests(game), [state.fen])

  const onMove = useCallback(
    (from: string, to: string) => {
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  return (
    <main>
      <h1>Chess Analyzer</h1>
      <Board
        fen={state.fen}
        dests={dests}
        orientation="white"
        turn={state.turn === 'w' ? 'white' : 'black'}
        onMove={onMove}
      />
    </main>
  )
}
```

- [ ] **Step 4: Проверить вручную**

Run: `npm run dev`
Expected: доска отрисована с фигурами. Пешку `e2` можно перетащить на `e3` или `e4`, но не на `e5`. После хода белых ходят чёрные.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ src/App.tsx
git commit -m "feat(ui): add chessground board with legal move validation"
```

---

### Task 7: Мост движок → React и живая оценка

Первый момент, когда все части соединяются.

**Files:**
- Create: `src/hooks/useAnalysis.ts`
- Create: `src/ui/EvalBar.tsx`
- Create: `src/ui/LineList.tsx`
- Test: `src/ui/EvalBar.test.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json` (добавить `jsdom`, `@testing-library/react`)

**Interfaces:**
- Consumes: `createEngine`, `AnalyzeOptions` из `src/engine/engine`; `createWorkerTransport`, `isMultiThreaded` из `src/engine/transport`; `EvalUpdate` из `src/engine/uci`.
- Produces:
  - `type AnalysisState = { lines: EvalUpdate[]; depth: number; stale: boolean; multiThreaded: boolean }`
  - `function useAnalysis(fen: string, options: AnalyzeOptions): AnalysisState`
  - `function EvalBar(props: { score: Score | null; orientation: 'white' | 'black' }): JSX.Element`
  - `function formatScore(score: Score): string` (экспортируется из `EvalBar.tsx`)
  - `function whiteWinProbability(score: Score): number` (экспортируется из `EvalBar.tsx`)
  - `function LineList(props: { lines: EvalUpdate[] }): JSX.Element`

- [ ] **Step 1: Установить зависимости для компонентных тестов**

```bash
npm i -D jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Написать падающий тест на `EvalBar`**

Знак оценки — самая частая ошибка в анализаторах. UCI всегда даёт оценку **с точки зрения стороны, которая ходит**. Бар показывает оценку **с точки зрения белых**. Перевод обязан учитывать очередь хода, поэтому `formatScore` работает уже с нормализованной оценкой, а нормализацию делает `useAnalysis`.

`src/ui/EvalBar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EvalBar, formatScore, whiteWinProbability } from './EvalBar'

it('formats a centipawn score in pawns with a sign', () => {
  expect(formatScore({ type: 'cp', value: 616 })).toBe('+6.16')
  expect(formatScore({ type: 'cp', value: -34 })).toBe('-0.34')
  expect(formatScore({ type: 'cp', value: 0 })).toBe('0.00')
})

it('formats a mate score', () => {
  expect(formatScore({ type: 'mate', value: 1 })).toBe('M1')
  expect(formatScore({ type: 'mate', value: -3 })).toBe('-M3')
})

it('maps scores to a white win probability between 0 and 1', () => {
  expect(whiteWinProbability({ type: 'cp', value: 0 })).toBeCloseTo(0.5, 5)
  expect(whiteWinProbability({ type: 'mate', value: 2 })).toBe(1)
  expect(whiteWinProbability({ type: 'mate', value: -2 })).toBe(0)
  expect(whiteWinProbability({ type: 'cp', value: 300 })).toBeGreaterThan(0.7)
  expect(whiteWinProbability({ type: 'cp', value: -300 })).toBeLessThan(0.3)
})

it('renders a placeholder when there is no score yet', () => {
  render(<EvalBar score={null} orientation="white" />)
  expect(screen.getByTestId('eval-bar')).toHaveTextContent('…')
})

it('renders the score text', () => {
  render(<EvalBar score={{ type: 'cp', value: 50 }} orientation="white" />)
  expect(screen.getByTestId('eval-bar')).toHaveTextContent('+0.50')
})
```

Добавить `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

и в `vite.config.ts` в блок `test` добавить `setupFiles: ['./src/test-setup.ts']`.

- [ ] **Step 3: Запустить тест, убедиться что падает**

Run: `npx vitest run src/ui/EvalBar.test.tsx`
Expected: FAIL — `Failed to resolve import "./EvalBar"`.

- [ ] **Step 4: Написать `src/ui/EvalBar.tsx`**

```tsx
import type { Score } from '../engine/uci'

/** Логистическая кривая: 400 сантипешек ≈ 76% ожидаемого результата. */
export function whiteWinProbability(score: Score): number {
  if (score.type === 'mate') return score.value > 0 ? 1 : 0
  return 1 / (1 + Math.pow(10, -score.value / 400))
}

export function formatScore(score: Score): string {
  if (score.type === 'mate') {
    return score.value >= 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`
  }
  const pawns = score.value / 100
  if (pawns === 0) return '0.00'
  return `${pawns > 0 ? '+' : '-'}${Math.abs(pawns).toFixed(2)}`
}

export function EvalBar({ score, orientation }: { score: Score | null; orientation: 'white' | 'black' }) {
  const whiteShare = score ? whiteWinProbability(score) : 0.5
  const whiteHeight = `${whiteShare * 100}%`

  return (
    <div
      data-testid="eval-bar"
      className="eval-bar"
      style={{
        display: 'flex',
        flexDirection: orientation === 'white' ? 'column-reverse' : 'column',
        width: '24px',
        height: 'min(80vh, 640px)',
        background: '#403d39',
        position: 'relative',
      }}
    >
      <div style={{ height: whiteHeight, background: '#f0f0f0', transition: 'height 200ms' }} />
      <span
        style={{
          position: 'absolute',
          inset: 'auto 0 4px 0',
          textAlign: 'center',
          fontSize: '10px',
          color: '#111',
        }}
      >
        {score ? formatScore(score) : '…'}
      </span>
    </div>
  )
}
```

- [ ] **Step 5: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/ui/EvalBar.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/EvalBar.tsx src/ui/EvalBar.test.tsx src/test-setup.ts vite.config.ts package.json package-lock.json
git commit -m "feat(ui): add eval bar with score formatting"
```

- [ ] **Step 7: Написать `src/hooks/useAnalysis.ts`**

```ts
import { useEffect, useRef, useState } from 'react'
import { createEngine, type AnalyzeOptions, type Engine } from '../engine/engine'
import { createWorkerTransport, isMultiThreaded } from '../engine/transport'
import type { EvalUpdate, Score } from '../engine/uci'

export type AnalysisState = {
  lines: EvalUpdate[]
  depth: number
  stale: boolean
  multiThreaded: boolean
}

const THROTTLE_MS = 100

/** UCI отдаёт оценку от лица стороны, которая ходит. Бару нужна оценка от лица белых. */
function toWhitePerspective(score: Score, blackToMove: boolean): Score {
  return blackToMove ? { type: score.type, value: -score.value } : score
}

export function useAnalysis(fen: string, options: AnalyzeOptions): AnalysisState {
  const engineRef = useRef<Engine | null>(null)
  const [lines, setLines] = useState<EvalUpdate[]>([])
  const [depth, setDepth] = useState(0)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    engineRef.current = createEngine(createWorkerTransport())
    return () => {
      engineRef.current?.terminate()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const blackToMove = fen.split(' ')[1] === 'b'
    let cancelled = false
    setStale(true)

    // Апдейты от движка приходят сотнями в секунду; копим их и отдаём React
    // не чаще, чем раз в THROTTLE_MS.
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
  }, [fen, options.depth, options.multiPV, options.chess960])

  return { lines, depth, stale, multiThreaded: isMultiThreaded() }
}
```

`cancelled = true` заставляет цикл `for await` выйти через `break`, что запускает `finally` внутри `analyze` и корректно останавливает движок. `engine.stop()` в клинапе лишь ускоряет этот процесс, посылая `stop` немедленно.

- [ ] **Step 8: Написать `src/ui/LineList.tsx`**

```tsx
import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'

export function LineList({ lines }: { lines: EvalUpdate[] }) {
  if (lines.length === 0) return <p>Анализ…</p>

  return (
    <ol className="line-list">
      {lines.map((line) => (
        <li key={line.multipv}>
          <strong>{formatScore(line.score)}</strong> <span>{line.pv.slice(0, 8).join(' ')}</span>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 9: Соединить всё в `src/App.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react'
import { createGame, getState, legalDests, tryMove } from './game/game'
import { useAnalysis } from './hooks/useAnalysis'
import { Board } from './ui/Board'
import { EvalBar } from './ui/EvalBar'
import { LineList } from './ui/LineList'

const OPTIONS = { depth: 18, multiPV: 3, chess960: false }

export function App() {
  const [game] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))

  const dests = useMemo(() => legalDests(game), [state.fen])
  const analysis = useAnalysis(state.fen, OPTIONS)

  const onMove = useCallback(
    (from: string, to: string) => {
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  const best = analysis.lines[0] ?? null

  return (
    <main>
      <h1>Chess Analyzer</h1>
      {!analysis.multiThreaded && (
        <p role="alert">
          Многопоточный движок недоступен (нет cross-origin isolation). Работает медленная
          однопоточная сборка.
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <EvalBar score={best?.score ?? null} orientation="white" />
        <Board
          fen={state.fen}
          dests={dests}
          orientation="white"
          turn={state.turn === 'w' ? 'white' : 'black'}
          onMove={onMove}
        />
        <div style={{ opacity: analysis.stale ? 0.5 : 1 }}>
          <p>Глубина: {analysis.depth}</p>
          <LineList lines={analysis.lines} />
        </div>
      </div>
    </main>
  )
}
```

Приглушение через `opacity` вместо очистки списка — иначе панель мигает пустотой на каждом ходу.

- [ ] **Step 10: Проверить вручную**

Run: `npm run dev`
Expected:
- Предупреждения про однопоточность нет.
- На стартовой позиции оценка около `+0.20`, глубина растёт до 18 и останавливается.
- Три варианта в списке.
- После хода `1.e4` оценка пересчитывается, список обновляется.
- Сыграть `1.f3 e5 2.g4` — оценка обязана показать `-M1` (мат `d8h4`), а не `M1`. Если знак перевёрнут, сломан `toWhitePerspective`.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/ src/ui/LineList.tsx src/App.tsx
git commit -m "feat: wire engine to UI with live evaluation"
```

---

### Task 8: Стрелки лучших ходов

**Files:**
- Modify: `src/App.tsx`
- Create: `src/ui/arrows.ts`
- Test: `src/ui/arrows.test.ts`

**Interfaces:**
- Consumes: `EvalUpdate` из `src/engine/uci`; `Arrow` из `src/ui/Board`.
- Produces: `function linesToArrows(lines: EvalUpdate[]): Arrow[]`

- [ ] **Step 1: Написать падающий тест**

`src/ui/arrows.test.ts`:

```ts
import { expect, it } from 'vitest'
import type { EvalUpdate } from '../engine/uci'
import { linesToArrows } from './arrows'

const line = (multipv: number, pv: string[]): EvalUpdate => ({
  depth: 10,
  multipv,
  score: { type: 'cp', value: 0 },
  pv,
})

it('draws the best line in green and the rest paler', () => {
  const arrows = linesToArrows([line(1, ['e2e4']), line(2, ['d2d4']), line(3, ['g1f3'])])
  expect(arrows).toEqual([
    { orig: 'e2', dest: 'e4', brush: 'green' },
    { orig: 'd2', dest: 'd4', brush: 'paleGreen' },
    { orig: 'g1', dest: 'f3', brush: 'paleGrey' },
  ])
})

it('handles promotion moves, which carry a fifth character', () => {
  expect(linesToArrows([line(1, ['e7e8q'])])).toEqual([{ orig: 'e7', dest: 'e8', brush: 'green' }])
})

it('ignores lines with an empty pv', () => {
  expect(linesToArrows([line(1, [])])).toEqual([])
})

it('returns nothing for no lines', () => {
  expect(linesToArrows([])).toEqual([])
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/ui/arrows.test.ts`
Expected: FAIL — `Failed to resolve import "./arrows"`.

- [ ] **Step 3: Написать `src/ui/arrows.ts`**

```ts
import type { EvalUpdate } from '../engine/uci'
import type { Arrow } from './Board'

const BRUSHES = ['green', 'paleGreen', 'paleGrey'] as const

export function linesToArrows(lines: EvalUpdate[]): Arrow[] {
  return lines
    .slice(0, BRUSHES.length)
    .filter((line) => line.pv.length > 0)
    .map((line, index) => {
      const move = line.pv[0]
      return {
        orig: move.slice(0, 2),
        dest: move.slice(2, 4),
        brush: BRUSHES[index],
      }
    })
}
```

Ход в UCI-формате — это `e2e4`, а при превращении `e7e8q`. Поэтому `slice(2, 4)`, а не `slice(2)`.

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/ui/arrows.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Передать стрелки в доску**

В `src/App.tsx` добавить импорт `import { linesToArrows } from './ui/arrows'`, вычислить

```tsx
const arrows = useMemo(() => linesToArrows(analysis.lines), [analysis.lines])
```

и передать в `<Board ... arrows={arrows} />`.

- [ ] **Step 6: Проверить вручную**

Run: `npm run dev`
Expected: на стартовой позиции три стрелки — яркая зелёная на первом варианте, две бледные на остальных. При ходе стрелки перерисовываются.

- [ ] **Step 7: Commit**

```bash
git add src/ui/arrows.ts src/ui/arrows.test.ts src/App.tsx
git commit -m "feat(ui): draw best-move arrows on the board"
```

---

### Task 9: Ввод FEN и PGN

**Files:**
- Create: `src/ui/PositionInput.tsx`
- Test: `src/ui/PositionInput.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isValidFen`, `createGame` из `src/game/game`; `loadPgn` из `src/game/pgn`.
- Produces:
  - `type PositionInputProps = { onLoad: (game: Chess) => void }`
  - `function PositionInput(props: PositionInputProps): JSX.Element`

- [ ] **Step 1: Написать падающий тест**

`src/ui/PositionInput.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { PositionInput } from './PositionInput'

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'

it('loads a valid FEN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('FEN'), MATE_IN_ONE)
  await userEvent.click(screen.getByRole('button', { name: 'Загрузить FEN' }))

  expect(onLoad).toHaveBeenCalledTimes(1)
  expect(onLoad.mock.calls[0][0].fen()).toBe(MATE_IN_ONE)
})

it('shows an error for an invalid FEN and does not load it', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('FEN'), 'garbage')
  await userEvent.click(screen.getByRole('button', { name: 'Загрузить FEN' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Некорректный FEN')
  expect(onLoad).not.toHaveBeenCalled()
})

it('loads a valid PGN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('PGN'), '1. e4 e5 2. Nf3')
  await userEvent.click(screen.getByRole('button', { name: 'Загрузить PGN' }))

  expect(onLoad).toHaveBeenCalledTimes(1)
  expect(onLoad.mock.calls[0][0].history()).toEqual(['e4', 'e5', 'Nf3'])
})

it('shows an error for an unparsable PGN', async () => {
  const onLoad = vi.fn()
  render(<PositionInput onLoad={onLoad} />)

  await userEvent.type(screen.getByLabelText('PGN'), '1. Qxq9 ##')
  await userEvent.click(screen.getByRole('button', { name: 'Загрузить PGN' }))

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(onLoad).not.toHaveBeenCalled()
})
```

Установить `@testing-library/user-event`:

```bash
npm i -D @testing-library/user-event
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/ui/PositionInput.test.tsx`
Expected: FAIL — `Failed to resolve import "./PositionInput"`.

- [ ] **Step 3: Написать `src/ui/PositionInput.tsx`**

```tsx
import type { Chess } from 'chess.js'
import { useState } from 'react'
import { createGame, isValidFen } from '../game/game'
import { loadPgn } from '../game/pgn'

export type PositionInputProps = {
  onLoad: (game: Chess) => void
}

export function PositionInput({ onLoad }: PositionInputProps) {
  const [fen, setFen] = useState('')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitFen = () => {
    if (!isValidFen(fen.trim())) {
      setError('Некорректный FEN')
      return
    }
    setError(null)
    onLoad(createGame(fen.trim()))
  }

  const submitPgn = () => {
    const result = loadPgn(pgn.trim())
    if (!result.ok) {
      setError(`Не удалось разобрать PGN: ${result.error}`)
      return
    }
    setError(null)
    onLoad(result.game)
  }

  return (
    <section className="position-input">
      <label htmlFor="fen-input">FEN</label>
      <input id="fen-input" value={fen} onChange={(event) => setFen(event.target.value)} />
      <button type="button" onClick={submitFen}>
        Загрузить FEN
      </button>

      <label htmlFor="pgn-input">PGN</label>
      <textarea id="pgn-input" rows={4} value={pgn} onChange={(event) => setPgn(event.target.value)} />
      <button type="button" onClick={submitPgn}>
        Загрузить PGN
      </button>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/ui/PositionInput.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Подключить в `src/App.tsx`**

Заменить `const [game] = useState(...)` на изменяемое состояние, потому что загрузка позиции подменяет объект партии целиком:

```tsx
const [game, setGame] = useState(() => createGame())
const [state, setState] = useState(() => getState(game))

const loadGame = useCallback((next: Chess) => {
  setGame(next)
  setState(getState(next))
}, [])
```

и отрендерить `<PositionInput onLoad={loadGame} />` под доской. Не забыть `import type { Chess } from 'chess.js'`.

- [ ] **Step 6: Проверить вручную**

Run: `npm run dev`
Expected: вставка FEN `6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1` показывает позицию, оценку `M1` и зелёную стрелку `a1 → a8`. Ввод `garbage` показывает ошибку и не меняет доску.

- [ ] **Step 7: Commit**

```bash
git add src/ui/PositionInput.tsx src/ui/PositionInput.test.tsx src/App.tsx package.json package-lock.json
git commit -m "feat(ui): add FEN and PGN input with error handling"
```

---

### Task 10: Настройки анализа

**Files:**
- Create: `src/hooks/useSettings.ts`
- Test: `src/hooks/useSettings.test.ts`
- Create: `src/ui/SettingsPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AnalyzeOptions` из `src/engine/engine`.
- Produces:
  - `const DEFAULT_SETTINGS: AnalyzeOptions`
  - `function useSettings(): [AnalyzeOptions, (patch: Partial<AnalyzeOptions>) => void]`
  - `function SettingsPanel(props: { settings: AnalyzeOptions; onChange: (patch: Partial<AnalyzeOptions>) => void }): JSX.Element`

- [ ] **Step 1: Написать падающий тест**

`src/hooks/useSettings.test.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, useSettings } from './useSettings'

beforeEach(() => localStorage.clear())

it('starts from the defaults when storage is empty', () => {
  const { result } = renderHook(() => useSettings())
  expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
})

it('persists a patch to localStorage', () => {
  const { result } = renderHook(() => useSettings())
  act(() => result.current[1]({ depth: 22 }))
  expect(result.current[0].depth).toBe(22)
  expect(JSON.parse(localStorage.getItem('chess-analyzer:settings')!).depth).toBe(22)
})

it('restores persisted settings on mount', () => {
  localStorage.setItem('chess-analyzer:settings', JSON.stringify({ ...DEFAULT_SETTINGS, multiPV: 5 }))
  const { result } = renderHook(() => useSettings())
  expect(result.current[0].multiPV).toBe(5)
})

it('falls back to the defaults when storage holds garbage', () => {
  localStorage.setItem('chess-analyzer:settings', 'not json')
  const { result } = renderHook(() => useSettings())
  expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
})

it('clamps out-of-range values from storage', () => {
  localStorage.setItem('chess-analyzer:settings', JSON.stringify({ depth: 999, multiPV: 0, chess960: false }))
  const { result } = renderHook(() => useSettings())
  expect(result.current[0].depth).toBe(30)
  expect(result.current[0].multiPV).toBe(1)
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/hooks/useSettings.test.ts`
Expected: FAIL — `Failed to resolve import "./useSettings"`.

- [ ] **Step 3: Написать `src/hooks/useSettings.ts`**

```ts
import { useCallback, useState } from 'react'
import type { AnalyzeOptions } from '../engine/engine'

const STORAGE_KEY = 'chess-analyzer:settings'

export const DEFAULT_SETTINGS: AnalyzeOptions = {
  depth: 18,
  multiPV: 3,
  chess960: false,
}

const LIMITS = {
  depth: { min: 1, max: 30 },
  multiPV: { min: 1, max: 5 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sanitize(raw: unknown): AnalyzeOptions {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS
  const candidate = raw as Partial<AnalyzeOptions>
  return {
    depth: Number.isInteger(candidate.depth)
      ? clamp(candidate.depth!, LIMITS.depth.min, LIMITS.depth.max)
      : DEFAULT_SETTINGS.depth,
    multiPV: Number.isInteger(candidate.multiPV)
      ? clamp(candidate.multiPV!, LIMITS.multiPV.min, LIMITS.multiPV.max)
      : DEFAULT_SETTINGS.multiPV,
    chess960: typeof candidate.chess960 === 'boolean' ? candidate.chess960 : DEFAULT_SETTINGS.chess960,
  }
}

function read(): AnalyzeOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_SETTINGS
  } catch {
    // Битый JSON или недоступное хранилище — не повод падать.
    return DEFAULT_SETTINGS
  }
}

export function useSettings(): [AnalyzeOptions, (patch: Partial<AnalyzeOptions>) => void] {
  const [settings, setSettings] = useState<AnalyzeOptions>(read)

  const update = useCallback((patch: Partial<AnalyzeOptions>) => {
    setSettings((current) => {
      const next = sanitize({ ...current, ...patch })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Приватный режим браузера. Настройки просто не переживут перезагрузку.
      }
      return next
    })
  }, [])

  return [settings, update]
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/hooks/useSettings.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Написать `src/ui/SettingsPanel.tsx`**

```tsx
import type { AnalyzeOptions } from '../engine/engine'

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: AnalyzeOptions
  onChange: (patch: Partial<AnalyzeOptions>) => void
}) {
  return (
    <section className="settings">
      <label htmlFor="depth">Глубина: {settings.depth}</label>
      <input
        id="depth"
        type="range"
        min={1}
        max={30}
        value={settings.depth}
        onChange={(event) => onChange({ depth: Number(event.target.value) })}
      />

      <label htmlFor="multipv">Вариантов: {settings.multiPV}</label>
      <input
        id="multipv"
        type="range"
        min={1}
        max={5}
        value={settings.multiPV}
        onChange={(event) => onChange({ multiPV: Number(event.target.value) })}
      />
    </section>
  )
}
```

- [ ] **Step 6: Подключить в `src/App.tsx`**

Удалить константу `OPTIONS` целиком. Добавить импорты:

```tsx
import { useSettings } from './hooks/useSettings'
import { SettingsPanel } from './ui/SettingsPanel'
```

Заменить строку `const analysis = useAnalysis(state.fen, OPTIONS)` на две:

```tsx
const [settings, updateSettings] = useSettings()
const analysis = useAnalysis(state.fen, settings)
```

И отрендерить панель в правой колонке, над `<LineList>`:

```tsx
<SettingsPanel settings={settings} onChange={updateSettings} />
```

`useSettings` возвращает новый объект только при изменении, а `useAnalysis` зависит от полей `settings`, а не от ссылки на объект, поэтому лишних перезапусков анализа не будет.

- [ ] **Step 7: Проверить вручную**

Run: `npm run dev`
Expected: изменение глубины перезапускает анализ; изменение числа вариантов меняет длину списка и количество стрелок; после перезагрузки страницы значения сохраняются.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useSettings.ts src/hooks/useSettings.test.ts src/ui/SettingsPanel.tsx src/App.tsx
git commit -m "feat: add persisted analysis settings"
```

---

### Task 11: Восстановление после падения воркера

Спек требует: при падении воркера перезапустить его и повторить последний запрос один раз, дальше — сообщение.

**Files:**
- Modify: `src/engine/transport.ts`
- Modify: `src/hooks/useAnalysis.ts`
- Test: `src/engine/transport.test.ts`

**Interfaces:**
- Consumes: `EngineTransport` из `./transport`.
- Produces:
  - `createWorkerTransport(scriptUrl?: string, onError?: (error: unknown) => void): EngineTransport` — расширенная сигнатура
  - `AnalysisState` получает новое поле: `error: string | null`

- [ ] **Step 1: Написать падающий тест на проброс ошибки**

`src/engine/transport.test.ts`:

```ts
// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { createWorkerTransport } from './transport'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
}

it('forwards worker errors to the callback', () => {
  const fake = new FakeWorker()
  vi.stubGlobal('Worker', vi.fn(() => fake))
  const onError = vi.fn()

  createWorkerTransport('/engine.js', onError)
  fake.onerror?.(new ErrorEvent('error', { message: 'boom' }))

  expect(onError).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})

it('forwards only string messages to the line handler', () => {
  const fake = new FakeWorker()
  vi.stubGlobal('Worker', vi.fn(() => fake))
  const lines: string[] = []

  const transport = createWorkerTransport('/engine.js')
  transport.onLine((line) => lines.push(line))

  fake.onmessage?.({ data: 'readyok' } as MessageEvent)
  fake.onmessage?.({ data: { not: 'a string' } } as MessageEvent)

  expect(lines).toEqual(['readyok'])
  vi.unstubAllGlobals()
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/engine/transport.test.ts`
Expected: FAIL — `createWorkerTransport` принимает один аргумент, `onError` не вызывается.

- [ ] **Step 3: Расширить `createWorkerTransport`**

В `src/engine/transport.ts` заменить функцию на:

```ts
export function createWorkerTransport(
  scriptUrl: string = selectEngineUrl(),
  onError?: (error: unknown) => void,
): EngineTransport {
  const worker = new Worker(scriptUrl)
  let handler: (line: string) => void = () => {}

  worker.onmessage = (event: MessageEvent) => {
    if (typeof event.data === 'string') handler(event.data)
  }
  worker.onerror = (event) => onError?.(event)

  return {
    send: (command) => worker.postMessage(command),
    onLine: (next) => {
      handler = next
    },
    terminate: () => worker.terminate(),
  }
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/engine/transport.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Обработать падение в `useAnalysis`**

В `src/hooks/useAnalysis.ts`: добавить в `AnalysisState` поле `error: string | null`, завести `const [error, setError] = useState<string | null>(null)` и счётчик перезапусков в ref.

Заменить эффект создания движка на:

```ts
const restarts = useRef(0)
const [engineGeneration, setEngineGeneration] = useState(0)

useEffect(() => {
  const handleError = () => {
    if (restarts.current >= 1) {
      setError('Движок аварийно завершился. Перезагрузите страницу.')
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
```

Смена `engineGeneration` пересоздаёт движок, а эффект анализа перезапускается, потому что `engineRef.current` меняется — добавьте `engineGeneration` в массив зависимостей эффекта анализа. Это и есть «повторить последний запрос один раз».

Вернуть `error` из хука.

- [ ] **Step 6: Показать ошибку в `src/App.tsx`**

Под предупреждением про однопоточность добавить:

```tsx
{analysis.error && <p role="alert">{analysis.error}</p>}
```

- [ ] **Step 7: Проверить вручную**

Run: `npm run dev`

В консоли браузера убить воркер: временно поменять `MULTI_THREADED` на несуществующий путь `/stockfish/nope.js`, перезагрузить.
Expected: движок перезапускается один раз, затем появляется сообщение «Движок аварийно завершился». Вернуть путь обратно.

- [ ] **Step 8: Commit**

```bash
git add src/engine/transport.ts src/engine/transport.test.ts src/hooks/useAnalysis.ts src/App.tsx
git commit -m "feat(engine): recover from worker crashes once, then report"
```

---

### Task 12: Просмотр варианта кликом по ходу

Спек: «клик по ходу в цепочке проматывает доску на эту позицию, не разрушая основную партию».

**Files:**
- Create: `src/game/preview.ts`
- Test: `src/game/preview.test.ts`
- Modify: `src/ui/LineList.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `chess.js`.
- Produces:
  - `function previewFen(baseFen: string, uciMoves: string[]): string | null` — `null`, если ходы нелегальны в этой позиции
  - `LineList` получает новый проп: `onSelect: (line: EvalUpdate, plyCount: number) => void`

- [ ] **Step 1: Написать падающий тест**

`src/game/preview.test.ts`:

```ts
import { expect, it } from 'vitest'
import { previewFen } from './preview'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

it('applies a single uci move', () => {
  expect(previewFen(START, ['e2e4'])).toBe(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  )
})

it('applies a sequence of uci moves', () => {
  const fen = previewFen(START, ['e2e4', 'e7e5', 'g1f3'])
  expect(fen).toContain(' b ')
  expect(fen!.startsWith('rnbqkbnr/pppp1ppp')).toBe(true)
})

it('returns the base position for an empty move list', () => {
  expect(previewFen(START, [])).toBe(START)
})

it('handles promotion moves', () => {
  const fen = previewFen('8/P6k/8/8/8/8/8/7K w - - 0 1', ['a7a8q'])
  expect(fen).toContain('Q7/7k')
})

it('returns null for an illegal move instead of throwing', () => {
  expect(previewFen(START, ['e2e5'])).toBeNull()
})

it('returns null for an invalid base position', () => {
  expect(previewFen('garbage', ['e2e4'])).toBeNull()
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/game/preview.test.ts`
Expected: FAIL — `Failed to resolve import "./preview"`.

- [ ] **Step 3: Написать `src/game/preview.ts`**

```ts
import { Chess } from 'chess.js'

/**
 * Проигрывает UCI-ходы от базовой позиции и возвращает получившийся FEN.
 * Ничего не мутирует: работает на своём экземпляре Chess.
 */
export function previewFen(baseFen: string, uciMoves: string[]): string | null {
  try {
    const game = new Chess(baseFen)
    for (const move of uciMoves) {
      game.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.length > 4 ? move[4] : undefined,
      })
    }
    return game.fen()
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/game/preview.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Сделать ходы в `LineList` кликабельными**

Заменить `src/ui/LineList.tsx` целиком:

```tsx
import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'

export type LineListProps = {
  lines: EvalUpdate[]
  onSelect: (line: EvalUpdate, plyCount: number) => void
}

export function LineList({ lines, onSelect }: LineListProps) {
  if (lines.length === 0) return <p>Анализ…</p>

  return (
    <ol className="line-list">
      {lines.map((line) => (
        <li key={line.multipv}>
          <strong>{formatScore(line.score)}</strong>{' '}
          {line.pv.slice(0, 8).map((move, index) => (
            <button
              key={`${move}-${index}`}
              type="button"
              className="pv-move"
              onClick={() => onSelect(line, index + 1)}
            >
              {move}
            </button>
          ))}
        </li>
      ))}
    </ol>
  )
}
```

`plyCount` — сколько полуходов варианта применить: клик по первому ходу даёт `1`.

- [ ] **Step 6: Завести состояние просмотра в `src/App.tsx`**

Добавить импорт `import { previewFen } from './game/preview'` и состояние:

```tsx
const [preview, setPreview] = useState<string | null>(null)

const selectLine = useCallback(
  (line: EvalUpdate, plyCount: number) => {
    setPreview(previewFen(state.fen, line.pv.slice(0, plyCount)))
  },
  [state.fen],
)

// Ход по доске или загрузка позиции всегда выходят из просмотра.
const displayFen = preview ?? state.fen
const previewing = preview !== null
```

Анализ и доска теперь работают от `displayFen`:

```tsx
const analysis = useAnalysis(displayFen, settings)
```

В `<Board>` передать `fen={displayFen}` и `dests={previewing ? new Map() : dests}` — во время просмотра ходить нельзя. В `onMove` и `loadGame` первой строкой добавить `setPreview(null)`.

Под доской показать кнопку возврата:

```tsx
{previewing && (
  <button type="button" onClick={() => setPreview(null)}>
    Вернуться к партии
  </button>
)}
```

Передать `onSelect={selectLine}` в `<LineList>`. Не забыть `import type { EvalUpdate } from './engine/uci'`.

- [ ] **Step 7: Проверить вручную**

Run: `npm run dev`
Expected: клик по второму ходу первого варианта переставляет доску на два полухода вперёд, появляется кнопка «Вернуться к партии», оценка пересчитывается для показанной позиции. Клик по кнопке возвращает исходную позицию, ходить снова можно.

- [ ] **Step 8: Commit**

```bash
git add src/game/preview.ts src/game/preview.test.ts src/ui/LineList.tsx src/App.tsx
git commit -m "feat(ui): preview engine lines by clicking their moves"
```

---

### Task 13: Редактор позиции

Четвёртый способ ввода из спека: ручная расстановка фигур.

**Files:**
- Create: `src/game/editor.ts`
- Test: `src/game/editor.test.ts`
- Create: `src/ui/PositionEditor.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isValidFen` из `src/game/game`; `chessground` API `getFen()` / `setPieces()`.
- Produces:
  - `const EMPTY_PLACEMENT = '8/8/8/8/8/8/8/8'`
  - `function composeFen(placement: string, turn: 'w' | 'b'): string`
  - `function validatePlacement(placement: string, turn: 'w' | 'b'): { ok: true; fen: string } | { ok: false; error: string }`

- [ ] **Step 1: Написать падающий тест**

`src/game/editor.test.ts`:

```ts
import { expect, it } from 'vitest'
import { composeFen, EMPTY_PLACEMENT, validatePlacement } from './editor'

it('composes a full fen from a placement and a side to move', () => {
  expect(composeFen('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'w')).toBe('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')
  expect(composeFen('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'b')).toBe('6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1')
})

it('accepts a legal placement', () => {
  const result = validatePlacement('6k1/5ppp/8/8/8/8/5PPP/R5K1', 'w')
  expect(result).toEqual({ ok: true, fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1' })
})

it('rejects an empty board', () => {
  const result = validatePlacement(EMPTY_PLACEMENT, 'w')
  expect(result.ok).toBe(false)
})

it('rejects a position missing a king', () => {
  const result = validatePlacement('6k1/5ppp/8/8/8/8/5PPP/R7', 'w')
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeTruthy()
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/game/editor.test.ts`
Expected: FAIL — `Failed to resolve import "./editor"`.

- [ ] **Step 3: Написать `src/game/editor.ts`**

```ts
import { isValidFen } from './game'

export const EMPTY_PLACEMENT = '8/8/8/8/8/8/8/8'

/**
 * chessground отдаёт только расстановку фигур. Права на рокировку и взятие
 * на проходе восстановить из неё нельзя, поэтому редактор их обнуляет.
 */
export function composeFen(placement: string, turn: 'w' | 'b'): string {
  return `${placement} ${turn} - - 0 1`
}

export function validatePlacement(
  placement: string,
  turn: 'w' | 'b',
): { ok: true; fen: string } | { ok: false; error: string } {
  const fen = composeFen(placement, turn)
  if (!isValidFen(fen)) {
    return { ok: false, error: 'Некорректная позиция: на доске должны быть оба короля.' }
  }
  return { ok: true, fen }
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/game/editor.test.ts`
Expected: PASS, 4 tests.

Если тест «rejects an empty board» падает — значит `validateFen` из chess.js пропускает позицию без королей. Тогда добавьте явную проверку `placement.includes('k') && placement.includes('K')` перед вызовом `isValidFen`.

- [ ] **Step 5: Написать `src/ui/PositionEditor.tsx`**

Отдельная доска в свободном режиме. Клик по фигуре в палитре, затем клик по клетке — ставит фигуру. Клик по занятой клетке пустой палитрой — убирает.

```tsx
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import { useEffect, useRef, useState } from 'react'
import { EMPTY_PLACEMENT, composeFen, validatePlacement } from '../game/editor'
import '../ui/board.css'

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
          Ластик
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
          Очистить доску
        </button>
        <label>
          <input type="radio" checked={turn === 'w'} onChange={() => setTurn('w')} /> Ход белых
        </label>
        <label>
          <input type="radio" checked={turn === 'b'} onChange={() => setTurn('b')} /> Ход чёрных
        </label>
        <button type="button" onClick={apply}>
          Применить
        </button>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
```

Права на рокировку редактор обнуляет — восстановить их из расстановки невозможно. Это осознанное упрощение: кому нужна рокировка, вставит FEN.

- [ ] **Step 6: Подключить в `src/App.tsx`**

```tsx
const [editing, setEditing] = useState(false)

const applyEditedFen = useCallback(
  (fen: string) => {
    setEditing(false)
    setPreview(null)
    loadGame(createGame(fen))
  },
  [loadGame],
)
```

Отрендерить кнопку «Редактировать позицию» (`onClick={() => setEditing(true)}`), а когда `editing === true` — показывать `<PositionEditor initialFen={state.fen} onApply={applyEditedFen} onCancel={() => setEditing(false)} />` вместо основной доски.

- [ ] **Step 7: Проверить вручную**

Run: `npm run dev`
Expected: кнопка открывает редактор. Выбор ферзя в палитре и клик по `d4` ставит белого ферзя. «Ластик» + клик убирает фигуру. «Очистить доску» + «Применить» показывает ошибку про королей. Расстановка мата в один и «Применить» возвращает к анализатору с оценкой `M1`.

- [ ] **Step 8: Commit**

```bash
git add src/game/editor.ts src/game/editor.test.ts src/ui/PositionEditor.tsx src/App.tsx
git commit -m "feat(ui): add manual position editor"
```

---

### Task 14: Роутер и заглушки страниц

**Files:**
- Create: `src/pages/Analyzer.tsx`
- Create: `src/pages/PlayVsComputer.tsx`
- Create: `src/pages/Freestyle.tsx`
- Create: `src/pages/ImportGame.tsx`
- Create: `src/pages/BestMove.tsx`
- Create: `src/ui/Nav.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json` (добавить `react-router`)

**Interfaces:**
- Consumes: всё из предыдущих задач.
- Produces: маршруты `/`, `/play`, `/freestyle`, `/import`, `/best-move`.

- [ ] **Step 1: Установить роутер**

```bash
npm i react-router@^7
```

- [ ] **Step 2: Перенести содержимое `App.tsx` в `src/pages/Analyzer.tsx`**

Целиком переносится текущее тело `App` вместе с импортами, экспортируется как `export function Analyzer()`.

- [ ] **Step 3: Создать четыре заглушки**

Каждая — по одному файлу. `src/pages/PlayVsComputer.tsx`:

```tsx
export function PlayVsComputer() {
  return <p>Игра с компьютером появится в под-проекте 2.</p>
}
```

`src/pages/Freestyle.tsx`:

```tsx
export function Freestyle() {
  return <p>Chess960 появится в под-проекте 2.</p>
}
```

`src/pages/ImportGame.tsx`:

```tsx
export function ImportGame() {
  return <p>Импорт партий появится в под-проекте 3.</p>
}
```

`src/pages/BestMove.tsx`:

```tsx
export function BestMove() {
  return <p>Поиск лучшего хода появится вместе с упрощённым интерфейсом анализатора.</p>
}
```

- [ ] **Step 4: Создать `src/ui/Nav.tsx`**

```tsx
import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Анализатор' },
  { to: '/best-move', label: 'Лучший ход' },
  { to: '/play', label: 'Игра с компьютером' },
  { to: '/freestyle', label: 'Chess960' },
  { to: '/import', label: 'Импорт партии' },
]

export function Nav() {
  return (
    <nav>
      {LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} end>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Переписать `src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router'
import { Analyzer } from './pages/Analyzer'
import { BestMove } from './pages/BestMove'
import { Freestyle } from './pages/Freestyle'
import { ImportGame } from './pages/ImportGame'
import { PlayVsComputer } from './pages/PlayVsComputer'
import { Nav } from './ui/Nav'

export function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Analyzer />} />
        <Route path="/best-move" element={<BestMove />} />
        <Route path="/play" element={<PlayVsComputer />} />
        <Route path="/freestyle" element={<Freestyle />} />
        <Route path="/import" element={<ImportGame />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Прогнать весь набор тестов**

Run: `npm test`
Expected: PASS, все файлы. Ни один тест из предыдущих задач не сломан.

- [ ] **Step 7: Проверить вручную**

Run: `npm run dev`
Expected: навигация переключает страницы; на `/` анализатор работает как раньше; уход с `/` на другую страницу останавливает движок (в консоли нет продолжающегося потока `info`).

- [ ] **Step 8: Обновить `README.md`**

```markdown
# Chess Analyzer

Локальный шахматный анализатор: Stockfish 18 в браузере, без бэкенда.

## Запуск

    npm install
    npm run dev

Открыть http://localhost:5173

## Тесты

    npm test

## Лицензия

GPL-3.0 (требование Stockfish).
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/ src/ui/Nav.tsx src/App.tsx README.md package.json package-lock.json
git commit -m "feat: add router and stub pages for remaining tools"
```

---

## Покрытие спека

| Требование спека | Задача |
| --- | --- |
| Заголовки COOP/COEP, выбор сборки движка | 1 |
| Парсер UCI | 2 |
| Шов `EngineTransport`, Worker и Node | 3 |
| `analyze` / `stop`, корректное прерывание поиска | 4 |
| Модуль партии, FEN, PGN, легальность | 5 |
| Доска на chessground, перетаскивание | 6 |
| Мост `useAnalysis`, eval-бар, список вариантов, троттлинг, предупреждение об однопоточности | 7 |
| Стрелки лучших ходов | 8 |
| Ввод FEN и PGN, обработка ошибок ввода | 9 |
| Настройки в `localStorage` | 10 |
| Восстановление после падения воркера | 11 |
| Проматывание варианта кликом по ходу | 12 |
| Редактор позиции (четвёртый способ ввода) | 13 |
| Роутер и остальные страницы | 14 |

## Что осталось за рамками этого плана

Под-проекты 2, 3 и 4 из спека: игра с компьютером и Chess960, импорт и разбор партий, AI-чат. Каждый получит свой спек и свой план.

Отдельно отмечено внутри Task 13: редактор позиции обнуляет права на рокировку и поле взятия на проходе, потому что восстановить их из расстановки фигур невозможно. Пользователь, которому нужна рокировка, вводит FEN напрямую.
