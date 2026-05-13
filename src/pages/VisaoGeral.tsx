import { useEffect, useState } from 'react'
import { fetchVisaoGeral } from '../lib/api'
import type { VisaoGeral as VisaoGeralType } from '../lib/api'
import { Link } from 'react-router-dom'

const statCards = [
  { key: 'agendado',   label: 'Agendados',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'disparando', label: 'Disparando',  color: 'text-accent',     bg: 'bg-accent/10 border-accent/20' },
  { key: 'concluido',  label: 'Concluídos',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  { key: 'falhou',     label: 'Falharam',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
]

export default function VisaoGeral() {
  const [data, setData] = useState<VisaoGeralType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVisaoGeral()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted text-sm mb-1">Bem-vindo de volta</p>
        <h1 className="text-2xl font-bold text-white">Kaio 👋</h1>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Campanhas */}
        <Link
          to="/campanhas"
          className="bg-card border border-border rounded-xl px-5 py-5 hover:border-accent/40 transition-colors col-span-2 sm:col-span-1"
        >
          <p className="text-muted text-xs uppercase tracking-wider mb-2">Campanhas</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '—' : data?.totalCampanhas ?? 0}
          </p>
          <p className="text-muted text-xs mt-1">grupos organizados</p>
        </Link>

        {/* Total disparos */}
        <div className="bg-card border border-border rounded-xl px-5 py-5 col-span-2 sm:col-span-1">
          <p className="text-muted text-xs uppercase tracking-wider mb-2">Total de disparos</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '—' : data
              ? Object.values(data.disparos).reduce((a, b) => a + b, 0)
              : 0}
          </p>
          <p className="text-muted text-xs mt-1">desde o início</p>
        </div>
      </div>

      {/* Status dos disparos */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">Status dos disparos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.key} className={`border rounded-xl px-4 py-4 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>
                {loading ? '—' : data?.disparos[s.key as keyof typeof data.disparos] ?? 0}
              </p>
              <p className="text-muted text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Atalhos */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/"
          className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold text-sm text-center transition-colors"
        >
          Novo Disparo
        </Link>
        <Link
          to="/campanhas"
          className="flex-1 py-3 rounded-lg bg-card border border-border hover:border-accent/40 text-white font-semibold text-sm text-center transition-colors"
        >
          Ver Campanhas
        </Link>
      </div>
    </div>
  )
}
