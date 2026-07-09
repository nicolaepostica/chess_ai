# Chess Analyzer

Локальный шахматный анализатор: Stockfish 18 в браузере через WASM, без бэкенда.

Проект в стадии реализации. Код появится по ходу выполнения плана.

- Дизайн: [`docs/superpowers/specs/2026-07-09-chess-analyzer-design.md`](docs/superpowers/specs/2026-07-09-chess-analyzer-design.md)
- План реализации: [`docs/superpowers/plans/2026-07-09-chess-analyzer-core.md`](docs/superpowers/plans/2026-07-09-chess-analyzer-core.md)

## История

До версии 0.1 в этом репозитории жил бот, который играл на chess.com, кликая
мышью через `pyautogui`. Он сохранён в ветке `legacy-chessdotcom-bot` вместе с
размеченным датасетом для распознавания доски. Текущий проект — не автоматизация
чужих сайтов, а анализатор позиции, которую вы ему дали.

## Лицензия

GPL-3.0 — требование Stockfish.
