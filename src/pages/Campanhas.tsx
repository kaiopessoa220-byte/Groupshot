import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCampanhas, createCampanha, deleteCampanha } from '../lib/api'
import type { Campanha } from '../lib/api'

export default function Campanhas() {
  const navigate = useNavigate()
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)

  const load = () => {
    setLoading(true)
    fetchCampanhas()
      .then(setCampanhas)
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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1.5">Campanha</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Campanhas</h1>
        </div>
        <button onClick={() => setShowNova(true)} className="btn-primary flex items-center gap-2">
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova campanha
        </button>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Carregando...</div>
      ) : campanhas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" fill="none" stroke="#71717a" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white mb-1">Nenhuma campanha</p>
          <p className="text-xs text-muted mb-4">Crie uma campanha para organizar seus grupos</p>
          <button onClick={() => setShowNova(true)} className="btn-primary text-xs">
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_80px_40px] items-center px-5 py-2.5 border-b border-border">
            <span className="text-xs text-muted">Nome</span>
            <span className="text-xs text-muted text-center">Grupos</span>
            <span className="text-xs text-muted text-center">Instâncias</span>
            <span />
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {campanhas.map(campanha => (
              <div
                key={campanha.id}
                onClick={() => navigate(`/campanhas/${campanha.id}`)}
                className="grid grid-cols-[1fr_80px_80px_40px] items-center px-5 py-3.5 cursor-pointer hover:bg-surface transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-white truncate">{campanha.nome}</span>
                </div>
                <span className="text-sm text-secondary text-center">{campanha.campanha_grupos.length}</span>
                <span className="text-sm text-secondary text-center">{campanha.instancias?.length ?? 0}</span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={e => handleDelete(e, campanha.id)}
                    className="p-1.5 text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              <button
                onClick={() => { setShowNova(false); setNovoNome('') }}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={criando || !novoNome.trim()}
                className="btn-primary flex-1 py-2.5"
              >
                {criando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
