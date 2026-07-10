# Visual Layer Implementation Plan

> **For agentic workers:** выполняйте задачи по порядку, по одной. Шаги помечены чекбоксами (`- [ ]`). Каждая задача заканчивается коммитом и пушем.
>
> Если ваш харнесс — Claude Code с плагином superpowers, используйте `superpowers:subagent-driven-development` или `superpowers:executing-plans`. Если нет — идите по шагам сверху вниз, это ничего не меняет.

**Goal:** Одеть работающий анализатор в тёмную палитру OduSphere: токены, три шрифта, липкая шапка с вкладками-пилюлями, карточки правой колонки, доступный фокус и узкие экраны.

**Architecture:** Tailwind v4 читает блок `@theme` из единственного файла `src/styles/index.css` и генерирует утилиты. Размер доски живёт в CSS-переменной `--board-size`, от неё же считается высота eval-бара — они не могут разойтись. Логика (`engine/`, `game/`, `hooks/`) не трогается вообще: если для перекраски пришлось её изменить, значит протекла абстракция.

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/vite`, `@fontsource` (Inter, Space Grotesk, JetBrains Mono), React 19, Vite 6, vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-visual-layer-design.md`

## Global Constraints

- Точные версии: `tailwindcss@4.3.2`, `@tailwindcss/vite@4.3.2`, `@fontsource/inter@5.2.8`, `@fontsource/space-grotesk@5.2.10`, `@fontsource/jetbrains-mono@5.2.8`.
- **Существующие 59 тестов обязаны проходить без единой правки.** Меняем оформление, не поведение.
- **Не трогать** `src/engine/`, `src/game/`, `src/hooks/`. Единственное исключение — `useAnalysis` уже отдаёт `depth`, ничего добавлять не нужно.
- **Никогда не набирать текст цветом `decor` (`#5B6184`).** Класс `text-decor` запрещён; это проверяется тестом. Цвет только для разделителей и отключённых элементов.
- Язык интерфейса — **английский**. Существующие подписи не переводить.
- Потолок доски — `min(80vh, 640px)`, не менять.
- Тема только тёмная. Светлой нет.
- Сохранить зацепки: `data-testid="eval-bar"`; `role="alert"` на всех сообщениях об ошибке; доступные имена кнопок `Load FEN`, `Load PGN`, `Back to game`, `Edit position`, `Apply`, `Cancel`, `Clear board`, `Eraser`; `id` полей `fen-input`, `pgn-input`, `depth`, `multipv` с их `<label htmlFor>`; классы `line-list`, `pv-move`, `position-editor`, `palette`, `editor-controls`.
- Работаем в ветке `chess-analyzer-core`. Каждая задача: коммит + `git push`.

## Предпосылки окружения

Проверено на живом стенде до написания плана:

- `npx vite build` с `@tailwindcss/vite` собирается; шрифты `@fontsource` попадают в бандл как `.woff2`.
- `@theme { --color-fg-muted: … }` порождает `.text-fg-muted{color:var(--color-fg-muted)}`.
- `--font-display` порождает `.font-display`.
- `ring-accent/35` порождает `--tw-ring-color:#2dd4ff59`, то есть альфа-модификатор работает на кастомных цветах.

---

### Task 1: Tailwind, токены и шрифты

**Files:**
- Create: `src/styles/index.css`
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `src/ui/board.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: ничего.
- Produces: утилиты `bg-bg`, `bg-surface`, `border-border`, `text-fg`, `text-fg-secondary`, `text-fg-muted`, `text-accent`, `text-accent-alt`, `font-display`, `font-sans`, `font-mono`; CSS-переменные `--board-size` и `--color-*`; брейкпоинт `wide` (1100px).

- [ ] **Step 1: Установить зависимости**

```bash
npm i -D tailwindcss@4.3.2 @tailwindcss/vite@4.3.2
npm i @fontsource/inter@5.2.8 @fontsource/space-grotesk@5.2.10 @fontsource/jetbrains-mono@5.2.8
```

Шрифты идут в `dependencies`, а не `devDependencies`: их `@import` попадает в продакшн-бандл.

- [ ] **Step 2: Подключить плагин в `vite.config.ts`**

Добавить импорт и плагин, всё остальное оставить как есть:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  test: {
    environment: 'node',
    testTimeout: 60_000,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 3: Создать `src/styles/index.css`**

Значения токенов взяты из спека дословно. `--color-fg-muted` — это осветлённый `#6E76A0`, а не исходный `#5B6184` с odusphere.dev: тот даёт контраст 3.38:1 и не проходит WCAG AA.

