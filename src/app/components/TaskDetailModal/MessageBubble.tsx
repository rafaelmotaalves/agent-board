import type { TaskMessage } from "@/lib/types";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: TaskMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${isUser ? "bg-zinc-500" : "bg-blue-600"}`}>
        {isUser
          ? <User className="h-3.5 w-3.5" aria-hidden="true" />
          : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-xl px-3 py-2 text-sm ${isUser
          ? "rounded-tr-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
          : "rounded-tl-sm bg-blue-50 text-zinc-800 dark:bg-blue-900/30 dark:text-zinc-100"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-zinc-800 dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-code:bg-zinc-700 dark:prose-code:text-zinc-200">
              <ReactMarkdown>{message.content}</ReactMarkdown>
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
