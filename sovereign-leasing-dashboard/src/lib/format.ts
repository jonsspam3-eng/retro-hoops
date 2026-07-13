import { format, formatDistanceToNowStrict } from "date-fns";

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value?: string | null): string {
  const date = parse(value);
  return date ? format(date, "MMM d, yyyy · h:mm a") : "—";
}

export function formatDate(value?: string | null): string {
  const date = parse(value);
  return date ? format(date, "MMM d, yyyy") : "—";
}

export function formatRelative(value?: string | null): string {
  const date = parse(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : "—";
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}
