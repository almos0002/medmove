import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-mm-accent)] text-[var(--color-mm-accent-ink)] hover:bg-[#0c4a3c]',
        secondary:
          'bg-[var(--color-mm-surface)] text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:bg-[var(--color-mm-canvas)]',
        ghost:
          'bg-transparent text-[var(--color-mm-ink)] hover:bg-[var(--color-mm-canvas)]',
        danger:
          'bg-[var(--color-mm-bad)] text-white hover:bg-[#741822]',
        outline:
          'bg-transparent text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:bg-[var(--color-mm-canvas)]',
        link: 'bg-transparent text-[var(--color-mm-accent)] underline-offset-4 hover:underline px-0 py-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-sm squircle',
        md: 'h-10 px-4 text-sm squircle',
        lg: 'h-12 px-6 text-base squircle',
        icon: 'h-9 w-9 squircle',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, asChild, loading, children, disabled, ...rest },
    ref,
  ) {
    // When asChild, the consumer owns the markup (e.g. <Link>). Slot is
    // strict: it requires exactly one element child and forwards props
    // to it — so we must hand it `children` untouched (no loader spinner
    // injection, no fragment). Loading is a no-op for asChild buttons.
    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size }), className)}
          {...rest}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
