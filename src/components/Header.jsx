import { Check, Moon, Sun } from 'lucide-react'

const STATUS = {
  live: { label: 'Live', title: 'Connected to Supabase Realtime' },
  connecting: { label: 'Connecting…', title: 'Connecting to Supabase Realtime' },
  offline: {
    label: 'Offline',
    title: 'Realtime disconnected. The list refreshes when the connection returns',
  },
}

export default function Header({ connection, stats, theme, onToggleTheme }) {
  const status = STATUS[connection] ?? STATUS.connecting

  return (
    <header className="header">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          <Check size={18} strokeWidth={3} />
        </div>
        <div>
          <h1>open</h1>
          <p>notes &amp; to-dos</p>
        </div>
      </div>

      <div className="header-right">
        <dl className="stats">
          <div>
            <dt>Notes</dt>
            <dd>{stats.notes}</dd>
          </div>
          <div>
            <dt>Tasks done</dt>
            <dd>
              {stats.done}/{stats.todos}
            </dd>
          </div>
        </dl>
        <span className={`status-pill ${connection}`} title={status.title} role="status">
          <span className="dot" />
          {status.label}
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
