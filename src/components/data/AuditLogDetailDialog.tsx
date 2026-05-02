import * as React from 'react'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AuditEventBadge } from '@/components/data/AuditEventBadge'
import { AUDIT_ENTITY_LABELS, type AuditEntityType } from '@/lib/audit-events'

export type AuditLogDetailRow = {
  log: {
    id: string
    actorUserId: string | null
    actorOrgId: string | null
    action: string
    entityType: string
    entityId: string
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date | string
  }
  actorUser: {
    id: string | null
    email: string | null
    name: string | null
    role: string | null
  } | null
  actorOrg: {
    id: string | null
    name: string | null
    type: string | null
  } | null
}

/**
 * Modal showing the full payload of a single audit log row — actor, entity,
 * before/after diff, metadata, IP/UA. Read-only by design.
 */
export function AuditLogDetailDialog({
  row,
  open,
  onOpenChange,
}: {
  row: AuditLogDetailRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto app-scroll">
        <DialogHeader>
          <DialogTitle>Audit event</DialogTitle>
          <DialogDescription>
            {row
              ? format(new Date(row.log.createdAt), 'd MMM yyyy, HH:mm:ss')
              : '—'}
          </DialogDescription>
        </DialogHeader>

        {!row ? (
          <p className="text-sm text-[var(--color-mm-subtle)]">
            Loading entry…
          </p>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <AuditEventBadge action={row.log.action} />
              <span className="text-[12px] text-[var(--color-mm-subtle)] font-mono">
                {row.log.action}
              </span>
            </div>

            <Section title="Actor">
              <DefRow label="User">
                {row.actorUser?.email ? (
                  <span>
                    <span className="font-medium">
                      {row.actorUser.email}
                    </span>
                    {row.actorUser.role && (
                      <span className="ml-2 text-[12px] text-[var(--color-mm-subtle)] capitalize">
                        ({row.actorUser.role.replace(/_/g, ' ')})
                      </span>
                    )}
                  </span>
                ) : (
                  <Muted>System</Muted>
                )}
              </DefRow>
              <DefRow label="Organization">
                {row.actorOrg?.name ? (
                  <Link
                    to="/admin/organizations/$orgId"
                    params={{ orgId: row.actorOrg.id ?? '' }}
                    className="text-[var(--color-mm-accent)] hover:underline inline-flex items-center gap-1"
                  >
                    {row.actorOrg.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <Muted>—</Muted>
                )}
              </DefRow>
              <DefRow label="IP">
                {row.log.ipAddress ? (
                  <span className="font-mono text-[12.5px]">
                    {row.log.ipAddress}
                  </span>
                ) : (
                  <Muted>—</Muted>
                )}
              </DefRow>
              <DefRow label="User agent">
                {row.log.userAgent ? (
                  <span className="text-[12.5px] text-[var(--color-mm-muted)] break-all">
                    {row.log.userAgent}
                  </span>
                ) : (
                  <Muted>—</Muted>
                )}
              </DefRow>
            </Section>

            <Section title="Entity">
              <DefRow label="Type">
                {AUDIT_ENTITY_LABELS[row.log.entityType as AuditEntityType] ??
                  row.log.entityType}
              </DefRow>
              <DefRow label="ID">
                <span className="font-mono text-[12.5px] break-all">
                  {row.log.entityId}
                </span>
              </DefRow>
            </Section>

            {row.log.metadata && Object.keys(row.log.metadata).length > 0 && (
              <Section title="Metadata">
                <JsonBlock value={row.log.metadata} />
              </Section>
            )}

            {(row.log.before || row.log.after) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Section title="Before">
                  {row.log.before ? (
                    <JsonBlock value={row.log.before} />
                  ) : (
                    <Muted>No prior state</Muted>
                  )}
                </Section>
                <Section title="After">
                  {row.log.after ? (
                    <JsonBlock value={row.log.after} />
                  ) : (
                    <Muted>No payload</Muted>
                  )}
                </Section>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <div className="bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm p-3 space-y-1.5">
        {children}
      </div>
    </div>
  )
}

function DefRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3 text-[13px]">
      <div className="text-[var(--color-mm-subtle)] uppercase tracking-wide text-[11px] pt-0.5">
        {label}
      </div>
      <div className="text-[var(--color-mm-ink)] min-w-0 break-words">
        {children}
      </div>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[var(--color-mm-subtle)]">{children}</span>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-[11.5px] text-[var(--color-mm-muted)] font-mono whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto app-scroll">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
