import { motion } from 'framer-motion'
import { Eye, Pencil, PackageMinus, PackagePlus, PackageSearch, Trash2 } from 'lucide-react'

const numberFormat = new Intl.NumberFormat('fa-IR')
const dateFormat = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', year: 'numeric' })

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  )
}

export default function ProductTable({ products, loading, onStockIn, onStockOut, onViewDetails, onEdit, onDelete }) {
  if (loading) {
    return (
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <PackageSearch className="h-10 w-10 text-slate-700" strokeWidth={1.5} />
        <p className="text-sm text-slate-500">کالایی یافت نشد — یکی اضافه کنید یا جستجو را تغییر دهید.</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-right text-xs uppercase tracking-wide text-slate-500">
          <th className="px-4 py-3">کد</th>
          <th className="px-4 py-3">نام</th>
          <th className="px-4 py-3">دسته‌بندی</th>
          <th className="px-4 py-3 text-right">تعداد</th>
          <th className="px-4 py-3">شماره سفارش</th>
          <th className="px-4 py-3">توضیحات</th>
          <th className="px-4 py-3">تاریخ ثبت</th>
          <th className="px-4 py-3">عملیات</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p, i) => (
          <motion.tr
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
            className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
          >
            <td className="px-4 py-3 font-mono text-sky-400">{numberFormat.format(p.product_code)}</td>
            <td className="px-4 py-3 font-medium text-slate-100">{p.product_name}</td>
            <td className="px-4 py-3">
              {p.category ? (
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{p.category}</span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-right text-slate-300">
              {numberFormat.format(p.quantity)} <span className="text-slate-500">{p.unit}</span>
            </td>
            <td className="px-4 py-3 text-slate-300">
              {p.order_number || <span className="text-slate-600">—</span>}
            </td>
            <td className="px-4 py-3 max-w-[16rem] truncate text-slate-400">{p.discription ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-500">{dateFormat.format(new Date(p.created_at))}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onStockIn(p)}
                  title="افزودن موجودی"
                  className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-300 hover:bg-emerald-500/25 transition"
                >
                  <PackagePlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onStockOut(p)}
                  title="ثبت فروش"
                  disabled={p.quantity === 0}
                  className="rounded-lg bg-amber-500/15 p-1.5 text-amber-300 hover:bg-amber-500/25 disabled:opacity-40 disabled:hover:bg-amber-500/15 transition"
                >
                  <PackageMinus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewDetails(p)}
                  title="مشاهده جزئیات"
                  className="rounded-lg bg-sky-500/15 p-1.5 text-sky-300 hover:bg-sky-500/25 transition"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(p)}
                  title="ویرایش کالا"
                  className="rounded-lg bg-slate-500/15 p-1.5 text-slate-300 hover:bg-slate-500/25 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(p)}
                  title="حذف کالا"
                  className="rounded-lg bg-rose-500/15 p-1.5 text-rose-300 hover:bg-rose-500/25 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  )
}
