import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  LogOut,
  Users,
  type LucideIcon,
  FileCheck2,
} from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { ROLES, isAdminRole, type AppRole } from '@/lib/permissions'
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
  { to: '/org/profile', label: 'Organization', icon: Building2 },
  { to: '/org/documents', label: 'Documents', icon: FileCheck2 },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
]

const LOGISTICS_NAV: NavItem[] = [
  { to: '/logistics', label: 'Assigned deliveries', icon: Truck },
]

const SECTION_TITLE: Record<ShellSection, string> = {
  app: 'Workspace',
  admin: 'Admin console',
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
    <div className="min-h-screen flex bg-[var(--color-mm-canvas)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--color-mm-line)] bg-[var(--color-mm-surface)]">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="h-8 w-8 inline-flex items-center justify-center bg-[var(--color-mm-accent)] text-white squircle">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-mm-ink)]">
              MedMove
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-mm-subtle)]">
              {SECTION_TITLE[section]}
            </div>
          </div>
        </div>
        <nav className="px-3 pb-2 flex-1 app-scroll overflow-y-auto">
          <ul className="space-y-0.5">
            {filtered.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.to === '/org' || item.to === '/admin' || item.to === '/logistics' }}
                    activeProps={{
                      className:
                        'bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)]',
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--color-mm-muted)] squircle',
                      'hover:bg-[var(--color-mm-canvas)]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          section={section}
          session={session}
          onSignOut={async () => {
            await signOut()
            navigate({ to: '/sign-in', search: {} })
          }}
        />
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto">
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
    <header className="border-b border-[var(--color-mm-line)] bg-[var(--color-mm-surface)]">
      {showAdminBanner && (
        <div className="bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)] text-xs px-6 py-1.5 text-center">
          Viewing organization workspace as admin — actions you take are
          recorded against your admin account.
        </div>
      )}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {section === 'app' && session.primaryOrg && (
            <VerificationStatusBadge status={session.primaryOrg.verificationStatus} />
          )}
          {section === 'admin' && (
            <span className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {session.user && (
            <span className="hidden sm:block text-xs text-[var(--color-mm-muted)] truncate max-w-[180px]">
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
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="h-8 w-8 squircle bg-[var(--color-mm-canvas)] inline-flex items-center justify-center text-xs font-semibold text-[var(--color-mm-ink)]">
        {(u.email[0] ?? 'U').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-[var(--color-mm-ink)] truncate">
          {u.email}
        </div>
        <div className="text-[11px] text-[var(--color-mm-subtle)] capitalize">
          {u.role.replace('_', ' ')}
        </div>
      </div>
      {u.role === ROLES.ORG_OWNER && (
        <Users
          className="h-3.5 w-3.5 text-[var(--color-mm-accent)]"
          aria-label="Owner"
        />
      )}
    </div>
  )
}
