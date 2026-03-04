interface StateDividerProps {
  label: string;
}

export default function StateDivider({ label }: StateDividerProps) {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-700" />
      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-700" />
    </div>
  );
}
