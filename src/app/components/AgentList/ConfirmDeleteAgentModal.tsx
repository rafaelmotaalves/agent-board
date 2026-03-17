"use client";

import { useRef, useEffect } from "react";
import type { Agent } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface ConfirmDeleteAgentModalProps {
  agent: Agent;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteAgentModal({
  agent,
  deleting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteAgentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current && !deleting) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={deleting ? (e) => e.preventDefault() : onCancel}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Delete Agent
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Are you sure you want to delete{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {agent.name}
        </span>
        ? This action cannot be undone.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {deleting && (
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          )}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
