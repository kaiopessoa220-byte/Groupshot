import { useEffect, useState } from 'react'
import { fetchHistory } from '../lib/api'
import type { Disparo } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Historico() {
  const [disparos, setDisparos] = useState<Disparo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetchHistory()
      .then(setDisparos)
      .catch(() => setError('Erro ao carregar histórico'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const fmt = (iso: string) =>
    format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  if (loading) return (
    <div className="p-6 text-muted text-sm">Carregando histórico...</div>
  )

  if (error) return (
    <div className="p-6">
      <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Histórico</h1>
          <p className="text-muted text-sm">{disparos.length} disparo(s) registrado(s)</p>
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

      {disparos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
          <p className="text-muted text-sm">Nenhum disparo ainda.</p>
          <p className="text-muted text-xs mt-1">Crie um novo disparo para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disparos.map((d) => (
            <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
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

                  {/* Barra de progresso */}
                  {d.total_grupos > 0 && (
                    <div className="w-24 flex-shrink-0">
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>{Math.round((d.enviados / d.total_grupos) * 100)}%</span>
                        <span>{d.enviados}/{d.total_grupos}</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${(d.enviados / d.total_grupos) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <svg
                    width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"
                    className={`flex-shrink-0 transition-transform ${expanded === d.id ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Detalhes dos itens */}
              {expanded === d.id && d.disparo_itens && d.disparo_itens.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {d.disparo_itens.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">{item.group_name || item.group_id}</p>
                        <p className="text-xs text-muted">{item.instancia} · {fmt(item.send_at)}</p>
                        {item.erro && <p className="text-xs text-red-400 mt-0.5">{item.erro}</p>}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              )}
              {expanded === d.id && (!d.disparo_itens || d.disparo_itens.length === 0) && (
                <div className="border-t border-border px-5 py-4 text-muted text-sm">
                  Sem detalhes de itens disponíveis.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
