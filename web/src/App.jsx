import { useEffect, useMemo, useState } from 'react'
import { Boxes, FileText, Layers, LogOut, Plus, RefreshCw, Search, Warehouse } from 'lucide-react'
import {
  clearToken,
  createProduct,
  deleteProduct,
  getMe,
  getToken,
  listProducts,
  setUnauthorizedHandler,
  stockIn,
  stockOut,
  updateProduct,
} from './api.js'
import StatCard from './components/StatCard.jsx'
import ProductTable from './components/ProductTable.jsx'
import ProductModal from './components/ProductModal.jsx'
import StockModal from './components/StockModal.jsx'
import ProductDetailView from './components/ProductDetailView.jsx'
import ReportsView from './components/ReportsView.jsx'
import LoginView from './components/LoginView.jsx'
import Toast from './components/Toast.jsx'
import InstallButton from './components/InstallButton.jsx'

const numberFormat = new Intl.NumberFormat('fa-IR')

export default function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [stockModal, setStockModal] = useState(null)
  const [viewingCode, setViewingCode] = useState(null)
  const [showReports, setShowReports] = useState(false)
  const [query, setQuery] = useState('')
  const [toasts, setToasts] = useState([])

  const pushToast = (message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const fetchProducts = async ({ silent } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      setProducts(await listProducts())
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthenticated(false)
      setProducts([])
    })

    if (!getToken()) {
      setAuthChecked(true)
      return
    }

    getMe()
      .then((user) => {
        setUsername(user.username)
        setAuthenticated(true)
      })
      .catch(() => clearToken())
      .finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (authenticated) fetchProducts()
  }, [authenticated])

  const handleLoginSuccess = (loggedInUsername) => {
    setUsername(loggedInUsername)
    setAuthenticated(true)
  }

  const handleLogout = () => {
    clearToken()
    setAuthenticated(false)
    setProducts([])
    setViewingCode(null)
  }

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingProduct(null)
  }

  const handleSubmitProduct = async (payload) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.product_code, payload)
        pushToast(`${payload.product_name} به‌روزرسانی شد`)
      } else {
        await createProduct(payload)
        pushToast(`${payload.product_name} به انبار اضافه شد`)
      }
      handleModalClose()
      fetchProducts({ silent: true })
    } catch (err) {
      pushToast(err.message, 'error')
      throw err
    }
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`آیا از حذف «${product.product_name}» مطمئن هستید؟`)) return
    try {
      await deleteProduct(product.product_code)
      pushToast(`${product.product_name} حذف شد`)
      if (viewingCode === product.product_code) setViewingCode(null)
      fetchProducts({ silent: true })
    } catch (err) {
      pushToast(err.message, 'error')
    }
  }

  const handleStockAdjust = async ({ quantity, documentNumber }) => {
    const { product, mode } = stockModal
    try {
      if (mode === 'in') {
        await stockIn(product.product_code, quantity, documentNumber)
        pushToast(`${numberFormat.format(quantity)} ${product.unit} به موجودی ${product.product_name} افزوده شد`)
      } else {
        await stockOut(product.product_code, quantity, documentNumber)
        pushToast(`${numberFormat.format(quantity)} ${product.unit} از موجودی ${product.product_name} فروخته شد`)
      }
      setStockModal(null)
      fetchProducts({ silent: true })
    } catch (err) {
      pushToast(err.message, 'error')
      throw err
    }
  }

  const viewingProduct = products.find((p) => p.product_code === viewingCode) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.product_name, p.category, p.unit, String(p.product_code)].some((field) =>
        field?.toLowerCase().includes(q)
      )
    )
  }, [products, query])

  const stats = useMemo(
    () => ({
      count: products.length,
      totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
      categories: new Set(products.map((p) => p.category).filter(Boolean)).size,
    }),
    [products]
  )

  if (!authChecked) {
    return <div className="min-h-full" />
  }

  if (!authenticated) {
    return <LoginView onSuccess={handleLoginSuccess} />
  }

  return (
    <div className="relative min-h-full overflow-hidden print:overflow-visible">
      <div className="print-hide-decor pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-[-10%] h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {showReports ? (
        <ReportsView products={products} onBack={() => setShowReports(false)} />
      ) : viewingProduct ? (
        <ProductDetailView
          product={viewingProduct}
          onBack={() => setViewingCode(null)}
          onStockIn={(product) => setStockModal({ product, mode: 'in' })}
          onStockOut={(product) => setStockModal({ product, mode: 'out' })}
        />
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15">
                <Warehouse className="h-6 w-6 text-sky-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-100">انبارداری</h1>
                <p className="text-sm text-slate-500">مدیریت موجودی، ارزش کالا و دسته‌بندی‌ها به‌صورت لحظه‌ای</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <InstallButton />
              <button
                onClick={() => setShowReports(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                <FileText className="h-4 w-4" />
                گزارش
              </button>
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 transition"
              >
                <Plus className="h-4 w-4" />
                افزودن کالا
              </button>
              <div className="mx-1 h-6 w-px bg-slate-800" />
              <span className="text-sm text-slate-400">{username}</span>
              <button
                onClick={handleLogout}
                title="خروج"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard icon={Boxes} label="تعداد کالاها" value={stats.count} tone="sky" delay={0} />
            <StatCard icon={Layers} label="مجموع موجودی" value={stats.totalUnits} tone="violet" delay={0.05} />
            <StatCard icon={Warehouse} label="دسته‌بندی‌ها" value={stats.categories} tone="amber" delay={0.1} />
          </div>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-medium text-slate-200">کالاها</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="جستجوی کالا..."
                    className="w-56 rounded-lg border border-slate-700 bg-slate-950 py-1.5 pr-9 pl-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => fetchProducts({ silent: true })}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  بروزرسانی
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <ProductTable
                products={filtered}
                loading={loading}
                onStockIn={(product) => setStockModal({ product, mode: 'in' })}
                onStockOut={(product) => setStockModal({ product, mode: 'out' })}
                onViewDetails={(product) => setViewingCode(product.product_code)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProduct}
              />
            </div>
          </section>
        </div>
      )}

      <ProductModal open={modalOpen} onClose={handleModalClose} onSubmit={handleSubmitProduct} product={editingProduct} />
      <StockModal
        open={!!stockModal}
        mode={stockModal?.mode}
        product={stockModal?.product}
        onClose={() => setStockModal(null)}
        onSubmit={handleStockAdjust}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
