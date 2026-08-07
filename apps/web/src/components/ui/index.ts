/**
 * UI Component Library Index
 * 
 * Centralized exports for all accessible, brand-compliant UI primitives.
 * These components follow the iJac brand design system with semantic CSS variables,
 * focus management, reduced-motion support, and comprehensive accessibility attributes.
 */

// Utilities
export { cn } from './cn';

// Interaction Primitives
export { Button } from './Button';
export type { ButtonProps, ButtonVariants } from './Button';

// Form Components
export {
  Label,
  HelpText,
  FieldError,
  Input,
  Textarea,
  Select,
} from './Form';

// State/UI Components
export {
  Panel,
  Badge,
  Alert,
  LoadingState,
  EmptyState,
} from './States';
export type {
  PanelProps,
  BadgeProps,
  AlertProps,
  LoadingStateProps,
  EmptyStateProps,
} from './States';

// Dialog/Modal
export { Dialog, useDialog } from './Dialog';
export type { DialogProps } from './Dialog';
