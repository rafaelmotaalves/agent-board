import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, TaskNotFoundError } from "@/lib/taskService";

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
      // Track content snapshots of incomplete messages for delta detection
      const incompleteContent = new Map<number, string>();

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Send initial full message list
      try {
        const messages = service.listMessages(taskId);
        lastMessageId =
          messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0;
        // Track any already-incomplete messages
        for (const m of messages) {
          if (!m.is_complete) incompleteContent.set(m.id, m.content);
        }
        send({ type: "init", messages });
      } catch (e) {
        if (e instanceof TaskNotFoundError) {
          controller.close();
          return;
        }
        throw e;
      }

      // Poll for new messages and content changes every second
      const intervalId = setInterval(() => {
        try {
          const messages = service.listMessages(taskId);

          // Detect new messages
          const newMessages = messages.filter((m) => m.id > lastMessageId);
          if (newMessages.length > 0) {
            lastMessageId = Math.max(...newMessages.map((m) => m.id));
            send({ type: "new_messages", messages: newMessages });
            // Track new incomplete messages
            for (const m of newMessages) {
              if (!m.is_complete) incompleteContent.set(m.id, m.content);
            }
          }

          // Detect content updates on tracked incomplete messages
          for (const m of messages) {
            if (!incompleteContent.has(m.id)) continue;
            const prev = incompleteContent.get(m.id)!;
            if (m.content !== prev || m.is_complete) {
              incompleteContent.set(m.id, m.content);
              send({ type: "message_updated", message: m });
              if (m.is_complete) incompleteContent.delete(m.id);
            }
          }
        } catch {
          clearInterval(intervalId);
          controller.close();
        }
      }, 300);

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