```css
@import "tailwindcss";

@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/space-grotesk/500.css";
@import "@fontsource/space-grotesk/700.css";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/600.css";

@theme {
  --color-bg: #04050A;
  --color-surface: rgba(255, 255, 255, 0.024);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-well: #11131C;

  --color-fg: #EEF0FA;
  --color-fg-secondary: #9AA1BD;
  --color-fg-muted: #6E76A0;

  --color-accent: #2DD4FF;
  --color-accent-alt: #7C83FF;
  --color-decor: #5B6184;

  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --breakpoint-wide: 1100px;
}

@layer base {
  :root {
    /* Единственный источник размера доски. Высота eval-бара берётся отсюда же,
       поэтому они не могут разойтись. */
    --board-size: min(80vh, 640px);
    color-scheme: dark;
  }

  /* На узком экране высота окна больше не ограничивает: доска считается от ширины,
     иначе на телефоне она вылезет за экран. */
  @media (max-width: 1099px) {
    :root {
      --board-size: min(100vw - 3rem, 640px);
    }
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
  }

  /* Фокус не виден нигде, потому что у кнопок сняты дефолтные стили.
     Фиолетовый второй акцент, чтобы кольцо не сливалось с активной вкладкой на циане. */
  :focus-visible {
    outline: 2px solid var(--color-accent-alt);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 4: Импортировать стили в `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Привязать доску к `--board-size` в `src/ui/board.css`**

Файл остаётся обычным CSS: это единственное место, где импортируются стили chessground, и переносить их в утилиты нельзя.

```css
@import 'chessground/assets/chessground.base.css';
@import 'chessground/assets/chessground.brown.css';
@import 'chessground/assets/chessground.cburnett.css';

.board-wrap {
  width: var(--board-size);
  aspect-ratio: 1;
  flex: none;
  border-radius: 6px;
  overflow: hidden;
}
```

- [ ] **Step 6: Проверить, что утилиты действительно сгенерированы**

```bash
npm run build
grep -c 'text-fg-muted' dist/assets/*.css
```

Expected: сборка проходит, `grep` печатает число `1` или больше.

Если `0` — Tailwind не увидел плагин либо `index.css` не импортирован из `main.tsx`.

- [ ] **Step 7: Проверить, что ничего не сломалось**

Run: `npm test`
Expected: PASS, 59 tests. Ни один тест не правился.

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/main.tsx src/styles/index.css src/ui/board.css
git commit -m "feat(ui): add tailwind v4, design tokens and self-hosted fonts"
git push
```

---

### Task 2: Тест контраста палитры

Проверка WCAG становится тестом, а не разовым замером. Попытка вернуть красивый, но тусклый цвет упрётся в красную сборку.

**Files:**
- Create: `src/styles/contrast.ts`
- Test: `src/styles/contrast.test.ts`

**Interfaces:**
- Consumes: `src/styles/index.css` (читается с диска как текст).
- Produces:
  - `type Rgb = { r: number; g: number; b: number }`
  - `function parseColor(value: string): { rgb: Rgb; alpha: number }`
  - `function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb`
  - `function relativeLuminance(rgb: Rgb): number`
  - `function contrastRatio(a: Rgb, b: Rgb): number`

- [ ] **Step 1: Написать падающий тест**

`src/styles/contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compositeOver, contrastRatio, parseColor, relativeLuminance } from './contrast'

const css = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`token --color-${name} not found in index.css`)
  return match[1].trim()
}

const bg = parseColor(token('bg')).rgb
const surfaceRaw = parseColor(token('surface'))
const surface = compositeOver(surfaceRaw.rgb, surfaceRaw.alpha, bg)

const TEXT_TOKENS = ['fg', 'fg-secondary', 'fg-muted', 'accent', 'accent-alt'] as const

describe('colour maths', () => {
  it('parses hex', () => {
    expect(parseColor('#04050A')).toEqual({ rgb: { r: 4, g: 5, b: 10 }, alpha: 1 })
  })

  it('parses rgba', () => {
    expect(parseColor('rgba(255, 255, 255, 0.024)')).toEqual({
      rgb: { r: 255, g: 255, b: 255 },
      alpha: 0.024,
    })
  })

  it('computes known luminances', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
  })

  it('computes the canonical black-on-white ratio', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2)
  })

  it('is symmetric', () => {
    const a = { r: 4, g: 5, b: 10 }
    const b = { r: 238, g: 240, b: 250 }
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('composites a translucent surface over the page background', () => {
    expect(compositeOver({ r: 255, g: 255, b: 255 }, 0, bg)).toEqual(bg)
    expect(compositeOver({ r: 255, g: 255, b: 255 }, 1, bg)).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('palette accessibility', () => {
  for (const name of TEXT_TOKENS) {
    it(`${name} meets WCAG AA on the page background`, () => {
      expect(contrastRatio(parseColor(token(name)).rgb, bg)).toBeGreaterThanOrEqual(4.5)
    })

    it(`${name} meets WCAG AA on a card surface`, () => {
      expect(contrastRatio(parseColor(token(name)).rgb, surface)).toBeGreaterThanOrEqual(4.5)
    })
  }

  // #5B6184 — приглушённый тон с odusphere.dev. Он даёт 3.38:1 и в текст не годится.
  // Тест фиксирует именно это: цвет остаётся в палитре, но только для нетекстовых нужд.
  it('keeps the decorative tone below the text threshold, by design', () => {
    expect(contrastRatio(parseColor(token('decor')).rgb, bg)).toBeLessThan(4.5)
  })
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/styles/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "./contrast"`.

- [ ] **Step 3: Написать `src/styles/contrast.ts`**

```ts
export type Rgb = { r: number; g: number; b: number }

const HEX = /^#([0-9a-f]{6})$/i
const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i

export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const trimmed = value.trim()

  const hex = trimmed.match(HEX)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }, alpha: 1 }
  }

  const rgba = trimmed.match(RGBA)
  if (rgba) {
    return {
      rgb: { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]) },
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    }
  }

  throw new Error(`Unsupported colour: ${value}`)
}

