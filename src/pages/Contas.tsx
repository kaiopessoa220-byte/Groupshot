import { useEffect, useRef, useState } from 'react'
import { fetchInstances, fetchQRCode, createInstance, fetchProfilePicture } from '../lib/api'
import type { Instance } from '../lib/api'

type Tab = 'all' | 'connected' | 'disconnected'

export default function Contas() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [pics, setPics] = useState<Record<string, string>>({})

  const [qrInstance, setQrInstance] = useState<string | null>(null)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrConnected, setQrConnected] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showNova, setShowNova] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [criarErro, setCriarErro] = useState('')

  const load = () => {
    setLoading(true)
    fetchInstances()
      .then(list => {
        setInstances(list)
        list.forEach(inst => {
          if (!inst.ownerJid) return
          fetchProfilePicture(inst.name, inst.ownerJid)
            .then(url => { if (url) setPics(prev => ({ ...prev, [inst.name]: url })) })
            .catch(() => {})
        })
      })
      .catch(() => setError('Erro ao carregar instâncias'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!qrInstance) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const list = await fetchInstances()
        const inst = list.find(i => i.name === qrInstance)
        if (inst?.connectionStatus === 'open') {
          setQrConnected(true)
          setInstances(list)
          clearInterval(pollRef.current!)
        }
      } catch { /* ignora */ }
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [qrInstance])

  const openQR = async (name: string) => {
    setQrInstance(name)
    setQrConnected(false)
    setQrBase64(null)
    setQrLoading(true)
    try {
      const data = await fetchQRCode(name)
      setQrBase64(data.base64)
    } catch {
      setQrBase64(null)
    } finally {
      setQrLoading(false)
    }
  }

  const closeQR = () => {
    setQrInstance(null)
    setQrBase64(null)
    setQrConnected(false)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const handleCriarInstancia = async () => {
    const nome = novoNome.trim()
    if (!nome) return
    setCriando(true)
    setCriarErro('')
    try {
      await createInstance(nome)
      setNovoNome('')
      setShowNova(false)
      await openQR(nome)
      load()
    } catch (e: unknown) {
      setCriarErro(e instanceof Error ? e.message : 'Erro ao criar instância')
    } finally {
      setCriando(false)
    }
  }

  const filtered = instances
    .filter(i => {
      if (tab === 'connected') return i.connectionStatus === 'open'
      if (tab === 'disconnected') return i.connectionStatus !== 'open'
      return true
    })
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    all: instances.length,
    connected: instances.filter(i => i.connectionStatus === 'open').length,
    disconnected: instances.filter(i => i.connectionStatus !== 'open').length,
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-muted text-sm">
      <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
      Carregando contas...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Contas</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button
            onClick={() => { setShowNova(true); setCriarErro('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-black transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Conta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border mb-6">
        {([
          { key: 'all', label: 'Todas' },
          { key: 'connected', label: 'Conectadas' },
          { key: 'disconnected', label: 'Desconectadas' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-accent/70' : 'text-muted/50'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-white mb-1">Nenhuma instância</p>
          <p className="text-xs text-muted">Configure instâncias na Evolution API.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(inst => {
            const isOpen = inst.connectionStatus === 'open'
            const pic = pics[inst.name]
            const phone = inst.ownerJid
              ? '+' + inst.ownerJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
              : null

            return (
              <div
                key={inst.name}
                className="bg-card border border-border rounded-xl flex items-center gap-3.5 px-4 py-3.5 hover:border-border-2 transition-colors"
              >
                {pic ? (
                  <img
                    src={pic}
                    alt={inst.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                    {inst.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate mb-1">{inst.name}</p>
                  <div className="flex items-center gap-1.5">
                    {isOpen ? (
                      <>
                        <span className="relative w-2 h-2 flex-shrink-0">
                          <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                          <span className="relative block w-2 h-2 rounded-full bg-green-400" />
                        </span>
                        <span className="text-xs text-muted truncate">{phone ?? 'Conectada'}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
                        <span className="text-xs text-muted truncate">{phone ?? 'Desconectada'}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isOpen && (
                    <button
                      onClick={() => openQR(inst.name)}
                      title="Conectar via QR Code"
                      className="p-2 text-muted hover:text-accent transition-colors rounded-lg hover:bg-accent/10"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path strokeLinecap="round" d="M14 14h2m3 0h1m-3 3v1m0 3h1m3-4v4h-3" />
                      </svg>
                    </button>
                  )}
                  <button title="Configurações" className="p-2 text-muted hover:text-zinc-300 transition-colors rounded-lg hover:bg-surface-2">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" />
                      <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                  </button>
                  <button title="Detalhes" className="p-2 text-muted hover:text-zinc-300 transition-colors rounded-lg hover:bg-surface-2">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nova Instância */}
      {showNova && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-modal">
            <h2 className="text-base font-semibold mb-1">Nova instância</h2>
            <p className="text-xs text-muted mb-5">
              Crie uma nova instância WhatsApp. Após criar, o QR Code será gerado automaticamente.
            </p>
            <input
              type="text"
              placeholder="Nome da instância (ex: vendas, suporte)"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCriarInstancia()}
              autoFocus
              className="input mb-3"
            />
            {criarErro && <p className="text-xs text-red-400 mb-3">{criarErro}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowNova(false); setNovoNome(''); setCriarErro('') }} className="btn-secondary flex-1 py-2.5">Cancelar</button>
              <button onClick={handleCriarInstancia} disabled={criando || !novoNome.trim()} className="btn-primary flex-1 py-2.5">
                {criando ? 'Criando...' : 'Criar e conectar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrInstance && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-modal text-center">
            {qrConnected ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-white mb-1">Conectado!</p>
                <p className="text-sm text-muted mb-5">{qrInstance} está online agora.</p>
                <button onClick={closeQR} className="btn-primary w-full py-2.5">Fechar</button>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-white mb-1">Conectar {qrInstance}</p>
                <p className="text-xs text-muted mb-5">Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
                <div className="flex items-center justify-center mb-5" style={{ minHeight: 220 }}>
                  {qrLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
                      <p className="text-xs text-muted">Gerando QR Code...</p>
                    </div>
                  ) : qrBase64 ? (
                    <img src={qrBase64} alt="QR Code" className="w-52 h-52 rounded-xl border border-border" />
                  ) : (
                    <div className="text-sm text-muted">Não foi possível gerar o QR Code.</div>
                  )}
                </div>
                <p className="text-xs text-muted mb-5 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Aguardando conexão...
                </p>
                <div className="flex gap-2">
                  <button onClick={closeQR} className="btn-secondary flex-1 py-2.5">Cancelar</button>
                  <button onClick={() => openQR(qrInstance)} disabled={qrLoading} className="btn-secondary flex-1 py-2.5">Atualizar QR</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
