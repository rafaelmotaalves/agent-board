import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join, resolve, sep } from "path";
import { homedir } from "os";

interface DirectoryEntry {
  name: string;
  path: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get("path");

  const targetPath = rawPath ? resolve(rawPath) : homedir();

  try {
    const stat = statSync(targetPath);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory" },
        { status: 400 },
      );
    }

    const entries = readdirSync(targetPath, { withFileTypes: true });
    const directories: DirectoryEntry[] = entries
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        // Skip hidden directories and common non-useful dirs
        if (entry.name.startsWith(".")) return false;
        if (entry.name === "node_modules") return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({
        name: entry.name,
        path: join(targetPath, entry.name),
      }));

    // Build parent path (go up one level)
    const parts = targetPath.split(sep).filter(Boolean);
    const parent =
      parts.length > 1
        ? (sep === "\\" ? "" : sep) + parts.slice(0, -1).join(sep)
        : null;

    return NextResponse.json({
      current: targetPath,
      parent,
      directories,
    });
  } catch {
    return NextResponse.json(
      { error: `Cannot read directory: ${targetPath}` },
      { status: 400 },
    );
  }
}
