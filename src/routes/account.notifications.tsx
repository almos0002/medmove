import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  type NotificationPreferencesShape,
} from '@/server/functions/notificationPreferences'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'

export const Route = createFileRoute('/account/notifications')({
  loader: () => getMyNotificationPreferences(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: NotificationsPage,
})

type ChannelKey =
  | 'inAppEnabled'
  | 'emailEnabled'
  | 'smsEnabled'
  | 'whatsappEnabled'

const CHANNELS: ReadonlyArray<{
  key: ChannelKey
  label: string
  description: string
  icon: typeof Bell
}> = [
  {
    key: 'inAppEnabled',
    label: 'In-app notifications',
    description:
      'The bell icon in the top-right and the activity feed on your dashboard.',
    icon: Bell,
  },
  {
    key: 'emailEnabled',
    label: 'Email',
    description:
      'Sent to your sign-in email when key events happen — verification updates, listings approvals, transfer requests.',
    icon: Mail,
  },
  {
    key: 'smsEnabled',
    label: 'SMS',
    description:
      'High-priority delivery & verification alerts. Provider integration is rolling out post-MVP.',
    icon: Smartphone,
  },
  {
    key: 'whatsappEnabled',
    label: 'WhatsApp',
    description:
      'Optional courier-style updates via WhatsApp Business. Rolling out post-MVP.',
    icon: MessageSquare,
  },
]

function NotificationsPage() {
  const router = useRouter()
  const initial = Route.useLoaderData().preferences
  const [prefs, setPrefs] = useState<NotificationPreferencesShape>(initial)

  const mut = useMutation({
    mutationFn: () =>
      updateMyNotificationPreferences({
        data: {
          inAppEnabled: prefs.inAppEnabled,
          emailEnabled: prefs.emailEnabled,
          smsEnabled: prefs.smsEnabled,
          whatsappEnabled: prefs.whatsappEnabled,
          mutedTypes: prefs.mutedTypes,
        },
      }),
    onSuccess: (res) => {
      toast.success('Notification preferences saved')
      setPrefs(res.preferences)
      router.invalidate()
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Could not save preferences'),
  })

  const dirty =
    prefs.inAppEnabled !== initial.inAppEnabled ||
    prefs.emailEnabled !== initial.emailEnabled ||
    prefs.smsEnabled !== initial.smsEnabled ||
    prefs.whatsappEnabled !== initial.whatsappEnabled

  return (
    <Card>
      <CardContent className="space-y-5">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
            <Bell className="h-3.5 w-3.5" strokeWidth={1.6} />
            Channels
          </div>
          <h2 className="text-[18px] font-semibold text-[var(--color-mm-ink)]">
            Notification preferences
          </h2>
          <p className="text-[13px] text-[var(--color-mm-subtle)] leading-relaxed">
            Choose which channels MedMove uses to reach you. In-app
            notifications are recommended on for everyone — they’re how the
            activity feed and bell icon update.
          </p>
        </header>

        <Separator />

        <div className="space-y-1">
          {CHANNELS.map((c, idx) => {
            const Icon = c.icon
            const value = prefs[c.key]
            return (
              <div key={c.key}>
                {idx > 0 && (
                  <div className="border-t border-[var(--color-mm-line)] my-1" />
                )}
                <div className="flex items-start gap-4 py-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-canvas)] text-[var(--color-mm-ink)] squircle-xs">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={c.key}
                      className="text-[14px] font-semibold text-[var(--color-mm-ink)]"
                    >
                      {c.label}
                    </Label>
                    <p className="text-[12.5px] text-[var(--color-mm-subtle)] mt-0.5 leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                  <Switch
                    id={c.key}
                    checked={value}
                    onCheckedChange={(checked) =>
                      setPrefs((p) => ({ ...p, [c.key]: checked }))
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="ghost"
            disabled={!dirty || mut.isPending}
            onClick={() => setPrefs(initial)}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            disabled={!dirty || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
