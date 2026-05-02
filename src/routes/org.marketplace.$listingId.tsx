import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  AlertTriangle,
  Send,
  MapPin,
  Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { z } from 'zod'
import { getMarketplaceListing } from '@/server/functions/listings'
import { requestTransfer } from '@/server/functions/transfers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
import {
  TransferRequestStatusBadge,
  type TransferRequestStatus,
} from '@/components/data/TransferRequestStatusBadge'

export const Route = createFileRoute('/org/marketplace/$listingId')({
  loader: ({ params }) =>
    getMarketplaceListing({ data: { id: params.listingId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: MarketplaceListingDetailPage,
})

const formSchema = z.object({
  quantityRequested: z
    .number({ message: 'Enter a quantity' })
    .int()
    .positive('Quantity must be greater than 0'),
  intendedUse: z
    .string()
    .trim()
    .min(10, 'Tell the seller a bit about how this will be used (min 10 chars)')
    .max(1000),
})

type FormValues = z.infer<typeof formSchema>

function MarketplaceListingDetailPage() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const { session } = Route.useRouteContext() as {
    session: {
      user: { role: string } | null
      primaryOrg: {
        id: string
        canRequestMedicine: boolean
        verificationStatus: string
      } | null
    }
  }
  const { listing, batch, medicine, sellerOrg, existingRequest } =
    data as unknown as {
      listing: {
        id: string
        quantityAvailable: number
        quantityListed: number
        pricePerUnitCents: number | null
        currency: string | null
        pickupCity: string
        pickupCountry: string
        photoUrls: string[] | null
        notes: string | null
      }
      batch: {
        id: string
        batchNumber: string
        expiryDate: string
        unit: string
      }
      medicine: {
        id: string
        name: string
        strength: string
        genericName: string | null
        form: string
      }
      sellerOrg: {
        id: string
        name: string
        type: string
        city: string
        country: string
      }
      existingRequest:
        | { id: string; status: TransferRequestStatus; quantityRequested: number }
        | null
    }
  const isAdmin =
    session.user?.role === 'admin' || session.user?.role === 'super_admin'
  const canRequest =
    !!session.primaryOrg?.canRequestMedicine &&
    session.primaryOrg?.verificationStatus === 'verified' &&
    !isAdmin

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantityRequested: 1, intendedUse: '' },
  })

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!session.primaryOrg) throw new Error('Join an organization first')
      if (values.quantityRequested > listing.quantityAvailable) {
        throw new Error(
          `Only ${listing.quantityAvailable} ${batch.unit} available`,
        )
      }
      return requestTransfer({
        data: {
          listingId: listing.id,
          requesterOrgId: session.primaryOrg.id,
          quantityRequested: values.quantityRequested,
          intendedUse: values.intendedUse,
        },
      })
    },
    onSuccess: async (res) => {
      toast.success('Transfer request submitted')
      await router.invalidate()
      router.navigate({
        to: '/org/requests/$requestId',
        params: { requestId: res.request.id },
      })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not submit request')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org/marketplace">
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>{medicine.strength}</span>
              <span className="text-[var(--color-mm-subtle)]">·</span>
              <MedicineFormLabel form={medicine.form} />
              {medicine.genericName && (
                <>
                  <span className="text-[var(--color-mm-subtle)]">·</span>
                  <span>{medicine.genericName}</span>
                </>
              )}
            </span>
          }
        />
      </div>

      {Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listing.photoUrls.slice(0, 6).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden squircle-md border border-[var(--color-mm-line-strong)] block bg-[var(--color-mm-canvas)] photo-card"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Available"
          value={
            <>
              {listing.quantityAvailable.toLocaleString()}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {' '}
                / {listing.quantityListed.toLocaleString()} {batch.unit}
              </span>
            </>
          }
        />
        <Stat
          label="Price"
          value={
            listing.pricePerUnitCents === null ? (
              <span className="text-[var(--color-mm-ok)]">Free</span>
            ) : (
              <>
                {(listing.pricePerUnitCents / 100).toFixed(2)}{' '}
                <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                  {listing.currency ?? 'USD'} / {batch.unit}
                </span>
              </>
            )
          }
        />
        <Stat
          label="Pickup"
          value={<span className="text-[20px]">{listing.pickupCity}</span>}
          sub={listing.pickupCountry}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Batch
        </h2>
        <Row label="Batch number" value={batch.batchNumber} />
        <Row
          label="Expiry"
          value={
            <div className="flex items-center gap-3">
              <span>{format(new Date(batch.expiryDate), 'd MMM yyyy')}</span>
              <ExpiryStatusBadge expiryDate={batch.expiryDate} showDays />
            </div>
          }
        />
        <Row label="Unit" value={batch.unit} />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)] flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--color-mm-subtle)]" />
          Seller
        </h2>
        <Row label="Name" value={sellerOrg.name} />
        <Row
          label="Type"
          value={
            <span className="capitalize">
              {sellerOrg.type.replace(/_/g, ' ')}
            </span>
          }
        />
        <Row
          label="Location"
          value={
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-mm-subtle)]" />
              {sellerOrg.city}, {sellerOrg.country}
            </span>
          }
        />
      </Card>

      {listing.notes && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
            Seller notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-mm-muted)]">
            {listing.notes}
          </p>
        </Card>
      )}

      {existingRequest ? (
        <Card className="p-6 space-y-3 border-[var(--color-mm-accent)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
              Your request
            </h2>
            <TransferRequestStatusBadge status={existingRequest.status} />
          </div>
          <p className="text-sm text-[var(--color-mm-muted)]">
            You have an active request for{' '}
            {existingRequest.quantityRequested.toLocaleString()} {batch.unit}{' '}
            from this listing.
          </p>
          <div>
            <Button asChild variant="secondary">
              <Link
                to="/org/requests/$requestId"
                params={{ requestId: existingRequest.id }}
              >
                Open request
              </Link>
            </Button>
          </div>
        </Card>
      ) : canRequest ? (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
              Request this medicine
            </h2>
            <p className="text-sm text-[var(--color-mm-subtle)] mt-1">
              Submitted requests are reviewed by MedMove admins, then forwarded
              to the seller for acceptance.
            </p>
          </div>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Field
              label={`Quantity (max ${listing.quantityAvailable.toLocaleString()} ${batch.unit})`}
              required
              error={form.formState.errors.quantityRequested?.message}
            >
              <Input
                type="number"
                min={1}
                max={listing.quantityAvailable}
                {...form.register('quantityRequested', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Intended use"
              required
              error={form.formState.errors.intendedUse?.message}
              help="A brief description that helps admins and the seller assess fit."
            >
              <Textarea
                rows={4}
                placeholder="e.g. To restock our outpatient pharmacy for paediatric patients in May–July."
                {...form.register('intendedUse')}
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-mm-line)]">
              <Button asChild variant="ghost">
                <Link to="/org/marketplace">Cancel</Link>
              </Button>
              <Button
                onClick={form.handleSubmit((v) => submit.mutate(v))}
                disabled={submit.isPending}
              >
                <Send className="h-4 w-4" />
                {submit.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-mm-warn)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-mm-muted)]">
              {isAdmin
                ? "Admins can browse but can't request medicine on behalf of an organization."
                : !session.primaryOrg
                  ? 'You need to belong to a verified organization to request medicine.'
                  : session.primaryOrg.verificationStatus !== 'verified'
                    ? 'Your organization is not yet verified. Requests unlock after admin verification.'
                    : "Requesting medicine isn't enabled for this organization type. Contact an admin if you believe this is in error."}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div className="font-display text-[24px] leading-tight text-[var(--color-mm-ink)]">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-[var(--color-mm-subtle)] mt-1">{sub}</div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-6 items-start">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)] font-medium pt-0.5">
        {label}
      </div>
      <div className="text-sm text-[var(--color-mm-ink)]">{value}</div>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{' '}
        {required && <span className="text-[var(--color-mm-bad)]">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--color-mm-bad)]">{error}</p>
      ) : help ? (
        <p className="text-xs text-[var(--color-mm-subtle)]">{help}</p>
      ) : null}
    </div>
  )
}
