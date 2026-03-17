import { Loader2, MessageSquarePlus } from "lucide-react";

interface CommentFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
}

export default function CommentForm({ value, onChange, onSubmit, submitting, error }: CommentFormProps) {
  return (
    <div className="flex-shrink-0 border-t border-zinc-100 px-5 py-4 dark:border-zinc-700">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        Send Message
      </h3>
      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Send a message — the agent will continue based on it…"
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          disabled={submitting}
        />
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="mr-1 inline-block h-3 w-3 animate-spin" aria-hidden="true" />Sending…</>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
