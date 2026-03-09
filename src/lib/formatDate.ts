/**
 * Formats an ISO 8601 date string into a human-readable local date/time.
 * Example output: "Mar 9, 2026, 12:21:12 PM"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
