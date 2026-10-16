import { Check } from 'lucide-react'
import { COLORS, PRIORITIES } from '../lib/format'

/** Priority, category and colour pickers shared by Quick Add and the inline editor. */
export default function ItemOptions({ value, onChange, categories, idPrefix }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  const listId = `${idPrefix}-categories`

  return (
    <div className="item-options">
      <div className="option-group" role="radiogroup" aria-label="Priority">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={value.priority === p}
            className={`chip chip-${p} ${value.priority === p ? 'active' : ''}`}
            onClick={() => set('priority')(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <input
        className="category-input"
        list={listId}
        placeholder="Category"
        aria-label="Category"
        maxLength={40}
        value={value.category}
        onChange={(e) => set('category')(e.target.value)}
      />
      <datalist id={listId}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="option-group swatches" role="radiogroup" aria-label="Colour">
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={value.color_tag === c.value}
            aria-label={c.name}
            title={c.name}
            className="swatch"
            style={{ '--swatch': c.value }}
            onClick={() => set('color_tag')(c.value)}
          >
            {value.color_tag === c.value && <Check size={12} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  )
}
