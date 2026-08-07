import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from './cn';

/**
 * Button component variants using class-variance-authority (CVA).
 * Provides semantic variants, sizes, and states.
 */
const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center',
    'font-medium text-sm',
    'rounded-md',
    'transition-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95',
  ],
  {
    variants: {
      variant: {
        /* Primary: cyan/blue gradient */
        primary: [
          'bg-gradient-primary text-white',
          'hover:opacity-90',
          'focus-visible:ring-offset-focus',
        ],

        /* Secondary: panel with border */
        secondary: [
          'bg-panel-default text-fg-primary border border-border-default',
          'hover:bg-panel-hover',
          'focus-visible:ring-focus',
        ],

        /* Ghost: text-only */
        ghost: [
          'text-fg-primary',
          'hover:bg-panel-default',
          'focus-visible:ring-focus',
        ],

        /* Destructive: red variant */
        destructive: [
          'bg-destructive text-white',
          'hover:bg-destructive-hover',
          'focus-visible:ring-offset-focus',
        ],
      },

      size: {
        xs: 'h-8 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        base: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
      },

      pending: {
        true: 'opacity-70 pointer-events-none',
        false: '',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'base',
      pending: false,
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * Button component props
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  /** Show loading spinner or pending indicator */
  isLoading?: boolean;

  /** Icon to display before text (left side) */
  startIcon?: React.ReactNode;

  /** Icon to display after text (right side) */
  endIcon?: React.ReactNode;
}

/**
 * Accessible Button component with multiple variants and states.
 *
 * @example
 * <Button>Click me</Button>
 * <Button variant="destructive" size="lg">Delete</Button>
 * <Button variant="ghost" startIcon={<Icon />}>With icon</Button>
 * <Button isLoading>Loading...</Button>
 */
export function Button({
  className,
  variant,
  size,
  pending,
  isLoading,
  disabled,
  startIcon,
  endIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({
          variant,
          size,
          pending: pending || isLoading,
        }),
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {startIcon && <span className="mr-2 inline-flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-2 inline-flex items-center">{endIcon}</span>}
    </button>
  );
}

export type { ButtonProps, ButtonVariants };
