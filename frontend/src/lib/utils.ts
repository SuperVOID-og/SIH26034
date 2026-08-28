import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a backend-relative storage path (e.g. "inspections/9/foo.png")
 * into a publicly accessible media URL via the FastAPI /media mount.
 *
 * Never hardcodes localhost — always uses NEXT_PUBLIC_API_BASE_URL.
 */
export function getMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  // Normalize separators and strip any leading slash
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${base}/media/${clean}`;
}

