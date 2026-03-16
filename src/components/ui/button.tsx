import * as React from 'react'
import { cn } from '@/lib/utils'

const variantClasses = {
  default:
    'bg-[var(--accent)] text-white hover:opacity-95 hover:shadow-[0_0_20px_rgba(0,184,245,0.4)] rounded-lg',
  outline:
    'border border-white/10 bg-transparent hover:border-[var(--accent)]/50 hover:bg-white/5 text-[var(--text)] rounded-lg',
  ghost:
    'hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg',
  destructive:
    'bg-[var(--danger)]/90 text-white hover:bg-[var(--danger)] rounded-lg',
}
const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-11 px-6 text-base',
}

const buttonClasses =
  'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild, children, ...props }, ref) => {
    const classes = cn(
      buttonClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(classes, (children as React.ReactElement<{ className?: string }>).props?.className),
      })
    }
    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
