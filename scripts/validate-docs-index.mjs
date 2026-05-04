import fs from "node:fs";
import fg from "fast-glob";
import YAML from "yaml";

const indexPath = "docs/_meta/docs-index.yaml";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(indexPath)) {
  fail(`${indexPath} is missing`);
  process.exit();
}

const index = YAML.parse(fs.readFileSync(indexPath, "utf8"));
const allowedStatuses = new Set(index.statuses ?? []);
const indexedDocs = index.docs ?? {};

for (const [docPath, meta] of Object.entries(indexedDocs)) {
  if (!fs.existsSync(docPath)) fail(`Indexed doc does not exist: ${docPath}`);
  if (!meta.category) fail(`${docPath}: category is required`);
  if (!meta.status) fail(`${docPath}: status is required`);
  if (meta.status && !allowedStatuses.has(meta.status)) {
    fail(`${docPath}: invalid status: ${meta.status}`);
  }
  if (!meta.owner) fail(`${docPath}: owner is required`);
  if (!meta.edit_policy) fail(`${docPath}: edit_policy is required`);
  if (!Array.isArray(meta.read_for)) fail(`${docPath}: read_for must be a list`);
}

const docs = await fg("docs/**/*.md");
const unindexed = docs.filter((path) => !indexedDocs[path]);

if (unindexed.length) {
  console.warn("⚠️ Unindexed docs found:");
  for (const path of unindexed) console.warn(`- ${path}`);
  console.warn("This is a warning for now. Add these over time.");
}

if (!process.exitCode) {
  console.log("✅ Docs index looks good");
}
