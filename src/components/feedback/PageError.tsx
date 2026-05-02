import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ServerErrorShape = { code?: string; message?: string }

function describe(err: unknown): { title: string; body: string; code?: string } {
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
        title: 'No access',
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
        body:
          inner.message ?? 'This resource no longer exists or was never created.',
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
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-md">
          <AlertCircle
            className="h-6 w-6 text-[var(--color-mm-bad)]"
            strokeWidth={1.6}
          />
        </div>
        <h1 className="mt-6 font-display text-[28px] text-[var(--color-mm-ink)] tracking-tight">
          {title}
        </h1>
        {code && (
          <div className="eyebrow mt-2 text-[var(--color-mm-bad)]">
            Error code · {code}
          </div>
        )}
        <p className="mt-4 text-[15px] text-[var(--color-mm-subtle)] max-w-md mx-auto leading-relaxed">
          {body}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              reset?.()
              router.invalidate()
            }}
          >
            Try again
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
