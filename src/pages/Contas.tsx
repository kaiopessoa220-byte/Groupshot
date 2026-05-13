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

  if (loading) return <div className="p-6 text-muted text-sm">Carregando contas...</div>
  if (error) return (
    <div className="p-6">
      <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
    </div>
  )

  const connected = instances.filter((i) => i.connectionStatus === 'open')
  const disconnected = instances.filter((i) => i.connectionStatus !== 'open')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Contas</h1>
          <p className="text-muted text-sm">
            {connected.length} conectada(s) · {disconnected.length} desconectada(s)
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
          <p className="text-muted text-sm">Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((inst) => {
            const isOpen = inst.connectionStatus === 'open'
            return (
              <div key={inst.name} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-400' : 'bg-zinc-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{inst.name}</p>
                    {inst.ownerJid && (
                      <p className="text-xs text-muted mt-0.5">
                        {inst.ownerJid.replace('@s.whatsapp.net', '').replace('@c.us', '')}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
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
      )}
    </div>
  )
}
