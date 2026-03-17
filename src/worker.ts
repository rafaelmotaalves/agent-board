declare var self: Worker;

import { TaskWorker } from "./lib/worker";
import { TaskService } from "./lib/taskService";
import { getDb } from "./lib/db";
import { AgentPool } from "./lib/agents";
import { AgentService } from "./lib/agents";
import logger from "./lib/logger";

const log = logger.child({ module: "worker-entrypoint" });

const db = getDb();
const agentPool = new AgentPool(new AgentService(db));
const taskService = new TaskService(db);
const taskWorker = new TaskWorker(taskService, agentPool);

const recoveredCount = taskService.recoverInProgressTasks();
if (recoveredCount > 0) {
  log.info({ recoveredCount }, "Marked in_progress tasks as failed on startup");
}

log.info("Starting task worker process");
taskWorker.start();