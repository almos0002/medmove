import { AppError } from './errors'

export const ORG_TRANSITIONS = {
  pending: ['verified', 'rejected'],
  rejected: ['pending', 'verified'],
  verified: ['suspended'],
  suspended: ['verified'],
} as const

export const LISTING_TRANSITIONS = {
  draft: ['pending_admin', 'withdrawn'],
  pending_admin: ['active', 'rejected'],
  active: ['sold_out', 'expired', 'withdrawn'],
  rejected: [],
  sold_out: ['active'],
  expired: [],
  withdrawn: [],
} as const

export const TRANSFER_TRANSITIONS = {
  pending_admin: ['rejected', 'pending_seller', 'cancelled', 'expired'],
  rejected: [],
  pending_seller: ['accepted', 'declined', 'cancelled', 'expired'],
  declined: [],
  accepted: ['awaiting_handoff', 'cancelled'],
  awaiting_handoff: ['dispatched', 'cancelled'],
  dispatched: ['completed'],
  completed: [],
  expired: [],
  cancelled: [],
} as const

export const DELIVERY_TRANSITIONS = {
  scheduled: ['in_transit'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['disputed'],
  disputed: [],
} as const

export function assertTransition<
  T extends Record<string, ReadonlyArray<string>>,
>(map: T, from: keyof T, to: string): void {
  const allowed = map[from] as ReadonlyArray<string> | undefined
  if (!allowed || !allowed.includes(to)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Transition not allowed: ${String(from)} → ${to}`,
    )
  }
}
