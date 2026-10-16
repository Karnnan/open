import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../lib/supabase'

const DEFAULTS = {
  content: '',
  is_completed: false,
  is_pinned: false,
  priority: 'medium',
  category: 'General',
  color_tag: '#6366f1',
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const time = (row) => Date.parse(row?.updated_at ?? 0) || 0

/** Insert or replace a row by id. */
function upsert(list, row) {
  const i = list.findIndex((x) => x.id === row.id)
  if (i === -1) return [row, ...list]
  const next = list.slice()
  next[i] = row
  return next
}

/** Replace a row by id only if it is still in the list. */
function replace(list, row) {
  return list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : list
}

/** Apply a realtime row unless we already hold a newer version of it. */
function mergeRemote(list, row) {
  const current = list.find((x) => x.id === row.id)
  if (current && time(current) > time(row)) return list
  return upsert(list, row)
}

/**
 * Loads all items, keeps them in sync through Supabase Realtime and exposes
 * optimistic mutations. Mutations throw on failure after rolling back.
 */
export function useItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connection, setConnection] = useState('connecting')

  const itemsRef = useRef(items)
  itemsRef.current = items

  // Ids with a write in flight. Realtime echoes for them are ignored and the
  // server response of the last write wins, so rapid edits never flicker.
  const pending = useRef(new Map())
  const begin = (id) => pending.current.set(id, (pending.current.get(id) ?? 0) + 1)
  const end = (id) => {
    const n = (pending.current.get(id) ?? 1) - 1
    if (n > 0) pending.current.set(id, n)
    else pending.current.delete(id)
  }
  const isLastWrite = (id) => pending.current.get(id) === 1

  // Ids this tab deleted. Their realtime DELETE echo is skipped so a late echo
  // cannot remove an item that was restored with Undo in the meantime.
  const ownDeletes = useRef(new Set())
  const markOwnDelete = (id) => {
    ownDeletes.current.add(id)
    setTimeout(() => ownDeletes.current.delete(id), 15_000)
  }

  const load = useCallback(async () => {
    try {
      setItems(await api.getItems())
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    let subscribedBefore = false
    load()

    const unsubscribe = api.subscribeToItems({
      onInsert: (row) => {
        if (!pending.current.has(row.id)) setItems((l) => mergeRemote(l, row))
      },
      onUpdate: (row) => {
        if (!pending.current.has(row.id)) setItems((l) => mergeRemote(l, row))
      },
      onDelete: (id) => {
        if (ownDeletes.current.delete(id) || pending.current.has(id)) return
        setItems((l) => l.filter((x) => x.id !== id))
      },
      onStatus: (status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setConnection('live')
          // Catch up on anything that changed while we were disconnected.
          if (subscribedBefore) load()
          subscribedBefore = true
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('offline')
        }
      },
    })

    const onOffline = () => setConnection('offline')
    const onOnline = () => {
      setConnection('connecting')
      load()
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  const insertRow = useCallback(async (row, payload) => {
    begin(row.id)
    setItems((l) => upsert(l, row))
    try {
      const saved = await api.addItem(payload)
      if (isLastWrite(row.id)) setItems((l) => upsert(l, saved))
      return saved
    } catch (e) {
      setItems((l) => l.filter((x) => x.id !== row.id))
      throw e
    } finally {
      end(row.id)
    }
  }, [])

  const add = useCallback(
    (fields) => {
      const now = new Date().toISOString()
      const row = { ...DEFAULTS, ...fields, id: newId(), created_at: now, updated_at: now }
      const { created_at, updated_at, ...payload } = row
      return insertRow(row, payload)
    },
    [insertRow],
  )

  /** Re-insert a deleted item with its original id and creation time (undo). */
  const restore = useCallback(
    (item) => {
      const { updated_at, ...payload } = item
      return insertRow(item, payload)
    },
    [insertRow],
  )

  const update = useCallback(async (id, patch) => {
    const prev = itemsRef.current.find((x) => x.id === id)
    if (!prev) return
    begin(id)
    setItems((l) => replace(l, { ...prev, ...l.find((x) => x.id === id), ...patch }))
    try {
      const saved = await api.updateItem(id, patch)
      if (isLastWrite(id)) setItems((l) => replace(l, saved))
      return saved
    } catch (e) {
      setItems((l) => replace(l, prev))
      throw e
    } finally {
      end(id)
    }
  }, [])

  const remove = useCallback(async (id) => {
    const prev = itemsRef.current.find((x) => x.id === id)
    if (!prev) return null
    begin(id)
    setItems((l) => l.filter((x) => x.id !== id))
    try {
      markOwnDelete(id)
      await api.deleteItem(id)
      return prev
    } catch (e) {
      ownDeletes.current.delete(id)
      setItems((l) => upsert(l, prev))
      throw e
    } finally {
      end(id)
    }
  }, [])

  return { items, loading, error, connection, reload: load, add, update, remove, restore }
}