/** Полупрозрачная поверхность поверх фона даёт цвет, который человек видит на самом деле. */
export function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha))
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b) }
}

/** WCAG 2.1, определение относительной яркости. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/styles/contrast.test.ts`
Expected: PASS, 17 tests.

Если падает `fg-muted meets WCAG AA` — в `index.css` попал исходный `#5B6184` вместо `#6E76A0`.

- [ ] **Step 5: Добавить тест-страж на запрет `text-decor`**

Запрет из спека («никогда не набирать текст цветом `decor`») сам себя не соблюдёт. Этот тест ловит нарушение при следующем же прогоне.

Сначала дополнить импорты **вверху** `src/styles/contrast.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
```

Затем дописать в конец файла:

```ts
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|css)$/.test(entry) ? [full] : []
  })
}

it('never types text in the decorative tone', () => {
  const src = fileURLToPath(new URL('..', import.meta.url))
  const offenders = sourceFiles(src).filter((file) => {
    if (file.endsWith('contrast.test.ts')) return false
    return /\btext-decor\b/.test(readFileSync(file, 'utf8'))
  })
  expect(offenders).toEqual([])
})
```

- [ ] **Step 6: Запустить весь набор**

Run: `npm test`
Expected: PASS, 77 tests (59 прежних + 18 новых). Ни один прежний тест не правился.

- [ ] **Step 7: Commit**

```bash
git add src/styles/contrast.ts src/styles/contrast.test.ts
git commit -m "test(ui): guard palette contrast against WCAG AA"
git push
```

---

### Task 3: Оболочка и вкладки-пилюли

**Files:**
- Create: `src/ui/Shell.tsx`
- Modify: `src/ui/Nav.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: утилиты из Task 1; `react-router`.
- Produces: `function Shell(props: { children: ReactNode }): JSX.Element`; `function Nav(): JSX.Element`.

- [ ] **Step 1: Переписать `src/ui/Nav.tsx`**

Пилюли. Активная — циан с прозрачностью, неактивные — приглушённый тон. `overflow-x-auto` вместо гамбургера: ради пяти пунктов меню не заводят.

```tsx
import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Analyzer' },
  { to: '/best-move', label: 'Best move' },
  { to: '/play', label: 'Play vs computer' },
  { to: '/freestyle', label: 'Chess960' },
  { to: '/import', label: 'Import game' },
]

const BASE = 'whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors'

export function Nav() {
  return (
    <nav className="flex gap-1.5 overflow-x-auto">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            isActive
              ? `${BASE} border-accent/35 bg-accent/10 text-fg`
              : `${BASE} border-transparent text-fg-muted hover:text-fg-secondary`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Создать `src/ui/Shell.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Nav } from './Nav'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-white/2 backdrop-blur">
        <div className="flex h-15 items-center gap-7 px-6">
          <span className="font-display text-lg font-bold whitespace-nowrap">
            Chess<span className="text-accent">Analyzer</span>
          </span>
          <Nav />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Обернуть маршруты в `src/App.tsx`**

Заглушки получают оформление бесплатно, потому что живут внутри `Shell`.

```tsx
import { BrowserRouter, Route, Routes } from 'react-router'
import { Analyzer } from './pages/Analyzer'
import { BestMove } from './pages/BestMove'
import { Freestyle } from './pages/Freestyle'
import { ImportGame } from './pages/ImportGame'
import { PlayVsComputer } from './pages/PlayVsComputer'
import { Shell } from './ui/Shell'

export function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Analyzer />} />
          <Route path="/best-move" element={<BestMove />} />
          <Route path="/play" element={<PlayVsComputer />} />
          <Route path="/freestyle" element={<Freestyle />} />
          <Route path="/import" element={<ImportGame />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Оформить четыре заглушки**

Все четыре одинаковы по структуре. `src/pages/BestMove.tsx`:

```tsx
export function BestMove() {
  return (
    <p className="text-fg-secondary">
      Best-move search will arrive alongside the simplified analyzer interface.
    </p>
  )
}
```

`src/pages/PlayVsComputer.tsx`:

```tsx
export function PlayVsComputer() {
  return <p className="text-fg-secondary">Play against the computer will arrive in sub-project 2.</p>
}
```

`src/pages/Freestyle.tsx`:

```tsx
export function Freestyle() {
  return <p className="text-fg-secondary">Chess960 will arrive in sub-project 2.</p>
}
```

`src/pages/ImportGame.tsx`:

```tsx
export function ImportGame() {
  return <p className="text-fg-secondary">Game import will arrive in sub-project 3.</p>
}
```

- [ ] **Step 5: Проверить**

Run: `npm test`
Expected: PASS, 77 tests.

Run: `npm run dev`, открыть `http://localhost:5173/play`.
Expected: тёмный фон, липкая шапка, вкладка «Play vs computer» подсвечена цианом, остальные приглушены. Клавиша Tab даёт видимое фиолетовое кольцо на вкладках.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Shell.tsx src/ui/Nav.tsx src/App.tsx src/pages/
git commit -m "feat(ui): add app shell with pill navigation"
git push
```

---

### Task 4: Карточка

Убирает тройное дублирование вёрстки правой колонки.

**Files:**
- Create: `src/ui/Card.tsx`
- Create: `src/ui/DepthBadge.tsx`
- Test: `src/ui/DepthBadge.test.tsx`

**Interfaces:**
- Consumes: утилиты из Task 1.
- Produces:
  - `function Card(props: { title: string; aside?: ReactNode; children: ReactNode }): JSX.Element`
  - `function DepthBadge(props: { reached: number; target: number }): JSX.Element`

- [ ] **Step 1: Написать падающий тест на `DepthBadge`**

Это то самое разделение `Depth`, ради которого задача и существует: сейчас интерфейс дважды печатает `Depth: 18`, и различить заказанную глубину от достигнутой невозможно.

`src/ui/DepthBadge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DepthBadge } from './DepthBadge'

it('shows progress towards the requested depth', () => {
  render(<DepthBadge reached={12} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth 12/18')
})

it('shows a dash while the engine has not reported a depth yet', () => {
  render(<DepthBadge reached={0} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth —/18')
})

it('does not exceed the target when the engine overshoots', () => {
  render(<DepthBadge reached={20} target={18} />)
  expect(screen.getByTestId('depth-badge')).toHaveTextContent('depth 18/18')
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/ui/DepthBadge.test.tsx`
Expected: FAIL — `Failed to resolve import "./DepthBadge"`.

- [ ] **Step 3: Написать `src/ui/DepthBadge.tsx`**

Движок иногда рапортует глубину чуть больше заказанной (последняя итерация досчитывается целиком). Показывать `20/18` бессмысленно.

```tsx
export function DepthBadge({ reached, target }: { reached: number; target: number }) {
  const shown = reached === 0 ? '—' : String(Math.min(reached, target))

  return (
    <span data-testid="depth-badge" className="font-mono text-[13px] text-fg-muted tabular-nums">
      depth <b className="font-semibold text-accent">{shown}</b>/{target}
    </span>
  )
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/ui/DepthBadge.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Написать `src/ui/Card.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Card({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface px-[18px] py-4">
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <h2 className="font-display text-[15px] font-medium text-fg">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 6: Запустить весь набор**

Run: `npm test`
Expected: PASS, 80 tests.

- [ ] **Step 7: Commit**

```bash
git add src/ui/Card.tsx src/ui/DepthBadge.tsx src/ui/DepthBadge.test.tsx
git commit -m "feat(ui): add card and depth badge components"
git push
```

---

### Task 5: Eval-бар

Сейчас в его JSX зашиты `#403d39`, `24px` и `min(80vh, 640px)` — три магических значения, которые обязаны совпадать с доской, но ничем не связаны.

**Files:**
- Modify: `src/ui/EvalBar.tsx`

**Interfaces:**
- Consumes: `--board-size` из Task 1; `Score` из `src/engine/uci`.
- Produces: тот же публичный интерфейс. `whiteWinProbability` и `formatScore` **не меняются**.

- [ ] **Step 1: Переписать `src/ui/EvalBar.tsx`**

Экспорты `whiteWinProbability` и `formatScore` покрыты тестами и верны — трогать их нельзя. Меняется только разметка.

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

export function EvalBar({
  score,
  orientation,
}: {
  score: Score | null
  orientation: 'white' | 'black'
}) {
  const whiteShare = score ? whiteWinProbability(score) : 0.5

  return (
    <div
      data-testid="eval-bar"
      className={`relative w-7 shrink-0 overflow-hidden rounded-md border border-border bg-well ${
        orientation === 'white' ? 'flex flex-col-reverse' : 'flex flex-col'
      }`}
      style={{ height: 'var(--board-size)' }}
    >
      <div
        className="w-full bg-fg transition-[height] duration-200"
        style={{ height: `${whiteShare * 100}%` }}
      />
      <span className="absolute inset-x-0 bottom-1 z-1 text-center font-mono text-[10px] font-semibold text-bg tabular-nums">
        {score ? formatScore(score) : '…'}
      </span>
    </div>
  )
}
```

Высота берётся из той же `--board-size`, что и доска, поэтому бар не может оказаться выше или ниже неё.

- [ ] **Step 2: Проверить, что тесты не сломались**

Run: `npx vitest run src/ui/EvalBar.test.tsx`
Expected: PASS, 5 tests. Файл теста не правился.

- [ ] **Step 3: Commit**

```bash
git add src/ui/EvalBar.tsx
git commit -m "feat(ui): restyle eval bar, drop hardcoded inline styles"
git push
```

---

### Task 6: Список вариантов

**Files:**
- Modify: `src/ui/LineList.tsx`
- Delete: `src/ui/line-list.css`

**Interfaces:**
- Consumes: `EvalUpdate` из `src/engine/uci`; `formatScore` из `./EvalBar`.
- Produces: тот же интерфейс `LineList({ lines, onSelect })`.

- [ ] **Step 1: Переписать `src/ui/LineList.tsx`**

Классы `line-list` и `pv-move` сохраняются: по ним ходит браузерная проверка. Моноширинный шрифт и `tabular-nums` не косметика — оценка обновляется до десяти раз в секунду, и у пропорционального шрифта цифры разной ширины дёргали бы соседние элементы.

```tsx
import type { EvalUpdate } from '../engine/uci'
import { formatScore } from './EvalBar'

export type LineListProps = {
  lines: EvalUpdate[]
  onSelect: (line: EvalUpdate, plyCount: number) => void
}

export function LineList({ lines, onSelect }: LineListProps) {
  if (lines.length === 0) return <p className="py-2 text-sm text-fg-muted">Analyzing…</p>

  return (
    <ol className="line-list">
      {lines.map((line, index) => (
        <li
          key={line.multipv}
          className={`flex items-baseline gap-3 py-[7px] ${
            index > 0 ? 'border-t border-white/5' : ''
          }`}
        >
          <span className="w-2.5 shrink-0 text-xs text-fg-muted tabular-nums">{line.multipv}</span>
          <span
            className={`w-11 shrink-0 text-right font-mono text-[13px] tabular-nums ${
              index === 0 ? 'font-semibold text-accent' : 'text-fg-secondary'
            }`}
          >
            {formatScore(line.score)}
          </span>
          <span
            className={`flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[13px] ${
              index === 0 ? 'text-fg' : 'text-fg-secondary'
            }`}
          >
            {line.pv.slice(0, 8).map((move, ply) => (
              <button
                key={`${move}-${ply}`}
                type="button"
                className="pv-move rounded px-1 py-px hover:bg-white/6"
                onClick={() => onSelect(line, ply + 1)}
              >
                {move}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: Удалить `src/ui/line-list.css`**

```bash
git rm --quiet src/ui/line-list.css
```

Импорт `import './line-list.css'` уже отсутствует в новой версии компонента.

- [ ] **Step 3: Проверить**

Run: `npm test`
Expected: PASS, 80 tests.

Run: `npx tsc --noEmit`
Expected: без ошибок. Если ругается на несуществующий `./line-list.css` — импорт остался.

- [ ] **Step 4: Commit**

```bash
git add src/ui/LineList.tsx
git commit -m "feat(ui): restyle line list with tailwind, drop its stylesheet"
git push
```

---

### Task 7: Раскладка анализатора

Здесь же чинятся две вещи из спека: дублирование `Depth` и слишком широкое приглушение.

**Files:**
- Modify: `src/pages/Analyzer.tsx`

**Interfaces:**
- Consumes: `Shell` (через `App`), `Card`, `DepthBadge`, `EvalBar`, `LineList`, `SettingsPanel`, `PositionInput`, `PositionEditor`, `Board`.
- Produces: ничего нового наружу.

- [ ] **Step 1: Переписать разметку `src/pages/Analyzer.tsx`**

Логика (`selectLine`, `onMove`, `loadGame`, `applyEditedFen`, `displayFen`, `displayTurn`) **не меняется ни на строку** — она покрыта пятью тестами и содержит недавно исправленный баг проматывания. Меняется только то, что возвращает `return`.

```tsx
import { useCallback, useMemo, useState } from 'react'
import type { Chess } from 'chess.js'
import type { EvalUpdate } from '../engine/uci'
import { createGame, getState, legalDests, tryMove } from '../game/game'
import { previewFen } from '../game/preview'
import { useAnalysis } from '../hooks/useAnalysis'
import { useSettings } from '../hooks/useSettings'
import { Board } from '../ui/Board'
import { Card } from '../ui/Card'
import { DepthBadge } from '../ui/DepthBadge'
import { EvalBar } from '../ui/EvalBar'
import { LineList } from '../ui/LineList'
import { PositionEditor } from '../ui/PositionEditor'
import { PositionInput } from '../ui/PositionInput'
import { SettingsPanel } from '../ui/SettingsPanel'
import { linesToArrows } from '../ui/arrows'

export function Analyzer() {
  const [game, setGame] = useState(() => createGame())
  const [state, setState] = useState(() => getState(game))
  const [preview, setPreview] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const dests = useMemo(() => legalDests(game), [state.fen])
  const [settings, updateSettings] = useSettings()
  const displayFen = preview ?? state.fen
  const previewing = preview !== null
  const displayTurn = displayFen.split(' ')[1] === 'w' ? 'white' : 'black'
  const analysis = useAnalysis(displayFen, settings)
  const arrows = useMemo(() => linesToArrows(analysis.lines), [analysis.lines])

  // Lines describe the position on screen, so walk them from there — not from
  // the game position, which may be several plies behind during a preview.
  // An unplayable line leaves the board where it is rather than snapping back.
  const selectLine = useCallback(
    (line: EvalUpdate, plyCount: number) => {
      const next = previewFen(displayFen, line.pv.slice(0, plyCount))
      if (next) setPreview(next)
    },
    [displayFen],
  )

  const onMove = useCallback(
    (from: string, to: string) => {
      setPreview(null)
      if (tryMove(game, from, to)) setState(getState(game))
    },
    [game],
  )

  const loadGame = useCallback((next: Chess) => {
    setPreview(null)
    setGame(next)
    setState(getState(next))
  }, [])

  const applyEditedFen = useCallback(
    (fen: string) => {
      setEditing(false)
      setPreview(null)
      loadGame(createGame(fen))
    },
    [loadGame],
  )

  const best = analysis.lines[0] ?? null

  if (editing) {
    return (
      <PositionEditor
        initialFen={state.fen}
        onApply={applyEditedFen}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const ALERT = 'rounded-lg border border-accent-alt/40 bg-accent-alt/10 p-3 text-sm'
  const SECONDARY_BUTTON =
    'rounded-lg border border-border bg-white/3 px-3.5 py-2 text-[13px] text-fg-secondary hover:text-fg'

  return (
    <div className="flex flex-col gap-6">
      {/* Сообщения живут НАД колонками. Внутри wide:flex-row они встали бы
          третьей колонкой рядом с доской. */}
      {!analysis.multiThreaded && (
        <p role="alert" className={ALERT}>
          Multi-threaded engine unavailable (no cross-origin isolation). Falling back to the slower
          single-threaded build.
        </p>
      )}
      {analysis.error && (
        <p role="alert" className={ALERT}>
          {analysis.error}
        </p>
      )}

      <div className="flex flex-col gap-6 wide:flex-row wide:items-start">
        <div className="flex shrink-0 gap-2.5">
          <EvalBar score={best?.score ?? null} orientation="white" />
          <Board
            fen={displayFen}
            dests={previewing ? new Map() : dests}
            orientation="white"
            turn={displayTurn}
            arrows={arrows}
            onMove={onMove}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card
            title="Stockfish 18"
            aside={<DepthBadge reached={analysis.depth} target={settings.depth} />}
          >
            {/* Гасим только числа. Ползунки настроек не устарели, гасить их незачем. */}
            <div className={analysis.stale ? 'opacity-50' : undefined}>
              <LineList lines={analysis.lines} onSelect={selectLine} />
            </div>
            {previewing && (
              <button type="button" className={`mt-3 ${SECONDARY_BUTTON}`} onClick={() => setPreview(null)}>
                Back to game
              </button>
            )}
          </Card>

          <Card title="Settings">
            <SettingsPanel settings={settings} onChange={updateSettings} />
          </Card>

          <Card title="Position">
            <PositionInput onLoad={loadGame} />
            <button type="button" className={`mt-3 ${SECONDARY_BUTTON}`} onClick={() => setEditing(true)}>
              Edit position
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

