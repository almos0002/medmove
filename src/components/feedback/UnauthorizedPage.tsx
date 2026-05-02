import { Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Generic 403 / no-access surface. Used by route `beforeLoad` guards that
 * detect an authenticated but un-authorised actor (wrong role, capability,
 * or membership). The shape mirrors `NotFoundPage` so the visual rhythm
 * is consistent across error states.
 */
export function UnauthorizedPage({
  title = 'No access',
  description = 'Your account is signed in, but it isn’t allowed to view this page.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-md">
          <ShieldAlert
            className="h-6 w-6 text-[var(--color-mm-bad)]"
            strokeWidth={1.6}
          />
        </div>
        <h1 className="mt-6 font-display text-[28px] text-[var(--color-mm-ink)] tracking-tight">
          {title}
        </h1>
        <div className="eyebrow mt-2 text-[var(--color-mm-bad)]">
          Error code · FORBIDDEN
        </div>
        <p className="mt-4 text-[15px] text-[var(--color-mm-subtle)] max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
