type Status = 'agendado' | 'disparando' | 'concluido' | 'falhou' | 'pendente' | 'enviado'

const map: Record<Status, { label: string; dot: string; cls: string }> = {
  agendado:   { label: 'Agendado',   dot: 'bg-blue-400',    cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  disparando: { label: 'Disparando', dot: 'bg-accent animate-pulse', cls: 'text-accent bg-accent/10 border-accent/20' },
  concluido:  { label: 'Concluído',  dot: 'bg-green-400',   cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
  falhou:     { label: 'Falhou',     dot: 'bg-red-400',     cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  pendente:   { label: 'Pendente',   dot: 'bg-zinc-500',    cls: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  enviado:    { label: 'Enviado',    dot: 'bg-green-400',   cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const s = map[status] ?? map.pendente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}
