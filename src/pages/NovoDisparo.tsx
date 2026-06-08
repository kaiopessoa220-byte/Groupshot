import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchInstances, fetchGroups, dispatch, uploadImage } from '../lib/api'
import type { Instance, Group } from '../lib/api'

export default function NovoDisparo() {
  const navigate = useNavigate()

  const [instances, setInstances] = useState<Instance[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingInst, setLoadingInst] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(false)

  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [mentionAll, setMentionAll] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [groupSearch, setGroupSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchInstances()
      .then(setInstances)
      .catch(() => setError('Erro ao carregar instâncias'))
      .finally(() => setLoadingInst(false))
  }, [])

  useEffect(() => {
    if (selectedInstances.length === 0) { setGroups([]); return }
    setLoadingGroups(true)
    Promise.all(selectedInstances.map(inst => fetchGroups(inst).catch(() => [])))
      .then(results => {
        // junta grupos de todas as instâncias, deduplica por ID
        const seen = new Set<string>()
        const merged = results.flat().filter(g => {
          if (seen.has(g.id)) return false
          seen.add(g.id)
          return true
        })
        setGroups(merged)
      })
      .catch(() => setError('Erro ao carregar grupos'))
      .finally(() => setLoadingGroups(false))
  }, [selectedInstances])

  const toggleInstance = (name: string) => {
    setSelectedInstances(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    )
    setSelectedGroups([])
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleAllGroups = () => {
    const visible = filteredGroups.map(g => g.id)
    const allSelected = visible.every(id => selectedGroups.includes(id))
    if (allSelected) {
      setSelectedGroups(prev => prev.filter(id => !visible.includes(id)))
    } else {
      setSelectedGroups(prev => [...new Set([...prev, ...visible])])
    }
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleSend = async (sendNow: boolean) => {
    setError('')
    if (!mensagem.trim()) { setError('Digite a mensagem.'); return }
    if (selectedGroups.length === 0) { setError('Selecione ao menos um grupo.'); return }
    if (selectedInstances.length === 0) { setError('Selecione ao menos uma instância.'); return }
    if (!sendNow && !agendadoPara) { setError('Selecione a data/hora do agendamento.'); return }

    setSending(true)
    try {
      let imageUrl = ''
      let imageMimetype = ''
      if (imageFile) {
        setUploading(true)
        imageUrl = await uploadImage(imageFile)
        imageMimetype = imageFile.type
        setUploading(false)
      }
      const baseTime = sendNow ? new Date().toISOString() : new Date(agendadoPara).toISOString()
      await dispatch({
        nome: nome || 'Disparo sem nome',
        mensagem,
        imageUrl,
        imageMimetype,
        mentionAll,
        agendadoPara: baseTime,
        groupIds: selectedGroups,
        instancias: selectedInstances,
      })
      navigate('/historico', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  const filteredGroups = groups.filter(g =>
    g.subject.toLowerCase().includes(groupSearch.toLowerCase())
  )
  const connectedInstances = instances.filter(i => i.connectionStatus === 'open')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted uppercase tracking-widest mb-1.5">Envio</p>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Novo Disparo</h1>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        {/* Nome */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nome do disparo</label>
          <input
            type="text"
            placeholder="Ex: Promoção de maio"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="input"
          />
        </div>

        {/* Instâncias */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Instâncias
            {selectedInstances.length > 0 && <span className="text-accent ml-2 normal-case">{selectedInstances.length} selecionada(s)</span>}
          </label>
          {loadingInst ? (
            <div className="text-muted text-sm">Carregando...</div>
          ) : connectedInstances.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma instância conectada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {connectedInstances.map(inst => (
                <button
                  key={inst.name}
                  onClick={() => toggleInstance(inst.name)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    selectedInstances.includes(inst.name)
                      ? 'bg-accent text-black border-accent'
                      : 'bg-surface-2 border-border text-muted hover:text-foreground hover:border-border-2'
                  }`}
                >
                  {inst.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grupos */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Grupos
            {selectedGroups.length > 0 && <span className="text-accent ml-2 normal-case">{selectedGroups.length} selecionado(s)</span>}
          </label>
          {selectedInstances.length === 0 ? (
            <div className="bg-surface-2 border border-border rounded-xl px-4 py-5 text-center text-sm text-muted">
              Selecione uma instância primeiro
            </div>
          ) : loadingGroups ? (
            <div className="bg-surface-2 border border-border rounded-xl px-4 py-5 text-center text-sm text-muted flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" />
              Carregando grupos...
            </div>
          ) : (
            <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                <svg width="13" height="13" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar grupo..."
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
                />
                <button
                  onClick={toggleAllGroups}
                  className="text-xs text-accent hover:text-accent-hover transition-colors whitespace-nowrap"
                >
                  {filteredGroups.every(g => selectedGroups.includes(g.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-border">
                {filteredGroups.length === 0 && (
                  <div className="px-4 py-4 text-muted text-sm text-center">Nenhum grupo encontrado</div>
                )}
                {filteredGroups.map(g => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="accent-accent w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm text-foreground flex-1 truncate">{g.subject}</span>
                    {g.size != null && (
                      <span className="text-[11px] text-muted flex-shrink-0">{g.size} part.</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mensagem */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">Mensagem</label>
          <textarea
            placeholder="Digite a mensagem aqui..."
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            rows={5}
            className="input resize-none"
          />
          <p className="text-xs text-muted mt-1.5">{mensagem.length} caracteres</p>
        </div>

        {/* Imagem */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Imagem <span className="normal-case">(opcional)</span>
          </label>
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
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
                <p className="text-sm text-muted">Arraste uma imagem ou clique para selecionar</p>
                <p className="text-xs text-muted mt-0.5">PNG, JPG, GIF, WEBP</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Mencionar todos */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setMentionAll(!mentionAll)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${mentionAll ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mentionAll ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-secondary">Mencionar todos (@todos)</span>
        </label>

        {/* Data/hora */}
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-2">
            Data e hora <span className="normal-case">(BRT — UTC-3)</span>
          </label>
          <input
            type="datetime-local"
            value={agendadoPara}
            onChange={e => setAgendadoPara(e.target.value)}
            className="input w-auto"
          />
        </div>

        {/* Intervalo info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border border-border rounded-xl">
          <svg width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-muted">Intervalo aleatório de 40–60s entre cada grupo</p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => handleSend(true)}
            disabled={sending}
            className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
          >
            {sending ? (uploading ? 'Enviando imagem...' : 'Agendando...') : 'Enviar Agora'}
          </button>
          <button
            onClick={() => handleSend(false)}
            disabled={sending}
            className="btn-primary flex-1 py-2.5"
          >
            {sending ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
