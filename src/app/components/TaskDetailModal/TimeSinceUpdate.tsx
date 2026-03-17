"use client";

import { useEffect, useState } from "react";

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
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(updatedAt).getTime());

  useEffect(() => {
    setElapsed(Date.now() - new Date(updatedAt).getTime());
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(updatedAt).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  return (
    <span data-testid="time-since-update">{formatElapsed(elapsed)} ago</span>
  );
}

export { formatElapsed };
