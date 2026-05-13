import { NavLink } from 'react-router-dom'

const nav = [
  {
    to: '/visao-geral',
    label: 'Visão Geral',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    to: '/campanhas',
    label: 'Campanhas',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>,
  },
  {
    to: '/novo-disparo',
    label: 'Novo Disparo',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  },
  {
    to: '/historico',
    label: 'Histórico',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  },
  {
    to: '/contas',
    label: 'Contas',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a6 6 0 100-12 6 6 0 000 12zm0 0v3m-4-1.5l2-2.5m4 2.5l-2-2.5M3 12H1m4.22-6.36L3.76 4.2M12 3V1m6.36 4.22l1.44-1.44M21 12h2m-4.22 6.36l1.44 1.44"/></svg>,
  },
]

export default function Sidebar() {
  return (
    <aside className="w-[220px] min-h-screen bg-surface border-r border-border flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span className="font-semibold text-white text-[15px] tracking-tight">GroupShot</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border mb-3" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-white hover:bg-surface-2'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-4 h-px bg-border mt-3" />
      <div className="px-5 py-4 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-secondary">K</span>
        </div>
        <div>
          <p className="text-[13px] font-medium text-white leading-none">Kaio</p>
          <p className="text-[11px] text-muted mt-0.5">Nuvant Performance</p>
        </div>
      </div>
    </aside>
  )
}
