import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge.
 * This utility is the foundation of shadcn/ui component styling.
 *
 * @param inputs - Class values to merge (strings, arrays, objects)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * cn('px-2 py-1', 'px-4') // Returns 'py-1 px-4' (px-4 wins)
 * cn('text-red-500', condition && 'text-blue-500')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
