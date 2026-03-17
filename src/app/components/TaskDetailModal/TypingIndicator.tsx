import { Bot, Loader2 } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-2 flex-row mt-2">
      <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="rounded-xl rounded-tl-sm bg-blue-50 px-3 py-2.5 dark:bg-blue-900/30 flex items-center">
        <Loader2 className="h-4 w-4 animate-spin text-white" aria-label="Agent is writing…" />
      </div>
    </div>
  );
}
