import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AgentService, AgentNotFoundError, AgentValidationError } from "@/lib/agents";

function getService() {
  return new AgentService(getDb());
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
    if (e instanceof AgentValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}