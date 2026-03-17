"use client";

import type { ToolCall } from "@/lib/types";
import { Loader2 } from "lucide-react";
import ToolCallIcon from "./ToolCallIcon";

interface ActiveToolBarProps {
  toolCalls: ToolCall[];
}

export default function ActiveToolBar({ toolCalls }: ActiveToolBarProps) {
  const runningCalls = toolCalls.filter((tc) => tc.status === "running");
  const latest = runningCalls[runningCalls.length - 1];

  if (!latest) return null;

  return (
    <div className="flex-shrink-0 w-full flex items-center gap-2 rounded-t-lg border border-b-0 border-blue-200 bg-blue-50/90 px-3 py-2 text-xs text-blue-700 backdrop-blur-sm dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
      <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
      <ToolCallIcon kind={latest.kind} className="h-3 w-3 flex-shrink-0" />
      <span className="truncate font-medium">{latest.tool_name}</span>
    </div>
  );
}
