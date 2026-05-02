import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <div className="eyebrow">Error · 404</div>
        <h1 className="mt-6 font-display italic text-[clamp(80px,14vw,180px)] leading-[0.85] text-black">
          Not&nbsp;found.
        </h1>
        <div className="hairline my-10 max-w-xs mx-auto" />
        <p className="text-sm text-black max-w-md mx-auto">
          The page you were looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-8">
          <Button asChild variant="primary" size="lg">
            <Link to="/">← Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
