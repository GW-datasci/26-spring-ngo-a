import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Landing from './pages/Landing'
import Findings from './pages/Findings'
import Explore from './pages/Explore'
import Member from './pages/Member'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/member/:handle" element={<Member />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
