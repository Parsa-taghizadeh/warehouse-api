import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -32, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md ${
              toast.type === 'error'
                ? 'border-red-500/30 bg-red-950/80 text-red-200'
                : 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
