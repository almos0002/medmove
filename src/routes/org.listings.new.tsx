import * as React from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, AlertTriangle, Search } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { z } from 'zod'
import { listInventoryBatches } from '@/server/functions/inventory'
import { createListing, submitListing } from '@/server/functions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
import { classifyExpiry } from '@/lib/expiry'

export const Route = createFileRoute('/org/listings/new')({
  beforeLoad: async ({ context }) => {
    const session = (
      context as {
        session?: {
          primaryOrg?: {
            id: string
            canListMedicine: boolean
            verificationStatus: string
          } | null
        }
      }
    ).session
    if (!session?.primaryOrg) throw redirect({ to: '/org' })
    if (
      !session.primaryOrg.canListMedicine ||
      session.primaryOrg.verificationStatus !== 'verified'
    ) {
      throw redirect({ to: '/org/listings' })
    }
    return { primaryOrgId: session.primaryOrg.id }
  },
  pendingComponent: PageLoading,
  component: OrgListingNewPage,
})

const PRICING_FREE = 'free'
const PRICING_PAID = 'paid'

const formSchema = z
  .object({
    batchId: z.string().uuid('Pick an inventory batch'),
    quantityListed: z
      .number()
      .int()
      .positive('Quantity must be greater than 0'),
    pricingMode: z.enum([PRICING_FREE, PRICING_PAID]),
    pricePerUnit: z
      .number()
      .nonnegative('Price cannot be negative')
      .optional()
      .or(z.literal(undefined)),
    currency: z.string().trim().length(3, 'Use a 3-letter currency code'),
    pickupCity: z
      .string()
      .trim()
      .min(1, 'Pickup city is required')
      .max(120),
    pickupCountry: z
      .string()
      .trim()
      .min(1, 'Pickup country is required')
      .max(120),
    photoUrlsRaw: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.pricingMode === PRICING_PAID) {
      if (v.pricePerUnit === undefined || Number.isNaN(v.pricePerUnit)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pricePerUnit'],
          message: 'Price is required when listing for sale',
        })
      } else if (v.pricePerUnit < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['pricePerUnit'],
          message: 'Price cannot be negative',
        })
      }
    }
  })

type FormValues = z.infer<typeof formSchema>

type BatchRow = {
  batch: {
    id: string
    batchNumber: string
    expiryDate: string
    quantityOnHand: number
    unit: string
    sealedStatus: string
    storageType: string
  }
  medicine: {
    id: string
    name: string
    strength: string
    form: string
    genericName: string | null
    isControlled: boolean
    requiresColdChain: boolean
  }
}

