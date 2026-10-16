import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null

const TABLE = 'items'

// Columns the client is allowed to write; anything else is ignored.
const WRITABLE = [
  'id',
  'title',
  'content',
  'type',
  'is_completed',
  'priority',
  'category',
  'color_tag',
  'is_pinned',
  'created_at',
]

function pickWritable(fields) {
  const out = {}
  for (const k of WRITABLE) if (fields[k] !== undefined) out[k] = fields[k]
  return out
}

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export async function getItems() {
  return unwrap(
    await supabase
      .from(TABLE)
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
  )
}

export async function addItem(item) {
  return unwrap(await supabase.from(TABLE).insert(pickWritable(item)).select().single())
}

export async function updateItem(id, patch) {
  return unwrap(
    await supabase.from(TABLE).update(pickWritable(patch)).eq('id', id).select().single(),
  )
}

export function toggleItem(id, isCompleted) {
  return updateItem(id, { is_completed: isCompleted })
}

export async function deleteItem(id) {
  unwrap(await supabase.from(TABLE).delete().eq('id', id))
}

/** True when the error means the `items` table has not been created yet. */
export function isMissingTableError(error) {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

export function subscribeToItems({ onInsert, onUpdate, onDelete, onStatus }) {
  // A unique topic per subscription avoids reusing a channel that is still
  // being torn down (React StrictMode mounts effects twice in development).
  const channel = supabase
    .channel(`items-live-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (p) =>
      onInsert(p.new),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE }, (p) =>
      onUpdate(p.new),
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (p) =>
      onDelete(p.old.id),
    )
    .subscribe((status) => onStatus(status))

  return () => {
    supabase.removeChannel(channel)
  }
}
