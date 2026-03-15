import { TaskWorker } from "./lib/worker";
import { TaskService } from "./lib/taskService";
import { getDb } from "./lib/db";
import { AgentPool } from "./lib/agents";
import { AgentService } from "./lib/agents";
import { loadConfig } from "./lib/config";
import { syncAgentsFromConfig } from "./lib/configSync";
import logger from "./lib/logger";

const log = logger.child({ module: "worker-entrypoint" });

const db = getDb();
const agentService = new AgentService(db);
const agentPool = new AgentPool(agentService);
const taskService = new TaskService(db);
const taskWorker = new TaskWorker(taskService, agentPool);

const configPath = process.env.AGENT_BOARD_CONFIG;
if (configPath) {
  try {
    const config = loadConfig(configPath);
    syncAgentsFromConfig(config, agentService);
  } catch (err) {
    log.error({ err }, "Failed to load or sync config file");
    process.exit(1);
  }
}

const recoveredCount = taskService.recoverInProgressTasks();
if (recoveredCount > 0) {
  log.info({ recoveredCount }, "Marked in_progress tasks as failed on startup");
}

log.info("Starting task worker process");
taskWorker.start();