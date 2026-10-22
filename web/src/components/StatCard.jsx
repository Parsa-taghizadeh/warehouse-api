import { motion } from 'framer-motion'
import { useCountUp } from '../hooks/useCountUp.js'

const TONES = {
  sky: { glow: 'bg-sky-500', chip: 'bg-sky-500/15', icon: 'text-sky-300' },
  emerald: { glow: 'bg-emerald-500', chip: 'bg-emerald-500/15', icon: 'text-emerald-300' },
  amber: { glow: 'bg-amber-500', chip: 'bg-amber-500/15', icon: 'text-amber-300' },
  violet: { glow: 'bg-violet-500', chip: 'bg-violet-500/15', icon: 'text-violet-300' },
}

export default function StatCard({ icon: Icon, label, value, format, tone = 'sky', delay = 0 }) {
  const animated = useCountUp(value)
  const palette = TONES[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${palette.glow}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${palette.chip}`}>
          <Icon className={`h-5 w-5 ${palette.icon}`} strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-100">
            {format ? format(animated) : Math.round(animated)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
