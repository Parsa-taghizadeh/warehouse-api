import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Boxes, PackageMinus, PackagePlus, TrendingUp } from 'lucide-react'
import { getTransactions } from '../api.js'
import StatCard from './StatCard.jsx'
import LineChart from './LineChart.jsx'

const numberFormat = new Intl.NumberFormat('fa-IR')
const dateFormat = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'in', label: 'ورود' },
  { key: 'out', label: 'خروج' },
]

export default function ProductDetailView({ product, onBack, onStockIn, onStockOut }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    getTransactions(product.product_code)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [product.product_code, product.quantity])

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  )

  const totals = useMemo(
    () => ({
      totalIn: transactions.filter((t) => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0),
      totalOut: transactions.filter((t) => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0),
    }),
    [transactions]
  )

  // Stock left after each movement. Walk back from the current quantity so the
  // latest row always matches it, even if older stock was never recorded as a movement.
  const balances = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const result = new Map()
    let running = product.quantity
    for (let i = sorted.length - 1; i >= 0; i--) {
      const t = sorted[i]
      result.set(t.id, running)
      running -= t.type === 'in' ? t.quantity : -t.quantity
    }
    return { sorted, byId: result }
  }, [transactions, product.quantity])

  const stockLevelSeries = useMemo(
    () => [
      {
        key: 'balance',
        label: 'موجودی',
        color: '#38bdf8',
        points: balances.sorted.map((t) => ({ x: new Date(t.created_at), y: balances.byId.get(t.id) })),
      },
    ],
    [balances]
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{product.product_name}</h1>
            <p className="text-sm text-slate-500">
              کد {numberFormat.format(product.product_code)}
              {product.category ? ` — ${product.category}` : ''}
              {product.order_number ? ` — شماره سفارش: ${product.order_number}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStockIn(product)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
          >
            <PackagePlus className="h-4 w-4" />
            افزودن موجودی
          </button>
          <button
            onClick={() => onStockOut(product)}
            disabled={product.quantity === 0}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
          >
            <PackageMinus className="h-4 w-4" />
            ثبت فروش
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Boxes} label="موجودی فعلی" value={product.quantity} tone="sky" delay={0} />
        <StatCard icon={PackagePlus} label="مجموع ورودی" value={totals.totalIn} tone="emerald" delay={0.05} />
        <StatCard icon={PackageMinus} label="مجموع خروجی" value={totals.totalOut} tone="amber" delay={0.1} />
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full rounded-2xl" />
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 py-16 text-center backdrop-blur-sm">
          <p className="text-sm text-slate-500">هنوز فعالیتی ثبت نشده — با «افزودن موجودی» شروع کنید.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              روند موجودی (کل تاریخچه)
            </h2>
            <LineChart series={stockLevelSeries} emptyLabel="داده‌ای موجود نیست" />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-medium text-slate-200">تاریخچه فعالیت‌ها</h2>
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      filter === f.key ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">نوع</th>
                    <th className="px-4 py-3">تاریخ</th>
                    <th className="px-4 py-3">شماره سند</th>
                    <th className="px-4 py-3 text-right">تعداد</th>
                    <th className="px-4 py-3 text-right">مانده</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].reverse().map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
                      className="border-t border-slate-800/60"
                    >
                      <td className="px-4 py-3">
                        {t.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                            <PackagePlus className="h-3 w-3" /> ورود
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
                            <PackageMinus className="h-3 w-3" /> خروج
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{dateFormat.format(new Date(t.created_at))}</td>
                      <td className="px-4 py-3 text-slate-300">{t.document_number || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{numberFormat.format(t.quantity)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-100">
                        {numberFormat.format(balances.byId.get(t.id))}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
