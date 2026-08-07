import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with automatic conflict resolution.
 * Uses clsx for conditional classes and tailwind-merge to handle conflicting Tailwind utilities.
 *
 * @example
 * cn('px-2 py-1', 'px-4') // 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', { 'text-blue-500': true }) // 'text-blue-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
