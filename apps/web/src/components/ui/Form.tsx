import { forwardRef } from 'react';
import { cn } from './cn';

/**
 * Label component for form fields
 */
export function Label({
  className,
  htmlFor,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-sm font-medium text-fg-primary mb-2', className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

/**
 * Help text displayed below form fields
 */
export function HelpText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-fg-muted mt-1.5 leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Error message displayed for form field validation
 */
export function FieldError({
  className,
  role = 'alert',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { role?: string }) {
  return (
    <div
      role={role}
      className={cn('text-sm text-destructive mt-1.5 font-medium', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Input component with integrated label, help text, and error messaging
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Associated label text */
  label?: React.ReactNode;
  /** Helper text displayed below input */
  helpText?: React.ReactNode;
  /** Error message displayed below input */
  error?: React.ReactNode;
  /** Mark field as required */
  required?: boolean;
  /** Wrapper class name */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    wrapperClassName,
    label,
    helpText,
    error,
    required,
    id,
    disabled,
    type = 'text',
    ...props
  },
  ref,
) {
  // Generate stable ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        className={cn(
          [
            'w-full px-3 py-2 text-sm font-normal',
            'bg-bg-primary text-fg-primary',
            'border border-border-default rounded-md',
            'transition-fast',
            'placeholder:text-fg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'focus-visible:border-border-active',
            'disabled:bg-panel-default disabled:text-fg-muted disabled:cursor-not-allowed',
          ],
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          [error && `${inputId}-error`, helpText && `${inputId}-help`]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      />
      {error && <FieldError id={`${inputId}-error`}>{error}</FieldError>}
      {helpText && <HelpText id={`${inputId}-help`}>{helpText}</HelpText>}
    </div>
  );
});

/**
 * Textarea component with integrated label, help text, and error messaging
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Associated label text */
  label?: React.ReactNode;
  /** Helper text displayed below textarea */
  helpText?: React.ReactNode;
  /** Error message displayed below textarea */
  error?: React.ReactNode;
  /** Mark field as required */
  required?: boolean;
  /** Wrapper class name */
  wrapperClassName?: string;
}

export function Textarea({
  className,
  wrapperClassName,
  label,
  helpText,
  error,
  required,
  id,
  disabled,
  ...props
}: TextareaProps) {
  // Generate stable ID if not provided
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <Label htmlFor={textareaId} required={required}>
          {label}
        </Label>
      )}
      <textarea
        id={textareaId}
        disabled={disabled}
        className={cn(
          [
            'w-full px-3 py-2 text-sm font-normal',
            'bg-bg-primary text-fg-primary',
            'border border-border-default rounded-md',
            'transition-fast resize-vertical',
            'placeholder:text-fg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'focus-visible:border-border-active',
            'disabled:bg-panel-default disabled:text-fg-muted disabled:cursor-not-allowed',
          ],
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          [error && `${textareaId}-error`, helpText && `${textareaId}-help`]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      />
      {error && <FieldError id={`${textareaId}-error`}>{error}</FieldError>}
      {helpText && <HelpText id={`${textareaId}-help`}>{helpText}</HelpText>}
    </div>
  );
}

/**
 * Select/dropdown component with integrated label, help text, and error messaging
 */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Associated label text */
  label?: React.ReactNode;
  /** Helper text displayed below select */
  helpText?: React.ReactNode;
  /** Error message displayed below select */
  error?: React.ReactNode;
  /** Mark field as required */
  required?: boolean;
  /** Wrapper class name */
  wrapperClassName?: string;
  /** Select options */
  options?: Array<{ value: string; label: string }>;
}

export function Select({
  className,
  wrapperClassName,
  label,
  helpText,
  error,
  required,
  id,
  disabled,
  options,
  children,
  ...props
}: SelectProps) {
  // Generate stable ID if not provided
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <Label htmlFor={selectId} required={required}>
          {label}
        </Label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        className={cn(
          [
            'w-full px-3 py-2 text-sm font-normal',
            'bg-bg-primary text-fg-primary',
            'border border-border-default rounded-md',
            'transition-fast cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'focus-visible:border-border-active',
            'disabled:bg-panel-default disabled:text-fg-muted disabled:cursor-not-allowed',
            'appearance-none',
          ],
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          [error && `${selectId}-error`, helpText && `${selectId}-help`]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      >
        {options ? (
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      {error && <FieldError id={`${selectId}-error`}>{error}</FieldError>}
      {helpText && <HelpText id={`${selectId}-help`}>{helpText}</HelpText>}
    </div>
  );
}
