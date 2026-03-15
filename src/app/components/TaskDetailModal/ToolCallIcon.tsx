"use client";

import { createElement } from "react";
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
  return createElement(getToolIcon(kind), { className });
}
