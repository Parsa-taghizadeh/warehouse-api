import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, PackageMinus, PackagePlus, X } from 'lucide-react'

const numberFormat = new Intl.NumberFormat('fa-IR')

export default function StockModal({ open, mode, product, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isIn = mode === 'in'

  useEffect(() => {
    if (!open) return
    setQuantity('')
    setDocumentNumber('')
  }, [open, product])

  if (!product) return null
  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ quantity: Number(quantity), documentNumber: documentNumber || null })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isIn ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                  {isIn ? (
                    <PackagePlus className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <PackageMinus className="h-5 w-5 text-amber-300" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {isIn ? 'افزودن موجودی' : 'ثبت فروش'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-400">
              {product.product_name} — موجودی فعلی: {numberFormat.format(product.quantity)} {product.unit}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {isIn ? 'تعداد ورودی' : 'تعداد فروش'}
                </label>
                <input
                  autoFocus
                  required
                  type="number"
                  min="1"
                  max={isIn ? undefined : product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">شماره سند</label>
                <input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60 transition ${
                    isIn ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400'
                  }`}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isIn ? 'افزودن' : 'ثبت فروش'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
