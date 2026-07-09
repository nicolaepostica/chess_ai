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
