type Status = 'agendado' | 'disparando' | 'concluido' | 'falhou' | 'pendente' | 'enviado'

const map: Record<Status, { label: string; cls: string }> = {
  agendado:   { label: 'Agendado',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  disparando: { label: 'Disparando', cls: 'bg-accent/20 text-accent border-accent/30' },
  concluido:  { label: 'Concluído',  cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  falhou:     { label: 'Falhou',     cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  pendente:   { label: 'Pendente',   cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  enviado:    { label: 'Enviado',    cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const s = map[status] ?? map.pendente
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  )
}
