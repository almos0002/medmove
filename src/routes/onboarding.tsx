import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
  Link,
} from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ORG_TYPES,
  isAdminRole,
  isOrgOwner,
  type OrgType,
  defaultCapabilitiesForType,
} from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'
import { createOrganization } from '@/server/functions/organizations'
import { createOrganizationSchema } from '@/server/validators/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CapabilityChipRow } from '@/components/data/CapabilityChip'
import { cn } from '@/lib/utils'

/**
 * /onboarding — first-run flow for a freshly signed-up org owner.
 *
 * Guards:
 *  - Must be signed in.
 *  - Must be an ORG_OWNER (staff cannot create an org; they need to be
 *    invited). Non-owners are bounced to /dashboard.
 *  - If the user already has a primary org, send them to /org (no point
 *    onboarding twice).
 */
export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/onboarding' } })
    }
    // Admins don't onboard — they manage other orgs from /admin.
    if (isAdminRole(session.user.role)) {
      throw redirect({ to: '/admin' })
    }
    if (!isOrgOwner(session.user.role)) {
      throw redirect({ to: '/dashboard' })
    }
    if (session.primaryOrg) {
      throw redirect({ to: '/org' })
    }
    return { session }
  },
  component: OnboardingPage,
})

const ORG_TYPE_OPTIONS: ReadonlyArray<{
  value: OrgType
  label: string
  blurb: string
}> = [
  { value: ORG_TYPES.PHARMACY, label: 'Pharmacy', blurb: 'Retail or chain pharmacy' },
  { value: ORG_TYPES.CLINIC, label: 'Clinic', blurb: 'Outpatient clinic or polyclinic' },
  { value: ORG_TYPES.HOSPITAL, label: 'Hospital', blurb: 'Inpatient facility' },
  { value: ORG_TYPES.NGO, label: 'NGO', blurb: 'Non-profit / charitable health org' },
  {
    value: ORG_TYPES.DISTRIBUTOR,
    label: 'Distributor',
    blurb: 'Licensed pharmaceutical distributor',
  },
  {
    value: ORG_TYPES.LOGISTICS_PARTNER,
    label: 'Logistics partner',
    blurb: 'Last-mile delivery for medicines',
  },
]

type FormValues = z.infer<typeof createOrganizationSchema>

