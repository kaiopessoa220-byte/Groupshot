import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchInstances, fetchGroups, dispatch, uploadImage } from '../lib/api'
import type { Instance, Group } from '../lib/api'

export default function NovoDisparo() {
  const navigate = useNavigate()

  // dados remotos
  const [instances, setInstances] = useState<Instance[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingInst, setLoadingInst] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(false)

  // seleção
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  // campos
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [mentionAll, setMentionAll] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [groupSearch, setGroupSearch] = useState('')

  const dropRef = useRef<HTMLDivElement>(null)
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
    const inst = selectedInstances[0]
    fetchGroups(inst)
      .then(setGroups)
      .catch(() => setError('Erro ao carregar grupos'))
      .finally(() => setLoadingGroups(false))
  }, [selectedInstances])

  const toggleInstance = (name: string) => {
    setSelectedInstances((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    )
    setSelectedGroups([])
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const toggleAllGroups = () => {
    const visible = filteredGroups.map((g) => g.id)
    const allSelected = visible.every((id) => selectedGroups.includes(id))
    if (allSelected) {
      setSelectedGroups((prev) => prev.filter((id) => !visible.includes(id)))
    } else {
      setSelectedGroups((prev) => [...new Set([...prev, ...visible])])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
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

      const baseTime = sendNow
        ? new Date().toISOString()
        : new Date(agendadoPara).toISOString()

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

  const filteredGroups = groups.filter((g) =>
    g.subject.toLowerCase().includes(groupSearch.toLowerCase())
  )

  const connectedInstances = instances.filter((i) => i.connectionStatus === 'open')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Novo Disparo</h1>
      <p className="text-muted text-sm mb-6">Configure e envie mensagens para grupos WhatsApp</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Nome do disparo</label>
          <input
            type="text"
            placeholder="Ex: Promoção maio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Instâncias */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Instâncias <span className="text-muted text-xs">(selecione uma ou mais)</span>
          </label>
          {loadingInst ? (
            <div className="text-muted text-sm">Carregando instâncias...</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {connectedInstances.length === 0 && (
                <span className="text-muted text-sm">Nenhuma instância conectada</span>
              )}
              {connectedInstances.map((inst) => (
                <button
                  key={inst.name}
                  onClick={() => toggleInstance(inst.name)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    selectedInstances.includes(inst.name)
                      ? 'bg-accent text-black border-accent'
                      : 'bg-card border-border text-muted hover:text-white hover:border-zinc-500'
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
          <label className="block text-sm font-medium mb-1.5">
            Grupos{' '}
            {selectedGroups.length > 0 && (
              <span className="text-accent text-xs">{selectedGroups.length} selecionado(s)</span>
            )}
          </label>

          {selectedInstances.length === 0 ? (
            <div className="bg-card border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
              Selecione uma instância primeiro
            </div>
          ) : loadingGroups ? (
            <div className="bg-card border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
              Carregando grupos...
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <svg width="14" height="14" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar grupo..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none"
                />
                <button
                  onClick={toggleAllGroups}
                  className="text-xs text-accent hover:underline ml-2 whitespace-nowrap"
                >
                  {filteredGroups.every((g) => selectedGroups.includes(g.id))
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-border">
                {filteredGroups.length === 0 && (
                  <div className="px-4 py-4 text-muted text-sm text-center">Nenhum grupo encontrado</div>
                )}
                {filteredGroups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="text-sm text-white">{g.subject}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mensagem */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Mensagem</label>
          <textarea
            placeholder="Digite a mensagem aqui..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
          />
          <p className="text-xs text-muted mt-1">{mensagem.length} caracteres</p>
        </div>

        {/* Upload imagem */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Imagem <span className="text-muted text-xs">(opcional)</span></label>
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
          >
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="max-h-32 rounded mx-auto" />
                <button
                  onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <div className="text-muted text-sm">Arraste uma imagem ou clique para selecionar</div>
                <div className="text-muted text-xs mt-1">PNG, JPG, GIF, WEBP</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Mencionar todos */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setMentionAll(!mentionAll)}
            className={`relative w-10 h-5 rounded-full transition-colors ${mentionAll ? 'bg-accent' : 'bg-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${mentionAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm">Mencionar todos (@todos)</span>
        </label>

        {/* Data/hora */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Data e hora <span className="text-muted text-xs">(BRT — UTC-3)</span></label>
          <input
            type="datetime-local"
            value={agendadoPara}
            onChange={(e) => setAgendadoPara(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Info intervalo */}
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg">
          <span className="text-sm">🎲</span>
          <span className="text-sm text-muted">Intervalo aleatório de 40–60s entre cada grupo</span>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSend(true)}
            disabled={sending}
            className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
          >
            {sending ? (uploading ? 'Enviando imagem...' : 'Agendando...') : 'Enviar Agora'}
          </button>
          <button
            onClick={() => handleSend(false)}
            disabled={sending}
            className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold text-sm transition-colors"
          >
            {sending ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
