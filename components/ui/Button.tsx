import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-neon-blue text-black hover:brightness-90',
  secondary: 'border-2 border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black',
  dark: 'bg-bg-dark text-white hover:brightness-110',
  ghost: 'text-text-secondary hover:bg-bg-secondary',
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'rounded-full px-6 py-3 font-semibold transition-all duration-200',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
