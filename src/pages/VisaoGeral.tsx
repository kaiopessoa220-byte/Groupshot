import { useEffect, useState } from 'react'
import { fetchInstances, fetchCampanhas, fetchVisaoGeral } from '../lib/api'
import type { Instance, Campanha, VisaoGeral as VisaoGeralType } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function VisaoGeral() {
  const navigate = useNavigate()
  const [instances, setInstances] = useState<Instance[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [stats, setStats] = useState<VisaoGeralType | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchContas, setSearchContas] = useState('')
  const [searchCamp, setSearchCamp] = useState('')

  useEffect(() => {
    Promise.all([
      fetchInstances().catch(() => [] as Instance[]),
      fetchCampanhas().catch(() => [] as Campanha[]),
      fetchVisaoGeral().catch(() => null),
    ]).then(([inst, camp, vg]) => {
      setInstances(inst)
      setCampanhas(camp)
      setStats(vg)
    }).finally(() => setLoading(false))
  }, [])

  const filteredInst = instances.filter(i =>
    i.name.toLowerCase().includes(searchContas.toLowerCase())
  )
  const filteredCamp = campanhas.filter(c =>
    c.nome.toLowerCase().includes(searchCamp.toLowerCase())
  )
  const connectedCount = instances.filter(i => i.connectionStatus === 'open').length

  return (
    <div className="p-6 flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">

        {/* ── Contas ── */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Contas</span>
              <span className="text-xs text-muted">{connectedCount}/{instances.length}</span>
            </div>
            <button
              onClick={() => navigate('/contas')}
              title="Nova instância"
              className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent hover:text-black transition-colors text-accent"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-1.5">
              <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar"
                value={searchContas}
                onChange={e => setSearchContas(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-muted focus:outline-none flex-1"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {loading ? (
              <div className="px-4 py-4 text-xs text-muted">Carregando...</div>
            ) : filteredInst.length === 0 ? (
              <div className="px-4 py-8 text-xs text-muted text-center">Nenhuma conta</div>
            ) : filteredInst.map(inst => {
              const isOpen = inst.connectionStatus === 'open'
              return (
                <div
                  key={inst.name}
                  onClick={() => navigate('/contas')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface cursor-pointer transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                    {inst.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{inst.name}</p>
                    {inst.ownerJid && (
                      <p className="text-[11px] text-muted truncate">
                        +{inst.ownerJid.replace('@s.whatsapp.net', '').replace('@c.us', '')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOpen ? (
                      <span className="relative w-2.5 h-2.5">
                        <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                        <span className="relative block w-2.5 h-2.5 rounded-full bg-green-400" />
                      </span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                    )}
                    <svg width="13" height="13" fill="none" stroke="#52525b" strokeWidth="1.75" viewBox="0 0 24 24" className="group-hover:stroke-zinc-400 transition-colors">
                      <circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    <svg width="13" height="13" fill="none" stroke="#52525b" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:stroke-zinc-400 transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Campanhas ── */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Campanhas</span>
              <span className="text-xs text-muted">{campanhas.length}/∞</span>
            </div>
            <button
              onClick={() => navigate('/campanhas')}
              title="Nova campanha"
              className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent hover:text-black transition-colors text-accent"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-1.5">
              <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar"
                value={searchCamp}
                onChange={e => setSearchCamp(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-muted focus:outline-none flex-1"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {loading ? (
              <div className="px-4 py-4 text-xs text-muted">Carregando...</div>
            ) : filteredCamp.length === 0 ? (
              <div className="px-4 py-8 text-xs text-muted text-center">Nenhuma campanha</div>
            ) : filteredCamp.map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/campanhas/${c.id}`)}
                className="px-4 py-3 hover:bg-surface cursor-pointer transition-colors group"
              >
                {/* Stats */}
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path strokeLinecap="round" d="M14 14h2m3 0h1m-3 3v1m0 3h1m3-4v4h-3" />
                    </svg>
                    0
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    0
                  </span>
                  <span className="text-[11px] text-muted">% 0.00</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted ml-auto">
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {c.instancias?.length ?? 0}
                  </span>
                </div>
                {/* Photo + name */}
                <div className="flex items-center gap-2.5">
                  {c.foto_url ? (
                    <img src={c.foto_url} alt={c.nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent font-bold text-xs">
                      {c.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <p className="text-xs font-semibold text-white truncate">{c.nome}</p>
                    </div>
                    <p className="text-[10px] text-muted truncate pl-3.5">
                      {c.descricao || `${c.campanha_grupos.length} grupos`}
                    </p>
                  </div>
                  <svg width="12" height="12" fill="none" stroke="#52525b" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 group-hover:stroke-accent transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Disparos ── */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-semibold text-white">Disparos</span>
            <button
              onClick={() => navigate('/novo-disparo')}
              title="Novo disparo"
              className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent hover:text-black transition-colors text-accent"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 space-y-2">
            {[
              { key: 'agendado',   label: 'Agendados',  dot: 'bg-blue-400',  text: 'text-blue-400' },
              { key: 'disparando', label: 'Disparando', dot: 'bg-accent animate-pulse', text: 'text-accent' },
              { key: 'concluido',  label: 'Concluídos', dot: 'bg-green-400', text: 'text-green-400' },
              { key: 'falhou',     label: 'Falharam',   dot: 'bg-red-400',   text: 'text-red-400' },
            ].map(s => {
              const val = stats?.disparos[s.key as keyof typeof stats.disparos] ?? 0
              return (
                <div key={s.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-xs text-muted">{s.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${s.text}`}>{loading ? '—' : val}</span>
                </div>
              )
            })}
          </div>

          <div className="px-4 pb-4 space-y-2 flex-shrink-0">
            <button
              onClick={() => navigate('/novo-disparo')}
              className="w-full py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Novo Disparo
            </button>
            <button
              onClick={() => navigate('/historico')}
              className="w-full py-2 rounded-lg border border-border text-muted hover:text-white hover:border-border-2 text-xs transition-colors"
            >
              Ver histórico
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
