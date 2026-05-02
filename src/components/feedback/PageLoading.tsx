import { Loader2 } from 'lucide-react'

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[var(--color-mm-muted)]">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">{label ?? 'Loading…'}</span>
    </div>
  )
}
