# Centred Responsive Layout Implementation Plan

> **For agentic workers:** выполняйте задачи по порядку, по одной. Шаги помечены чекбоксами (`- [ ]`). Каждая задача заканчивается коммитом и пушем.
>
> Если ваш харнесс — Claude Code с плагином superpowers, используйте `superpowers:subagent-driven-development` или `superpowers:executing-plans`. Если нет — идите по шагам сверху вниз.

**Goal:** Центрировать контент анализатора в контейнере ограниченной ширины, заменить резиновую правую колонку сеткой фиксированной ширины и отвязать размер доски от полей страницы.

**Architecture:** Оболочка получает `mx-auto max-w-[1600px]`. Анализатор становится центрированной стопкой, а на широком экране — сеткой `[minmax(0,680px) 450px]` с `justify-center`. Доска считается от ширины своей колонки, а не от `100vw`, поэтому поля страницы исчезают из формулы. Eval-бар тянется по строке и не может разъехаться с доской.

**Tech Stack:** Tailwind CSS v4, React 19, Vite 6, vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-centred-responsive-layout-design.md`

## Global Constraints

- **88 существующих тестов обязаны проходить без единой правки.** Новых тестов эта работа не добавляет: поведения здесь нет, только раскладка.
- **Не трогать** `src/engine/`, `src/game/`, `src/hooks/`.
- Сохранить зацепки: `data-testid="eval-bar"`; `role="alert"` на обоих сообщениях; доступные имена кнопок `Load FEN`, `Load PGN`, `Back to game`, `Edit position`, `Apply`, `Cancel`, `Clear board`, `Eraser`; `id` полей `fen-input`, `pgn-input`, `depth`, `multipv`; классы `line-list`, `pv-move`, `position-editor`, `palette`, `editor-controls`, `board-wrap`.
- Тема только тёмная. Язык интерфейса английский. Класс `text-decor` запрещён (проверяется тестом).
- Максимум доски остаётся `min(80vh, 640px)`. Ширина eval-бара остаётся `w-7` (1.75rem), зазор — `gap-2.5` (0.625rem).
- Работаем в ветке `chess-analyzer-core`. Каждая задача: коммит + `git push`.

## Предпосылки, проверенные на прототипе

Раскладка проверена одноразовым статическим прототипом до написания плана. При ширинах 1920/1440/1280 получается сетка, при 1279/1100/768/390 — центрированная стопка. Доска равна 640px везде, кроме телефона, где `390 - 24 - 38 = 328px`. Горизонтальной прокрутки нет ни на одной ширине. Высоты доски и eval-бара совпадают везде.

**Мерить зазоры нужно от `document.documentElement.clientWidth`, а не от `window.innerWidth`.** Вертикальная полоса прокрутки входит в `innerWidth`, но не в систему координат `getBoundingClientRect`. На прототипе это давало расхождение ровно в 15px и ложный вывод, что контент не центрирован.

---

### Task 1: Центрирующий контейнер в оболочке

Самая безопасная часть: раскладка анализатора пока не меняется, поэтому регрессия видна сразу.

**Files:**
- Modify: `src/ui/Shell.tsx`

**Interfaces:**
- Consumes: `Nav` из `./Nav`.
- Produces: `<main>` и ряд шапки, ограниченные `max-w-[1600px]` и центрированные.

- [ ] **Step 1: Переписать `src/ui/Shell.tsx`**

Шапка остаётся во всю ширину экрана — её фон и нижняя граница тянутся от края до края. Центрируется только её внутренний ряд, теми же полями, что и `<main>`, иначе логотип и доска окажутся на разных вертикалях.

```tsx
import type { ReactNode } from 'react'
import { Nav } from './Nav'

const CONTAINER = 'mx-auto w-full max-w-[1600px] px-3 sm:px-6'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-white/2 backdrop-blur">
        <div className={`${CONTAINER} flex h-15 items-center gap-7`}>
          <span className="font-display text-lg font-bold whitespace-nowrap">
            Chess<span className="text-accent">Analyzer</span>
          </span>
          <Nav />
        </div>
      </header>
      <main className={`${CONTAINER} py-3 sm:py-6`}>{children}</main>
    </div>
  )
}
```

Поля стали `12px` на телефоне и `24px` от 640px ширины — как у оригинала (`p-3 sm:p-6`). Горизонтальные поля вынесены в общую константу, вертикальные заданы отдельно, потому что шапка задаёт высоту через `h-15`.

- [ ] **Step 2: Проверить**

Run: `npm test`
Expected: PASS, 88 tests. Ни один тест не правился.

Run: `npx tsc --noEmit`
Expected: без ошибок.

Run: `npm run build`
Expected: сборка проходит.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Shell.tsx
git commit -m "feat(ui): centre the page in a max-width container"
git push
```

