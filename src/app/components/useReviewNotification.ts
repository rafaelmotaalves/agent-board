"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/types";
import { isReadyForReview } from "@/lib/queues";

export function useReviewNotification(tasks: Task[], enabled: boolean) {
  const prevIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const currentIds = new Set(
      tasks.filter((t) => isReadyForReview(t.state, t.status)).map((t) => t.id)
    );

    // Skip notification on initial mount
    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds;
      return;
    }

    if (enabled && Notification.permission === "granted") {
      const newTasks = tasks.filter(
        (t) => currentIds.has(t.id) && !prevIdsRef.current!.has(t.id)
      );
      if (newTasks.length > 0) {
        const body =
          newTasks.length === 1
            ? newTasks[0].title
            : `${newTasks.length} tasks need your attention`;
        new Notification("Task Ready for Review", {
          body,
          icon: "/favicon.ico",
        });
      }
    }

    prevIdsRef.current = currentIds;
  }, [tasks, enabled]);
}