Заголовок `<h1>Chess Analyzer</h1>` исчез: логотип живёт в шапке, а крупный заголовок с подзаголовком был нужен оригиналу ради поисковой выдачи.

`DepthBadge` получает `analysis.depth` (достигнутое) и `settings.depth` (цель) — те же два числа, что раньше печатались двумя неразличимыми строками `Depth: 18`.

- [ ] **Step 2: Проверить, что поведение не поехало**

Run: `npx vitest run src/pages/Analyzer.test.tsx`
Expected: PASS, 5 tests. Файл теста не правился.

Пять тестов проверяют ровно то, что легко сломать перевёрсткой: показ позиции партии, вход в просмотр, углубление просмотра, очередь хода на показанной позиции, возврат к партии.

- [ ] **Step 3: Запустить весь набор**

Run: `npm test`
Expected: PASS, 80 tests.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Analyzer.tsx
git commit -m "feat(ui): lay out analyzer, split target depth from reached depth"
git push
```

---

### Task 8: Настройки и ввод позиции

**Files:**
- Modify: `src/ui/SettingsPanel.tsx`
- Modify: `src/ui/PositionInput.tsx`

**Interfaces:**
- Consumes: `AnalyzeOptions` из `src/engine/engine`; `isValidFen`, `createGame` из `src/game/game`; `loadPgn` из `src/game/pgn`.
- Produces: те же интерфейсы.

- [ ] **Step 1: Переписать `src/ui/SettingsPanel.tsx`**

`id="depth"` и `id="multipv"` с их `<label htmlFor>` сохраняются. Подпись меняется на `Target depth` — теперь понятно, что это заказ, а не факт.

```tsx
import type { AnalyzeOptions } from '../engine/engine'

