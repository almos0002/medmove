import { createFileRoute } from '@tanstack/react-router'
import { Sparkles, Zap, Palette } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          Welcome to MedMove
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Built with TanStack Start, Tailwind CSS v4, Lucide icons, and Poppins
          font.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Palette className="h-8 w-8 text-indigo-600" />
            <h2 className="mt-4 text-xl font-semibold">Tailwind v4</h2>
            <p className="mt-2 text-sm text-slate-600">
              Modern utility-first CSS with the new Vite plugin.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <h2 className="mt-4 text-xl font-semibold">Lucide Icons</h2>
            <p className="mt-2 text-sm text-slate-600">
              Beautiful, consistent icons as React components.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Zap className="h-8 w-8 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold">Poppins Font</h2>
            <p className="mt-2 text-sm text-slate-600">
              Clean geometric sans-serif loaded from Google Fonts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
