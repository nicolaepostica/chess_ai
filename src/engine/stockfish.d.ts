declare module 'stockfish' {
  interface StockfishEngine {
    sendCommand(command: string): void
    listener: (line: string) => void
  }
  function initEngine(flavor?: string): Promise<StockfishEngine>
  export = initEngine
}
