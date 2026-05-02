import { Loader2 } from 'lucide-react'

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-black">
      <Loader2 className="h-4 w-4 animate-spin mr-3" strokeWidth={1.5} />
      <span className="eyebrow">{label ?? 'Loading'}</span>
    </div>
  )
}
