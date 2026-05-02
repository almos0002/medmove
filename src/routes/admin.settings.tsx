import { createFileRoute, useRouter } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Megaphone, Settings2, ShieldOff, Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAdminPlatformSettings,
  adminUpdatePlatformSettings,
} from '@/server/functions/platformSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { formatDateTime } from '@/lib/dates'

export const Route = createFileRoute('/admin/settings')({
  loader: () => getAdminPlatformSettings(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Admin · Platform settings", noindex: true }),
  component: AdminSettingsPage,
})

type DraftShape = {
  siteName: string
  supportEmail: string
  supportPhone: string
  announcementBanner: string
  signupsEnabled: boolean
  verificationGracePeriodDays: string
}

function AdminSettingsPage() {
  const router = useRouter()
  const initial = Route.useLoaderData().settings
  const [draft, setDraft] = useState<DraftShape>({
    siteName: initial.siteName,
    supportEmail: initial.supportEmail,
    supportPhone: initial.supportPhone ?? '',
    announcementBanner: initial.announcementBanner,
    signupsEnabled: initial.signupsEnabled,
    verificationGracePeriodDays: initial.verificationGracePeriodDays,
  })

  const dirty =
    draft.siteName !== initial.siteName ||
    draft.supportEmail !== initial.supportEmail ||
    (draft.supportPhone || '') !== (initial.supportPhone ?? '') ||
    draft.announcementBanner !== initial.announcementBanner ||
    draft.signupsEnabled !== initial.signupsEnabled ||
    draft.verificationGracePeriodDays !== initial.verificationGracePeriodDays

  const mut = useMutation({
    mutationFn: () =>
      adminUpdatePlatformSettings({
        data: {
          siteName: draft.siteName.trim(),
          supportEmail: draft.supportEmail.trim(),
          supportPhone: draft.supportPhone.trim() || null,
          announcementBanner: draft.announcementBanner,
          signupsEnabled: draft.signupsEnabled,
          verificationGracePeriodDays: draft.verificationGracePeriodDays,
        },
      }),
    onSuccess: () => {
      toast.success('Platform settings saved')
      router.invalidate()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not save'),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Site identity, support contact, public sign-ups and the dashboard announcement banner."
      />

      <Card>
        <CardContent className="space-y-5">
          <SectionHeader icon={Settings2} title="Identity" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                value={draft.siteName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, siteName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={draft.supportEmail}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, supportEmail: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supportPhone">Support phone (optional)</Label>
              <Input
                id="supportPhone"
                value={draft.supportPhone}
                placeholder="+1 555 0100"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, supportPhone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grace">Verification grace period (days)</Label>
              <Input
                id="grace"
                type="number"
                min={0}
                max={365}
                value={draft.verificationGracePeriodDays}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    verificationGracePeriodDays: e.target.value,
                  }))
                }
              />
              <p className="text-[12px] text-[var(--color-mm-subtle)]">
                Auto-suspend orgs without approved documents after this many days. 0 disables the check.
              </p>
            </div>
          </div>

          <Separator />

          <SectionHeader icon={Megaphone} title="Announcement banner" />
          <div className="space-y-1.5">
            <Label htmlFor="banner">Banner text</Label>
            <Textarea
              id="banner"
              value={draft.announcementBanner}
              maxLength={500}
              rows={2}
              onChange={(e) =>
                setDraft((d) => ({ ...d, announcementBanner: e.target.value }))
              }
              placeholder="Leave empty to hide the banner."
            />
            <p className="text-[12px] text-[var(--color-mm-subtle)]">
              Shown across the dashboard until cleared. Keep it short.
            </p>
          </div>

          <Separator />

          <SectionHeader icon={ShieldOff} title="Access control" />
          <div className="flex items-start gap-4 py-1">
            <div className="flex-1">
              <Label
                htmlFor="signups"
                className="text-[14px] font-semibold text-[var(--color-mm-ink)]"
              >
                Public sign-ups
              </Label>
              <p className="text-[12.5px] text-[var(--color-mm-subtle)] mt-0.5">
                When off, /sign-up returns a friendly closed-beta message. Existing users can still sign in.
              </p>
            </div>
            <Switch
              id="signups"
              checked={draft.signupsEnabled}
              onCheckedChange={(checked) =>
                setDraft((d) => ({ ...d, signupsEnabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[var(--color-mm-subtle)]">
              Last updated {formatDateTime(initial.updatedAt)}
            </p>
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                disabled={!dirty || mut.isPending}
                onClick={() =>
                  setDraft({
                    siteName: initial.siteName,
                    supportEmail: initial.supportEmail,
                    supportPhone: initial.supportPhone ?? '',
                    announcementBanner: initial.announcementBanner,
                    signupsEnabled: initial.signupsEnabled,
                    verificationGracePeriodDays:
                      initial.verificationGracePeriodDays,
                  })
                }
              >
                Reset
              </Button>
              <Button
                variant="primary"
                disabled={!dirty || mut.isPending}
                onClick={() => mut.mutate()}
              >
                {mut.isPending ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <SectionHeader icon={Tag} title="Feature flags" />
          <p className="text-[13px] text-[var(--color-mm-subtle)] leading-relaxed">
            Feature flags are reserved for staged roll-outs in production.
            Currently no flags are exposed in the UI.
          </p>
          <pre className="bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm p-3 text-[12px] text-[var(--color-mm-ink)] overflow-x-auto">
            {JSON.stringify(initial.featureFlags ?? {}, null, 2) || '{}'}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Settings2
  title: string
}) {
  return (
    <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
      {title}
    </div>
  )
}
