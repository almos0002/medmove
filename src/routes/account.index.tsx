import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { changeMyPassword } from '@/server/functions/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/account/')({
  head: pageHead({ title: "Account", noindex: true }),
  component: SecurityPage,
})

function SecurityPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () =>
      changeMyPassword({
        data: {
          currentPassword: current,
          newPassword: next,
          confirmPassword: confirm,
        },
      }),
    onSuccess: () => {
      toast.success('Password updated. Other sessions were revoked.')
      setCurrent('')
      setNext('')
      setConfirm('')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message ?? 'Could not change password')
    },
  })

  const ready =
    current.length > 0 &&
    next.length >= 8 &&
    confirm.length >= 8 &&
    next === confirm &&
    next !== current

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <header className="space-y-1">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.6} />
              Password
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--color-mm-ink)]">
              Change password
            </h2>
            <p className="text-[13px] text-[var(--color-mm-subtle)]">
              Use at least 8 characters. After a successful change, every
              other signed-in session for this account is revoked.
            </p>
          </header>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!ready || mut.isPending) return
              setError(null)
              mut.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={current}
                autoComplete="current-password"
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="next">New password</Label>
                <Input
                  id="next"
                  type="password"
                  value={next}
                  autoComplete="new-password"
                  onChange={(e) => setNext(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            {next.length > 0 && next.length < 8 && (
              <p className="text-[12.5px] text-[var(--color-mm-warn)]">
                Password must be at least 8 characters.
              </p>
            )}
            {next.length >= 8 && confirm.length >= 8 && next !== confirm && (
              <p className="text-[12.5px] text-[var(--color-mm-warn)]">
                Passwords don’t match.
              </p>
            )}
            {error && (
              <p className="text-[12.5px] text-[var(--color-mm-bad)]">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="submit"
                disabled={!ready || mut.isPending}
                variant="primary"
              >
                {mut.isPending ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
            Coming soon
          </div>
          <h2 className="text-[18px] font-semibold text-[var(--color-mm-ink)]">
            Two-factor authentication
          </h2>
          <p className="text-[13px] text-[var(--color-mm-subtle)] leading-relaxed max-w-prose">
            We’ll roll out TOTP-based 2FA for org owners and admins after MVP.
            Until then, please use a strong unique password and enable 2FA on
            your work email account.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
