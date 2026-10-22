import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { createCategory, createUnit, listCategories, listUnits } from '../api.js'
import SelectWithCreate from './SelectWithCreate.jsx'

const EMPTY_FORM = {
  product_name: '',
  product_code: '',
  category: '',
  quantity: '',
  unit: '',
  discription: '',
  order_number: '',
  document_number: '',
}

export default function ProductModal({ open, onClose, onSubmit, product }) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])

  useEffect(() => {
    if (!open) return
    listCategories().then(setCategories).catch(() => {})
    listUnits().then(setUnits).catch(() => {})
    setForm(
      product
        ? {
            product_name: product.product_name,
            product_code: String(product.product_code),
            category: product.category ?? '',
            quantity: String(product.quantity),
            unit: product.unit,
            discription: product.discription ?? '',
            order_number: product.order_number ?? '',
            document_number: '',
          }
        : EMPTY_FORM
    )
  }, [open, product])

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleCreateCategory = async (name) => {
    const created = await createCategory(name)
    setCategories((prev) => [...prev, created])
  }

  const handleCreateUnit = async (name) => {
    const created = await createUnit(name)
    setUnits((prev) => [...prev, created])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        product_name: form.product_name,
        product_code: Number(form.product_code),
        quantity: Number(form.quantity),
        category: form.category || null,
        unit: form.unit,
        discription: form.discription || null,
        order_number: form.order_number || null,
        ...(isEdit ? {} : { document_number: form.document_number || null }),
      })
      setForm(EMPTY_FORM)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition'

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
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">{isEdit ? 'ویرایش کالا' : 'افزودن کالا'}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">نام کالا</label>
                <input required value={form.product_name} onChange={update('product_name')} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">کد کالا</label>
                <input required type="number" value={form.product_code} onChange={update('product_code')} className={inputClass} />
              </div>
              <SelectWithCreate
                label="دسته‌بندی"
                options={categories}
                value={form.category}
                onChange={(name) => setForm((prev) => ({ ...prev, category: name }))}
                onCreate={handleCreateCategory}
                placeholder="انتخاب دسته‌بندی"
                required={false}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">تعداد</label>
                <input required type="number" value={form.quantity} onChange={update('quantity')} className={inputClass} />
              </div>
              <SelectWithCreate
                label="واحد"
                options={units}
                value={form.unit}
                onChange={(name) => setForm((prev) => ({ ...prev, unit: name }))}
                onCreate={handleCreateUnit}
                placeholder="انتخاب واحد"
              />
              {isEdit && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">شماره سفارش</label>
                  <input value={form.order_number} onChange={update('order_number')} className={inputClass} />
                </div>
              )}
              {!isEdit && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">شماره سند</label>
                  <input value={form.document_number} onChange={update('document_number')} className={inputClass} />
                </div>
              )}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">توضیحات</label>
                <input value={form.discription} onChange={update('discription')} className={inputClass} />
              </div>

              <div className="col-span-2 mt-2 flex justify-end gap-2">
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
                  className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? 'ذخیره تغییرات' : 'افزودن کالا'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
