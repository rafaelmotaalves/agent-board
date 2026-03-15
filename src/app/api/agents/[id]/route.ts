import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AgentService, AgentNotFoundError, AgentValidationError, AgentConfigError } from "@/lib/agents";

function getService() {
  return new AgentService(getDb());
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agentId = parseInt(id, 10);
  if (isNaN(agentId)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const body = await request.json();
  try {
    const agent = getService().update(agentId, {
      name: body.name,
      port: body.port,
      type: body.type,
      command: body.command,
      folder: body.folder,
      options: body.options,
    });
    return NextResponse.json(agent);
  } catch (e) {
    if (e instanceof AgentNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof AgentConfigError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof AgentValidationError) {
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
  const agentId = parseInt(id, 10);
  if (isNaN(agentId)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  try {
    getService().delete(agentId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AgentNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof AgentConfigError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof AgentValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}