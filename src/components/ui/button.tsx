import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Editorial button system.
 *
 * Visual contract:
 *   - Primary  = solid deep-teal pill, white text.
 *   - Secondary = white pill, full black border, black text.
 *   - Outline  = same as secondary but transparent (used on dark hero strips).
 *   - Ghost    = no border, black text, hover inverts to black bg + white.
 *   - Danger   = solid burgundy pill, white text.
 *   - Link     = inline link with editorial underline.
 *
 * No fills besides white, the accent, or the danger tone. No shadows.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-mm-ink)] text-white border border-[var(--color-mm-ink)] hover:bg-[var(--color-mm-accent)] hover:border-[var(--color-mm-accent)]',
        secondary:
          'bg-white text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)]',
        outline:
          'bg-transparent text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)]',
        ghost:
          'bg-transparent text-[var(--color-mm-ink)] border border-transparent hover:bg-black/[0.04]',
        danger:
          'bg-[var(--color-mm-bad)] text-white border border-[var(--color-mm-bad)] hover:bg-[var(--color-mm-ink)] hover:border-[var(--color-mm-ink)]',
        link:
          'bg-transparent text-[var(--color-mm-ink)] border-0 px-0 py-0 h-auto link-underline hover:text-[var(--color-mm-accent)]',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] squircle',
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
