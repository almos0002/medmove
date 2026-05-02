import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { createMedicine } from '@/server/functions/medicines'
import { medicineFormSchema } from '@/server/validators/medicines'
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
import { MEDICINE_FORMS } from '@/components/data/MedicineFormLabel'

export const Route = createFileRoute('/admin/medicines/new')({
  head: pageHead({ title: "Admin · New medicine", noindex: true }),
  component: AdminMedicineNewPage,
})

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  genericName: z.string().trim().max(200).optional(),
  strength: z.string().trim().min(1, 'Strength is required').max(60),
  form: medicineFormSchema,
  manufacturer: z.string().trim().max(200).optional(),
  atcCode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
})

type FormValues = z.infer<typeof formSchema>

function AdminMedicineNewPage() {
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      genericName: '',
      strength: '',
      form: 'tablet',
      manufacturer: '',
      atcCode: '',
      notes: '',
    },
  })

  const create = useMutation({
    mutationFn: async (values: FormValues) =>
      createMedicine({
        data: {
          name: values.name,
          genericName: values.genericName || undefined,
          strength: values.strength,
          form: values.form,
          manufacturer: values.manufacturer || undefined,
          atcCode: values.atcCode || undefined,
          notes: values.notes || undefined,
          isControlled: false,
          requiresColdChain: false,
        },
      }),
    onSuccess: (res) => {
      toast.success('Medicine added to catalog')
      navigate({
        to: '/admin/medicines/$medicineId',
        params: { medicineId: res.medicine.id },
      })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Could not create medicine'
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
          title="New medicine"
          description="Add an entry to the shared catalog. Controlled and cold-chain medicines are not allowed in MVP."
        />
      </div>

      <Card className="p-6">
        <form
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="space-y-5"
        >
          <Field
            label="Name"
            required
            error={form.formState.errors.name?.message}
            help="Brand or trade name as it appears on the package."
          >
            <Input
              autoFocus
              placeholder="e.g. Panadol"
              {...form.register('name')}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Strength"
              required
              error={form.formState.errors.strength?.message}
            >
              <Input placeholder="e.g. 500 mg" {...form.register('strength')} />
            </Field>
            <Field label="Form" required error={form.formState.errors.form?.message}>
              <Select
                value={form.watch('form')}
                onValueChange={(v) => form.setValue('form', v as FormValues['form'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
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

          <Field
            label="Generic name"
            help="Recommended — buyers often search by INN / generic name."
          >
            <Input placeholder="e.g. Paracetamol" {...form.register('genericName')} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Manufacturer">
              <Input placeholder="e.g. GSK" {...form.register('manufacturer')} />
            </Field>
            <Field label="ATC code" help="Optional WHO classification.">
              <Input placeholder="e.g. N02BE01" {...form.register('atcCode')} />
            </Field>
          </div>

          <Field label="Notes" help="Internal notes shown only to admins.">
            <Textarea rows={3} {...form.register('notes')} />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-mm-line)]">
            <Button asChild variant="ghost">
              <Link to="/admin/medicines">Cancel</Link>
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Add to catalog'}
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
