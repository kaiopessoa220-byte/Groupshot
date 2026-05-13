import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NovoDisparo from './pages/NovoDisparo'
import Historico from './pages/Historico'
import Contas from './pages/Contas'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<NovoDisparo />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/contas" element={<Contas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
