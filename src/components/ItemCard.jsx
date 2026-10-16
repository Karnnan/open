import { useState } from 'react'
import { Check, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import ItemOptions from './ItemOptions'
import { fullDate, timeAgo } from '../lib/format'

function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>
}

function Meta({ item }) {
  return (
    <div className="meta">
      <PriorityBadge priority={item.priority} />
      {item.category && <span className="category">{item.category}</span>}
      <time dateTime={item.created_at} title={fullDate(item.created_at)}>
        {timeAgo(item.created_at)}
      </time>
    </div>
  )
}

function ItemActions({ item, onPin, onEdit, onDelete }) {
  return (
    <div className="item-actions">
      <button
        type="button"
        className={`icon-btn sm ${item.is_pinned ? 'pinned' : ''}`}
        onClick={onPin}
        aria-label={item.is_pinned ? 'Unpin' : 'Pin to top'}
        title={item.is_pinned ? 'Unpin' : 'Pin to top'}
      >
        {item.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
      </button>
      <button type="button" className="icon-btn sm" onClick={onEdit} aria-label="Edit" title="Edit">
        <Pencil size={15} />
      </button>
      <button
        type="button"
        className="icon-btn sm danger"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function ItemEditor({ item, categories, onSave, onCancel }) {
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content ?? '')
  const [options, setOptions] = useState({
    priority: item.priority,
    category: item.category ?? '',
    color_tag: item.color_tag,
  })

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onSave({
      title: trimmed,
      content: content.trim(),
      priority: options.priority,
      category: options.category.trim() || 'General',
      color_tag: options.color_tag,
    })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onCancel()
    else if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className="editor" onKeyDown={onKeyDown}>
      <input
        className="editor-title"
        value={title}
        maxLength={200}
        aria-label="Title"
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="editor-content"
        value={content}
        rows={item.type === 'note' ? 5 : 2}
        placeholder={item.type === 'note' ? 'Write something…' : 'Details (optional)'}
        aria-label="Content"
        onChange={(e) => setContent(e.target.value)}
      />
      <ItemOptions
        value={options}
        onChange={setOptions}
        categories={categories}
        idPrefix={`edit-${item.id}`}
      />
      <div className="editor-actions">
        <span className="hint">Enter to save · Esc to cancel</span>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={save} disabled={!title.trim()}>
          Save
        </button>
      </div>
    </div>
  )
}

function useEditing(onUpdate) {
  const [editing, setEditing] = useState(false)
  return {
    editing,
    start: () => setEditing(true),
    cancel: () => setEditing(false),
    save: (patch) => {
      setEditing(false)
      onUpdate(patch)
    },
  }
}

export function TodoItem({ item, categories, onUpdate, onDelete }) {
  const edit = useEditing(onUpdate)

  return (
    <div
      className={`todo glass ${item.is_completed ? 'done' : ''} ${item.is_pinned ? 'is-pinned' : ''}`}
      style={{ '--accent': item.color_tag }}
    >
      {edit.editing ? (
        <ItemEditor item={item} categories={categories} onSave={edit.save} onCancel={edit.cancel} />
      ) : (
        <>
          <button
            type="button"
            role="checkbox"
            aria-checked={item.is_completed}
            aria-label={item.is_completed ? 'Mark as not done' : 'Mark as done'}
            className="check"
            onClick={() => onUpdate({ is_completed: !item.is_completed })}
          >
            <Check size={14} strokeWidth={3} />
          </button>
          <div className="todo-body" onDoubleClick={edit.start}>
            <span className="todo-title">{item.title}</span>
            {item.content && <p className="todo-content">{item.content}</p>}
            <Meta item={item} />
          </div>
          <ItemActions
            item={item}
            onPin={() => onUpdate({ is_pinned: !item.is_pinned })}
            onEdit={edit.start}
            onDelete={onDelete}
          />
        </>
      )}
    </div>
  )
}

export function NoteCard({ item, categories, onUpdate, onDelete }) {
  const edit = useEditing(onUpdate)
  const [expanded, setExpanded] = useState(false)
  const content = item.content ?? ''
  const isLong = content.length > 280 || content.split('\n').length > 6

  return (
    <article
      className={`note glass ${item.is_pinned ? 'is-pinned' : ''}`}
      style={{ '--accent': item.color_tag }}
    >
      {edit.editing ? (
        <ItemEditor item={item} categories={categories} onSave={edit.save} onCancel={edit.cancel} />
      ) : (
        <>
          <div className="note-head">
            <h3 onDoubleClick={edit.start}>{item.title}</h3>
            {item.is_pinned && <Pin size={14} className="pin-mark" aria-label="Pinned" />}
          </div>
          {content && (
            <p
              className={`note-content ${isLong && !expanded ? 'clamped' : ''}`}
              onDoubleClick={edit.start}
            >
              {content}
            </p>
          )}
          {isLong && (
            <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          <div className="note-foot">
            <Meta item={item} />
            <ItemActions
              item={item}
              onPin={() => onUpdate({ is_pinned: !item.is_pinned })}
              onEdit={edit.start}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </article>
  )
}