const ROW = 'flex items-center gap-3.5'
const LABEL = 'w-30 shrink-0 text-[13px] text-fg-secondary'
const VALUE = 'w-6 shrink-0 text-right font-mono text-[13px] text-fg tabular-nums'
const RANGE = 'h-1 flex-1 cursor-pointer appearance-none rounded-sm bg-white/10 accent-accent'

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: AnalyzeOptions
  onChange: (patch: Partial<AnalyzeOptions>) => void
}) {
  return (
    <div className="settings flex flex-col gap-2.5">
      <div className={ROW}>
        <label htmlFor="depth" className={LABEL}>
          Target depth
        </label>
        <input
          id="depth"
          type="range"
          min={1}
          max={30}
          value={settings.depth}
          className={RANGE}
          onChange={(event) => onChange({ depth: Number(event.target.value) })}
        />
        <span className={VALUE}>{settings.depth}</span>
      </div>

      <div className={ROW}>
        <label htmlFor="multipv" className={LABEL}>
          Variations
        </label>
        <input
          id="multipv"
          type="range"
          min={1}
          max={5}
          value={settings.multiPV}
          className={RANGE}
          onChange={(event) => onChange({ multiPV: Number(event.target.value) })}
        />
        <span className={VALUE}>{settings.multiPV}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Переписать `src/ui/PositionInput.tsx`**

Доступные имена `Load FEN` и `Load PGN`, `id="fen-input"`, `id="pgn-input"` и `role="alert"` сохраняются — на них держатся четыре теста.

```tsx
import type { Chess } from 'chess.js'
import { useState } from 'react'
import { createGame, isValidFen } from '../game/game'
import { loadPgn } from '../game/pgn'

const FIELD =
  'w-full rounded-lg border border-border bg-black/35 px-2.5 py-2 font-mono text-xs text-fg placeholder:text-fg-muted'
const BUTTON =
  'rounded-lg border border-border bg-white/3 px-3.5 py-2 text-[13px] text-fg-secondary hover:text-fg'

export type PositionInputProps = {
  onLoad: (game: Chess) => void
}

export function PositionInput({ onLoad }: PositionInputProps) {
  const [fen, setFen] = useState('')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitFen = () => {
    if (!isValidFen(fen.trim())) {
      setError('Invalid FEN')
      return
    }
    setError(null)
    onLoad(createGame(fen.trim()))
  }

  const submitPgn = () => {
    const result = loadPgn(pgn.trim())
    if (!result.ok) {
      setError(`Could not parse PGN: ${result.error}`)
      return
    }
    setError(null)
    onLoad(result.game)
  }

  return (
    <section className="position-input flex flex-col gap-2">
      <label htmlFor="fen-input" className="text-[13px] text-fg-secondary">
        FEN
      </label>
      <input id="fen-input" className={FIELD} value={fen} onChange={(e) => setFen(e.target.value)} />
      <button type="button" className={`${BUTTON} self-start`} onClick={submitFen}>
        Load FEN
      </button>

      <label htmlFor="pgn-input" className="mt-2 text-[13px] text-fg-secondary">
        PGN
      </label>
      <textarea
        id="pgn-input"
        rows={3}
        className={FIELD}
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
      />
      <button type="button" className={`${BUTTON} self-start`} onClick={submitPgn}>
        Load PGN
      </button>

      {error && (
        <p role="alert" className="text-[13px] text-accent-alt">
          {error}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Проверить**

Run: `npx vitest run src/ui/PositionInput.test.tsx src/hooks/useSettings.test.ts`
Expected: PASS, 9 tests. Файлы тестов не правились.

- [ ] **Step 4: Commit**

```bash
git add src/ui/SettingsPanel.tsx src/ui/PositionInput.tsx
git commit -m "feat(ui): restyle settings and position input"
git push
```

---

### Task 9: Редактор позиции

**Files:**
- Modify: `src/ui/PositionEditor.tsx`

**Interfaces:**
- Consumes: `chessground`; `EMPTY_PLACEMENT`, `composeFen`, `validatePlacement` из `src/game/editor`.
- Produces: тот же интерфейс `PositionEditor({ initialFen, onApply, onCancel })`.

- [ ] **Step 1: Оформить `src/ui/PositionEditor.tsx`**

Классы `position-editor`, `palette`, `editor-controls` и имена кнопок `Eraser`, `Clear board`, `Apply`, `Cancel` сохраняются — по ним ходит браузерная проверка. Логика инициализации chessground и `apply()` не меняется.

Заменить только `return (...)` на:

```tsx
  return (
    <section className="position-editor flex flex-col gap-4">
      <div className="board-wrap" ref={element} />

      <div className="palette flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => setSelected(null)}
          className={`rounded-lg border px-3 py-2 text-[13px] ${
            selected === null
              ? 'border-accent/35 bg-accent/10 text-fg'
              : 'border-border bg-white/3 text-fg-secondary hover:text-fg'
          }`}
        >
          Eraser
        </button>
        {PIECES.map((piece) => (
          <button
            key={piece.key}
            type="button"
            aria-pressed={selected?.key === piece.key}
            onClick={() => setSelected(piece)}
            className={`h-10 w-10 rounded-lg border text-xl leading-none ${
              selected?.key === piece.key
                ? 'border-accent/35 bg-accent/10 text-fg'
                : 'border-border bg-white/3 text-fg-secondary hover:text-fg'
            }`}
          >
            {piece.label}
          </button>
        ))}
      </div>

      <div className="editor-controls flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-border bg-white/3 px-3.5 py-2 text-[13px] text-fg-secondary hover:text-fg"
          onClick={() => api.current?.set({ fen: EMPTY_PLACEMENT })}
        >
          Clear board
        </button>

        <label className="flex items-center gap-1.5 text-[13px] text-fg-secondary">
          <input
            type="radio"
            checked={turn === 'w'}
            onChange={() => setTurn('w')}
            className="accent-accent"
          />
          White to move
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-fg-secondary">
          <input
            type="radio"
            checked={turn === 'b'}
            onChange={() => setTurn('b')}
            className="accent-accent"
          />
          Black to move
        </label>

        <button
          type="button"
          className="rounded-lg border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-bg"
          onClick={apply}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-white/3 px-3.5 py-2 text-[13px] text-fg-secondary hover:text-fg"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-accent-alt">
          {error}
        </p>
      )}
    </section>
  )
