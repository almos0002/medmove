import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/logistics/')({
  component: LogisticsHome,
})

function LogisticsHome() {
  const { session } = Route.useRouteContext()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-900">
        Logistics console
      </h1>
      <p className="text-sm text-slate-600">
        Signed in as{' '}
        <span className="font-medium text-slate-900">
          {session.user?.email}
        </span>{' '}
        ({session.user?.role}).
      </p>
      <p className="text-sm text-slate-500">
        Assigned deliveries (read + dispatch progress) will be listed here.
      </p>
    </div>
  )
}
