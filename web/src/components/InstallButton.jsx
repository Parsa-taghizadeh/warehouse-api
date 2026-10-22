import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt) return null

  const install = async () => {
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return (
    <button
      onClick={install}
      className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
    >
      <Download className="h-4 w-4" />
      نصب برنامه
    </button>
  )
}
