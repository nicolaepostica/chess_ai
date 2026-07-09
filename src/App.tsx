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
