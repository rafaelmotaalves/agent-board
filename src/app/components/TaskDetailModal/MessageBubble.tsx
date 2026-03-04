"use client";

import { useRef } from "react";
import type { TaskMessage } from "@/lib/types";
import { Bot, User, PenLine } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: TaskMessage;
}

/** Renders streaming text word-by-word with a fade-in animation for new tokens. */
function StreamingContent({ content }: { content: string }) {
  const seenLengthRef = useRef(0);
  const prevSeen = seenLengthRef.current;
  const seenText = content.slice(0, prevSeen);
  const newText = content.slice(prevSeen);
  seenLengthRef.current = content.length;

  // Split new text on whitespace boundaries, keeping the separators
  const newTokens = newText ? newText.split(/(\s+)/) : [];

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {seenText}
      {newTokens.map((token, i) => (
        <span
          key={`${prevSeen}-${i}`}
          className="animate-word-in"
          style={{ animationDelay: `${i * 25}ms` }}
        >
          {token}
        </span>
      ))}
      {/* Blinking cursor */}
      <span
        className="inline-block w-0.5 h-[1em] ml-px bg-blue-500 align-text-bottom animate-cursor-blink"
        aria-hidden="true"
      />
    </p>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = !message.is_complete;
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${isUser ? "bg-zinc-500" : "bg-blue-600"}`}>
        {isUser
          ? <User className="h-3.5 w-3.5" aria-hidden="true" />
          : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* "Writing…" badge shown while streaming */}
        {isStreaming && !isUser && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-medium text-blue-400 dark:text-blue-300 uppercase tracking-wide">
            <PenLine className="h-2.5 w-2.5" aria-hidden="true" />
            writing…
          </span>
        )}
        <div className={`rounded-xl px-3 py-2 text-sm ${
          isStreaming && !isUser
            ? "rounded-tl-sm border border-blue-200 bg-blue-50 text-zinc-800 shadow-sm dark:border-blue-700 dark:bg-blue-900/30 dark:text-zinc-100"
            : isUser
              ? "rounded-tr-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
              : "rounded-tl-sm bg-blue-50 text-zinc-800 dark:bg-blue-900/30 dark:text-zinc-100"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content.trim() ?? ""}</p>
          ) : isStreaming ? (
            <StreamingContent content={message.content.trim() ?? ""} />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{message.content.trim() ?? ""}</ReactMarkdown>
            </div>
          )}
        </div>
        <p className="mt-0.5 px-1 text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(message.created_at).toISOString()}
        </p>
      </div>
    </div>
  );
}
