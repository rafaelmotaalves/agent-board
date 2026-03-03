import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TaskService } from "@/lib/taskService";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }
  new TaskService(getDb()).reset();
  return NextResponse.json({ success: true });
}
