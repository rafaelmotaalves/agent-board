"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/types";
import { isReadyForReview } from "@/lib/queues";

export function useReviewSound(tasks: Task[], enabled: boolean) {
  const prevIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const currentIds = new Set(
      tasks.filter((t) => isReadyForReview(t.state, t.status)).map((t) => t.id)
    );

    // Skip playing on initial mount to avoid sound blast
    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds;
      return;
    }

    if (enabled) {
      const hasNew = [...currentIds].some((id) => !prevIdsRef.current!.has(id));
      if (hasNew) {
        const audio = new Audio("/sounds/notification.wav");
        audio.play().catch(() => {});
      }
    }

    prevIdsRef.current = currentIds;
  }, [tasks, enabled]);
}
