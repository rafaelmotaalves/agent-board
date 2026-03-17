declare var self: Worker;

import { TaskWorker } from "./lib/worker";
import { TaskService } from "./lib/taskService";
import { getDb } from "./lib/db";

const taskService = new TaskService(getDb());
const taskWorker = new TaskWorker(taskService);

console.log("Worker initialized");
taskWorker.start();