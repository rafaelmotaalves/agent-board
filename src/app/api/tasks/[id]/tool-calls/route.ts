import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, TaskNotFoundError } from "@/lib/taskService";

function getService() {
  return new TaskService(getDb());
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    const toolCalls = getService().listToolCalls(taskId);
    return NextResponse.json(toolCalls);
  } catch (e) {
    if (e instanceof TaskNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
