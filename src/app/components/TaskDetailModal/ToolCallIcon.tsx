"use client";

import {
  Wrench,
  Eye,
  Pencil,
  FilePlus,
  Terminal,
  Search,
  Globe,
  GitBranch,
  FolderSearch,
  FileText,
  MessageSquare,
  Plug,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: [RegExp, LucideIcon][] = [
  [/^view$/, Eye],
  [/^read_powershell$/, Terminal],
  [/^write_powershell$/, Terminal],
  [/^stop_powershell$/, Terminal],
  [/^list_powershell$/, Terminal],
  [/^powershell$/, Terminal],
  [/^edit$/, Pencil],
  [/^create$/, FilePlus],
  [/^grep$/, Search],
  [/^glob$/, FolderSearch],
  [/^web_fetch$/, Globe],
  [/^web_search$/, Globe],
  [/^task$/, MessageSquare],
  [/^skill$/, Plug],
  [/^report_intent$/, FileText],
  [/^update_todo$/, FileText],
  [/git/i, GitBranch],
  [/search/i, Search],
  [/read/i, Eye],
  [/write|edit|create|update/i, Pencil],
  [/shell|terminal|exec|run/i, Terminal],
  [/url|http|fetch|web/i, Globe],
  [/mcp/i, Plug],
];

export function getToolIcon(toolName: string): LucideIcon {
  for (const [pattern, icon] of ICON_MAP) {
    if (pattern.test(toolName)) return icon;
  }
  return Wrench;
}

interface ToolCallIconProps {
  toolName: string;
  className?: string;
}

export default function ToolCallIcon({ toolName, className = "h-3.5 w-3.5" }: ToolCallIconProps) {
  const Icon = getToolIcon(toolName);
  return <Icon className={className} />;
}
