import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="font-display text-[80px] sm:text-[112px] leading-none text-[var(--color-mm-ink)] tracking-tight">
          404
        </div>
        <h1 className="mt-4 font-display text-[24px] text-[var(--color-mm-ink)]">
          We couldn't find that page
        </h1>
        <p className="mt-3 text-[15px] text-[var(--color-mm-subtle)] max-w-md mx-auto leading-relaxed">
          The page you were looking for doesn't exist or may have been moved.
        </p>
        <div className="mt-7">
          <Button asChild variant="primary" size="lg">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