```

- [ ] **Step 2: Проверить**

Run: `npm test`
Expected: PASS, 80 tests.

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PositionEditor.tsx
git commit -m "feat(ui): restyle position editor"
git push
```

---

### Task 10: Проверка в браузере

Единственная задача без тестов: проверяется то, что дешевле увидеть, чем описать. Требует браузера.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: всё предыдущее.
- Produces: ничего.

- [ ] **Step 1: Собрать и запустить**

```bash
npm run build
npm run dev
```

Expected: сборка проходит, дев-сервер поднимается.

- [ ] **Step 2: Проверить анализатор на широком экране**

Открыть `http://localhost:5173` в окне шириной не меньше 1280.

Expected:
- Фон почти чёрный, шрифт — Inter, а не Times.
- Шапка липкая, логотип `ChessAnalyzer` со вторым словом на циане, вкладка «Analyzer» подсвечена.
- Доска деревянная, 640px, слева eval-бар той же высоты, без просвета снизу.
- Карточка `Stockfish 18` справа, у заголовка счётчик `depth 18/18`, который **растёт по ходу счёта**, а не появляется сразу.
- Ползунок называется `Target depth`. Строки `Depth: 18` дважды на экране больше нет.
- Три варианта, у первого оценка цианом. Ходы разделены зазором.

