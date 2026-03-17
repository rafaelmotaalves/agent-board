import type { Agent } from "@/lib/types";

interface BoardHeaderProps {
  agents: Agent[];
  showAgents: boolean;
  onToggleAgents: () => void;
}

export default function BoardHeader({ agents, showAgents, onToggleAgents }: BoardHeaderProps) {
  return (
    <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            AgentBoard
          </h1>
        </div>
        <button
          onClick={onToggleAgents}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showAgents
              ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          }`}
        >
          Agents{agents.length > 0 ? ` (${agents.length})` : ""}
        </button>
      </div>
    </header>
  );
}
