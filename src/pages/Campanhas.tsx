import { useEffect, useState } from 'react'
import {
  fetchCampanhas, createCampanha, deleteCampanha,
  fetchInstances, fetchGroups,
  addGruposToCampanha, removeGrupoDaCampanha,
} from '../lib/api'
import type { Campanha, CampanhaGrupo, Instance, Group } from '../lib/api'

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Modal nova campanha
  const [showNova, setShowNova] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)

  // Modal adicionar grupos
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [selectedInst, setSelectedInst] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  const load = () => {
    setLoading(true)
    fetchCampanhas()
      .then(setCampanhas)
      .catch(() => setError('Erro ao carregar campanhas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (addingTo) {
      fetchInstances().then(setInstances).catch(() => {})
    }
  }, [addingTo])

  useEffect(() => {
    if (!selectedInst) { setGroups([]); return }
    setLoadingGroups(true)
    fetchGroups(selectedInst)
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [selectedInst])

  const handleCriar = async () => {
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      await createCampanha(novoNome.trim())
      setNovoNome('')
      setShowNova(false)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar')
    } finally { setCriando(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir campanha?')) return
    try {
      await deleteCampanha(id)
      load()
    } catch { setError('Erro ao excluir') }
  }

  const handleRemoveGrupo = async (grupo: CampanhaGrupo) => {
    try {
      await removeGrupoDaCampanha(grupo.id)
      load()
    } catch { setError('Erro ao remover grupo') }
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  const handleSalvarGrupos = async () => {
    if (!addingTo || !selectedInst || selectedGroups.length === 0) return
    setSalvando(true)

    const campanha = campanhas.find(c => c.id === addingTo)
    const jaAdicionados = new Set(campanha?.campanha_grupos.map(g => g.group_id) ?? [])

    const novos = groups
      .filter(g => selectedGroups.includes(g.id) && !jaAdicionados.has(g.id))
      .map(g => ({ group_id: g.id, group_name: g.subject, instancia: selectedInst }))

    try {
      if (novos.length > 0) await addGruposToCampanha(addingTo, novos)
      setAddingTo(null)
      setSelectedGroups([])
      setSelectedInst('')
      setGroups([])
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar grupos')
    } finally { setSalvando(false) }
  }

  const filteredGroups = groups.filter(g =>
    g.subject.toLowerCase().includes(groupSearch.toLowerCase())
  )

  const connectedInstances = instances.filter(i => i.connectionStatus === 'open')

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
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
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
            <div key={campanha.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header da campanha */}
              <div
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-surface transition-colors"
                onClick={() => setExpanded(expanded === campanha.id ? null : campanha.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <svg width="14" height="14" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{campanha.nome}</p>
                    <p className="text-xs text-muted">{campanha.campanha_grupos.length} grupo(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setAddingTo(campanha.id); setExpanded(campanha.id) }}
                    className="px-3 py-1.5 text-xs bg-surface border border-border hover:border-accent/40 text-muted hover:text-white rounded-lg transition-colors"
                  >
                    + Adicionar grupos
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(campanha.id) }}
                    className="p-1.5 text-muted hover:text-red-400 transition-colors"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg
                    width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"
                    className={`transition-transform ${expanded === campanha.id ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Lista de grupos */}
              {expanded === campanha.id && (
                <div className="border-t border-border">
                  {campanha.campanha_grupos.length === 0 ? (
                    <div className="px-5 py-6 text-center text-muted text-sm">
                      Nenhum grupo adicionado ainda.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {campanha.campanha_grupos.map(grupo => (
                        <div key={grupo.id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{grupo.group_name}</p>
                            <p className="text-xs text-muted">{grupo.instancia}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveGrupo(grupo)}
                            className="text-muted hover:text-red-400 transition-colors p-1"
                          >
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              <button
                onClick={() => { setShowNova(false); setNovoNome('') }}
                className="flex-1 py-2.5 rounded-lg bg-card border border-border text-sm text-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={criando || !novoNome.trim()}
                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors"
              >
                {criando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar grupos */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6">
            <h2 className="text-base font-bold mb-4">Adicionar grupos</h2>

            {/* Selecionar instância */}
            <div className="mb-4">
              <label className="block text-xs text-muted mb-2">Instância</label>
              <div className="flex flex-wrap gap-2">
                {connectedInstances.length === 0 && (
                  <span className="text-muted text-sm">Nenhuma instância conectada</span>
                )}
                {connectedInstances.map(inst => (
                  <button
                    key={inst.name}
                    onClick={() => setSelectedInst(inst.name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedInst === inst.name
                        ? 'bg-accent text-black border-accent'
                        : 'bg-card border-border text-muted hover:text-white'
                    }`}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de grupos */}
            {selectedInst && (
              <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <svg width="13" height="13" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar grupo..."
                    value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none"
                  />
                  {selectedGroups.length > 0 && (
                    <span className="text-xs text-accent">{selectedGroups.length} selecionado(s)</span>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {loadingGroups && (
                    <div className="px-4 py-4 text-muted text-sm text-center">Carregando...</div>
                  )}
                  {!loadingGroups && filteredGroups.length === 0 && (
                    <div className="px-4 py-4 text-muted text-sm text-center">Nenhum grupo encontrado</div>
                  )}
                  {filteredGroups.map(g => {
                    const jaAdicionado = campanhas
                      .find(c => c.id === addingTo)
                      ?.campanha_grupos.some(cg => cg.group_id === g.id)
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface transition-colors ${jaAdicionado ? 'opacity-40' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          disabled={!!jaAdicionado}
                          onChange={() => toggleGroup(g.id)}
                          className="accent-accent w-4 h-4"
                        />
                        <span className="text-sm text-white">{g.subject}</span>
                        {jaAdicionado && <span className="text-xs text-muted ml-auto">já adicionado</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setAddingTo(null); setSelectedGroups([]); setSelectedInst(''); setGroups([]) }}
                className="flex-1 py-2.5 rounded-lg bg-card border border-border text-sm text-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarGrupos}
                disabled={salvando || selectedGroups.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors"
              >
                {salvando ? 'Salvando...' : `Adicionar ${selectedGroups.length > 0 ? selectedGroups.length : ''} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
