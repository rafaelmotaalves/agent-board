import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, TaskNotFoundError, ValidationError } from "@/lib/taskService";

function getService() {
  return new TaskService(getDb());
}

export async function PATCH(
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
    // Handle archive/unarchive actions
    if (body.action === "archive") {
      const task = getService().archive(taskId);
      return NextResponse.json(task);
    }
    if (body.action === "unarchive") {
      const task = getService().unarchive(taskId);
      return NextResponse.json(task);
    }

    const task = getService().update(taskId, {
      title: body.title,
      description: body.description,
      status: body.status,
      state: body.state,
      failure_reason: body.failure_reason,
    });
    return NextResponse.json(task);
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    getService().delete(taskId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof TaskNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
