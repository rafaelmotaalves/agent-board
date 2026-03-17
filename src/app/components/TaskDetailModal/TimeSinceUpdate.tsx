"use client";

import { useEffect, useState } from "react";

/** Parse a datetime string as UTC, handling SQLite's `YYYY-MM-DD HH:MM:SS` format. */
function parseUTC(dateStr: string): number {
  // Already ISO 8601 (has "T" and/or "Z") → parse directly
  if (dateStr.includes("T")) return new Date(dateStr).getTime();
  // SQLite `datetime('now')` format → convert to ISO 8601 UTC
  return new Date(dateStr.replace(" ", "T") + "Z").getTime();
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

interface TimeSinceUpdateProps {
  updatedAt: string;
}

export default function TimeSinceUpdate({ updatedAt }: TimeSinceUpdateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Date.now() - parseUTC(updatedAt));
    const interval = setInterval(() => {
      setElapsed(Date.now() - parseUTC(updatedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  return (
    <span data-testid="time-since-update">{formatElapsed(elapsed)} ago</span>
  );
}

export { formatElapsed, parseUTC };
