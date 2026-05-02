import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[var(--color-mm-canvas)]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle">
          <Compass className="h-6 w-6 text-[var(--color-mm-muted)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-mm-ink)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--color-mm-muted)]">
          The page you were looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-6">
          <Button asChild variant="primary">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
