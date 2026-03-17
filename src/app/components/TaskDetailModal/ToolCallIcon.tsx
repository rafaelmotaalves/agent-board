"use client";

import {
  Wrench,
  Eye,
  Pencil,
  Terminal,
  Globe,
  Plug,
  type LucideIcon,
} from "lucide-react";

const KIND_ICONS: Record<string, LucideIcon> = {
  read: Eye,
  write: Pencil,
  shell: Terminal,
  url: Globe,
  mcp: Plug,
};

export function getToolIcon(kind: string | null): LucideIcon {
  return (kind && KIND_ICONS[kind]) || Wrench;
}

interface ToolCallIconProps {
  kind: string | null;
  className?: string;
}

export default function ToolCallIcon({ kind, className = "h-3.5 w-3.5" }: ToolCallIconProps) {
  const Icon = getToolIcon(kind);
  // eslint-disable-next-line react-hooks/static-components -- Icon is a stable lookup, not a dynamic component creation
  return <Icon className={className} />;
}
