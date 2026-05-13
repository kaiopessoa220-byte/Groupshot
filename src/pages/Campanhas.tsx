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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Campanhas</h1>
          <p className="text-muted text-sm">{campanhas.length} campanha(s)</p>
        </div>
        <button
          onClick={() => setShowNova(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-black font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova campanha
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Carregando campanhas...</div>
      ) : campanhas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
          <p className="text-muted text-sm">Nenhuma campanha ainda.</p>
          <button onClick={() => setShowNova(true)} className="mt-3 text-accent text-sm hover:underline">
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campanhas.map(campanha => (
            <div
              key={campanha.id}
              onClick={() => navigate(`/campanhas/${campanha.id}`)}
              className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-accent/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <svg width="15" height="15" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{campanha.nome}</p>
                  <p className="text-xs text-muted">
                    {campanha.campanha_grupos.length} grupo(s) · {campanha.instancias?.length ?? 0} instância(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted group-hover:text-accent transition-colors">Abrir →</span>
                <button
                  onClick={e => handleDelete(e, campanha.id)}
                  className="p-1.5 text-muted hover:text-red-400 transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova campanha */}
      {showNova && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold mb-4">Nova campanha</h2>
            <input
              type="text"
              placeholder="Nome da campanha"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCriar()}
              autoFocus
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowNova(false); setNovoNome('') }}
                className="flex-1 py-2.5 rounded-lg bg-card border border-border text-sm text-muted hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleCriar} disabled={criando || !novoNome.trim()}
                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors">
                {criando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
