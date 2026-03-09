"use client";

import { useEffect, useState } from "react";

/**
 * Returns the total active (agent-working) time in milliseconds.
 *
 * - When `activeSince` is set the hook ticks every second, adding the
 *   live delta to the accumulated `activeTimeMs`.
 * - When `activeSince` is null the returned value is simply `activeTimeMs`.
 */
export function useActiveTime(activeTimeMs: number, activeSince: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSince) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSince]);

  if (!activeSince) return activeTimeMs;
  const sinceMs = new Date(activeSince).getTime();
  return activeTimeMs + Math.max(0, now - sinceMs);
}

export function formatActiveTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
