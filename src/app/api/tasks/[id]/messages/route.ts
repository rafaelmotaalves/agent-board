import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, TaskNotFoundError, ValidationError } from "@/lib/taskService";

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
    const messages = getService().listMessages(taskId);
    return NextResponse.json(messages);
  } catch (e) {
    if (e instanceof TaskNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const body = await request.json();
  try {
    const message = getService().addUserMessage(taskId, body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof TaskNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
