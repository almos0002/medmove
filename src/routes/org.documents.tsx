import { createFileRoute, Link } from '@tanstack/react-router'
import {
  useRouter,
} from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ExternalLink,
  FileCheck2,
  FileText,
  Plus,
  Upload,
} from 'lucide-react'
import {
  getMyOrganization,
  uploadOrganizationDocument,
} from '@/server/functions/organizations'
import { canUploadOrgDocuments } from '@/lib/client/capability'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import {
  DocStatusBadge,
  type DocStatus,
} from '@/components/data/StatusBadge'

export const Route = createFileRoute('/org/documents')({
  loader: () => getMyOrganization(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: DocumentsPage,
})

const DOC_TYPE_LABEL: Record<string, string> = {
  pharmacy_license: 'Pharmacy licence',
  business_registration: 'Business registration',
  tax_certificate: 'Tax certificate',
  authorized_person_id: 'Authorized person ID',
  other: 'Other supporting document',
}

function DocumentsPage() {
  const data = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const org = data.organization
  const documents = data.documents

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Verification documents" />
        <EmptyState
          icon={FileCheck2}
          title="No organization on file"
          description="Register your organization first."
          action={
            <Button asChild>
              <Link to="/onboarding">Register organization</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const canUpload = canUploadOrgDocuments(session.user, {
    id: org.id,
    type: org.type,
    verificationStatus: org.verificationStatus,
    canListMedicine: org.canListMedicine,
    canRequestMedicine: org.canRequestMedicine,
    canDeliverMedicine: org.canDeliverMedicine,
  })

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
        <Link to="/org">
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
      </Button>

      <PageHeader
        title="Verification documents"
        description="Upload your pharmacy licence and business registration so MedMove admins can verify your organization."
        actions={
          canUpload ? (
            <UploadDocumentDialog organizationId={org.id} />
          ) : (
            <Button disabled variant="secondary">
              <Upload className="h-4 w-4" />
              Uploads locked
            </Button>
          )
        }
      />

      {!canUpload && org.verificationStatus === 'verified' && (
        <Card>
          <CardContent className="text-sm text-[var(--color-mm-muted)]">
            Your organization is verified. New uploads are disabled to
            preserve the verification trail. To submit additional documents,
            contact MedMove support.
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No documents uploaded"
          description="Start with a pharmacy licence or business registration. Other documents (tax certificate, ID) are optional but speed up review."
          action={
            canUpload ? (
              <UploadDocumentDialog
                organizationId={org.id}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add first document
                  </Button>
                }
              />
            ) : null
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-mm-line)]">
            {documents.map((doc) => (
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
                  <div className="text-xs text-[var(--color-mm-muted)] mt-0.5">
                    {DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType} ·
                    Uploaded{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  {doc.status === 'rejected' && doc.reviewNotes && (
                    <div className="mt-2 text-xs text-[var(--color-mm-bad)] bg-[var(--color-mm-bad-soft)] px-2.5 py-1.5 squircle-xs inline-block">
                      Reviewer note: {doc.reviewNotes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
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
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardContent className="text-xs text-[var(--color-mm-subtle)] space-y-1">
          <div className="font-semibold text-[var(--color-mm-muted)] text-[11px] uppercase tracking-wide">
            What we review
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[var(--color-mm-muted)]">
            <li>
              At least one approved <strong>pharmacy licence</strong> or{' '}
              <strong>business registration</strong> is required before an
              organization can be verified.
            </li>
            <li>
              Tax certificate and authorized-person ID are optional but help
              expedite review.
            </li>
            <li>
              Documents are stored privately and shared only with MedMove
              reviewers.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

const uploadFormSchema = z.object({
  documentType: z.enum([
    'pharmacy_license',
    'business_registration',
    'tax_certificate',
    'authorized_person_id',
    'other',
  ]),
  fileUrl: z
    .string()
    .trim()
    .url('Must be a valid https URL')
    .max(2000),
  fileName: z.string().trim().min(1, 'Required').max(255),
  mimeType: z.string().trim().min(1, 'Required').max(100),
})
type UploadFormValues = z.infer<typeof uploadFormSchema>

function UploadDocumentDialog({
  organizationId,
  trigger,
}: {
  organizationId: string
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      documentType: 'pharmacy_license',
      fileUrl: '',
      fileName: '',
      mimeType: 'application/pdf',
    },
  })

  const upload = useMutation({
    mutationFn: (values: UploadFormValues) =>
      uploadOrganizationDocument({
        data: { organizationId, ...values },
      }),
    onSuccess: async () => {
      toast.success('Document uploaded', {
        description: 'Pending admin review.',
      })
      await router.invalidate()
      form.reset()
      setOpen(false)
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Upload failed'
      toast.error('Upload failed', { description: msg })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Add document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload verification document</DialogTitle>
          <DialogDescription>
            Provide a hosted URL to the document and a friendly file name.
            File hosting / direct uploads will be wired up in a future
            release — for now paste a signed URL or share-link.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => upload.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select
              value={form.watch('documentType')}
              onValueChange={(v) =>
                form.setValue(
                  'documentType',
                  v as UploadFormValues['documentType'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pharmacy_license">
                  Pharmacy licence
                </SelectItem>
                <SelectItem value="business_registration">
                  Business registration
                </SelectItem>
                <SelectItem value="tax_certificate">
                  Tax certificate
                </SelectItem>
                <SelectItem value="authorized_person_id">
                  Authorized person ID
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fileName">File name</Label>
            <Input
              id="fileName"
              placeholder="pharmacy_license_2024.pdf"
              {...form.register('fileName')}
            />
            {form.formState.errors.fileName && (
              <p className="text-xs text-[var(--color-mm-bad)]">
                {form.formState.errors.fileName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fileUrl">File URL</Label>
            <Input
              id="fileUrl"
              type="url"
              placeholder="https://…"
              {...form.register('fileUrl')}
            />
            {form.formState.errors.fileUrl && (
              <p className="text-xs text-[var(--color-mm-bad)]">
                {form.formState.errors.fileUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mimeType">MIME type</Label>
            <Input
              id="mimeType"
              placeholder="application/pdf"
              {...form.register('mimeType')}
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
            <Button type="submit" loading={upload.isPending}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
