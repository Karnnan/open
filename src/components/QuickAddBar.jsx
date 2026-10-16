import { forwardRef, useState } from 'react'
import { Plus, SlidersHorizontal, SquareCheckBig, StickyNote } from 'lucide-react'
import ItemOptions from './ItemOptions'

const QuickAddBar = forwardRef(function QuickAddBar({ defaultType, categories, onAdd }, inputRef) {
  const [type, setType] = useState(defaultType)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [options, setOptions] = useState({ priority: 'medium', category: '', color_tag: '#6366f1' })
  const [showOptions, setShowOptions] = useState(false)
  const [lastDefault, setLastDefault] = useState(defaultType)

  // Follow the active view: Notes board → note, To-Do list → task.
  if (defaultType !== lastDefault) {
    setLastDefault(defaultType)
    setType(defaultType)
  }

  const submit = (e) => {
    e?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    onAdd({
      type,
      title: trimmed,
      content: type === 'note' ? content.trim() : '',
      priority: options.priority,
      category: options.category.trim() || 'General',
      color_tag: options.color_tag,
    })
    setTitle('')
    setContent('')
    inputRef.current?.focus()
  }

  return (
    <form className="quick-add glass" onSubmit={submit}>
      <div className="qa-row">
        <div className="segmented" role="radiogroup" aria-label="Item type">
          <button
            type="button"
            role="radio"
            aria-checked={type === 'todo'}
            className={type === 'todo' ? 'active' : ''}
            onClick={() => setType('todo')}
          >
            <SquareCheckBig size={15} /> To-Do
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={type === 'note'}
            className={type === 'note' ? 'active' : ''}
            onClick={() => setType('note')}
          >
            <StickyNote size={15} /> Note
          </button>
        </div>

        <input
          ref={inputRef}
          className="qa-input"
          placeholder={type === 'todo' ? 'Add a task and press Enter…' : 'Note title…'}
          aria-label={type === 'todo' ? 'New task' : 'New note title'}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="qa-actions">
          <button
            type="button"
            className={`icon-btn ${showOptions ? 'active' : ''}`}
            onClick={() => setShowOptions((v) => !v)}
            aria-expanded={showOptions}
            aria-label="Priority, category and colour"
            title="More options"
          >
            <SlidersHorizontal size={17} />
          </button>
          <button type="submit" className="btn-primary" disabled={!title.trim()}>
            <Plus size={17} /> Save
          </button>
        </div>
      </div>

      {type === 'note' && (
        <textarea
          className="qa-content"
          placeholder="Write something… (Ctrl+Enter to save)"
          aria-label="Note content"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
          }}
        />
      )}

      {showOptions && (
        <ItemOptions value={options} onChange={setOptions} categories={categories} idPrefix="qa" />
      )}
    </form>
  )
})

export default QuickAddBar
