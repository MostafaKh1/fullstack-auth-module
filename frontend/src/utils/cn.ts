import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class lists and lets later Tailwind classes win over conflicting earlier ones, so a caller's `className` overrides a variant. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
