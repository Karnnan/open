import { useState } from 'react'
import { Check, Copy, Database, ExternalLink, KeyRound, RefreshCw } from 'lucide-react'
import migrationSql from '../../supabase/migrations/001_create_items.sql?raw'

function sqlEditorUrl() {
  const ref = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(import.meta.env.VITE_SUPABASE_URL ?? '')?.[1]
  return ref
    ? `https://supabase.com/dashboard/project/${ref}/sql/new`
    : 'https://supabase.com/dashboard'
}

export default function SetupScreen({ kind, onRetry }) {
  const [copied, setCopied] = useState(false)

  if (kind === 'env') {
    return (
      <div className="setup glass">
        <KeyRound size={28} className="setup-icon" />
        <h2>Connect Supabase</h2>
        <p>
          The app needs two environment variables. Add them to <code>.env.local</code> for local
          development, or under <em>Site configuration → Environment variables</em> in Netlify, then
          rebuild.
        </p>
        <pre>{'VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<publishable key>'}</pre>
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(migrationSql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="setup glass">
      <Database size={28} className="setup-icon" />
      <h2>One-time database setup</h2>
      <p>
        Supabase is connected, but the <code>items</code> table doesn&apos;t exist yet. Copy the
        migration, paste it into the Supabase SQL editor and press <em>Run</em>.
      </p>
      <div className="setup-actions">
        <button type="button" className="btn-primary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy SQL'}
        </button>
        <a className="btn-ghost" href={sqlEditorUrl()} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open SQL editor
        </a>
        <button type="button" className="btn-ghost" onClick={onRetry}>
          <RefreshCw size={16} /> Check again
        </button>
      </div>
      <details>
        <summary>View SQL</summary>
        <pre>{migrationSql}</pre>
      </details>
    </div>
  )
}