---

### Task 2: Сетка вместо резиновой колонки

**Files:**
- Modify: `src/styles/index.css` (только строка `--breakpoint-wide`)
- Modify: `src/pages/Analyzer.tsx` (только блок `return`)

**Interfaces:**
- Consumes: `--breakpoint-wide` из `@theme`; компоненты `EvalBar`, `Board`, `Card`, `DepthBadge`, `LineList`, `SettingsPanel`, `PositionInput`.
- Produces: колонка доски шириной `max-w-[680px]`, внутри неё ряд `flex w-full gap-2.5` — на эту ширину будет опираться Task 3.

- [ ] **Step 1: Сдвинуть точку перелома в `src/styles/index.css`**

Две колонки требуют `680 + 450 + 24` (зазор) `+ 48` (поля) `= 1202px`. На прежних `1100px` они не помещаются.

Заменить строку в блоке `@theme`:

```css
  --breakpoint-wide: 1280px;
```

Имя `wide` сохраняется, поэтому разметку переписывать не нужно.

- [ ] **Step 2: Переписать блок `return` в `src/pages/Analyzer.tsx`**

Логика (`selectLine`, `onMove`, `loadGame`, `applyEditedFen`, `displayFen`, `displayTurn`, `previewing`, `dests`, `arrows`, `best`) и ранний `return` для `editing` **не меняются ни на строку**. Меняется только разметка ниже константы `ALERT`.

```tsx
  return (
    <div className="flex flex-col gap-6">
      {/* Сообщения живут НАД сеткой. Внутри неё они стали бы третьей ячейкой. */}
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

      <div className="flex flex-col items-center gap-6 wide:grid wide:grid-cols-[minmax(0,680px)_450px] wide:items-start wide:justify-center">
        {/* Обёртка задаёт ряду ширину, не зависящую от доски: иначе формула
            calc(100% - 2.375rem) в board.css сошлётся на ширину, которую сама
            доска и определяет. */}
        <div className="w-full max-w-[680px]">
          <div className="flex w-full gap-2.5">
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
        </div>

        <div className="flex w-full min-w-0 max-w-[650px] flex-col gap-4 wide:max-w-none">
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

Три изменения по сравнению с прежней разметкой. Внешний контейнер стал `flex flex-col items-center`, а на широком экране — `grid` с двумя колонками и `justify-center`. Ряд доски потерял `shrink-0` и получил `w-full` внутри обёртки `max-w-[680px]`. Правая колонка потеряла `flex-1` и получила `max-w-[650px]`, снимаемый на широком экране, где ширину задаёт колонка сетки.

- [ ] **Step 3: Проверить**

Run: `npm test`
Expected: PASS, 88 tests. Пять тестов `src/pages/Analyzer.test.tsx` — главный сторож: они мокают `Board` и проверяют просмотр вариантов, который перевёрстка легко ломает.

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/styles/index.css src/pages/Analyzer.tsx
git commit -m "feat(ui): lay the analyzer out as a centred two-column grid"
git push
```

---

### Task 3: Доска считается от своей колонки

Здесь исчезает мина, которую нашло финальное ревью: `5.375rem` вручную складывал поля страницы, ширину eval-бара и зазор — три значения из трёх файлов. Task 1 уже поменял поля на `p-3 sm:p-6`, так что старая формула сейчас неверна.

**Files:**
- Modify: `src/styles/index.css` (блок `@layer base`)
- Modify: `src/ui/board.css`
- Modify: `src/ui/EvalBar.tsx`
- Modify: `src/ui/PositionEditor.tsx`

**Interfaces:**
- Consumes: обёртку `max-w-[680px]` и ряд `flex w-full gap-2.5` из Task 2.
- Produces: переменную `--board-max` (заменяет `--board-size`) и класс-модификатор `.board-wrap--solo`.

- [ ] **Step 1: Заменить переменную в `src/styles/index.css`**

В блоке `@layer base` заменить объявление `:root` и **удалить медиазапрос целиком**:

```css
@layer base {
  :root {
    /* Upper bound only. The board's real width comes from its column, so the
       page padding never enters the formula. */
    --board-max: min(80vh, 640px);
    color-scheme: dark;
  }

  body {
```

То есть удаляются: строка `--board-size: min(80vh, 640px);` вместе со своим комментарием и весь блок

