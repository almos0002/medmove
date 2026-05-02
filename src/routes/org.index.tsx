import { createFileRoute } from '@tanstack/react-router'
import { isOrgOwner } from '@/lib/permissions'

export const Route = createFileRoute('/org/')({
  component: OrgHome,
})

function OrgHome() {
  const { session } = Route.useRouteContext()
  const user = session.user
  const primaryOrg = session.primaryOrg

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Organization console
        </h1>
        <p className="text-sm text-slate-600">
          Signed in as{' '}
          <span className="font-medium text-slate-900">{user?.email}</span> (
          {user?.role}
          {isOrgOwner(user?.role) ? ' — owner' : ''}).
        </p>
      </div>

      {primaryOrg ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Active capabilities
          </h2>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>
              List medicine:{' '}
              <span
                className={
                  primaryOrg.canListMedicine
                    ? 'text-emerald-700 font-medium'
                    : 'text-slate-400'
                }
              >
                {primaryOrg.canListMedicine ? 'enabled' : 'disabled'}
              </span>
            </li>
            <li>
              Request medicine:{' '}
              <span
                className={
                  primaryOrg.canRequestMedicine
                    ? 'text-emerald-700 font-medium'
                    : 'text-slate-400'
                }
              >
                {primaryOrg.canRequestMedicine ? 'enabled' : 'disabled'}
              </span>
            </li>
            <li>
              Deliver medicine:{' '}
              <span
                className={
                  primaryOrg.canDeliverMedicine
                    ? 'text-emerald-700 font-medium'
                    : 'text-slate-400'
                }
              >
                {primaryOrg.canDeliverMedicine ? 'enabled' : 'disabled'}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Capabilities are managed by MedMove admins. Verification status:{' '}
            <span className="font-medium text-slate-700">
              {primaryOrg.verificationStatus}
            </span>
            .
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          You are not yet linked to an organization. Ask your owner to invite
          you, or create one if you are the owner.
        </p>
      )}
    </div>
  )
}
