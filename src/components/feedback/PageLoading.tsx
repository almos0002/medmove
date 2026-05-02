import { Loader2 } from 'lucide-react'

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--color-mm-subtle)]">
      <Loader2 className="h-4 w-4 animate-spin mr-2.5" strokeWidth={1.6} />
      <span className="text-[14px]">{label ?? 'Loading…'}</span>
    </div>
  )
}
