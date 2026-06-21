import React from 'react'
import { cn } from '@utils/cn'

interface BigButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

export const BigButton = React.forwardRef<HTMLButtonElement, BigButtonProps>(
  ({ className, variant = 'primary', size = 'lg', isLoading, fullWidth, icon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all active:scale-95',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' && 'min-h-[40px] px-3 py-2 text-sm-mobile',
        size === 'md' && 'min-h-[48px] px-4 py-3 text-base-mobile',
        size === 'lg' && 'min-h-[56px] px-5 py-4 text-lg-mobile',
        size === 'xl' && 'min-h-[64px] px-6 py-5 text-xl-mobile',
        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        variant === 'ghost' && 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  ),
)

BigButton.displayName = 'BigButton'
