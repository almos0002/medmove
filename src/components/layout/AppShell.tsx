import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Pill,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  LogOut,
  type LucideIcon,
  FileCheck2,
  Tags,
  User as UserIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/auth-client'
import { isAdminRole, type AppRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { VerificationStatusBadge } from '@/components/data/StatusBadge'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export type ShellSection = 'app' | 'admin' | 'logistics'

type SessionShape = {
  user: {
    id: string
    email: string
    role: AppRole
    name?: string | null
  } | null
  primaryOrg: {
    id: string
    type: string
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
    canListMedicine: boolean
    canRequestMedicine: boolean
    canDeliverMedicine: boolean
  } | null
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Use exact-match for the active highlight (default: false). */
  exact?: boolean
  show?: (s: SessionShape) => boolean
}

type NavSection = {
  /** Optional header. When omitted, items render flush with no label. */
  title?: string
  /** Hide the entire section (and its header) when this returns false. */
  show?: (s: SessionShape) => boolean
  items: NavItem[]
}

/**
 * Sidebar groups the org workspace by *which hat you're wearing* so the
 * lifecycle stages don't look like duplicates:
 *
 *   - "Selling" surfaces the seller's own goods + the inbox of buyer
 *     requests + outbound shipments leaving their warehouse.
 *   - "Buying" surfaces the marketplace + the outbox of requests they've
 *     sent + inbound shipments arriving at their warehouse.
 *
 * A single transfer flows through both stages: a seller's *Incoming
 * request* becomes their *Outgoing delivery* once accepted; a buyer's
 * *My request* becomes their *Incoming delivery* once shipped.
 */
const APP_NAV_SECTIONS: NavSection[] = [
  {
    items: [{ to: '/org', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    title: 'Selling',
    show: (s) => !!s.primaryOrg?.canListMedicine,
    items: [
      { to: '/org/inventory', label: 'Inventory', icon: Boxes },
      { to: '/org/listings', label: 'My listings', icon: Tags },
      {
        to: '/org/requests/incoming',
        label: 'Incoming requests',
        icon: Inbox,
      },
      {
        to: '/org/deliveries/outgoing',
        label: 'Outgoing deliveries',
        icon: Truck,
      },
    ],
  },
  {
    title: 'Buying',
    show: (s) => !!s.primaryOrg?.canRequestMedicine,
    items: [
      { to: '/org/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { to: '/org/requests/outgoing', label: 'My requests', icon: Inbox },
      {
        to: '/org/deliveries/incoming',
        label: 'Incoming deliveries',
        icon: Truck,
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      { to: '/org/profile', label: 'Profile', icon: Building2 },
      { to: '/org/documents', label: 'Documents', icon: FileCheck2 },
      { to: '/org/activity', label: 'Activity', icon: Activity },
      { to: '/org/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
      { to: '/admin/medicines', label: 'Medicines', icon: Pill },
      { to: '/admin/listings', label: 'Listings', icon: Tags },
      { to: '/admin/requests', label: 'Transfers', icon: Inbox },
      { to: '/admin/deliveries', label: 'Deliveries', icon: Truck },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
      { to: '/admin/settings', label: 'Platform settings', icon: Settings },
    ],
  },
]

const LOGISTICS_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      {
        to: '/logistics',
        label: 'Assigned deliveries',
        icon: Truck,
        exact: true,
      },
    ],
  },
]

const SECTION_TITLE: Record<ShellSection, string> = {
  app: 'Workspace',
  admin: 'Admin',
  logistics: 'Logistics',
}

export function AppShell({
  section,
  session,
  children,
}: {
  section: ShellSection
  session: SessionShape
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const navSections =
    section === 'admin'
      ? ADMIN_NAV_SECTIONS
      : section === 'logistics'
        ? LOGISTICS_NAV_SECTIONS
        : APP_NAV_SECTIONS
  // Filter section-by-section: drop the whole section if its `show` returns
  // false, then drop individual items by their own `show`. Sections that end
  // up empty are dropped too so we don't render an orphan header.
  const visibleSections = navSections
    .filter((sec) => sec.show?.(session) ?? true)
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => it.show?.(session) ?? true),
    }))
    .filter((sec) => sec.items.length > 0)

  const handleSignOut = React.useCallback(async () => {
    await signOut()
    navigate({ to: '/sign-in', search: {} })
  }, [navigate])

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--color-mm-line)] bg-white sticky top-0 h-screen">
        <Link
          to="/"
          className="px-5 py-5 flex items-center gap-2.5 border-b border-[var(--color-mm-line)] shrink-0"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div>
            <div className="font-display text-[18px] leading-none text-[var(--color-mm-accent)]">
              MedMove
            </div>
            <div className="text-[11px] text-[var(--color-mm-subtle)] mt-1">
              {SECTION_TITLE[section]}
            </div>
          </div>
        </Link>

        <nav className="px-3 py-4 flex-1 app-scroll overflow-y-auto min-h-0 space-y-5">
          {visibleSections.map((sec, secIdx) => (
            <div key={sec.title ?? `sec-${secIdx}`}>
              {sec.title && (
                <div className="px-3 mb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-mm-subtle)] font-semibold">
                  {sec.title}
                </div>
              )}
              <ul className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.exact ?? false }}
                        activeProps={{
                          className:
                            'bg-[var(--color-mm-accent)] text-white border-[var(--color-mm-accent)] hover:bg-[var(--color-mm-accent)]',
                        }}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-[var(--color-mm-ink)] squircle-sm border border-transparent transition-colors',
                          'hover:bg-black/[0.04]',
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--color-mm-line)] p-3 shrink-0">
          <SidebarUserCard session={session} onSignOut={handleSignOut} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          section={section}
          session={session}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 px-5 sm:px-8 py-8 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

