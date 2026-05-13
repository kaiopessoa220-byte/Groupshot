import { useEffect, useState } from 'react'
import { fetchInstances } from '../lib/api'
import type { Instance } from '../lib/api'

export default function Contas() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetchInstances()
      .then(setInstances)
      .catch(() => setError('Erro ao carregar instâncias'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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

  const connected = instances.filter(i => i.connectionStatus === 'open')
  const disconnected = instances.filter(i => i.connectionStatus !== 'open')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1.5">WhatsApp</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Contas</h1>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Summary chips */}
      {instances.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-green-400 font-medium">{connected.length} conectada(s)</span>
          </div>
          {disconnected.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500/10 border border-zinc-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span className="text-xs text-zinc-400 font-medium">{disconnected.length} desconectada(s)</span>
            </div>
          )}
        </div>
      )}

      {instances.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" fill="none" stroke="#71717a" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a6 6 0 100-12 6 6 0 000 12zm0 0v3m-4-1.5l2-2.5m4 2.5l-2-2.5M3 12H1m4.22-6.36L3.76 4.2M12 3V1m6.36 4.22l1.44-1.44M21 12h2m-4.22 6.36l1.44 1.44" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white mb-1">Nenhuma instância</p>
          <p className="text-xs text-muted">Configure instâncias na Evolution API.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_120px] items-center px-5 py-2.5 border-b border-border">
            <span className="text-xs text-muted">Instância</span>
            <span className="text-xs text-muted">Status</span>
          </div>
          <div className="divide-y divide-border">
            {instances.map(inst => {
              const isOpen = inst.connectionStatus === 'open'
              return (
                <div key={inst.name} className="grid grid-cols-[1fr_120px] items-center px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-400' : 'bg-zinc-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{inst.name}</p>
                      {inst.ownerJid && (
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {inst.ownerJid.replace('@s.whatsapp.net', '').replace('@c.us', '')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium w-fit ${
                    isOpen
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                    {isOpen ? 'Conectada' : inst.connectionStatus}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
