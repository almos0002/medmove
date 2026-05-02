import * as React from 'react'
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
import { Button } from '@/components/ui/button'

/**
 * Reusable confirmation dialog. Either:
 *
 *  - Pass `trigger` to render the trigger button inside the dialog tree
 *    (uncontrolled), OR
 *  - Pass `open` + `onOpenChange` to control it from the parent (e.g. for
 *    table row actions where the trigger lives in a menu).
 *
 *  ```tsx
 *  <ConfirmDialog
 *    title="Withdraw listing?"
 *    description="This is final and can't be undone."
 *    confirmLabel="Withdraw"
 *    tone="danger"
 *    onConfirm={() => withdraw()}
 *    trigger={<Button variant="ghost">Withdraw</Button>}
 *  />
 *  ```
 */
type Tone = 'default' | 'danger'

export type ConfirmDialogProps = {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
  trigger,
  open,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              disabled={busy}
              onClick={(e) => {
                // Prevent Radix's auto-close until the consumer's handler
                // resolves — they typically close via `onOpenChange(false)`
                // after a successful mutation.
                e.preventDefault()
                void onConfirm()
              }}
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
