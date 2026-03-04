import { useRef, useEffect } from "react";
import type { TaskMessage, Task } from "@/lib/types";
import { QUEUES } from "@/lib/queues";
import MessageBubble from "./MessageBubble";
import StateDivider from "./StateDivider";
import TypingIndicator from "./TypingIndicator";

function getQueueLabel(slug: string): string {
  return QUEUES.find((q) => q.slug === slug)?.label ?? slug;
}

interface ConversationProps {
  messages: TaskMessage[];
  task: Task;
}

export default function Conversation({ messages, task }: ConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, task.state]);

  // Group messages by consecutive task_state_at_creation to render dividers on transitions
  const messageGroups: { state: string; messages: TaskMessage[] }[] = [];
  for (const msg of messages) {
    const last = messageGroups[messageGroups.length - 1];
    if (last && last.state === msg.task_state_at_creation) {
      last.messages.push(msg);
    } else {
      messageGroups.push({ state: msg.task_state_at_creation, messages: [msg] });
    }
  }

  return (
    <div className="border-t border-zinc-100 px-5 pt-4 dark:border-zinc-700">
      <h3 className="mb-3 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Conversation
      </h3>
      {messages.length === 0 && task.state !== "in_progress" ? (
        <p className="text-sm italic text-zinc-400 dark:text-zinc-500">No messages yet — waiting for the agent…</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1 pb-2">
          {messageGroups.map((group, gi) => (
            <div key={gi}>
              <StateDivider label={getQueueLabel(group.state)} />
              <div className="space-y-2">
                {group.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
          {/* Show typing indicator only if the task is in_progress with no incomplete message yet */}
          {task.state === "in_progress" && !messages.some((m) => !m.is_complete) && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