```css
  @media (max-width: 1099px) {
    :root {
      --board-size: min(100vw - 5.375rem, 640px);
    }
  }
```

- [ ] **Step 2: Переписать `src/ui/board.css`**

```css
@import 'chessground/assets/chessground.base.css';
@import 'chessground/assets/chessground.brown.css';
@import 'chessground/assets/chessground.cburnett.css';

.board-wrap {
  /* Sized from its column, never from the viewport. The only things sharing the
     board's row are the eval bar (1.75rem) and the gap beside it (0.625rem);
     the page padding is already accounted for by `100%`. */
  width: min(var(--board-max), calc(100% - var(--row-extras, 2.375rem)));
  aspect-ratio: 1;
  flex: none;
  border-radius: 6px;
  overflow: hidden;
}

/* The position editor shows the board with no eval bar beside it. */
.board-wrap--solo {
  --row-extras: 0px;
}
```

- [ ] **Step 3: Растянуть eval-бар по строке в `src/ui/EvalBar.tsx`**

Убрать инлайновую высоту, добавить `self-stretch`. Высоту строки задаёт доска, поэтому бар не может оказаться выше или ниже неё — теперь это свойство раскладки, а не соглашение между двумя файлами.

Заменить открывающий `<div>` на:

```tsx
    <div
      data-testid="eval-bar"
      className={`relative w-7 shrink-0 self-stretch overflow-hidden rounded-md border border-border bg-well ${
        orientation === 'white' ? 'flex flex-col-reverse' : 'flex flex-col'
      }`}
    >
```

Атрибут `style` удаляется целиком. Всё остальное содержимое компонента — заливка, подпись с плашкой, функции `whiteWinProbability` и `formatScore` — не трогать.

- [ ] **Step 4: Пометить доску редактора как одиночную**

В `src/ui/PositionEditor.tsx` заменить

```tsx
      <div className="board-wrap" ref={element} />
```

на

```tsx
      <div className="board-wrap board-wrap--solo" ref={element} />
```

Без этого доска в редакторе теряла бы 38 пикселей на eval-бар, которого рядом нет.

- [ ] **Step 5: Убедиться, что старая переменная нигде не осталась**

Run: `grep -rn 'board-size' src/ README.md`
Expected: единственное совпадение — строка 46 в `README.md`. Она исправляется в Task 4. Если `grep` находит что-то под `src/`, значит правка неполная.

- [ ] **Step 6: Проверить**

Run: `npm test`
Expected: PASS, 88 tests. Пять тестов `EvalBar.test.tsx` не правились — они проверяют текст и классы подписи, а не высоту.

Run: `npx tsc --noEmit`
Expected: без ошибок.

Run: `npm run build`
Expected: сборка проходит.

- [ ] **Step 7: Commit**

```bash
git add src/styles/index.css src/ui/board.css src/ui/EvalBar.tsx src/ui/PositionEditor.tsx
git commit -m "feat(ui): size the board from its column, stretch the eval bar to match"
git push
```

---

### Task 4: Проверка в браузере и README

Единственная задача, требующая живого браузера. Тестами раскладка не покрывается.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: всё предыдущее.
- Produces: ничего.

- [ ] **Step 1: Запустить приложение**

```bash
npm run dev
```

Открыть `http://localhost:5173` и дождаться, пока движок посчитает стартовую позицию.

- [ ] **Step 2: Измерить раскладку на семи ширинах**

Менять размер окна браузера ненадёжно: у инструментов автоматизации команда смены viewport часто не применяется к уже открытой странице. Вместо этого вставьте в страницу iframe того же origin и меняйте **его** ширину — медиазапросы внутри iframe реагируют на его собственную ширину, а `contentDocument` доступен, потому что origin общий.

Выполнить в консоли браузера:

