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
    <div className="p-8 flex items-center gap-2 text-muted text-sm">
      <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
      Carregando histórico...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1.5">Registro</p>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Histórico</h1>
        </div>
        <button
          onClick={load}
          className="btn-secondary flex items-center gap-2"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {disparos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" fill="none" stroke="#71717a" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhum disparo</p>
          <p className="text-xs text-muted">Crie um novo disparo para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {disparos.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{d.nome}</span>
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
                        <span>{d.enviados}/{d.total_grupos}</span>
                      </div>
                      <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(d.enviados / d.total_grupos) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <svg
                    width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"
                    className={`flex-shrink-0 transition-transform mt-0.5 ${expanded === d.id ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expanded === d.id && d.disparo_itens && d.disparo_itens.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {d.disparo_itens.map(item => (
                    <div key={item.id} className="px-5 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">{item.group_name || item.group_id}</p>
                        <p className="text-xs text-muted mt-0.5">{item.instancia} · {fmt(item.send_at)}</p>
                        {item.erro && <p className="text-xs text-red-400 mt-0.5">{item.erro}</p>}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              )}
              {expanded === d.id && (!d.disparo_itens || d.disparo_itens.length === 0) && (
                <div className="border-t border-border px-5 py-4 text-muted text-sm">
                  Sem detalhes disponíveis.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
