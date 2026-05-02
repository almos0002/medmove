import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/seller/')({
  component: SellerHome,
})

function SellerHome() {
  const { session } = Route.useRouteContext()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-900">Seller console</h1>
      <p className="text-sm text-slate-600">
        Signed in as{' '}
        <span className="font-medium text-slate-900">
          {session.user?.email}
        </span>{' '}
        ({session.user?.role}).
      </p>
      <p className="text-sm text-slate-500">
        Inventory and listing management screens will be added here.
      </p>
    </div>
  )
}