function OnboardingPage() {
  const router = useRouter()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      type: ORG_TYPES.PHARMACY,
      licenseNumber: '',
      contactEmail: '',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  })

  const watchedType = form.watch('type')
  const previewCaps = useMemo(
    () => defaultCapabilitiesForType(watchedType),
    [watchedType],
  )

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      createOrganization({ data: values }) as Promise<{
        ok: true
        organization: { id: string }
      }>,
    onSuccess: async () => {
      toast.success('Organization registered', {
        description: 'Upload your verification documents to begin admin review.',
      })
      await router.invalidate()
      navigate({ to: '/org/documents' })
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Could not register organization'
      toast.error('Registration failed', { description: msg })
    },
  })

  return (
    <div className="min-h-screen bg-[var(--color-mm-canvas)]">
      <header className="bg-[var(--color-mm-surface)] border-b border-[var(--color-mm-line)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="h-7 w-7 inline-flex items-center justify-center bg-[var(--color-mm-accent)] text-white squircle">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">MedMove · Onboarding</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 inline-flex items-center justify-center bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle">
            <Building2 className="h-5 w-5 text-[var(--color-mm-accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Register your organization
            </h1>
            <p className="mt-1 text-sm text-[var(--color-mm-muted)] max-w-xl">
              Tell us about your organization. After you submit, MedMove
              admins will review your details and verification documents
              before unlocking medicine actions.
            </p>
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle-md p-6 sm:p-8 space-y-8"
        >
          {/* Section: Type + name */}
          <section className="space-y-4">
            <SectionHeading
              title="Organization type"
              description="This determines which medicine actions you may request. Admins can adjust these later."
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ORG_TYPE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => form.setValue('type', opt.value)}
                  className={cn(
                    'text-left p-3 squircle-sm border text-sm transition-colors',
                    watchedType === opt.value
                      ? 'border-[var(--color-mm-accent)] bg-[var(--color-mm-accent-soft)]'
                      : 'border-[var(--color-mm-line)] hover:border-[var(--color-mm-line-strong)]',
                  )}
                >
                  <div className="font-medium text-[var(--color-mm-ink)]">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[var(--color-mm-muted)] mt-0.5">
                    {opt.blurb}
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)] mb-1.5">
                Default capabilities for this type
              </div>
              <CapabilityChipRow
                canListMedicine={previewCaps.canListMedicine}
                canRequestMedicine={previewCaps.canRequestMedicine}
                canDeliverMedicine={previewCaps.canDeliverMedicine}
              />
            </div>
          </section>

          {/* Section: Identity */}
          <section className="space-y-4">
            <SectionHeading title="Identity & licence" />
            <Field
              label="Organization name"
              error={form.formState.errors.name?.message}
            >
              <Input
                placeholder="City Pharmacy Ltd."
                {...form.register('name')}
              />
            </Field>
            <Field
              label="Licence / registration number"
              hint="As issued by your country's pharmacy / health authority."
              error={form.formState.errors.licenseNumber?.message}
            >
              <Input
                placeholder="e.g. PHM-2024-00123"
                {...form.register('licenseNumber')}
              />
            </Field>
          </section>

          {/* Section: Contact */}
          <section className="space-y-4">
            <SectionHeading title="Contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Contact email"
                error={form.formState.errors.contactEmail?.message}
              >
                <Input
                  type="email"
                  placeholder="ops@your-org.org"
                  {...form.register('contactEmail')}
                />
              </Field>
              <Field
                label="Contact phone"
                error={form.formState.errors.contactPhone?.message}
              >
                <Input
                  placeholder="+254 700 000 000"
                  {...form.register('contactPhone')}
                />
              </Field>
            </div>
          </section>

          {/* Section: Address */}
          <section className="space-y-4">
            <SectionHeading title="Address" />
            <Field
              label="Address line 1"
              error={form.formState.errors.addressLine1?.message}
            >
              <Input
                placeholder="Street and number"
                {...form.register('addressLine1')}
              />
            </Field>
            <Field
              label="Address line 2"
              optional
              error={form.formState.errors.addressLine2?.message}
            >
              <Input
                placeholder="Suite / floor"
                {...form.register('addressLine2')}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="City"
                error={form.formState.errors.city?.message}
              >
                <Input {...form.register('city')} />
              </Field>
              <Field
                label="State / region"
                optional
                error={form.formState.errors.state?.message}
              >
                <Input {...form.register('state')} />
              </Field>
              <Field
                label="Postal code"
                optional
                error={form.formState.errors.postalCode?.message}
              >
                <Input {...form.register('postalCode')} />
              </Field>
            </div>
            <Field
              label="Country"
              hint="Two-letter country code (e.g. KE, NG, IN, US)."
              error={form.formState.errors.country?.message}
            >
              <Input
                maxLength={2}
                placeholder="KE"
                className="uppercase max-w-[120px]"
                {...form.register('country', {
                  setValueAs: (v: string) => (v ?? '').toUpperCase(),
                })}
              />
            </Field>
          </section>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-mm-line)] -mx-6 sm:-mx-8 px-6 sm:px-8">
            <p className="text-xs text-[var(--color-mm-subtle)] max-w-md">
              By submitting you confirm the information above is accurate and
              that you are authorized to register this organization on its
              behalf.
            </p>
            <Button type="submit" loading={create.isPending}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-[var(--color-mm-subtle)]">
          Need help?{' '}
          <Link to="/sign-in" search={{}} className="underline">
            Sign in to a different account
          </Link>
        </p>
      </main>
    </div>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
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
  )
}

function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {optional && (
          <span className="text-[11px] text-[var(--color-mm-subtle)]">
            optional
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="text-xs text-[var(--color-mm-subtle)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-[var(--color-mm-bad)]">{error}</p>
      )}
    </div>
  )
}

// Suppress an unused-import warning by referencing Select primitives; kept
// in the import surface so other forms in this file can adopt them later.
void Select
void SelectTrigger
void SelectValue
void SelectContent
void SelectItem
