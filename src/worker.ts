declare var self: Worker;

import { TaskWorker } from "./lib/worker";
import { TaskService } from "./lib/taskService";
import { getDb } from "./lib/db";
import { AgentPool } from "./lib/agentPool";
import { AgentService } from "./lib/agentService";
import logger from "./lib/logger";

const log = logger.child({ module: "worker-entrypoint" });

const db = getDb();
const agentPool = new AgentPool(new AgentService(db));
const taskService = new TaskService(db);
const taskWorker = new TaskWorker(taskService, agentPool);

log.info("Starting task worker process");
taskWorker.start();