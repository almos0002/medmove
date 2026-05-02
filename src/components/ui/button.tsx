import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Button — friendly, Airbnb-style. Squircle corners, soft borders, no shadows.
 * Primary is filled deep-teal. Secondary/outline are bordered. Ghost is bare.
 *
 * `asChild` swaps the rendered element to the single React child via
 * Radix `Slot` so the same variant styles can wrap a `<Link>` etc. — must
 * receive exactly one child element.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-mm-accent)] text-white border border-[var(--color-mm-accent)] hover:bg-[var(--color-mm-ink)] hover:border-[var(--color-mm-ink)]',
        secondary:
          'bg-white text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)] hover:bg-black/[0.02]',
        outline:
          'bg-transparent text-[var(--color-mm-ink)] border border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)]',
        ghost:
          'bg-transparent text-[var(--color-mm-ink)] border border-transparent hover:bg-black/[0.04]',
        dark:
          'bg-[var(--color-mm-ink)] text-white border border-[var(--color-mm-ink)] hover:bg-[var(--color-mm-accent)] hover:border-[var(--color-mm-accent)]',
        danger:
          'bg-[var(--color-mm-bad)] text-white border border-[var(--color-mm-bad)] hover:opacity-90',
        link:
          'bg-transparent text-[var(--color-mm-ink)] border-0 px-0 py-0 h-auto underline underline-offset-4 hover:text-[var(--color-mm-accent)]',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px] squircle-xs',
        md: 'h-11 px-5 text-sm squircle-sm',
        lg: 'h-12 px-6 text-[15px] squircle-sm',
        xl: 'h-14 px-8 text-base squircle-sm',
        icon: 'h-10 w-10 squircle-xs',
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
    {
      className,
      variant,
      size,
      asChild,
      loading,
      disabled,
      children,
      ...rest
    },
    ref,
  ) {
    if (asChild) {
      // Slot renders into the single child; we only forward classNames + ref.
      return (
        <Slot
          className={cn(buttonVariants({ variant, size }), className)}
          ref={ref as unknown as React.Ref<HTMLElement>}
        >
          {children as React.ReactElement}
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
    )
  },
)
