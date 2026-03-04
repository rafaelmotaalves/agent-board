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

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Send initial full message list
      try {
        const messages = service.listMessages(taskId);
        lastMessageId =
          messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0;
        send({ type: "init", messages });
      } catch (e) {
        if (e instanceof TaskNotFoundError) {
          controller.close();
          return;
        }
        throw e;
      }

      // Poll for new messages every second
      const intervalId = setInterval(() => {
        try {
          const messages = service.listMessages(taskId);
          const newMessages = messages.filter((m) => m.id > lastMessageId);
          if (newMessages.length > 0) {
            lastMessageId = Math.max(...newMessages.map((m) => m.id));
            send({ type: "new_messages", messages: newMessages });
          }
        } catch {
          clearInterval(intervalId);
          controller.close();
        }
      }, 1000);

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
