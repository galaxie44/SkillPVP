import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePassword(length = 12): string {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.length >= 3
    ? cleaned.slice(0, 32)
    : `user_${cleaned || "mc"}`.slice(0, 32);
}

export function getLoginUrl(siteUrl?: string): string {
  const base =
    siteUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return "/login";
  return `${base.replace(/\/$/, "")}/login`;
}

export function formatAccountCredentialsText(
  username: string,
  password: string,
  siteUrl?: string
): string {
  return `Site: ${getLoginUrl(siteUrl)}\nLogin: ${username}\nMot de passe: ${password}`;
}
