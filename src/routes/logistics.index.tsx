import { createFileRoute } from '@tanstack/react-router'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/feedback/EmptyState'

export const Route = createFileRoute('/logistics/')({
  component: LogisticsHome,
})

function LogisticsHome() {
  const { session } = Route.useRouteContext()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned deliveries"
        description={
          <>
            Signed in as{' '}
            <span className="font-medium text-[var(--color-mm-ink)]">
              {session.user?.email}
            </span>
            .
          </>
        }
      />
      <EmptyState
        icon={Truck}
        title="No deliveries assigned"
        description="Deliveries assigned by admin will appear here. The full delivery workflow ships in the next milestone."
      />
    </div>
  )
}