- [ ] **Step 3: Проверить приглушение**

Сделать ход по доске.

Expected: гаснет только список вариантов; ползунки `Target depth` и `Variations` остаются в полную яркость.

- [ ] **Step 4: Проверить просмотр варианта**

Кликнуть первый ход первого варианта, затем первый ход в обновившемся списке, затем ещё раз.

Expected: просмотр углубляется каждый раз, кнопка `Back to game` не пропадает. Клик по ней возвращает 32 фигуры на места.

- [ ] **Step 5: Проверить редактор**

Нажать `Edit position`, выбрать ферзя, поставить на `d4`, нажать `Clear board`, затем `Apply`.

Expected: появляется сообщение `Invalid position: both kings must be on the board.` фиолетовым.

- [ ] **Step 6: Проверить клавиатуру**

Нажимать Tab от адресной строки.

Expected: каждый интерактивный элемент — вкладки, ползунки, поля, кнопки, ходы в вариантах — получает видимое фиолетовое кольцо.

- [ ] **Step 7: Проверить узкий экран**

Сузить окно до 900px.

Expected: доска и карточки складываются в стопку, доска считается от ширины и не вылезает за экран, вкладки в шапке прокручиваются горизонтально.

- [ ] **Step 8: Обновить `README.md`**

Заменить раздел `## Tools` на:

