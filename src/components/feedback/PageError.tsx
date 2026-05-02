import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ServerErrorShape = { code?: string; message?: string }

function describe(err: unknown): { title: string; body: string; code?: string } {
  // TanStack server fns serialize errors as JSON with { error: { code, message } }
  // or sometimes just an Error with that JSON in `message`.
  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, unknown> & {
      message?: string
      error?: ServerErrorShape
    }
    const inner =
      (anyErr.error as ServerErrorShape | undefined) ??
      (typeof anyErr.message === 'string'
        ? safeJson(anyErr.message)
        : undefined)
    if (inner?.code === 'FORBIDDEN') {
      return {
        title: "You don't have access",
        body:
          inner.message ??
          'Your account or organization is not allowed to view this page.',
        code: inner.code,
      }
    }
    if (inner?.code === 'UNAUTHORIZED') {
      return {
        title: 'Please sign in',
        body: 'Your session has expired. Sign in again to continue.',
        code: inner.code,
      }
    }
    if (inner?.code === 'NOT_FOUND') {
      return {
        title: 'Not found',
        body: inner.message ?? 'This resource no longer exists or was never created.',
        code: inner.code,
      }
    }
    if (inner?.code) {
      return {
        title: 'Something went wrong',
        body: inner.message ?? 'An unexpected error occurred.',
        code: inner.code,
      }
    }
    if (typeof anyErr.message === 'string' && anyErr.message.length > 0) {
      return { title: 'Something went wrong', body: anyErr.message }
    }
  }
  return {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again.',
  }
}

function safeJson(s: string): ServerErrorShape | undefined {
  try {
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed === 'object') {
      return (parsed.error ?? parsed) as ServerErrorShape
    }
  } catch {
    /* not JSON */
  }
  return undefined
}

export function PageError({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) {
  const router = useRouter()
  const { title, body, code } = describe(error)
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[var(--color-mm-canvas)]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center bg-[var(--color-mm-warn-soft)] squircle">
          <AlertTriangle className="h-6 w-6 text-[var(--color-mm-warn)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-mm-ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-mm-muted)]">{body}</p>
        {code && (
          <p className="mt-3 text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
            Error code: {code}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              reset?.()
              router.invalidate()
            }}
          >
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
