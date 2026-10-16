import { forwardRef } from 'react'
import { Layers, ListTodo, Search, StickyNote, X } from 'lucide-react'

const VIEWS = [
  { id: 'all', label: 'All', Icon: Layers },
  { id: 'todo', label: 'To-Do', Icon: ListTodo },
  { id: 'note', label: 'Notes', Icon: StickyNote },
]

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div className="chip-group" role="radiogroup" aria-label={label}>
      <span className="chip-label">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          className={`chip ${value === o ? 'active' : ''}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

const FilterBar = forwardRef(function FilterBar(
  { view, counts, filters, categories, onView, onFilter },
  searchRef,
) {
  return (
    <div className="filter-bar">
      <div className="filter-top">
        <div className="tabs" role="tablist" aria-label="View">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={view === id ? 'active' : ''}
              onClick={() => onView(id)}
            >
              <Icon size={15} />
              {label}
              <span className="count">{counts[id]}</span>
            </button>
          ))}
        </div>

        <label className="search glass">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search titles & content"
            aria-label="Search"
            value={filters.search}
            onChange={(e) => onFilter({ search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onFilter({ search: '' })
                e.currentTarget.blur()
              }
            }}
          />
          {filters.search ? (
            <button
              type="button"
              className="clear"
              onClick={() => onFilter({ search: '' })}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>
      </div>

      <div className="filter-row">
        {view !== 'note' && (
          <ChipGroup
            label="Status"
            options={['all', 'active', 'completed']}
            value={filters.status}
            onChange={(status) => onFilter({ status })}
          />
        )}
        <ChipGroup
          label="Priority"
          options={['all', 'low', 'medium', 'high']}
          value={filters.priority}
          onChange={(priority) => onFilter({ priority })}
        />
        {categories.length > 1 && (
          <ChipGroup
            label="Category"
            options={['all', ...categories]}
            value={filters.category}
            onChange={(category) => onFilter({ category })}
          />
        )}
      </div>
    </div>
  )
})

export default FilterBar
