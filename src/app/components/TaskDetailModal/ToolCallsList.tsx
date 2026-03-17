"use client";

import { useRef, useEffect } from "react";
import type { ToolCall } from "@/lib/types";
import { QUEUES } from "@/lib/queues";
import { formatDateTime } from "@/lib/formatDate";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import StateDivider from "./StateDivider";
import ToolCallIcon from "./ToolCallIcon";

function getQueueLabel(slug: string): string {
  return QUEUES.find((q) => q.slug === slug)?.label ?? slug;
}

function StatusBadge({ status }: { status: ToolCall["status"] }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
      <XCircle className="h-3 w-3" />
      Failed
    </span>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  let parsedInput: Record<string, unknown> | null = null;
  try {
    if (toolCall.input) parsedInput = JSON.parse(toolCall.input);
  } catch {
    // keep as raw string
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ToolCallIcon toolName={toolCall.tool_name} className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {toolCall.tool_name}
          </span>
        </div>
        <StatusBadge status={toolCall.status} />
      </div>

      {parsedInput && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
            Input
          </summary>
          <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {JSON.stringify(parsedInput, null, 2)}
          </pre>
        </details>
      )}

      {!parsedInput && toolCall.input && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
            Input
          </summary>
          <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {toolCall.input}
          </pre>
        </details>
      )}

      {toolCall.output && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
            Output
          </summary>
          <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {toolCall.output}
          </pre>
        </details>
      )}

      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {formatDateTime(toolCall.created_at)}
      </p>
    </div>
  );
}

interface ToolCallsListProps {
  toolCalls: ToolCall[];
}

export default function ToolCallsList({ toolCalls }: ToolCallsListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [toolCalls]);

  if (toolCalls.length === 0) {
    return (
      <div className="min-h-0 flex-1 flex flex-col border-t border-zinc-100 px-5 pt-4 dark:border-zinc-700">
        <p className="text-sm italic text-zinc-400 dark:text-zinc-500">No tool calls recorded.</p>
      </div>
    );
  }

  // Group by task_state_at_creation
  const groups: { state: string; calls: ToolCall[] }[] = [];
  for (const tc of toolCalls) {
    const last = groups[groups.length - 1];
    if (last && last.state === tc.task_state_at_creation) {
      last.calls.push(tc);
    } else {
      groups.push({ state: tc.task_state_at_creation, calls: [tc] });
    }
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col border-t border-zinc-100 px-5 pt-4 dark:border-zinc-700">
      <div className="min-h-0 flex-1 overflow-y-auto space-y-1 pr-1 pb-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            <StateDivider label={getQueueLabel(group.state)} />
            <div className="space-y-2">
              {group.calls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
