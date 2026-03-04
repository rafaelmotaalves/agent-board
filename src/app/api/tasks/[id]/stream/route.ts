import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, TaskNotFoundError } from "@/lib/taskService";
import { readStreamingContent } from "@/lib/streamingStore";
import type { TaskMessage } from "@/lib/types";

/**
 * Return the best available content for a message:
 *   - If the message is still streaming, read from its temp .md file on disk.
 *   - Otherwise (complete), return the SQLite content as-is.
 */
function resolveContent(msg: TaskMessage): TaskMessage {
  if (msg.is_complete) return msg;
  const diskContent = readStreamingContent(msg.id);
  if (diskContent !== null) {
    return { ...msg, content: diskContent };
  }
  return msg;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return new Response("Invalid task ID", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const service = new TaskService(getDb());
      let lastMessageId = 0;

      /**
       * Map of messageId → last content string sent to the client for each
       * incomplete message that is actively streaming from disk.
       */
      const streamingMessages = new Map<number, string>();

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // ── Initial snapshot ─────────────────────────────────────────────────
      try {
        const messages = service.listMessages(taskId);
        lastMessageId =
          messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0;

        // Enrich incomplete messages with current disk content and start tracking them
        const enriched = messages.map((m) => {
          const resolved = resolveContent(m);
          if (!m.is_complete) {
            streamingMessages.set(m.id, resolved.content);
          }
          return resolved;
        });

        send({ type: "init", messages: enriched });
      } catch (e) {
        if (e instanceof TaskNotFoundError) {
          controller.close();
          return;
        }
        throw e;
      }

      // ── Polling interval ─────────────────────────────────────────────────
      // Poll at 100ms for snappy streaming; disk reads are fast.
      const intervalId = setInterval(() => {
        try {
          const messages = service.listMessages(taskId);

          // 1. Detect NEW messages (by id)
          const newMessages = messages.filter((m) => m.id > lastMessageId);
          if (newMessages.length > 0) {
            lastMessageId = Math.max(...newMessages.map((m) => m.id));
            const enrichedNew = newMessages.map((m) => {
              const resolved = resolveContent(m);
              if (!m.is_complete) {
                streamingMessages.set(m.id, resolved.content);
              }
              return resolved;
            });
            send({ type: "new_messages", messages: enrichedNew });
          }

          // 2. For tracked streaming messages, check for content updates on disk
          //    AND detect completion via SQLite (is_complete = 1).
          const msgById = new Map(messages.map((m) => [m.id, m]));

          for (const [msgId, prevContent] of streamingMessages) {
            const current = msgById.get(msgId);
            if (!current) continue;

            if (current.is_complete) {
              // Message is finalized in SQLite — send the authoritative content
              streamingMessages.delete(msgId);
              send({ type: "message_updated", message: current });
              continue;
            }

            // Still streaming: read from disk file
            const diskContent = readStreamingContent(msgId);
            const latestContent = diskContent ?? current.content;

            if (latestContent !== prevContent) {
              streamingMessages.set(msgId, latestContent);
              send({
                type: "message_updated",
                message: { ...current, content: latestContent },
              });
            }
          }
        } catch {
          clearInterval(intervalId);
          controller.close();
        }
      }, 100);

      // Clean up when the client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