function TopBar({
  section,
  session,
  onSignOut,
}: {
  section: ShellSection
  session: SessionShape
  onSignOut: () => void
}) {
  const isAdmin = isAdminRole(session.user?.role)
  const showAdminBanner = section === 'app' && isAdmin
  return (
    <header className="border-b border-[var(--color-mm-line)] bg-white">
      {showAdminBanner && (
        <div className="border-b border-[var(--color-mm-warn)] bg-white text-[12.5px] px-5 sm:px-8 py-2 text-center text-[var(--color-mm-warn)]">
          Admin view — actions are recorded against your admin account.
        </div>
      )}
      <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {section === 'app' && session.primaryOrg && (
            <VerificationStatusBadge status={session.primaryOrg.verificationStatus} />
          )}
          {section === 'admin' && (
            <span className="text-[13px] font-semibold text-[var(--color-mm-ink)]">
              Admin console
            </span>
          )}
          {section === 'logistics' && (
            <span className="text-[13px] font-semibold text-[var(--color-mm-ink)]">
              Logistics
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {session.user && <NotificationBell />}
          {session.user && (
            <UserMenu user={session.user} onSignOut={onSignOut} />
          )}
        </div>
      </div>
    </header>
  )
}

/** Items shown in both the sidebar dropdown and the top-bar dropdown so
 *  the two surfaces stay in lock-step. */
function UserMenuItems({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link to="/profile" className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" strokeWidth={1.6} />
          Profile
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/account" className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" strokeWidth={1.6} />
          Account & security
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/account/notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" strokeWidth={1.6} />
          Notification preferences
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={onSignOut}
        className="text-[var(--color-mm-bad)]"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.6} />
        Sign out
      </DropdownMenuItem>
    </>
  )
}

function UserMenu({
  user,
  onSignOut,
}: {
  user: NonNullable<SessionShape['user']>
  onSignOut: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 squircle-xs h-9 px-2.5 hover:bg-black/[0.04] focus-ring"
        >
          <span className="h-7 w-7 squircle-xs bg-[var(--color-mm-accent)] text-white inline-flex items-center justify-center text-[12px] font-semibold">
            {(user.email[0] ?? 'U').toUpperCase()}
          </span>
          <span className="hidden sm:inline text-[13px] text-[var(--color-mm-ink)] truncate max-w-[160px]">
            {user.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-mm-subtle)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            {user.name && (
              <div className="text-[13px] font-medium text-[var(--color-mm-ink)] truncate">
                {user.name}
              </div>
            )}
            <div
              className={cn(
                user.name
                  ? 'text-[12px] text-[var(--color-mm-subtle)] truncate'
                  : 'text-[13px] font-medium text-[var(--color-mm-ink)] truncate',
              )}
            >
              {user.email}
            </div>
            <div className="text-[11.5px] text-[var(--color-mm-subtle)] capitalize">
              {user.role.replace(/_/g, ' ')}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <UserMenuItems onSignOut={onSignOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Pinned profile block at the bottom of the sidebar. Click opens the
 *  same menu the top-bar avatar exposes so the two surfaces are in
 *  lock-step (Profile / Account / Notifications / Sign out). */
function SidebarUserCard({
  session,
  onSignOut,
}: {
  session: SessionShape
  onSignOut: () => void
}) {
  const u = session.user
  if (!u) return null
  const displayName = u.name || u.email
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-2 squircle-sm border border-transparent hover:border-[var(--color-mm-line-strong)] hover:bg-black/[0.03] focus-ring text-left transition-colors"
          aria-label="Account menu"
        >
          <span className="h-9 w-9 squircle-xs bg-[var(--color-mm-accent)] text-white inline-flex items-center justify-center text-[13px] font-semibold shrink-0">
            {(displayName[0] ?? 'U').toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-[var(--color-mm-ink)] truncate">
              {displayName}
            </span>
            <span className="block text-[11.5px] text-[var(--color-mm-subtle)] mt-0.5 capitalize truncate">
              {u.role.replace(/_/g, ' ')}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-mm-subtle)] shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="min-w-[240px]"
      >
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            <div className="text-[13px] font-medium text-[var(--color-mm-ink)] truncate">
              {displayName}
            </div>
            {u.name && (
              <div className="text-[12px] text-[var(--color-mm-subtle)] truncate">
                {u.email}
              </div>
            )}
            <div className="text-[11.5px] text-[var(--color-mm-subtle)] capitalize">
              {u.role.replace(/_/g, ' ')}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <UserMenuItems onSignOut={onSignOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
