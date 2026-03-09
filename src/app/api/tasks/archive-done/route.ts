import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService } from "@/lib/taskService";

function getService() {
  return new TaskService(getDb());
}

export async function POST() {
  const count = getService().archiveAllDone();
  return NextResponse.json({ archived: count });
}
