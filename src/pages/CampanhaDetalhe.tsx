import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchCampanha, updateCampanha,
  fetchAtividades, dispararCampanha,
  fetchInstances, fetchGroups,
  addGruposToCampanha, removeGrupoDaCampanha,
  uploadImage,
} from '../lib/api'
import type { Campanha, CampanhaGrupo, Disparo, Instance, Group } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tab = 'visao-geral' | 'grupos' | 'atividades' | 'acoes'

export default function CampanhaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campanha, setCampanha] = useState<Campanha | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('visao-geral')
  const [error, setError] = useState('')

  // Atividades
  const [atividades, setAtividades] = useState<Disparo[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)
  const [expandedAtiv, setExpandedAtiv] = useState<string | null>(null)

  // Adicionar instâncias
  const [allInstances, setAllInstances] = useState<Instance[]>([])
  const [showAddInst, setShowAddInst] = useState(false)

  // Modal adicionar grupos
  const [showAddGrupos, setShowAddGrupos] = useState(false)
  const [selectedInst, setSelectedInst] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [salvandoGrupos, setSalvandoGrupos] = useState(false)

  // Ações — disparo
  const [mensagem, setMensagem] = useState('')
  const [mentionAll, setMentionAll] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    fetchCampanha(id)
      .then(setCampanha)
      .catch(() => setError('Campanha não encontrada'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    fetchInstances().then(setAllInstances).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'atividades' && id) {
      setLoadingAtiv(true)
      fetchAtividades(id)
        .then(setAtividades)
        .finally(() => setLoadingAtiv(false))
    }
  }, [tab, id])

  useEffect(() => {
    if (!selectedInst) { setGroups([]); return }
    setLoadingGroups(true)
    fetchGroups(selectedInst)
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [selectedInst])

  const fmt = (iso: string) => format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  const toggleInstancia = async (name: string) => {
    if (!campanha) return
    const atual = campanha.instancias ?? []
    const novas = atual.includes(name) ? atual.filter(i => i !== name) : [...atual, name]
    try {
      const updated = await updateCampanha(campanha.id, { instancias: novas })
      setCampanha(updated)
    } catch { setError('Erro ao atualizar instâncias') }
  }

  const handleRemoveGrupo = async (grupo: CampanhaGrupo) => {
    try {
      await removeGrupoDaCampanha(grupo.id)
      load()
    } catch { setError('Erro ao remover grupo') }
  }

  const handleSalvarGrupos = async () => {
    if (!campanha || !selectedInst || selectedGroups.length === 0) return
    setSalvandoGrupos(true)
    const jaAdicionados = new Set(campanha.campanha_grupos.map(g => g.group_id))
    const novos = groups
      .filter(g => selectedGroups.includes(g.id) && !jaAdicionados.has(g.id))
      .map(g => ({ group_id: g.id, group_name: g.subject, instancia: selectedInst }))
    try {
      if (novos.length > 0) await addGruposToCampanha(campanha.id, novos)
      setShowAddGrupos(false)
      setSelectedGroups([])
      setSelectedInst('')
      setGroups([])
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar grupos')
    } finally { setSalvandoGrupos(false) }
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleDisparar = async (sendNow: boolean) => {
    setError('')
    if (!mensagem.trim()) { setError('Digite a mensagem'); return }
    if (!campanha?.instancias?.length) { setError('Adicione pelo menos uma instância à campanha'); return }
    if (!campanha?.campanha_grupos?.length) { setError('Adicione pelo menos um grupo à campanha'); return }
    if (!sendNow && !agendadoPara) { setError('Selecione a data/hora'); return }

    setSending(true)
    try {
      let imageUrl = ''
      let imageMimetype = ''
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
        imageMimetype = imageFile.type
      }
      const baseTime = sendNow ? new Date().toISOString() : new Date(agendadoPara).toISOString()
      const result = await dispararCampanha(campanha.id, { mensagem, imageUrl, imageMimetype, mentionAll, agendadoPara: baseTime })
      setMensagem('')
      setImageFile(null)
      setImagePreview(null)
      setTab('atividades')
      setAtividades([])
      if (id) {
        setLoadingAtiv(true)
        fetchAtividades(id).then(setAtividades).finally(() => setLoadingAtiv(false))
      }
      alert(`Disparo criado! ${result.itens} grupos agendados.`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao disparar')
    } finally { setSending(false) }
  }

  const connectedInstances = allInstances.filter(i => i.connectionStatus === 'open')
  const filteredGroups = groups.filter(g => g.subject.toLowerCase().includes(groupSearch.toLowerCase()))

  if (loading) return <div className="p-6 text-muted text-sm">Carregando...</div>
  if (!campanha) return <div className="p-6 text-red-400 text-sm">{error || 'Campanha não encontrada'}</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'grupos', label: `Grupos (${campanha.campanha_grupos.length})` },
    { key: 'atividades', label: 'Atividades' },
    { key: 'acoes', label: 'Ações' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/campanhas')} className="text-muted hover:text-white transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <svg width="14" height="14" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">{campanha.nome}</h1>
          <p className="text-xs text-muted">{campanha.campanha_grupos.length} grupo(s) · {campanha.instancias?.length ?? 0} instância(s)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === VISÃO GERAL === */}
      {tab === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl px-4 py-4">
              <p className="text-2xl font-bold text-white">{campanha.campanha_grupos.length}</p>
              <p className="text-xs text-muted mt-1">Grupos</p>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-4">
              <p className="text-2xl font-bold text-white">{campanha.instancias?.length ?? 0}</p>
              <p className="text-xs text-muted mt-1">Instâncias</p>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-4 col-span-2 sm:col-span-1">
              <p className="text-2xl font-bold text-white">{atividades.length}</p>
              <p className="text-xs text-muted mt-1">Disparos</p>
            </div>
          </div>

          {/* Instâncias */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white">Instâncias da campanha</h2>
              <button onClick={() => setShowAddInst(!showAddInst)} className="text-xs text-accent hover:underline">
                {showAddInst ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>
            {showAddInst ? (
              <div className="flex flex-wrap gap-2">
                {connectedInstances.length === 0 && <span className="text-muted text-sm">Nenhuma instância conectada</span>}
                {connectedInstances.map(inst => (
                  <button
                    key={inst.name}
                    onClick={() => toggleInstancia(inst.name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      campanha.instancias?.includes(inst.name)
                        ? 'bg-accent text-black border-accent'
                        : 'bg-card border-border text-muted hover:text-white'
                    }`}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!campanha.instancias?.length && <span className="text-muted text-sm">Nenhuma instância adicionada</span>}
                {campanha.instancias?.map(inst => (
                  <span key={inst} className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm">
                    {inst}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Atalhos */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setTab('acoes')} className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold text-sm transition-colors">
              Disparar campanha
            </button>
            <button onClick={() => setTab('grupos')} className="flex-1 py-3 rounded-lg bg-card border border-border hover:border-accent/40 text-white text-sm transition-colors">
              Gerenciar grupos
            </button>
          </div>
        </div>
      )}

      {/* === GRUPOS === */}
      {tab === 'grupos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">{campanha.campanha_grupos.length} grupo(s)</p>
            <button
              onClick={() => setShowAddGrupos(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-black font-semibold text-sm rounded-lg transition-colors"
            >
              + Adicionar grupos
            </button>
          </div>
          {campanha.campanha_grupos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
              <p className="text-muted text-sm">Nenhum grupo ainda.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {campanha.campanha_grupos.map(grupo => (
                <div key={grupo.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{grupo.group_name}</p>
                    <p className="text-xs text-muted">{grupo.instancia}</p>
                  </div>
                  <button onClick={() => handleRemoveGrupo(grupo)} className="text-muted hover:text-red-400 transition-colors p-1">
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

      {/* === ATIVIDADES === */}
      {tab === 'atividades' && (
        <div>
          {loadingAtiv ? (
            <div className="text-muted text-sm">Carregando atividades...</div>
          ) : atividades.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
              <p className="text-muted text-sm">Nenhum disparo ainda para esta campanha.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atividades.map(d => (
                <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => setExpandedAtiv(expandedAtiv === d.id ? null : d.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-white truncate">{d.nome}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-muted text-xs truncate">{d.mensagem}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          <span>{fmt(d.agendado_para)}</span>
                          <span>{d.total_grupos} grupo(s)</span>
                          {d.enviados > 0 && <span className="text-green-400">{d.enviados} enviado(s)</span>}
                          {d.falhas > 0 && <span className="text-red-400">{d.falhas} falha(s)</span>}
                        </div>
                      </div>
                      {d.total_grupos > 0 && (
                        <div className="w-20 flex-shrink-0">
                          <div className="flex justify-between text-xs text-muted mb-1">
                            <span>{Math.round((d.enviados / d.total_grupos) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(d.enviados / d.total_grupos) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      <svg width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"
                        className={`flex-shrink-0 transition-transform ${expandedAtiv === d.id ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedAtiv === d.id && d.disparo_itens && (
                    <div className="border-t border-border divide-y divide-border">
                      {d.disparo_itens.map(item => (
                        <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{item.group_name || item.group_id}</p>
                            <p className="text-xs text-muted">{item.instancia} · {fmt(item.send_at)}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === AÇÕES === */}
      {tab === 'acoes' && (
        <div className="space-y-5">
          {!campanha.instancias?.length && (
            <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
              Adicione instâncias na aba Visão Geral antes de disparar.
            </div>
          )}
          {!campanha.campanha_grupos?.length && (
            <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
              Adicione grupos na aba Grupos antes de disparar.
            </div>
          )}

          {/* Mensagem */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Mensagem</label>
            <textarea
              placeholder="Digite a mensagem..."
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Imagem */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Imagem <span className="text-muted text-xs">(opcional)</span></label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="max-h-32 rounded mx-auto" />
                  <button onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <p className="text-muted text-sm">Arraste ou clique para selecionar imagem</p>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Mencionar todos */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setMentionAll(!mentionAll)}
              className={`relative w-10 h-5 rounded-full transition-colors ${mentionAll ? 'bg-accent' : 'bg-border'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${mentionAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm">Mencionar todos (@todos)</span>
          </label>

          {/* Data/hora */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Agendar para <span className="text-muted text-xs">(BRT)</span></label>
            <input
              type="datetime-local"
              value={agendadoPara}
              onChange={e => setAgendadoPara(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg">
            <span className="text-sm">🎲</span>
            <span className="text-sm text-muted">
              {campanha.campanha_grupos.length} grupos · intervalo aleatório 40–60s · instâncias: {campanha.instancias?.join(', ') || '—'}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => handleDisparar(true)} disabled={sending}
              className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors">
              {sending ? 'Enviando...' : 'Enviar Agora'}
            </button>
            <button onClick={() => handleDisparar(false)} disabled={sending}
              className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors">
              {sending ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal adicionar grupos */}
      {showAddGrupos && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6">
            <h2 className="text-base font-bold mb-4">Adicionar grupos</h2>
            <div className="mb-4">
              <label className="block text-xs text-muted mb-2">Instância</label>
              <div className="flex flex-wrap gap-2">
                {connectedInstances.map(inst => (
                  <button key={inst.name} onClick={() => setSelectedInst(inst.name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedInst === inst.name ? 'bg-accent text-black border-accent' : 'bg-card border-border text-muted hover:text-white'
                    }`}>{inst.name}</button>
                ))}
              </div>
            </div>
            {selectedInst && (
              <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <input type="text" placeholder="Buscar..." value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none" />
                  {selectedGroups.length > 0 && <span className="text-xs text-accent">{selectedGroups.length} sel.</span>}
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {loadingGroups && <div className="px-4 py-4 text-muted text-sm text-center">Carregando...</div>}
                  {filteredGroups.map(g => {
                    const jaAdicionado = campanha.campanha_grupos.some(cg => cg.group_id === g.id)
                    return (
                      <label key={g.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface ${jaAdicionado ? 'opacity-40' : ''}`}>
                        <input type="checkbox" checked={selectedGroups.includes(g.id)} disabled={jaAdicionado}
                          onChange={() => setSelectedGroups(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                          className="accent-accent w-4 h-4" />
                        <span className="text-sm text-white">{g.subject}</span>
                        {jaAdicionado && <span className="text-xs text-muted ml-auto">já adicionado</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowAddGrupos(false); setSelectedGroups([]); setSelectedInst(''); setGroups([]) }}
                className="flex-1 py-2.5 rounded-lg bg-card border border-border text-sm text-muted hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSalvarGrupos} disabled={salvandoGrupos || selectedGroups.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors">
                {salvandoGrupos ? 'Salvando...' : `Adicionar ${selectedGroups.length || ''} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