```markdown
## Tools

- `/` — position analyzer (live evaluation, MultiPV, best-move arrows, FEN/PGN
  input, position editor, line preview).
- `/best-move`, `/play`, `/freestyle`, `/import` — stubs for upcoming sub-projects
  (play vs. computer, Chess960, game import).

## Design

Dark theme only. Palette and typography follow
[odusphere.dev](https://odusphere.dev); the layout follows
[chessmoveexpert.com](https://chessmoveexpert.com). Tokens live in
`src/styles/index.css` and their contrast is enforced by
`src/styles/contrast.test.ts`.
```

- [ ] **Step 9: Commit**

```bash
git add README.md
git commit -m "docs: describe the visual layer"
git push
```

---

## Покрытие спека

| Требование спека | Задача |
| --- | --- |
| Tailwind v4, плагин Vite | 1 |
| Токены палитры, `#6E76A0` вместо `#5B6184` | 1 |
| Три шрифта через `@fontsource`, самохостинг | 1 |
| `--board-size` как единственный источник размера | 1 |
| Кольцо фокуса на `accent-alt` | 1 |
| Узкие экраны, точка перелома 1100px | 1 (`--board-size`, брейкпоинт) и 7 (`wide:flex-row`) |
| Тест контраста токенов | 2 |
| Запрет `text-decor` | 2 |
| Липкая шапка, вкладки-пилюли, горизонтальная прокрутка | 3 |
| Заглушки получают оформление через `Shell` | 3 |
| Карточка, снятие тройного дублирования | 4 |
| Разделение `Depth` на цель и достигнутое | 4 (`DepthBadge`) и 7 (проброс) |
| Eval-бар без инлайновых стилей | 5 |
| Список вариантов, удаление `line-list.css` | 6 |
| Раскладка анализатора, снятие крупного заголовка | 7 |
| Приглушение только чисел | 7 |
| `Target depth` вместо `Depth` | 8 |
| Оформление ввода позиции | 8 |
| Оформление редактора позиции | 9 |
| Браузерная проверка, README | 10 |
| 59 прежних тестов проходят без правок | проверяется в 1, 5, 6, 7, 8, 9 |

## Чего этот план не делает

- Светлой темы. Токены к ней готовы: переопределить `--color-*` под `:root[data-theme="light"]`.
- Анимаций сверх той, что уже есть у eval-бара.
- Логотипа-картинки: только текст.
- AI-чата (под-проект 4). Карточка под него не резервируется.
