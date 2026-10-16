import { useEffect, useMemo, useRef, useState } from 'react'
import { Inbox, RefreshCw, SearchX, TriangleAlert } from 'lucide-react'
import Header from './components/Header'
import QuickAddBar from './components/QuickAddBar'
import FilterBar from './components/FilterBar'
import SetupScreen from './components/SetupScreen'
import { NoteCard, TodoItem } from './components/ItemCard'
import { ToastStack, useToasts } from './components/Toasts'
import { useItems } from './hooks/useItems'
import { isConfigured, isMissingTableError } from './lib/supabase'
import { truncate } from './lib/format'

const DEFAULT_FILTERS = { search: '', status: 'all', priority: 'all', category: 'all' }

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode); preferences just won't persist.
  }
}

function useTheme() {
  const [theme, setTheme] = useState(() => readPref('open:theme', 'dark'))
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b0d17' : '#f4f5fb')
    writePref('open:theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

function matches(item, view, f, query) {
  if (view !== 'all' && item.type !== view) return false
  if (f.priority !== 'all' && item.priority !== f.priority) return false
  if (f.category !== 'all' && item.category !== f.category) return false
  if (view !== 'note') {
    const done = item.type === 'todo' && item.is_completed
    if (f.status === 'completed' && !done) return false
    if (f.status === 'active' && done) return false
  }
  if (query && !`${item.title}\n${item.content ?? ''}`.toLowerCase().includes(query)) return false
  return true
}

function byOrder(view) {
  const created = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  return view === 'todo'
    ? (a, b) => a.is_completed - b.is_completed || b.is_pinned - a.is_pinned || created(a, b)
    : (a, b) => b.is_pinned - a.is_pinned || created(a, b)
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  if (!isConfigured) {
    return (
      <div className="app">
        <SetupScreen kind="env" />
      </div>
    )
  }
  return <NotesApp theme={theme} onToggleTheme={toggleTheme} />
}

function NotesApp({ theme, onToggleTheme }) {
  const { items, loading, error, connection, reload, add, update, remove, restore } = useItems()
  const { toasts, push, dismiss } = useToasts()
  const [view, setViewState] = useState(() => readPref('open:view', 'all'))
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const searchRef = useRef(null)
  const addRef = useRef(null)

  const setView = (v) => {
    setViewState(v)
    writePref('open:view', v)
  }
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }))

  // Re-render every minute so relative timestamps stay fresh.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  // "/" focuses search, "n" focuses quick add.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        addRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const todos = items.filter((i) => i.type === 'todo')
  const done = todos.filter((i) => i.is_completed).length
  const counts = { all: items.length, todo: todos.length, note: items.length - todos.length }

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items],
  )

  // A category filter that no longer exists (its last item was deleted) falls back to "all".
  const effective = categories.includes(filters.category) ? filters : { ...filters, category: 'all' }
  const query = effective.search.trim().toLowerCase()
  const visible = items.filter((i) => matches(i, view, effective, query)).sort(byOrder(view))
  const filtering = query || effective.priority !== 'all' || effective.category !== 'all' ||
    (view !== 'note' && effective.status !== 'all')

  const fail = (verb) => (e) =>
    push({ tone: 'error', message: `Couldn't ${verb}: ${e?.message ?? 'network error'}`, duration: 6000 })

  const handleAdd = (fields) => add(fields).catch(fail('save'))
  const handleUpdate = (id) => (patch) => update(id, patch).catch(fail('update'))
  const handleDelete = (item) => () =>
    remove(item.id)
      .then((removed) => {
        if (!removed) return
        push({
          message: `Deleted “${truncate(removed.title)}”`,
          action: { label: 'Undo', onClick: () => restore(removed).catch(fail('restore')) },
          duration: 6000,
        })
      })
      .catch(fail('delete'))

  const renderItem = (item) => {
    const Card = item.type === 'todo' ? TodoItem : NoteCard
    return (
      <Card
        key={item.id}
        item={item}
        categories={categories}
        onUpdate={handleUpdate(item.id)}
        onDelete={handleDelete(item)}
      />
    )
  }

  if (error && isMissingTableError(error)) {
    return (
      <div className="app">
        <Header connection={connection} stats={{ notes: 0, todos: 0, done: 0 }} theme={theme} onToggleTheme={onToggleTheme} />
        <SetupScreen kind="table" onRetry={reload} />
      </div>
    )
  }

  let body
  if (loading) {
    body = (
      <div className="skeletons" aria-busy="true" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton glass" />
        ))}
      </div>
    )
  } else if (error) {
    body = (
      <div className="empty glass">
        <TriangleAlert size={28} />
        <h2>Couldn&apos;t load your items</h2>
        <p>{error.message}</p>
        <button type="button" className="btn-ghost" onClick={reload}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    )
  } else if (visible.length === 0) {
    body = filtering ? (
      <div className="empty glass">
        <SearchX size={28} />
        <h2>No matches</h2>
        <p>Nothing fits the current search and filters.</p>
        <button type="button" className="btn-ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Clear filters
        </button>
      </div>
    ) : (
      <div className="empty glass">
        <Inbox size={28} />
        <h2>{view === 'todo' ? 'No tasks yet' : view === 'note' ? 'No notes yet' : 'A clean slate'}</h2>
        <p>
          Type above and press <kbd>Enter</kbd>. Everything saves instantly and syncs to your other
          devices.
        </p>
      </div>
    )
  } else if (view === 'note') {
    body = <div className="masonry">{visible.map(renderItem)}</div>
  } else {
    body = <div className={view === 'todo' ? 'todo-list' : 'stream'}>{visible.map(renderItem)}</div>
  }

  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0

  return (
    <div className="app">
      <Header
        connection={connection}
        stats={{ notes: counts.note, todos: todos.length, done }}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <main>
        <QuickAddBar
          ref={addRef}
          defaultType={view === 'note' ? 'note' : 'todo'}
          categories={categories}
          onAdd={handleAdd}
        />
        <FilterBar
          ref={searchRef}
          view={view}
          counts={counts}
          filters={effective}
          categories={categories}
          onView={setView}
          onFilter={setFilter}
        />
        {view === 'todo' && todos.length > 0 && (
          <div className="progress glass">
            <div className="progress-text">
              <span>
                <strong>
                  {done} of {todos.length}
                </strong>{' '}
                completed
              </span>
              <span className="pct">{pct}%</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {body}
      </main>
      <footer className="footer">
        Press <kbd>n</kbd> to add · <kbd>/</kbd> to search · double-click an item to edit
      </footer>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
