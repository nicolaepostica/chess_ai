# Chess Analyzer

A local chess analyzer: Stockfish 18 running in the browser via WASM, no backend.
Drag pieces, paste a FEN/PGN, or set up a position manually and get a live
evaluation, an eval bar, and best-move arrows.

## Run

    npm install
    npm run dev

Open http://localhost:5173

The dev server sets `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` so the multi-threaded Stockfish
build (which needs `SharedArrayBuffer`) can run. If those headers are absent the
app falls back to the slower single-threaded build and shows a warning.

Engine binaries (the ~7 MB Stockfish WASM) are copied from `node_modules` into
`public/stockfish/` on every `dev`/`build` and are git-ignored.

## Tests

    npm test

## Tools

- `/` — position analyzer (live evaluation, MultiPV, best-move arrows, FEN/PGN
  input, position editor, line preview).
- `/best-move`, `/play`, `/freestyle`, `/import` — stubs for upcoming sub-projects
  (play vs. computer, Chess960, game import).

## License

GPL-3.0 — required by Stockfish.
