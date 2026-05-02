import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Mail, ShieldCheck, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getServerSession } from '@/server/functions/session'
import {
  getMyAccount,
  updateMyAccount,
} from '@/server/functions/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/profile' } })
    }
    return { session }
  },
  loader: () => getMyAccount(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Profile", noindex: true }),
  component: ProfilePage,
})

function ProfilePage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const acc = data.account
  const [name, setName] = useState(acc.name)
  const dirty = name.trim() !== acc.name && name.trim().length >= 1

  const saveMut = useMutation({
    mutationFn: () => updateMyAccount({ data: { name: name.trim() } }),
    onSuccess: () => {
      toast.success('Profile updated')
      router.invalidate()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not update'),
  })

  return (
    <div className="min-h-screen bg-white">
      <main className="px-5 sm:px-8 py-10 max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <PageHeader
          title="Your profile"
          description="The display name MedMove shows next to your audit-log entries and notifications."
        />

        <Card>
          <CardContent className="space-y-5">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!dirty || saveMut.isPending) return
                saveMut.mutate()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <ReadField
                  icon={Mail}
                  label="Email"
                  value={acc.email}
                  hint="Sign-in identifier — change requires support."
                />
                <ReadField
                  icon={ShieldCheck}
                  label="Role"
                  value={
                    <Badge tone="neutral" className="capitalize">
                      {acc.role.replace(/_/g, ' ')}
                    </Badge>
                  }
                />
                <ReadField
                  icon={UserIcon}
                  label="Member since"
                  value={formatDate(acc.createdAt)}
                />
                <ReadField
                  icon={ShieldCheck}
                  label="Email verified"
                  value={
                    <Badge tone={acc.emailVerified ? 'success' : 'outline'}>
                      {acc.emailVerified ? 'Verified' : 'Not verified'}
                    </Badge>
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2.5">
                <Button asChild variant="ghost">
                  <Link to="/account">Account & security</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={!dirty || saveMut.isPending}
                  variant="primary"
                >
                  {saveMut.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ReadField({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Mail
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
        {label}
      </div>
      <div className="text-[14px] text-[var(--color-mm-ink)]">{value}</div>
      {hint && <div className="text-[12px] text-[var(--color-mm-subtle)]">{hint}</div>}
    </div>
  )
}
