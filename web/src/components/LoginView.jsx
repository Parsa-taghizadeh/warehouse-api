import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Lock, User, Warehouse } from 'lucide-react'
import { getAuthStatus, login, register, setToken } from '../api.js'

export default function LoginView({ onSuccess }) {
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAuthStatus()
      .then((status) => setSetupRequired(status.setup_required))
      .catch(() => setSetupRequired(false))
      .finally(() => setCheckingStatus(false))
  }, [])

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pr-10 pl-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = setupRequired ? await register(username, password) : await login(username, password)
      setToken(result.access_token)
      onSuccess(result.username)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-[-10%] h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15">
            <Warehouse className="h-6 w-6 text-sky-300" />
          </div>
          <h1 className="text-lg font-semibold text-slate-100">
            {setupRequired ? 'ایجاد حساب مدیر' : 'ورود به انبارداری'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {setupRequired
              ? 'این اولین اجرای سامانه است — یک حساب برای خودتان بسازید.'
              : 'برای دسترسی به انبار وارد شوید'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">نام کاربری</label>
            <div className="relative">
              <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                required
                minLength={setupRequired ? 3 : undefined}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">رمز عبور</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type="password"
                minLength={setupRequired ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60 transition"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {setupRequired ? 'ایجاد حساب' : 'ورود'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