function OrgListingNewPage() {
  const navigate = useNavigate()
  const { primaryOrgId } = Route.useRouteContext() as { primaryOrgId: string }

  const batchesQ = useQuery({
    queryKey: ['my-inventory', primaryOrgId],
    queryFn: () =>
      listInventoryBatches({
        data: { organizationId: primaryOrgId },
      }),
  })

  const allBatches = (batchesQ.data?.items ?? []) as unknown as BatchRow[]
  const eligibleBatches = React.useMemo(
    () => allBatches.filter((r) => isEligibleForListing(r)),
    [allBatches],
  )

  const [batchQuery, setBatchQuery] = React.useState('')
  const filteredBatches = React.useMemo(() => {
    const q = batchQuery.trim().toLowerCase()
    if (!q) return eligibleBatches
    return eligibleBatches.filter((r) => {
      return (
        r.medicine.name.toLowerCase().includes(q) ||
        r.medicine.genericName?.toLowerCase().includes(q) ||
        r.batch.batchNumber.toLowerCase().includes(q)
      )
    })
  }, [batchQuery, eligibleBatches])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchId: '',
      quantityListed: 1,
      pricingMode: PRICING_FREE,
      pricePerUnit: undefined,
      currency: 'USD',
      pickupCity: '',
      pickupCountry: '',
      photoUrlsRaw: '',
      notes: '',
    },
  })

  const selectedId = form.watch('batchId')
  const selectedRow = React.useMemo(
    () => eligibleBatches.find((r) => r.batch.id === selectedId),
    [eligibleBatches, selectedId],
  )

  // Re-validate quantity ceiling client-side when batch changes
  React.useEffect(() => {
    if (selectedRow) {
      const cur = form.getValues('quantityListed')
      if (cur > selectedRow.batch.quantityOnHand) {
        form.setValue('quantityListed', selectedRow.batch.quantityOnHand, {
          shouldValidate: true,
        })
      }
    }
  }, [selectedRow, form])

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedRow) {
        throw new Error('Pick a batch first')
      }
      if (values.quantityListed > selectedRow.batch.quantityOnHand) {
        throw new Error(
          `Only ${selectedRow.batch.quantityOnHand} ${selectedRow.batch.unit} available in this batch`,
        )
      }
      const photoUrls = (values.photoUrlsRaw ?? '')
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      return createListing({
        data: {
          batchId: values.batchId,
          quantityListed: values.quantityListed,
          pricePerUnitCents:
            values.pricingMode === PRICING_PAID && values.pricePerUnit !== undefined
              ? Math.round(values.pricePerUnit * 100)
              : null,
          currency: values.currency,
          photoUrls,
          notes: values.notes || undefined,
          pickupCity: values.pickupCity,
          pickupCountry: values.pickupCountry,
        },
      })
    },
  })

  const submit = useMutation({
    mutationFn: async (listingId: string) =>
      submitListing({ data: { listingId } }),
  })

  async function onSaveDraft(values: FormValues) {
    try {
      const res = await create.mutateAsync(values)
      toast.success('Draft saved')
      navigate({
        to: '/org/listings/$listingId',
        params: { listingId: res.listing.id },
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not save draft'
      toast.error(message)
    }
  }

  async function onSubmitForReview(values: FormValues) {
    try {
      const res = await create.mutateAsync(values)
      await submit.mutateAsync(res.listing.id)
      toast.success('Submitted for admin review')
      navigate({
        to: '/org/listings/$listingId',
        params: { listingId: res.listing.id },
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not submit listing'
      toast.error(message)
    }
  }

  const busy = create.isPending || submit.isPending

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>
        </Button>
        <PageHeader
          title="New listing"
          description="Pick a sealed, in-date batch you already hold and turn it into a redistribution offer. Listings need admin review before going live."
        />
      </div>

      <Card className="p-4 border-[var(--color-mm-line-strong)]">
        <div className="flex gap-3">
          <AlertTriangle className="h-4 w-4 text-[var(--color-mm-warn)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--color-mm-muted)] space-y-1">
            <div className="font-medium text-[var(--color-mm-ink)]">
              Hard rules — enforced server-side
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[var(--color-mm-subtle)]">
              <li>Only sealed, non-expired batches you own can be listed.</li>
              <li>Controlled or cold-chain medicines are blocked.</li>
              <li>
                Listing quantity cannot exceed the batch quantity on hand.
              </li>
              <li>Submitted listings are inactive until an admin approves.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-5"
        >
          <Field
            label="Batch"
            required
            error={form.formState.errors.batchId?.message}
            help="Only sealed, in-date, non-restricted batches are eligible."
          >
            <div className="space-y-2">
              {selectedRow ? (
                <div className="flex items-start gap-3 px-3.5 py-3 bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line-strong)] squircle-sm">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-sm font-medium text-[var(--color-mm-ink)]">
                      {selectedRow.medicine.name}
                    </div>
                    <div className="text-xs text-[var(--color-mm-subtle)]">
                      {selectedRow.medicine.strength} ·{' '}
                      <MedicineFormLabel form={selectedRow.medicine.form} />
                      {selectedRow.medicine.genericName
                        ? ` · ${selectedRow.medicine.genericName}`
                        : ''}
                    </div>
                    <div className="text-xs text-[var(--color-mm-subtle)]">
                      Batch{' '}
                      <span className="text-[var(--color-mm-ink)]">
                        {selectedRow.batch.batchNumber}
                      </span>{' '}
                      · {selectedRow.batch.quantityOnHand.toLocaleString()}{' '}
                      {selectedRow.batch.unit} on hand · expires{' '}
                      {format(
                        new Date(selectedRow.batch.expiryDate),
                        'd MMM yyyy',
                      )}
                    </div>
                    <ExpiryStatusBadge
                      expiryDate={selectedRow.batch.expiryDate}
                      showDays
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('batchId', '')}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
                    <Input
                      placeholder="Search inventory by medicine or batch #…"
                      value={batchQuery}
                      onChange={(e) => setBatchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto border border-[var(--color-mm-line-strong)] squircle-sm divide-y divide-[var(--color-mm-line)]">
                    {batchesQ.isPending && (
                      <div className="px-3 py-3 text-xs text-[var(--color-mm-subtle)]">
                        Loading inventory…
                      </div>
                    )}
                    {!batchesQ.isPending && eligibleBatches.length === 0 && (
                      <div className="px-3 py-4 text-xs text-[var(--color-mm-subtle)]">
                        No eligible batches in your inventory yet. Add a sealed,
                        in-date batch first.
                      </div>
                    )}
                    {!batchesQ.isPending &&
                      eligibleBatches.length > 0 &&
                      filteredBatches.length === 0 && (
                        <div className="px-3 py-4 text-xs text-[var(--color-mm-subtle)]">
                          No matches for that search.
                        </div>
                      )}
                    {filteredBatches.map((r) => (
                      <button
                        key={r.batch.id}
                        type="button"
                        onClick={() =>
                          form.setValue('batchId', r.batch.id, {
                            shouldValidate: true,
                          })
                        }
                        className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-mm-canvas)] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--color-mm-ink)] truncate">
                              {r.medicine.name}
                            </div>
                            <div className="text-xs text-[var(--color-mm-subtle)] truncate">
                              {r.medicine.strength} · batch {r.batch.batchNumber}{' '}
                              · {r.batch.quantityOnHand} {r.batch.unit}
                            </div>
                          </div>
                          <ExpiryStatusBadge expiryDate={r.batch.expiryDate} />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Field>

          <Field
            label="Quantity to list"
            required
            error={form.formState.errors.quantityListed?.message}
            help={
              selectedRow
                ? `Max ${selectedRow.batch.quantityOnHand} ${selectedRow.batch.unit} (batch on hand)`
                : 'Pick a batch first'
            }
          >
            <Input
              type="number"
              min={1}
              max={selectedRow?.batch.quantityOnHand ?? undefined}
              disabled={!selectedRow}
              {...form.register('quantityListed', { valueAsNumber: true })}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px] gap-5">
            <Field
              label="Pricing"
              required
              error={form.formState.errors.pricingMode?.message}
            >
              <Select
                value={form.watch('pricingMode')}
                onValueChange={(v) =>
                  form.setValue(
                    'pricingMode',
                    v as FormValues['pricingMode'],
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRICING_FREE}>Free / donation</SelectItem>
                  <SelectItem value={PRICING_PAID}>For sale</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Price per unit"
              required={form.watch('pricingMode') === PRICING_PAID}
              error={form.formState.errors.pricePerUnit?.message}
              help={
                form.watch('pricingMode') === PRICING_FREE
                  ? 'Disabled — free / donation listings have no price.'
                  : undefined
              }
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={form.watch('pricingMode') === PRICING_FREE}
                {...form.register('pricePerUnit', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Currency"
              error={form.formState.errors.currency?.message}
            >
              <Input
                maxLength={3}
                disabled={form.watch('pricingMode') === PRICING_FREE}
                {...form.register('currency', {
                  setValueAs: (v: string) => (v ?? '').toUpperCase(),
                })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Pickup city"
              required
              error={form.formState.errors.pickupCity?.message}
            >
              <Input {...form.register('pickupCity')} />
            </Field>
            <Field
              label="Pickup country"
              required
              error={form.formState.errors.pickupCountry?.message}
            >
              <Input {...form.register('pickupCountry')} />
            </Field>
          </div>

          <Field
            label="Photo URLs"
            help="Optional. One per line, or comma-separated. Object-storage uploads come in a later step."
            error={form.formState.errors.photoUrlsRaw?.message}
          >
            <Textarea rows={3} {...form.register('photoUrlsRaw')} />
          </Field>

          <Field
            label="Notes for admin / buyers"
            error={form.formState.errors.notes?.message}
          >
            <Textarea rows={3} {...form.register('notes')} />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-2 border-t border-[var(--color-mm-line)]">
            <Button asChild variant="ghost">
              <Link to="/org/listings">Cancel</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit(onSaveDraft)}
              disabled={busy}
            >
              {create.isPending && !submit.isPending ? 'Saving…' : 'Save draft'}
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForReview)}
              disabled={busy}
            >
              {submit.isPending ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function isEligibleForListing(r: BatchRow): boolean {
  if (r.medicine.isControlled || r.medicine.requiresColdChain) return false
  if (r.batch.sealedStatus !== 'sealed') return false
  if (r.batch.storageType === 'refrigerated') return false
  if (r.batch.quantityOnHand <= 0) return false
  if (classifyExpiry(r.batch.expiryDate).status === 'expired') return false
  return true
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
        {label} {required && <span className="text-[var(--color-mm-bad)]">*</span>}
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
