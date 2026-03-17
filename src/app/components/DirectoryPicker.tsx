"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, FolderUp, Check, X, Loader2 } from "lucide-react";

interface DirectoryEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  current: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  className?: string;
}

export default function DirectoryPicker({
  value,
  onChange,
  placeholder = "Working directory (optional)",
  className = "",
}: DirectoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browse = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/filesystem${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to browse directory");
      }
      const data: BrowseResponse = await res.json();
      setCurrentPath(data.current);
      setParentPath(data.parent);
      setDirectories(data.directories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to browse");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      browse(value || undefined);
    }
  }, [isOpen, browse, value]);

  function handleSelect() {
    onChange(currentPath);
    setIsOpen(false);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="mt-2 rounded border border-zinc-200 px-2 py-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          title="Browse directories"
        >
          <FolderOpen size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
          {/* Current path header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-600">
            <p
              className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-300"
              title={currentPath}
            >
              {currentPath}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          </div>

          {/* Directory list */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-zinc-400" />
              </div>
            ) : error ? (
              <p className="px-3 py-4 text-center text-xs text-red-500">
                {error}
              </p>
            ) : (
              <div className="py-1">
                {parentPath && (
                  <button
                    type="button"
                    onClick={() => browse(parentPath)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <FolderUp size={14} />
                    <span>..</span>
                  </button>
                )}
                {directories.length === 0 && (
                  <p className="px-3 py-3 text-center text-xs text-zinc-400">
                    No subdirectories
                  </p>
                )}
                {directories.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    onClick={() => browse(dir.path)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <FolderOpen size={14} className="shrink-0 text-amber-500" />
                    <span className="truncate">{dir.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Select button */}
          <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-600">
            <button
              type="button"
              onClick={handleSelect}
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={14} />
              Select this directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
