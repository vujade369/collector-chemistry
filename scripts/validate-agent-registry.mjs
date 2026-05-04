import fs from "node:fs";
import YAML from "yaml";

const registryPath = ".agents/registry.yaml";

function exists(path) {
  return fs.existsSync(path);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

if (!exists(registryPath)) {
  fail(`${registryPath} is missing`);
  process.exit();
}

const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));

if (!registry.version) fail("registry.version is required");
if (!registry.entrypoints?.canonical) fail("entrypoints.canonical is required");
if (!registry.entrypoints?.orchestrator) fail("entrypoints.orchestrator is required");

if (registry.entrypoints?.canonical && !exists(registry.entrypoints.canonical)) {
  fail(`canonical entrypoint missing: ${registry.entrypoints.canonical}`);
}

if (registry.entrypoints?.orchestrator && !exists(registry.entrypoints.orchestrator)) {
  fail(`orchestrator missing: ${registry.entrypoints.orchestrator}`);
}

for (const [taskType, task] of Object.entries(registry.task_types ?? {})) {
  if (!task.agent) fail(`${taskType}: agent is required`);
  if (task.agent && !exists(task.agent)) fail(`${taskType}: agent not found: ${task.agent}`);

  for (const doc of task.required_docs ?? []) {
    if (!exists(doc)) fail(`${taskType}: required doc not found: ${doc}`);
  }

  if (!task.checks?.length) fail(`${taskType}: checks are required`);
}

const agentsMd = exists("AGENTS.md") ? fs.readFileSync("AGENTS.md", "utf8") : "";
if (!agentsMd.includes(".agents/agents/ORCHESTRATOR.md")) {
  fail("AGENTS.md should reference .agents/agents/ORCHESTRATOR.md");
}

if (!process.exitCode) {
  console.log("✅ Agent registry looks good");
}
