import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCampanhas, createCampanha, deleteCampanha, fetchCampanhaStats } from '../lib/api'
import type { Campanha, CampanhaStats } from '../lib/api'

export default function Campanhas() {
  const navigate = useNavigate()
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [stats, setStats] = useState<Record<string, CampanhaStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    fetchCampanhas()
      .then(data => {
        setCampanhas(data)
        data.forEach(c => {
          fetchCampanhaStats(c.id)
            .then(s => setStats(prev => ({ ...prev, [c.id]: s })))
            .catch(() => {})
        })
      })
      .catch(() => setError('Erro ao carregar campanhas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCriar = async () => {
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      const nova = await createCampanha(novoNome.trim())
      setNovoNome('')
      setShowNova(false)
      navigate(`/campanhas/${nova.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar')
    } finally { setCriando(false) }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Excluir campanha e todos os grupos?')) return
    try {
      await deleteCampanha(id)
      load()
    } catch { setError('Erro ao excluir') }
  }

  const filtered = campanhas.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Campanhas</h1>
        <button
          onClick={() => setShowNova(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-black transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Campanha
        </button>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Buscar"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted text-sm">
          <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Nenhuma campanha</p>
          <p className="text-xs text-muted mb-4">Crie uma campanha para organizar seus grupos</p>
          <button onClick={() => setShowNova(true)} className="btn-primary text-xs">Criar primeira campanha</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(campanha => (
            <div
              key={campanha.id}
              onClick={() => navigate(`/campanhas/${campanha.id}`)}
              className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-border-2 transition-all group relative"
            >
              {/* Stats row */}
              {(() => {
                const s = stats[campanha.id]
                const loading = !s
                return (
                  <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60">
                    <div className="px-3 pt-2.5 pb-2 flex flex-col items-center">
                      <span className="text-sm font-bold text-foreground">{campanha.campanha_grupos.length}</span>
                      <span className="text-[10px] text-muted mt-0.5">Grupos</span>
                    </div>
                    <div className="px-3 pt-2.5 pb-2 flex flex-col items-center">
                      <span className="text-sm font-bold text-foreground">{loading ? '—' : s.participantes.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-muted mt-0.5">Participantes</span>
                    </div>
                    <div className="px-3 pt-2.5 pb-2 flex flex-col items-center">
                      {loading ? (
                        <span className="text-sm font-bold text-foreground">—</span>
                      ) : (
                        <span className="text-sm font-bold">
                          <span className="text-green-400">{s.gruposDisponiveis}</span>
                          <span className="text-muted font-normal text-xs"> / </span>
                          <span className="text-red-400">{s.gruposCheios}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-muted mt-0.5">Disp. / Cheios</span>
                    </div>
                  </div>
                )
              })()}

              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {campanha.foto_url ? (
                  <img
                    src={campanha.foto_url}
                    alt={campanha.nome}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent font-bold text-sm">
                    {campanha.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{campanha.nome}</p>
                  </div>
                  <p className="text-[11px] text-muted truncate pl-4">
                    {campanha.descricao || `${campanha.campanha_grupos.length} grupos`}
                  </p>
                </div>

                <svg width="14" height="14" fill="none" stroke="#52525b" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 group-hover:stroke-accent transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </div>

              {/* Delete on hover */}
              <button
                onClick={e => handleDelete(e, campanha.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova campanha */}
      {showNova && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-modal">
            <h2 className="text-base font-semibold mb-1">Nova campanha</h2>
            <p className="text-xs text-muted mb-5">Organize grupos em uma campanha para disparos em massa.</p>
            <input
              type="text"
              placeholder="Nome da campanha"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCriar()}
              autoFocus
              className="input mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowNova(false); setNovoNome('') }} className="btn-secondary flex-1 py-2.5">Cancelar</button>
              <button onClick={handleCriar} disabled={criando || !novoNome.trim()} className="btn-primary flex-1 py-2.5">
                {criando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
