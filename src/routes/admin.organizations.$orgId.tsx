import {
  createFileRoute,
  Link,
  useRouter,
} from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  adminApproveDocument,
  adminApproveOrganization,
  adminGetOrganizationById,
  adminRejectDocument,
  adminRejectOrganization,
  adminSuspendOrganization,
  adminUpdateOrganizationCapabilities,
} from '@/server/functions/organizations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import {
  DocStatusBadge,
  type DocStatus,
  VerificationStatusBadge,
  type OrgVerificationStatus,
} from '@/components/data/StatusBadge'
import { OrgTypeBadge } from '@/components/data/OrgTypeBadge'

export const Route = createFileRoute('/admin/organizations/$orgId')({
  loader: ({ params }) =>
    adminGetOrganizationById({ data: { organizationId: params.orgId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AdminOrgDetail,
})

function AdminOrgDetail() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const org = data.organization
  const docs = data.documents
  const status = org.verificationStatus as OrgVerificationStatus

  const refresh = () => router.invalidate()

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
        <Link to="/admin/organizations">
          <ArrowLeft className="h-4 w-4" />
          Back to organizations
        </Link>
      </Button>

      <PageHeader
        title={org.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <OrgTypeBadge type={org.type} />
            <span className="text-[var(--color-mm-subtle)]">·</span>
            <span>{org.contactEmail}</span>
            <span className="text-[var(--color-mm-subtle)]">·</span>
            <span>
              {org.city}, {org.country}
            </span>
            <span className="text-[var(--color-mm-subtle)]">·</span>
            <span>{data.memberCount} member(s)</span>
          </span>
        }
        actions={<VerificationStatusBadge status={status} />}
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(status === 'pending' || status === 'rejected') && (
          <ApproveDialog
            orgName={org.name}
            organizationId={org.id}
            onDone={refresh}
          />
        )}
        {status === 'pending' && (
          <RejectDialog
            orgName={org.name}
            organizationId={org.id}
            onDone={refresh}
          />
        )}
        {status === 'verified' && (
          <SuspendDialog
            orgName={org.name}
            organizationId={org.id}
            onDone={refresh}
          />
        )}
        {status === 'suspended' && (
          <ApproveDialog
            orgName={org.name}
            organizationId={org.id}
            label="Reinstate organization"
            onDone={refresh}
          />
        )}
      </div>

      {/* Profile + verification trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5">
            <SectionHeading
              icon={Building2}
              title="Profile"
              description="Submitted by the organization owner."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Licence number" value={org.licenseNumber} mono />
              <Field
                label="Registered"
                value={new Date(org.createdAt).toLocaleString()}
              />
              <Field label="Contact phone" value={org.contactPhone} />
              <Field label="Contact email" value={org.contactEmail} />
              <Field
                label="Address"
                value={
                  <div className="space-y-0.5 text-sm">
                    <div>{org.addressLine1}</div>
                    {org.addressLine2 && <div>{org.addressLine2}</div>}
                    <div>
                      {org.city}
                      {org.state ? `, ${org.state}` : ''}
                      {org.postalCode ? ` ${org.postalCode}` : ''}
                    </div>
                    <div>{org.country}</div>
                  </div>
                }
              />
              {status === 'rejected' && org.rejectionReason && (
                <Field
                  label="Rejection reason"
                  value={
                    <span className="text-[var(--color-mm-bad)]">
                      {org.rejectionReason}
                    </span>
                  }
                />
              )}
              {status === 'suspended' && org.suspensionReason && (
                <Field
                  label="Suspension reason"
                  value={
                    <span className="text-[var(--color-mm-cool)]">
                      {org.suspensionReason}
                    </span>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeading
              icon={ShieldCheck}
              title="Capabilities"
              description="Toggle the actions this organization can perform once verified."
            />
            <CapabilityToggles
              orgId={org.id}
              canListMedicine={org.canListMedicine}
              canRequestMedicine={org.canRequestMedicine}
              canDeliverMedicine={org.canDeliverMedicine}
              onDone={refresh}
            />
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardContent className="space-y-4">
          <SectionHeading
            icon={FileText}
            title="Verification documents"
            description="At least one approved pharmacy licence or business registration is required to verify."
          />
          {docs.length === 0 ? (
            <p className="text-sm text-[var(--color-mm-subtle)]">
              No documents have been uploaded yet.
            </p>
          ) : (
            <ul className="-mx-6 divide-y divide-[var(--color-mm-line)]">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="px-6 py-4 flex items-start gap-4 flex-wrap"
                >
                  <div className="h-10 w-10 inline-flex items-center justify-center bg-[var(--color-mm-canvas)] squircle shrink-0">
                    <FileText className="h-5 w-5 text-[var(--color-mm-muted)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--color-mm-ink)] truncate">
                      {doc.fileName}
                    </div>
                    <div className="text-xs text-[var(--color-mm-muted)]">
                      {doc.documentType.replace(/_/g, ' ')} ·{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                    {doc.reviewNotes && (
                      <div className="mt-2 text-xs text-[var(--color-mm-muted)] bg-[var(--color-mm-canvas)] px-2.5 py-1.5 squircle-xs inline-block">
                        Reviewer: {doc.reviewNotes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <DocStatusBadge status={doc.status as DocStatus} />
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-mm-accent)] hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {doc.status === 'pending' && (
                      <DocReviewActions docId={doc.id} onDone={refresh} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <div className="h-8 w-8 inline-flex items-center justify-center bg-[var(--color-mm-canvas)] squircle shrink-0">
        <Icon className="h-4 w-4 text-[var(--color-mm-muted)]" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-mm-ink)]">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-[var(--color-mm-muted)] mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)] mb-1">
        {label}
      </div>
      <div
        className={
          mono
            ? 'text-sm font-mono text-[var(--color-mm-ink)] break-all'
            : 'text-sm text-[var(--color-mm-ink)] break-words'
        }
      >
        {value}
      </div>
    </div>
  )
}

// ─── Capability toggles ───────────────────────────────────────────────────

function CapabilityToggles({
  orgId,
  canListMedicine,
  canRequestMedicine,
  canDeliverMedicine,
  onDone,
}: {
  orgId: string
  canListMedicine: boolean
  canRequestMedicine: boolean
  canDeliverMedicine: boolean
  onDone: () => void
}) {
  const update = useMutation({
    mutationFn: (
      patch: Partial<{
        canListMedicine: boolean
        canRequestMedicine: boolean
        canDeliverMedicine: boolean
      }> & { capabilityLabel: string },
    ) => {
      const { capabilityLabel: _label, ...rest } = patch
      return adminUpdateOrganizationCapabilities({
        data: { organizationId: orgId, ...rest },
      })
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.capabilityLabel} updated`)
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Update failed'
      toast.error('Capability change failed', { description: msg })
    },
  })

  return (
    <div className="mt-4 space-y-2">
      <ToggleRow
        label="List medicine"
        description="Org may publish surplus inventory as listings."
        checked={canListMedicine}
        disabled={update.isPending}
        onChange={(v) =>
          update.mutate({
            canListMedicine: v,
            capabilityLabel: 'List medicine',
          })
        }
      />
      <Separator />
      <ToggleRow
        label="Request medicine"
        description="Org may request transfers from listings on the network."
        checked={canRequestMedicine}
        disabled={update.isPending}
        onChange={(v) =>
          update.mutate({
            canRequestMedicine: v,
            capabilityLabel: 'Request medicine',
          })
        }
      />
      <Separator />
      <ToggleRow
        label="Deliver medicine"
        description="Org may handle deliveries for transfers it’s assigned to."
        checked={canDeliverMedicine}
        disabled={update.isPending}
        onChange={(v) =>
          update.mutate({
            canDeliverMedicine: v,
            capabilityLabel: 'Deliver medicine',
          })
        }
      />
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-mm-ink)]">
          {label}
        </div>
        <div className="text-xs text-[var(--color-mm-muted)] mt-0.5">
          {description}
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

// ─── Approve / reject / suspend dialogs ───────────────────────────────────

const reasonSchema = z.object({ reason: z.string().trim().min(1).max(500) })
const optionalReasonSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

function ApproveDialog({
  orgName,
  organizationId,
  label = 'Verify organization',
  onDone,
}: {
  orgName: string
  organizationId: string
  label?: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<{ reason?: string }>({
    resolver: zodResolver(optionalReasonSchema),
    defaultValues: { reason: '' },
  })
  const m = useMutation({
    mutationFn: (v: { reason?: string }) =>
      adminApproveOrganization({
        data: { organizationId, reason: v.reason },
      }),
    onSuccess: () => {
      toast.success(`${orgName} is now verified`)
      setOpen(false)
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Verification failed'
      toast.error('Cannot verify organization', { description: msg })
    },
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CheckCircle2 className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            This unlocks medicine actions allowed by the org’s capability
            flags. Requires at least one approved pharmacy licence or
            business registration on file.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => m.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="approve-note">Internal note (optional)</Label>
            <Textarea
              id="approve-note"
              placeholder="Anything to add to the audit log…"
              {...form.register('reason')}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  orgName,
  organizationId,
  onDone,
}: {
  orgName: string
  organizationId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })
  const m = useMutation({
    mutationFn: (v: { reason: string }) =>
      adminRejectOrganization({
        data: { organizationId, reason: v.reason },
      }),
    onSuccess: () => {
      toast.success(`${orgName} marked rejected`)
      setOpen(false)
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Reject failed'
      toast.error('Cannot reject organization', { description: msg })
    },
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {orgName}</DialogTitle>
          <DialogDescription>
            The organization owner will see this reason and can address it
            before re-submitting.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => m.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Pharmacy licence is expired — please re-upload a current one."
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-[var(--color-mm-bad)]">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={m.isPending}>
              Reject organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SuspendDialog({
  orgName,
  organizationId,
  onDone,
}: {
  orgName: string
  organizationId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })
  const m = useMutation({
    mutationFn: (v: { reason: string }) =>
      adminSuspendOrganization({
        data: { organizationId, reason: v.reason },
      }),
    onSuccess: () => {
      toast.success(`${orgName} suspended`)
      setOpen(false)
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Suspension failed'
      toast.error('Cannot suspend organization', { description: msg })
    },
  })
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <PauseCircle className="h-4 w-4" />
          Suspend
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend {orgName}?</AlertDialogTitle>
          <AlertDialogDescription>
            All medicine actions for this organization will be paused
            immediately. Provide a reason for the audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => m.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Input
              id="suspend-reason"
              placeholder="e.g. Compliance review opened on 2026-01-15"
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-[var(--color-mm-bad)]">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="submit" variant="danger" loading={m.isPending}>
                Confirm suspension
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DocReviewActions({
  docId,
  onDone,
}: {
  docId: string
  onDone: () => void
}) {
  const approve = useMutation({
    mutationFn: () => adminApproveDocument({ data: { documentId: docId } }),
    onSuccess: () => {
      toast.success('Document approved')
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Approval failed'
      toast.error('Cannot approve document', { description: msg })
    },
  })

  const [rejectOpen, setRejectOpen] = useState(false)
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })
  const reject = useMutation({
    mutationFn: (v: { reason: string }) =>
      adminRejectDocument({ data: { documentId: docId, reason: v.reason } }),
    onSuccess: () => {
      toast.success('Document rejected')
      setRejectOpen(false)
      onDone()
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Reject failed'
      toast.error('Cannot reject document', { description: msg })
    },
  })

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        loading={approve.isPending}
        onClick={() => approve.mutate()}
      >
        Approve
      </Button>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              The uploader will see this note and can re-upload a corrected
              file.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((v) => reject.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`doc-reject-${docId}`}>Reason</Label>
              <Textarea
                id={`doc-reject-${docId}`}
                placeholder="e.g. Image is too blurry to read the licence number."
                {...form.register('reason')}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-[var(--color-mm-bad)]">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={reject.isPending}
              >
                Reject document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
