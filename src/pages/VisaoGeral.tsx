import { useEffect, useState } from 'react'
import { fetchVisaoGeral } from '../lib/api'
import type { VisaoGeral as VisaoGeralType } from '../lib/api'
import { Link } from 'react-router-dom'

export default function VisaoGeral() {
  const [data, setData] = useState<VisaoGeralType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVisaoGeral()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const total = data
    ? Object.values(data.disparos).reduce((a, b) => a + b, 0)
    : 0

  const stat = (val: number | undefined) =>
    loading ? '—' : (val ?? 0).toString()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted uppercase tracking-widest mb-1.5">Painel</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Olá, Kaio</h1>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link
          to="/campanhas"
          className="bg-card border border-border rounded-xl p-5 hover:border-border-2 transition-colors group"
        >
          <p className="text-xs text-muted mb-3">Campanhas</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {stat(data?.totalCampanhas)}
          </p>
          <p className="text-xs text-muted mt-2 group-hover:text-accent transition-colors">Ver campanhas →</p>
        </Link>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted mb-3">Total de disparos</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {loading ? '—' : total}
          </p>
          <p className="text-xs text-muted mt-2">todos os tempos</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { key: 'agendado',   label: 'Agendados',  color: 'text-blue-400',  bar: 'bg-blue-400' },
          { key: 'disparando', label: 'Disparando', color: 'text-accent',    bar: 'bg-accent' },
          { key: 'concluido',  label: 'Concluídos', color: 'text-green-400', bar: 'bg-green-400' },
          { key: 'falhou',     label: 'Falharam',   color: 'text-red-400',   bar: 'bg-red-400' },
        ].map((s) => {
          const val = data?.disparos[s.key as keyof typeof data.disparos] ?? 0
          const pct = total > 0 ? (val / total) * 100 : 0
          return (
            <div key={s.key} className="bg-card border border-border rounded-xl p-4">
              <p className={`text-2xl font-bold tracking-tight ${s.color}`}>
                {stat(val)}
              </p>
              <p className="text-xs text-muted mt-1 mb-3">{s.label}</p>
              <div className="h-0.5 bg-border rounded-full overflow-hidden">
                <div className={`h-full ${s.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/novo-disparo"
          className="btn-primary flex items-center gap-2"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Novo Disparo
        </Link>
        <Link to="/campanhas" className="btn-secondary">
          Ver campanhas
        </Link>
      </div>
    </div>
  )
}
