import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { UnauthorizedPage } from '@/components/feedback/UnauthorizedPage'

/**
 * Generic 403 surface. Linked from any guard that wants to give the user
 * a friendly explanation rather than silently bouncing them to the
 * dashboard. Mostly used by ad-hoc beforeLoad checks (e.g. trying to
 * open `/admin/...` as an org owner).
 */
export const Route = createFileRoute('/unauthorized')({
  head: pageHead({ title: "Unauthorized", noindex: true }),
  component: UnauthorizedPage,
})
