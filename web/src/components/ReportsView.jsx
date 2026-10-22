import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FileText, PackageMinus, PackagePlus, Printer, RotateCcw } from 'lucide-react'
import { getMovementReport, listCategories } from '../api.js'

const numberFormat = new Intl.NumberFormat('fa-IR')
// fa-IR formats dates in the Persian (Jalali) calendar.
const dateTimeFormat = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const dateFormat = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

// Date inputs use local YYYY-MM-DD; toISOString would shift the day by the UTC offset.
function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toInputDate(d)
}

function fromInputDate(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const PRESETS = [
  { label: 'امروز', start: () => daysAgo(0) },
  { label: '۷ روز اخیر', start: () => daysAgo(6) },
  { label: '۳۰ روز اخیر', start: () => daysAgo(29) },
  { label: 'همه', start: () => '' },
]

const EMPTY_FILTERS = {
  start: daysAgo(29),
  end: daysAgo(0),
  type: '',
  product_code: '',
  category: '',
  document_number: '',
}

const TYPE_LABELS = { '': 'همه', in: 'ورود', out: 'خروج' }

export default function ReportsView({ products, onBack }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {})
  }, [])

  // Wait for typing in the document number box to pause before asking the server.
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      getMovementReport(filters)
        .then((data) => {
          setRows(data)
          setError('')
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [filters])

  const update = (field) => (event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }))

  const applyPreset = (preset) =>
    setFilters((prev) => ({ ...prev, start: preset.start(), end: preset.start() === '' ? '' : daysAgo(0) }))

  const totals = useMemo(
    () => ({
      in: rows.filter((r) => r.type === 'in').reduce((sum, r) => sum + r.quantity, 0),
      out: rows.filter((r) => r.type === 'out').reduce((sum, r) => sum + r.quantity, 0),
    }),
    [rows]
  )

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.product_name.localeCompare(b.product_name, 'fa')),
    [products]
  )

  // A plain-language line describing the active filters, shown on the printed page.
  const filterSummary = useMemo(() => {
    const parts = []
    if (filters.start || filters.end) {
      const from = filters.start ? dateFormat.format(fromInputDate(filters.start)) : 'ابتدا'
      const to = filters.end ? dateFormat.format(fromInputDate(filters.end)) : 'امروز'
      parts.push(`از ${from} تا ${to}`)
    } else {
      parts.push('همه‌ی تاریخ‌ها')
    }
    if (filters.type) parts.push(`نوع: ${TYPE_LABELS[filters.type]}`)
    if (filters.product_code) {
      const product = products.find((p) => String(p.product_code) === filters.product_code)
      parts.push(`کالا: ${product ? product.product_name : filters.product_code}`)
    }
    if (filters.category) parts.push(`دسته‌بندی: ${filters.category}`)
    if (filters.document_number) parts.push(`شماره سند: ${filters.document_number}`)
    return parts.join(' — ')
  }, [filters, products])

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition'
  const labelClass = 'mb-1 block text-xs font-medium text-slate-400'

  return (
    <div className="report-page mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">گزارش ورود و خروج</h1>
            <p className="text-sm text-slate-500">فیلتر بر اساس تاریخ، نوع، کالا، دسته‌بندی و شماره سند</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition"
        >
          <Printer className="h-4 w-4" />
          چاپ گزارش
        </button>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm print:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mr-auto flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="h-3 w-3" />
            پاک کردن فیلترها
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div>
            <label className={labelClass}>از تاریخ</label>
            <input type="date" value={filters.start} onChange={update('start')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>تا تاریخ</label>
            <input type="date" value={filters.end} onChange={update('end')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>نوع</label>
            <select value={filters.type} onChange={update('type')} className={inputClass}>
              <option value="">همه</option>
              <option value="in">ورود</option>
              <option value="out">خروج</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>کالا</label>
            <select value={filters.product_code} onChange={update('product_code')} className={inputClass}>
              <option value="">همه‌ی کالاها</option>
              {sortedProducts.map((p) => (
                <option key={p.product_code} value={String(p.product_code)}>
                  {p.product_name} ({numberFormat.format(p.product_code)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>دسته‌بندی</label>
            <select value={filters.category} onChange={update('category')} className={inputClass}>
              <option value="">همه‌ی دسته‌بندی‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>شماره سند</label>
            <input
              value={filters.document_number}
              onChange={update('document_number')}
              placeholder="بخشی از شماره سند"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Only on paper: title and the filters that produced this list. */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-lg font-bold">گزارش ورود و خروج کالا</h1>
        <p className="text-sm">{filterSummary}</p>
        <p className="text-xs">تاریخ چاپ: {dateTimeFormat.format(new Date())}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="report-chip rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
          تعداد ردیف‌ها: <b className="text-slate-100">{numberFormat.format(rows.length)}</b>
        </span>
        <span className="report-chip rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-emerald-300">
          مجموع ورود: <b>{numberFormat.format(totals.in)}</b>
        </span>
        <span className="report-chip rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-amber-300">
          مجموع خروج: <b>{numberFormat.format(totals.out)}</b>
        </span>
      </div>

      <section className="report-table-wrap rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
        {error ? (
          <p className="py-16 text-center text-sm text-red-300">{error}</p>
        ) : loading ? (
          <div className="skeleton m-4 h-48 rounded-xl print:hidden" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FileText className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">هیچ ورود یا خروجی با این فیلترها پیدا نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="report-table w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-500">
                  <th className="px-3 py-3">ردیف</th>
                  <th className="px-3 py-3">تاریخ</th>
                  <th className="px-3 py-3">کالا</th>
                  <th className="px-3 py-3">کد</th>
                  <th className="px-3 py-3">دسته‌بندی</th>
                  <th className="px-3 py-3">نوع</th>
                  <th className="px-3 py-3">شماره سند</th>
                  <th className="px-3 py-3">تعداد</th>
                  <th className="px-3 py-3">واحد</th>
                  <th className="px-3 py-3">مانده</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-800/60">
                    <td className="px-3 py-2.5 text-slate-500">{numberFormat.format(i + 1)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">
                      {dateTimeFormat.format(new Date(r.created_at))}
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">{r.product_name}</td>
                    <td className="px-3 py-2.5 text-slate-400">{numberFormat.format(r.product_code)}</td>
                    <td className="px-3 py-2.5 text-slate-400">{r.category || '—'}</td>
                    <td className="px-3 py-2.5">
                      {r.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <PackagePlus className="h-3 w-3 print:hidden" /> ورود
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <PackageMinus className="h-3 w-3 print:hidden" /> خروج
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{r.document_number || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{numberFormat.format(r.quantity)}</td>
                    <td className="px-3 py-2.5 text-slate-400">{r.unit}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-100">{numberFormat.format(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