```js
window.__probe = (width) =>
  new Promise((resolve) => {
    let f = document.getElementById('probe')
    if (!f) {
      f = document.createElement('iframe')
      f.id = 'probe'
      f.src = '/'
      f.style.cssText = 'position:fixed;left:-9999px;top:0;height:900px;border:0'
      document.body.appendChild(f)
    }
    f.style.width = width + 'px'
    const read = () => {
      const d = f.contentDocument
      const w = f.contentWindow
      const board = d.querySelector('.board-wrap')
      if (!board) return setTimeout(read, 200)
      const layoutW = d.documentElement.clientWidth
      const bar = d.querySelector('[data-testid=eval-bar]').getBoundingClientRect()
      const b = board.getBoundingClientRect()
      // Ближайший предок с flex-col — это контейнер сетки. Внешний контейнер
      // страницы тоже flex-col, поэтому подниматься выше нельзя.
      const grid = board.closest('.items-center')
      const c = grid.getBoundingClientRect()
      const left = Math.round(c.left)
      const right = Math.round(layoutW - c.right)
      resolve({
        width,
        layoutW,
        board: Math.round(b.width),
        sameHeight: Math.abs(b.height - bar.height) < 1,
        display: w.getComputedStyle(grid).display,
        gutters: [left, right],
        centred: Math.abs(left - right) <= 1,
        scrollsX: d.documentElement.scrollWidth > layoutW + 1,
      })
    }
    setTimeout(read, 400)
  })

// Прогнать по очереди:
for (const w of [1920, 1440, 1280, 1279, 1100, 768, 390]) console.log(await window.__probe(w))
```

Expected на каждой ширине:

| Ширина | `display` | `board` | `centred` | `scrollsX` | `sameHeight` |
| --- | --- | --- | --- | --- | --- |
| 1920 | `grid` | 640 | `true` | `false` | `true` |
| 1440 | `grid` | 640 | `true` | `false` | `true` |
| 1280 | `grid` | 640 | `true` | `false` | `true` |
| 1279 | `flex` | 640 | `true` | `false` | `true` |
| 1100 | `flex` | 640 | `true` | `false` | `true` |
| 768 | `flex` | 640 | `true` | `false` | `true` |
| 390 | `flex` | 328 | `true` | `false` | `true` |

Если `centred` ложно, а `gutters` различаются ровно на 15 — вы измеряете от `innerWidth`, а не от `clientWidth`. Полоса прокрутки входит в первое и не входит во второе.

Если `board` на 390 равен 366, значит `.board-wrap--solo` применён к доске анализатора, а не только к редактору.

- [ ] **Step 3: Проверить редактор позиции**

Нажать `Edit position`, затем `Clear board`, затем `Apply`.
Expected: появляется сообщение `Invalid position: both kings must be on the board.` Доска редактора занимает всю ширину своей колонки, а не на 38px меньше.

- [ ] **Step 4: Проверить просмотр вариантов**

Кликнуть первый ход первого варианта трижды подряд.
Expected: просмотр углубляется каждый раз, кнопка `Back to game` не пропадает; клик по ней возвращает 32 фигуры.

- [ ] **Step 5: Проверить шапку**

Сузить окно так, чтобы пять вкладок не помещались.
Expected: вкладки прокручиваются горизонтально; страница вбок не прокручивается; логотип и левый край доски стоят на одной вертикали.

- [ ] **Step 6: Обновить `README.md`**

Заменить абзац

```markdown
The board's size is the CSS variable `--board-size`. The eval bar takes its
height from the same variable, so the two cannot drift apart.
```

на

```markdown
The page is centred in a `max-w-[1600px]` container. Above 1280px the analyzer
is a two-column grid; below it the columns stack, centred.

The board sizes itself from the width of its column, capped by `--board-max`
(`min(80vh, 640px)`). The eval bar stretches to the row, so the two cannot
drift apart — the page padding never enters the arithmetic.
```

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: describe the centred responsive layout"
git push
```

---

## Покрытие спека

| Требование спека | Задача |
| --- | --- |
| Контейнер `mx-auto max-w-[1600px] p-3 sm:p-6` | 1 |
| Центрирование внутреннего ряда шапки | 1 |
| Сетка `[minmax(0,680px) 450px]` с `justify-center` | 2 |
| Стопка по центру ниже перелома | 2 |
| Правая колонка ровно 450px, без `flex-1` | 2 |
| Ряд доски получает `w-full`, теряет `shrink-0` | 2 |
| Сообщения `role="alert"` остаются над сеткой | 2 |
| Перелом 1100px → 1280px | 2 |
| `--board-max` вместо `--board-size`, медиазапрос удалён | 3 |
| Доска считается от родителя | 3 |
| Eval-бар `self-stretch` | 3 |
| Доска редактора без вычета eval-бара | 3 |
| Проверка на семи ширинах через `clientWidth` | 4 |
| README | 4 |
| 88 тестов проходят без правок | проверяется в 1, 2, 3 |

## Чего этот план не делает

- Не меняет максимум доски (`min(80vh, 640px)`), ширину eval-бара и зазор.
- Не вводит третью точку перелома.
- Не трогает шрифты, цвета и токены палитры.
- Не добавляет юнит-тестов: поведения здесь нет, только раскладка.
