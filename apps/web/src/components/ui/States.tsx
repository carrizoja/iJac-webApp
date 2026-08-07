import { cn } from './cn';

/**
 * Panel component for grouped content with consistent styling
 */
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Semantic variant (default, elevated, bordered) */
  variant?: 'default' | 'elevated' | 'bordered';
  /** Size of the panel (sm, md, lg) */
  size?: 'sm' | 'md' | 'lg';
}

export function Panel({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: PanelProps) {
  const variantClasses = {
    default: 'bg-panel-default border border-border-subtle',
    elevated: 'bg-panel-elevated shadow-md',
    bordered: 'bg-bg-primary border-2 border-border-default',
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-lg transition-fast',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Badge component for labels, tags, or status indicators
 */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant */
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'purple'
    | 'neutral';
  /** Size of badge (xs, sm, md) */
  size?: 'xs' | 'sm' | 'md';
  /** Removable badge with close button */
  onRemove?: () => void;
}

export function Badge({
  className,
  variant = 'default',
  size = 'sm',
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default:
      'bg-gradient-primary text-white border border-transparent',
    success:
      'bg-status-completed bg-opacity-20 text-status-completed border border-status-completed border-opacity-20',
    warning:
      'bg-priority-high bg-opacity-20 text-priority-high border border-priority-high border-opacity-20',
    error:
      'bg-destructive bg-opacity-20 text-destructive border border-destructive border-opacity-20',
    info: 'bg-status-open bg-opacity-20 text-status-open border border-status-open border-opacity-20',
    purple:
      'bg-accent-primary bg-opacity-20 text-accent-primary border border-accent-primary border-opacity-20',
    neutral:
      'bg-panel-default text-fg-primary border border-border-default',
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs font-medium rounded',
    sm: 'px-2.5 py-1 text-sm font-medium rounded-md',
    md: 'px-3 py-1.5 text-sm font-semibold rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 rounded"
          aria-label="Remove badge"
        >
          ✕
        </button>
      )}
    </span>
  );
}

/**
 * Alert component for status messages, warnings, and errors
 */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alert severity level */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Icon displayed before message */
  icon?: React.ReactNode;
  /** Optional action button text and handler */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Closeable alert with dismiss button */
  onClose?: () => void;
}

export function Alert({
  className,
  type = 'info',
  icon,
  action,
  onClose,
  children,
  ...props
}: AlertProps) {
  const typeClasses = {
    info: 'bg-status-open bg-opacity-10 border border-status-open border-opacity-20 text-status-open',
    success:
      'bg-status-completed bg-opacity-10 border border-status-completed border-opacity-20 text-status-completed',
    warning:
      'bg-priority-high bg-opacity-10 border border-priority-high border-opacity-20 text-priority-high',
    error:
      'bg-destructive bg-opacity-10 border border-destructive border-opacity-20 text-destructive',
  };

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg p-4 flex gap-3 items-start',
        typeClasses[type],
        className
      )}
      {...props}
    >
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}

      <div className="flex-1">
        <div className="text-sm font-medium">{children}</div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-semibold mt-2 underline hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 rounded"
          >
            {action.label}
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 rounded"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * LoadingState component for displaying loading skeletons and spinners
 */
interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Loading state variant (spinner, skeleton, pulse) */
  variant?: 'spinner' | 'skeleton' | 'pulse';
  /** Message to display during loading */
  message?: React.ReactNode;
  /** Size of loading indicator (sm, md, lg) */
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  className,
  variant = 'spinner',
  message = 'Loading...',
  size = 'md',
  ...props
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinnerContent = (
    <div className={cn('rounded-full border-2 border-fg-tertiary border-t-accent-primary animate-spin', sizeClasses[size])} />
  );

  const skeletonContent = (
    <div className={cn('rounded bg-panel-default animate-pulse', sizeClasses[size])} />
  );

  const pulseContent = (
    <div className={cn('rounded-full bg-accent-primary animate-pulse', sizeClasses[size])} />
  );

  const renderContent = {
    spinner: spinnerContent,
    skeleton: skeletonContent,
    pulse: pulseContent,
  };

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      {...props}
    >
      {renderContent[variant]}
      {message && <p className="text-sm text-fg-tertiary font-medium">{message}</p>}
    </div>
  );
}

/**
 * EmptyState component for displaying empty content with optional action
 */
interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Icon to display (optional) */
  icon?: React.ReactNode;
  /** Title text */
  title: React.ReactNode;
  /** Description text (optional) */
  description?: React.ReactNode;
  /** Action button (optional) */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12 px-6 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-4xl text-fg-tertiary opacity-50">{icon}</div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-fg-primary">{title}</h3>
        {description && (
          <p className="text-sm text-fg-tertiary max-w-sm">{description}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium bg-gradient-primary text-white rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export type { PanelProps, BadgeProps, AlertProps, LoadingStateProps, EmptyStateProps };
