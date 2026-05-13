import { useEffect, useState } from 'react'
import { fetchVisaoGeral, fetchInstances, fetchCampanhas } from '../lib/api'
import type { VisaoGeral as VisaoGeralType, Instance, Campanha } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

export default function VisaoGeral() {
  const navigate = useNavigate()
  const [data, setData] = useState<VisaoGeralType | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchVisaoGeral(),
      fetchInstances().catch(() => []),
      fetchCampanhas().catch(() => []),
    ]).then(([vg, inst, camp]) => {
      setData(vg)
      setInstances(inst)
      setCampanhas(camp)
    }).finally(() => setLoading(false))
  }, [])

  const total = data
    ? Object.values(data.disparos).reduce((a, b) => a + b, 0)
    : 0

  const stat = (val: number | undefined) => loading ? '—' : (val ?? 0).toString()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted uppercase tracking-widest mb-1.5">Painel</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Olá, Kaio</h1>
      </div>

      <div className="flex gap-6">
        {/* ── Coluna esquerda: métricas ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/campanhas"
              className="bg-card border border-border rounded-xl p-5 hover:border-border-2 transition-colors group"
            >
              <p className="text-xs text-muted mb-3">Campanhas</p>
              <p className="text-3xl font-bold text-white tracking-tight">{stat(data?.totalCampanhas)}</p>
              <p className="text-xs text-muted mt-2 group-hover:text-accent transition-colors">Ver campanhas →</p>
            </Link>

            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-3">Total de disparos</p>
              <p className="text-3xl font-bold text-white tracking-tight">{loading ? '—' : total}</p>
              <p className="text-xs text-muted mt-2">todos os tempos</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-4 gap-3">
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
                  <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{stat(val)}</p>
                  <p className="text-xs text-muted mt-1 mb-3">{s.label}</p>
                  <div className="h-0.5 bg-border rounded-full overflow-hidden">
                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link to="/novo-disparo" className="btn-primary flex items-center gap-2">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Novo Disparo
            </Link>
            <Link to="/campanhas" className="btn-secondary">Ver campanhas</Link>
          </div>
        </div>

        {/* ── Coluna direita: painéis ── */}
        <div className="w-[220px] flex-shrink-0 space-y-4">

          {/* Painel: Contas */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-white">Contas</p>
              <Link to="/contas" className="text-xs text-muted hover:text-accent transition-colors">Ver todas</Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-4 py-4 text-xs text-muted">Carregando...</div>
              ) : instances.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted">Nenhuma conta</div>
              ) : (
                instances.slice(0, 6).map(inst => {
                  const isOpen = inst.connectionStatus === 'open'
                  return (
                    <div key={inst.name} className="px-4 py-2.5 flex items-center gap-2.5">
                      <span className={`relative flex-shrink-0 w-2 h-2`}>
                        {isOpen ? (
                          <>
                            <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
                            <span className="relative block w-2 h-2 rounded-full bg-green-400" />
                          </>
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-zinc-600" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{inst.name}</p>
                        {inst.ownerJid && (
                          <p className="text-[10px] text-muted truncate leading-tight">
                            {inst.ownerJid.replace('@s.whatsapp.net', '').replace('@c.us', '')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Painel: Campanhas */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-white">Campanhas</p>
              <Link to="/campanhas" className="text-xs text-muted hover:text-accent transition-colors">Ver todas</Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-4 py-4 text-xs text-muted">Carregando...</div>
              ) : campanhas.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted">Nenhuma campanha</div>
              ) : (
                campanhas.slice(0, 6).map(c => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/campanhas/${c.id}`)}
                    className="px-4 py-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-surface transition-colors"
                  >
                    {c.foto_url ? (
                      <img
                        src={c.foto_url}
                        alt={c.nome}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                        <svg width="11" height="11" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{c.nome}</p>
                      <p className="text-[10px] text-muted leading-tight">
                        {c.campanha_grupos.length} grupo(s)
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
