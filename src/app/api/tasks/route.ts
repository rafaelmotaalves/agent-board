import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService, ValidationError } from "@/lib/taskService";

function getService() {
  return new TaskService(getDb());
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  try {
    const tasks = getService().list(status);
    return NextResponse.json(tasks);
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const task = getService().create({ title: body.title, description: body.description, agent_id: body.agent_id, status: body.status });
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
