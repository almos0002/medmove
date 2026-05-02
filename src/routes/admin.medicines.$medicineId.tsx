import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { getMedicine, updateMedicine } from '@/server/functions/medicines'
import { medicineFormSchema } from '@/server/validators/medicines'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { MEDICINE_FORMS } from '@/components/data/MedicineFormLabel'

export const Route = createFileRoute('/admin/medicines/$medicineId')({
  loader: ({ params }) => getMedicine({ data: { id: params.medicineId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  head: pageHead({ title: "Admin · Medicine", noindex: true }),
  component: AdminMedicineEditPage,
})

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  genericName: z.string().trim().max(200).optional(),
  strength: z.string().trim().min(1, 'Strength is required').max(60),
  form: medicineFormSchema,
  manufacturer: z.string().trim().max(200).optional(),
  atcCode: z.string().trim().max(20).optional(),
  isActive: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
})

type FormValues = z.infer<typeof formSchema>

function AdminMedicineEditPage() {
  const navigate = useNavigate()
  const { medicine } = Route.useLoaderData()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: medicine.name,
      genericName: medicine.genericName ?? '',
      strength: medicine.strength,
      form: medicine.form,
      manufacturer: medicine.manufacturer ?? '',
      atcCode: medicine.atcCode ?? '',
      isActive: medicine.isActive,
      notes: medicine.notes ?? '',
    },
  })

  const update = useMutation({
    mutationFn: async (values: FormValues) =>
      updateMedicine({
        data: {
          id: medicine.id,
          name: values.name,
          genericName: values.genericName || undefined,
          strength: values.strength,
          form: values.form,
          manufacturer: values.manufacturer || undefined,
          atcCode: values.atcCode || undefined,
          isActive: values.isActive,
          notes: values.notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Medicine updated')
      navigate({ to: '/admin/medicines' })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Could not update medicine'
      toast.error(message)
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/admin/medicines">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={`${medicine.strength} · catalog id ${medicine.id.slice(0, 8)}…`}
        />
      </div>

      <Card className="p-6">
        <form
          onSubmit={form.handleSubmit((v) => update.mutate(v))}
          className="space-y-5"
        >
          <Field label="Name" required error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Strength"
              required
              error={form.formState.errors.strength?.message}
            >
              <Input {...form.register('strength')} />
            </Field>
            <Field label="Form" required error={form.formState.errors.form?.message}>
              <Select
                value={form.watch('form')}
                onValueChange={(v) => form.setValue('form', v as FormValues['form'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDICINE_FORMS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Generic name">
            <Input {...form.register('genericName')} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Manufacturer">
              <Input {...form.register('manufacturer')} />
            </Field>
            <Field label="ATC code">
              <Input {...form.register('atcCode')} />
            </Field>
          </div>

          <Field label="Notes" help="Internal notes shown only to admins.">
            <Textarea rows={3} {...form.register('notes')} />
          </Field>

          <div className="flex items-start gap-4 p-4 bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm">
            <Switch
              checked={form.watch('isActive')}
              onCheckedChange={(v) => form.setValue('isActive', v)}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--color-mm-ink)]">
                Active in catalog
              </div>
              <p className="text-xs text-[var(--color-mm-subtle)] mt-1">
                When inactive, sellers cannot create new batches against this entry.
                Existing batches and listings are not affected.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-mm-line)]">
            <Button asChild variant="ghost">
              <Link to="/admin/medicines">Cancel</Link>
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
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
