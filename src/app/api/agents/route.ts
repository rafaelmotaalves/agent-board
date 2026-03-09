import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AgentService, AgentValidationError } from "@/lib/agents";

function getService() {
  return new AgentService(getDb());
}

export async function GET() {
  const agents = getService().list();
  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const agent = getService().create({
      name: body.name,
      port: body.port,
      type: body.type,
      command: body.command,
      folder: body.folder,
      options: body.options,
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (e) {
    if (e instanceof AgentValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
