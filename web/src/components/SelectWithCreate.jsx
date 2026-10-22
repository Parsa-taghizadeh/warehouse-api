import { useState } from 'react'
import { Check, X } from 'lucide-react'

const NEW_OPTION = '__new__'

export default function SelectWithCreate({ label, options, value, onChange, onCreate, placeholder, required = true }) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition'

  const handleSelect = (event) => {
    const val = event.target.value
    if (val === NEW_OPTION) {
      setDraft('')
      setCreating(true)
      return
    }
    onChange(val)
  }

  const confirmCreate = async () => {
    const name = draft.trim()
    if (!name) return
    setSaving(true)
    try {
      await onCreate(name)
      onChange(name)
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  if (creating) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmCreate()
              }
            }}
          />
          <button
            type="button"
            onClick={confirmCreate}
            disabled={saving}
            className="shrink-0 rounded-lg bg-emerald-500/15 p-2 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 transition"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="shrink-0 rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <select required={required} value={value} onChange={handleSelect} className={inputClass}>
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name}>
            {opt.name}
          </option>
        ))}
        <option value={NEW_OPTION} className="text-sky-400">
          + افزودن مورد جدید
        </option>
      </select>
    </div>
  )
}
