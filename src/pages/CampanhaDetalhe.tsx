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

  const [atividades, setAtividades] = useState<Disparo[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)
  const [expandedAtiv, setExpandedAtiv] = useState<string | null>(null)

  const [allInstances, setAllInstances] = useState<Instance[]>([])
  const [showAddInst, setShowAddInst] = useState(false)

  const [showAddGrupos, setShowAddGrupos] = useState(false)
  const [selectedInst, setSelectedInst] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [salvandoGrupos, setSalvandoGrupos] = useState(false)

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
  useEffect(() => { fetchInstances().then(setAllInstances).catch(() => {}) }, [])

  useEffect(() => {
    if (tab === 'atividades' && id) {
      setLoadingAtiv(true)
      fetchAtividades(id).then(setAtividades).finally(() => setLoadingAtiv(false))
    }
  }, [tab, id])

  useEffect(() => {
    if (!selectedInst) { setGroups([]); return }
    setLoadingGroups(true)
    fetchGroups(selectedInst).then(setGroups).catch(() => {}).finally(() => setLoadingGroups(false))
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

  // Upload de foto da campanha
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const handleFotoUpload = async (file: File) => {
    if (!campanha || !file.type.startsWith('image/')) return
    setUploadingFoto(true)
    try {
      const url = await uploadImage(file)
      const updated = await updateCampanha(campanha.id, { foto_url: url })
      setCampanha(updated)
    } catch { setError('Erro ao salvar foto') }
    finally { setUploadingFoto(false) }
  }

  const handleRemoveFoto = async () => {
    if (!campanha) return
    try {
      const updated = await updateCampanha(campanha.id, { foto_url: '' })
      setCampanha(updated)
    } catch { setError('Erro ao remover foto') }
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

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-muted text-sm">
      <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
      Carregando...
    </div>
  )
  if (!campanha) return <div className="p-8 text-red-400 text-sm">{error || 'Campanha não encontrada'}</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'grupos', label: `Grupos (${campanha.campanha_grupos.length})` },
    { key: 'atividades', label: 'Atividades' },
    { key: 'acoes', label: 'Ações' },
  ]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate('/campanhas')}
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-white hover:border-border-2 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">{campanha.nome}</h1>
          <p className="text-xs text-muted">{campanha.campanha_grupos.length} grupos · {campanha.instancias?.length ?? 0} instâncias</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-accent text-white'
                : 'border-transparent text-muted hover:text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === VISÃO GERAL === */}
      {tab === 'visao-geral' && (
        <div className="space-y-6">
          {/* Foto da campanha */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {campanha.foto_url ? (
                <img
                  src={campanha.foto_url}
                  alt={campanha.nome}
                  className="w-16 h-16 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                  <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">{campanha.nome}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                >
                  {uploadingFoto ? 'Salvando...' : campanha.foto_url ? 'Alterar foto' : 'Adicionar foto'}
                </button>
                {campanha.foto_url && (
                  <>
                    <span className="text-muted text-xs">·</span>
                    <button onClick={handleRemoveFoto} className="text-xs text-muted hover:text-red-400 transition-colors">
                      Remover
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoUpload(f) }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Grupos', value: campanha.campanha_grupos.length },
              { label: 'Instâncias', value: campanha.instancias?.length ?? 0 },
              { label: 'Disparos', value: atividades.length },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Instâncias */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white">Instâncias</p>
              <button
                onClick={() => setShowAddInst(!showAddInst)}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
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
                        : 'bg-surface-2 border-border text-muted hover:text-white hover:border-border-2'
                    }`}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!campanha.instancias?.length
                  ? <span className="text-sm text-muted">Nenhuma instância adicionada. Clique em Gerenciar.</span>
                  : campanha.instancias.map(inst => (
                    <span key={inst} className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm">
                      {inst}
                    </span>
                  ))
                }
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setTab('acoes')} className="btn-primary flex-1 py-2.5">
              Disparar campanha
            </button>
            <button onClick={() => setTab('grupos')} className="btn-secondary flex-1 py-2.5">
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
            <button onClick={() => setShowAddGrupos(true)} className="btn-primary text-sm">
              + Adicionar grupos
            </button>
          </div>
          {campanha.campanha_grupos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-14 text-center">
              <p className="text-sm text-muted">Nenhum grupo adicionado ainda.</p>
              <button onClick={() => setShowAddGrupos(true)} className="mt-3 text-accent text-sm hover:underline">
                Adicionar grupos
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_32px] items-center px-5 py-2.5 border-b border-border">
                <span className="text-xs text-muted">Grupo</span>
                <span className="text-xs text-muted">Instância</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {campanha.campanha_grupos.map(grupo => (
                  <div key={grupo.id} className="grid grid-cols-[1fr_120px_32px] items-center px-5 py-3 group">
                    <p className="text-sm text-white truncate">{grupo.group_name}</p>
                    <p className="text-xs text-muted">{grupo.instancia}</p>
                    <button
                      onClick={() => handleRemoveGrupo(grupo)}
                      className="p-1 text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ATIVIDADES === */}
      {tab === 'atividades' && (
        <div>
          {loadingAtiv ? (
            <div className="flex items-center gap-2 text-muted text-sm">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
              Carregando atividades...
            </div>
          ) : atividades.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-14 text-center">
              <p className="text-sm text-muted">Nenhum disparo ainda para esta campanha.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {atividades.map(d => (
                <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => setExpandedAtiv(expandedAtiv === d.id ? null : d.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">{d.nome}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-xs text-muted truncate">{d.mensagem}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                          <span>{fmt(d.agendado_para)}</span>
                          <span>{d.total_grupos} grupos</span>
                          {d.enviados > 0 && <span className="text-green-400">{d.enviados} enviados</span>}
                          {d.falhas > 0 && <span className="text-red-400">{d.falhas} falhas</span>}
                        </div>
                      </div>
                      {d.total_grupos > 0 && (
                        <div className="w-20 flex-shrink-0">
                          <div className="flex justify-between text-xs text-muted mb-1.5">
                            <span>{Math.round((d.enviados / d.total_grupos) * 100)}%</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${(d.enviados / d.total_grupos) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      <svg width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"
                        className={`flex-shrink-0 transition-transform ${expandedAtiv === d.id ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedAtiv === d.id && d.disparo_itens && (
                    <div className="border-t border-border divide-y divide-border">
                      {d.disparo_itens.map(item => (
                        <div key={item.id} className="px-5 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{item.group_name || item.group_id}</p>
                            <p className="text-xs text-muted mt-0.5">{item.instancia} · {fmt(item.send_at)}</p>
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
            <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              Adicione instâncias na aba Visão Geral antes de disparar.
            </div>
          )}
          {!campanha.campanha_grupos?.length && (
            <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              Adicione grupos na aba Grupos antes de disparar.
            </div>
          )}

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">Mensagem</label>
            <textarea
              placeholder="Digite a mensagem..."
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="input resize-none"
            />
            <p className="text-xs text-muted mt-1.5">{mensagem.length} caracteres</p>
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              Imagem <span className="normal-case">(opcional)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => e.preventDefault()}
              className="border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-border-2 transition-colors"
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="max-h-28 rounded-lg mx-auto" />
                  <button
                    onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >×</button>
                </div>
              ) : (
                <div>
                  <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-muted">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-muted mt-0.5">PNG, JPG, GIF, WEBP</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setMentionAll(!mentionAll)}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${mentionAll ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mentionAll ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-secondary">Mencionar todos (@todos)</span>
          </label>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              Agendar para <span className="normal-case">(BRT — UTC-3)</span>
            </label>
            <input
              type="datetime-local"
              value={agendadoPara}
              onChange={e => setAgendadoPara(e.target.value)}
              className="input w-auto"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border border-border rounded-xl">
            <svg width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-muted">
              {campanha.campanha_grupos.length} grupos · intervalo 40–60s · instâncias: <span className="text-secondary">{campanha.instancias?.join(', ') || '—'}</span>
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleDisparar(true)}
              disabled={sending}
              className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {sending ? 'Enviando...' : 'Enviar Agora'}
            </button>
            <button
              onClick={() => handleDisparar(false)}
              disabled={sending}
              className="btn-primary flex-1 py-2.5"
            >
              {sending ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal adicionar grupos */}
      {showAddGrupos && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-modal">
            <h2 className="text-base font-semibold mb-1">Adicionar grupos</h2>
            <p className="text-xs text-muted mb-5">Selecione a instância e os grupos que deseja adicionar.</p>

            <div className="mb-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">Instância</p>
              <div className="flex flex-wrap gap-2">
                {connectedInstances.length === 0 && <span className="text-muted text-sm">Nenhuma instância conectada</span>}
                {connectedInstances.map(inst => (
                  <button
                    key={inst.name}
                    onClick={() => setSelectedInst(inst.name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedInst === inst.name
                        ? 'bg-accent text-black border-accent'
                        : 'bg-surface-2 border-border text-muted hover:text-white hover:border-border-2'
                    }`}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedInst && (
              <div className="bg-surface-2 border border-border rounded-xl overflow-hidden mb-5">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <svg width="13" height="13" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar grupos..."
                    value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none"
                  />
                  {selectedGroups.length > 0 && (
                    <span className="text-xs text-accent">{selectedGroups.length} sel.</span>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {loadingGroups && <div className="px-4 py-4 text-muted text-sm text-center">Carregando...</div>}
                  {!loadingGroups && filteredGroups.length === 0 && (
                    <div className="px-4 py-4 text-muted text-sm text-center">Nenhum grupo encontrado</div>
                  )}
                  {filteredGroups.map(g => {
                    const jaAdicionado = campanha.campanha_grupos.some(cg => cg.group_id === g.id)
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface transition-colors ${jaAdicionado ? 'opacity-40 cursor-default' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          disabled={jaAdicionado}
                          onChange={() => setSelectedGroups(prev =>
                            prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id]
                          )}
                          className="accent-accent w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-sm text-white flex-1 truncate">{g.subject}</span>
                        {jaAdicionado && <span className="text-xs text-muted">já adicionado</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddGrupos(false); setSelectedGroups([]); setSelectedInst(''); setGroups([]) }}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarGrupos}
                disabled={salvandoGrupos || selectedGroups.length === 0}
                className="btn-primary flex-1 py-2.5"
              >
                {salvandoGrupos ? 'Salvando...' : `Adicionar ${selectedGroups.length || ''} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
