import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/**
 * Bare `/org/requests` redirects to the buyer-side outbox. The two real
 * pages live at `/org/requests/outgoing` (requests I sent as a buyer)
 * and `/org/requests/incoming` (requests against my listings as a seller),
 * so neither URL is a prefix of the other and the sidebar highlights
 * cleanly.
 *
 * Old bookmarks may carry filter state (`?q=…&status=…&expiry=…`) so we
 * validate against the same shape the outgoing page accepts and forward
 * the search params through, otherwise the redirect would silently strip
 * the user's filters.
 */
const forwardedSearchSchema = z
  .object({
    q: z.string().optional(),
    status: z.string().optional(),
    expiry: z.string().optional(),
  })
  .partial()

export const Route = createFileRoute('/org/requests/')({
  validateSearch: forwardedSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/org/requests/outgoing',
      search: search as Record<string, unknown>,
    })
  },
})
