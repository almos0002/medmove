import { Link } from '@tanstack/react-router'
import { PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Shown in place of the normal `/org` workspace when the primary
 * organization has been suspended by an admin. Read-only — the only
 * outbound action is to contact MedMove support.
 */
export function SuspendedOrgPage({
  orgName,
  reason,
  supportEmail,
}: {
  orgName: string
  reason?: string | null
  supportEmail?: string | null
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardContent className="text-center py-10">
          <div className="inline-flex h-14 w-14 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-md mb-6">
            <PauseCircle
              className="h-6 w-6 text-[var(--color-mm-cool)]"
              strokeWidth={1.6}
            />
          </div>
          <h1 className="font-display text-[26px] text-[var(--color-mm-ink)] tracking-tight">
            {orgName} is suspended
          </h1>
          <p className="mt-3 text-[15px] text-[var(--color-mm-subtle)] max-w-md mx-auto leading-relaxed">
            Your organization has been temporarily suspended by MedMove
            support. While suspended, your team cannot list, request,
            or deliver medicine.
          </p>
          {reason && (
            <div className="mt-6 mx-auto max-w-md text-left bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm p-4">
              <div className="eyebrow mb-1.5 text-[var(--color-mm-cool)]">
                Reason from support
              </div>
              <p className="text-[14px] text-[var(--color-mm-ink)] leading-relaxed">
                {reason}
              </p>
            </div>
          )}
          <div className="mt-8 flex items-center justify-center gap-3">
            {supportEmail && (
              <Button asChild variant="primary" size="lg">
                <a href={`mailto:${supportEmail}`}>Contact support</a>
              </Button>
            )}
            <Button asChild variant="secondary" size="lg">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
