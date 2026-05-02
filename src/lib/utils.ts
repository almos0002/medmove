import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class lists deduplicating later wins. The standard
 * `cn` helper used across all components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
