import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import VisaoGeral from './pages/VisaoGeral'
import Campanhas from './pages/Campanhas'
import CampanhaDetalhe from './pages/CampanhaDetalhe'
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
            <Route path="/" element={<Navigate to="/visao-geral" replace />} />
            <Route path="/visao-geral" element={<VisaoGeral />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/campanhas/:id" element={<CampanhaDetalhe />} />
            <Route path="/novo-disparo" element={<NovoDisparo />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/contas" element={<Contas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
