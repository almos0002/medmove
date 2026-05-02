import * as React from 'react'
import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, AlertTriangle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { listMedicines } from '@/server/functions/medicines'
import { createInventoryBatch } from '@/server/functions/inventory'
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
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'

const UNIT_OPTIONS = ['pack', 'strip', 'bottle', 'box', 'vial']

export const Route = createFileRoute('/org/inventory/new')({
  beforeLoad: async ({ context }) => {
    const session = (context as { session?: { primaryOrg?: { id: string; canListMedicine: boolean; verificationStatus: string } | null } }).session
    if (!session?.primaryOrg) throw redirect({ to: '/org' })
    if (!session.primaryOrg.canListMedicine || session.primaryOrg.verificationStatus !== 'verified') {
      throw redirect({ to: '/org/inventory' })
    }
    return { primaryOrgId: session.primaryOrg.id }
  },
  pendingComponent: PageLoading,
  component: OrgInventoryNewPage,
})

const today = new Date().toISOString().slice(0, 10)

const formSchema = z
  .object({
    medicineId: z.string().uuid('Pick a medicine from the catalog'),
    batchNumber: z.string().trim().min(1, 'Batch number is required').max(80),
    manufactureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .optional()
      .or(z.literal('')),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .refine((v) => v > today, 'Expiry must be in the future'),
    quantityOnHand: z.number().int().positive('Quantity must be greater than 0'),
    unit: z.string().trim().min(1).max(40),
    storageType: z.enum([
      'room_temperature',
      'cool_dry_place',
      'refrigerated',
    ]),
    sealedStatus: z.enum(['sealed', 'opened']),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.storageType === 'refrigerated') {
      ctx.addIssue({
        code: 'custom',
        path: ['storageType'],
        message: 'Refrigerated storage is not supported in MVP',
      })
    }
    if (v.sealedStatus === 'opened') {
      ctx.addIssue({
        code: 'custom',
        path: ['sealedStatus'],
        message: 'Only sealed packs can be redistributed',
      })
    }
    if (v.manufactureDate && v.manufactureDate > v.expiryDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['manufactureDate'],
        message: 'Manufacture date must be before expiry',
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

function OrgInventoryNewPage() {
  const navigate = useNavigate()
  const { primaryOrgId } = Route.useRouteContext() as { primaryOrgId: string }

  const [medicineQuery, setMedicineQuery] = React.useState('')
  const medicinesQ = useQuery({
    queryKey: ['medicines', medicineQuery],
    queryFn: () =>
      listMedicines({
        data: {
          search: medicineQuery.length > 0 ? medicineQuery : undefined,
          includeInactive: false,
          limit: 50,
        },
      }),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineId: '',
      batchNumber: '',
      manufactureDate: '',
      expiryDate: '',
      quantityOnHand: 1,
      unit: 'pack',
      storageType: 'room_temperature',
      sealedStatus: 'sealed',
      notes: '',
    },
  })

  const selectedId = form.watch('medicineId')
  const selectedMedicine = React.useMemo(
    () => medicinesQ.data?.items.find((m) => m.id === selectedId),
    [medicinesQ.data, selectedId],
  )

  const create = useMutation({
    mutationFn: async (values: FormValues) =>
      createInventoryBatch({
        data: {
          organizationId: primaryOrgId,
          medicineId: values.medicineId,
          batchNumber: values.batchNumber,
          manufactureDate: values.manufactureDate || undefined,
          expiryDate: values.expiryDate,
          quantityOnHand: values.quantityOnHand,
          unit: values.unit,
          storageType: values.storageType,
          sealedStatus: values.sealedStatus,
          notes: values.notes || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success('Batch added to inventory')
      navigate({
        to: '/org/inventory/$batchId',
        params: { batchId: res.batch.id },
      })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Could not save batch'
      toast.error(message)
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
        <PageHeader
          title="Add inventory batch"
          description="Record a sealed, in-date batch already on your shelf. Only batches added here can be promoted to listings later."
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
              <li>No expired or already-opened stock.</li>
              <li>No controlled or cold-chain medicines (catalog blocks these).</li>
              <li>Refrigerated storage is not supported in MVP.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="space-y-5"
        >
          <Field
            label="Medicine"
            required
            error={form.formState.errors.medicineId?.message}
            help="Pick from the admin-curated catalog. Free-text names are not allowed."
          >
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
                <Input
                  placeholder="Search catalog…"
                  value={medicineQuery}
                  onChange={(e) => setMedicineQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {selectedMedicine && (
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line-strong)] squircle-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-mm-ink)]">
                      {selectedMedicine.name}
                    </div>
                    <div className="text-xs text-[var(--color-mm-subtle)]">
                      {selectedMedicine.strength} ·{' '}
                      <MedicineFormLabel form={selectedMedicine.form} />
                      {selectedMedicine.genericName
                        ? ` · ${selectedMedicine.genericName}`
                        : ''}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('medicineId', '')}
                  >
                    Change
                  </Button>
                </div>
              )}
              {!selectedMedicine && (
                <div className="max-h-56 overflow-y-auto border border-[var(--color-mm-line-strong)] squircle-sm divide-y divide-[var(--color-mm-line)]">
                  {medicinesQ.isPending && (
                    <div className="px-3 py-3 text-xs text-[var(--color-mm-subtle)]">
                      Loading…
                    </div>
                  )}
                  {medicinesQ.data?.items.length === 0 && (
                    <div className="px-3 py-4 text-xs text-[var(--color-mm-subtle)]">
                      No matches. Ask an admin to add this medicine to the catalog.
                    </div>
                  )}
                  {medicinesQ.data?.items.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => form.setValue('medicineId', m.id, { shouldValidate: true })}
                      className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-mm-canvas)] transition-colors"
                    >
                      <div className="text-sm font-medium text-[var(--color-mm-ink)]">
                        {m.name}
                      </div>
                      <div className="text-xs text-[var(--color-mm-subtle)]">
                        {m.strength} · <MedicineFormLabel form={m.form} />
                        {m.genericName ? ` · ${m.genericName}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Batch number"
              required
              error={form.formState.errors.batchNumber?.message}
            >
              <Input
                placeholder="e.g. AX1234"
                {...form.register('batchNumber')}
              />
            </Field>
            <Field
              label="Quantity on hand"
              required
              error={form.formState.errors.quantityOnHand?.message}
            >
              <Input
                type="number"
                min={1}
                {...form.register('quantityOnHand', { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Manufacture date"
              error={form.formState.errors.manufactureDate?.message}
            >
              <Input type="date" {...form.register('manufactureDate')} />
            </Field>
            <Field
              label="Expiry date"
              required
              error={form.formState.errors.expiryDate?.message}
            >
              <Input type="date" min={today} {...form.register('expiryDate')} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Unit" required error={form.formState.errors.unit?.message}>
              <Select
                value={form.watch('unit')}
                onValueChange={(v) => form.setValue('unit', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Storage"
              required
              error={form.formState.errors.storageType?.message}
            >
              <Select
                value={form.watch('storageType')}
                onValueChange={(v) =>
                  form.setValue('storageType', v as FormValues['storageType'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room_temperature">Room temperature</SelectItem>
                  <SelectItem value="cool_dry_place">Cool, dry place</SelectItem>
                  <SelectItem value="refrigerated" disabled>
                    Refrigerated (not supported)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Sealed status"
            required
            error={form.formState.errors.sealedStatus?.message}
          >
            <Select
              value={form.watch('sealedStatus')}
              onValueChange={(v) =>
                form.setValue('sealedStatus', v as FormValues['sealedStatus'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sealed">Sealed</SelectItem>
                <SelectItem value="opened" disabled>
                  Opened (cannot be redistributed)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes" help="Optional. Visible only to your organization.">
            <Textarea rows={3} {...form.register('notes')} />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-mm-line)]">
            <Button asChild variant="ghost">
              <Link to="/org/inventory">Cancel</Link>
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Add batch'}
            </Button>
          </div>
        </form>
      </Card>
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
