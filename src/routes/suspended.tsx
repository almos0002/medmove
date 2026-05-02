import { createFileRoute, redirect } from '@tanstack/react-router'
import { getServerSession } from '@/server/functions/session'
import { getMyOrganization } from '@/server/functions/organizations'
import { getPlatformSettings } from '@/server/functions/platformSettings'
import { SuspendedOrgPage } from '@/components/feedback/SuspendedOrgPage'

/**
 * Informational landing for suspended organizations. The `/org` guard
 * redirects here when `primaryOrg.verificationStatus === 'suspended'`.
 *
 * If the user lands here without a suspended primary org we send them
 * back to the dashboard so they don't get stuck.
 */
export const Route = createFileRoute('/suspended')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/suspended' } })
    }
    if (
      !session.primaryOrg ||
      session.primaryOrg.verificationStatus !== 'suspended'
    ) {
      throw redirect({ to: '/dashboard' })
    }
    return { session }
  },
  loader: async () => {
    const [orgRes, settingsRes] = await Promise.all([
      getMyOrganization(),
      getPlatformSettings(),
    ])
    return { org: orgRes.organization, settings: settingsRes.settings }
  },
  component: SuspendedRoute,
})

function SuspendedRoute() {
  const { org, settings } = Route.useLoaderData()
  return (
    <SuspendedOrgPage
      orgName={org?.name ?? 'Your organization'}
      reason={org?.rejectionReason ?? null}
      supportEmail={settings.supportEmail}
    />
  )
}
