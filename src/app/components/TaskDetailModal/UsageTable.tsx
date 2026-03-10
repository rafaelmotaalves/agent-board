"use client";

import type { TaskUsage } from "@/lib/types";
import { QUEUES } from "@/lib/queues";

function getQueueLabel(slug: string): string {
  return QUEUES.find((q) => q.slug === slug)?.label ?? slug;
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit <= 0) return null;
  const pct = Math.min(100, (used / limit) * 100);
  const color =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface UsageTableProps {
  usage: TaskUsage[];
}

export default function UsageTable({ usage }: UsageTableProps) {
  if (usage.length === 0) {
    return (
      <div className="min-h-0 flex-1 flex flex-col border-t border-zinc-100 px-5 pt-4 dark:border-zinc-700">
        <p className="text-sm italic text-zinc-400 dark:text-zinc-500">No usage data recorded.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col border-t border-zinc-100 px-5 pt-4 dark:border-zinc-700">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="pb-2 pr-4">Phase</th>
              <th className="pb-2 pr-4 text-right">Used Tokens</th>
              <th className="pb-2 pr-4 text-right">Token Limit</th>
              <th className="pb-2 w-40">Usage</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr
                key={u.id}
                className="border-b border-zinc-100 dark:border-zinc-700/50"
              >
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {getQueueLabel(u.status)}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatTokens(u.used_tokens)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                  {u.token_limit > 0 ? formatTokens(u.token_limit) : "—"}
                </td>
                <td className="py-2.5">
                  <UsageBar used={u.used_tokens} limit={u.token_limit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
