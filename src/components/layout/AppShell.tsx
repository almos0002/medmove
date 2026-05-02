import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Boxes,
  Building2,
  Inbox,
  LayoutDashboard,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Truck,
  LogOut,
  type LucideIcon,
  FileCheck2,
  Tags,
} from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { isAdminRole, type AppRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { VerificationStatusBadge } from '@/components/data/StatusBadge'

export type ShellSection = 'app' | 'admin' | 'logistics'

type SessionShape = {
  user: { id: string; email: string; role: AppRole } | null
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
  show?: (s: SessionShape) => boolean
}

const APP_NAV: NavItem[] = [
  { to: '/org', label: 'Overview', icon: LayoutDashboard },
  { to: '/org/inventory', label: 'Inventory', icon: Boxes },
  { to: '/org/listings', label: 'Listings', icon: Tags },
  {
    to: '/org/marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    // Show to all orgs that can request medicine — the page itself surfaces an
    // "unverified" banner so the verification flow is discoverable from here.
    show: (s) => !!s.primaryOrg?.canRequestMedicine,
  },
  {
    to: '/org/requests',
    label: 'My requests',
    icon: Inbox,
    show: (s) => !!s.primaryOrg?.canRequestMedicine,
  },
  { to: '/org/profile', label: 'Organization', icon: Building2 },
  { to: '/org/documents', label: 'Documents', icon: FileCheck2 },
]
const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { to: '/admin/medicines', label: 'Medicines', icon: Pill },
  { to: '/admin/listings', label: 'Listings', icon: Tags },
  { to: '/admin/requests', label: 'Transfers', icon: Inbox },
]
const LOGISTICS_NAV: NavItem[] = [
  { to: '/logistics', label: 'Assigned deliveries', icon: Truck },
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
  const navItems =
    section === 'admin'
      ? ADMIN_NAV
      : section === 'logistics'
        ? LOGISTICS_NAV
        : APP_NAV
  const filtered = navItems.filter((n) => n.show?.(session) ?? true)

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--color-mm-line)] bg-white">
        <Link
          to="/"
          className="px-5 py-5 flex items-center gap-2.5 border-b border-[var(--color-mm-line)]"
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

        <nav className="px-3 py-4 flex-1 app-scroll overflow-y-auto">
          <ul className="space-y-1">
            {filtered.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{
                      exact:
                        item.to === '/org' ||
                        item.to === '/admin' ||
                        item.to === '/logistics',
                    }}
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
        </nav>

        <div className="border-t border-[var(--color-mm-line)] p-3">
          <UserCard session={session} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          section={section}
          session={session}
          onSignOut={async () => {
            await signOut()
            navigate({ to: '/sign-in', search: {} })
          }}
        />
        <main className="flex-1 px-5 sm:px-8 py-8 max-w-6xl w-full mx-auto">
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
          {session.user && (
            <span className="hidden sm:block text-[13px] text-[var(--color-mm-subtle)] truncate max-w-[220px]">
              {session.user.email}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

function UserCard({ session }: { session: SessionShape }) {
  const u = session.user
  if (!u) return null
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="h-9 w-9 squircle-xs bg-[var(--color-mm-accent)] text-white inline-flex items-center justify-center text-[13px] font-semibold">
        {(u.email[0] ?? 'U').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[var(--color-mm-ink)] truncate">
          {u.email}
        </div>
        <div className="text-[11.5px] text-[var(--color-mm-subtle)] mt-0.5 capitalize">
          {u.role.replace(/_/g, ' ')}
        </div>
      </div>
    </div>
  )
}
