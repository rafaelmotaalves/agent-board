import type { Agent } from "@/lib/types";
import { ArchiveIcon, Volume2, VolumeOff } from "lucide-react";

interface BoardHeaderProps {
  agents: Agent[];
  showAgents: boolean;
  onToggleAgents: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function BoardHeader({ agents, showAgents, onToggleAgents, showArchived, onToggleArchived, soundEnabled, onToggleSound }: BoardHeaderProps) {
  return (
    <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            AgentBoard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSound}
            className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              soundEnabled
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            }`}
            title={soundEnabled ? "Disable review sound" : "Enable review sound"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeOff className="h-4 w-4" />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button
            onClick={onToggleArchived}
            className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              showArchived
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            }`}
          >
            <ArchiveIcon className="h-4 w-4" />
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
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
      </div>
    </header>
  );
}
