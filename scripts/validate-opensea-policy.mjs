import fs from "node:fs";
import fg from "fast-glob";
import YAML from "yaml";

const policyPath = ".agents/policies/opensea-readonly.yaml";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(policyPath)) {
  fail(`${policyPath} is missing`);
  process.exit();
}

const policy = YAML.parse(fs.readFileSync(policyPath, "utf8"));

if (policy.mode !== "read_only") {
  fail("OpenSea policy mode must be read_only");
}

const requiredForbidden = [
  "fulfill_listing",
  "fulfill_offer",
  "create_listing",
  "create_offer",
  "swaps_quote",
  "get_token_swap_quote",
  "mint_action",
  "deploy_seadrop_contract",
  "sign_transaction",
  "submit_transaction",
  "request_wallet_signature",
  "configure_private_key",
];

for (const item of requiredForbidden) {
  if (!policy.forbidden?.includes(item)) {
    fail(`OpenSea policy must forbid: ${item}`);
  }
}

const riskyTerms = [
  "PRIVATE_KEY",
  "SEED_PHRASE",
  "PRIVY_APP_SECRET",
  "PRIVY_WALLET_ID",
  "fulfill_listing",
  "fulfill_offer",
  "create_listing",
  "create_offer",
  "swaps_quote",
  "get_token_swap_quote",
  "mint_action",
  "deploy_seadrop_contract",
  "sign_transaction",
  "submit_transaction",
  "request_wallet_signature",
];

const files = await fg(["app/**/*", "lib/**/*", "components/**/*"], {
  onlyFiles: true,
  ignore: [
    "node_modules/**",
    ".next/**",
    ".agents/**",
    "docs/**",
    "scripts/**"
  ],
});

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const term of riskyTerms) {
    if (text.includes(term)) {
      fail(`Forbidden OpenSea/security term found in runtime code: ${term} in ${file}`);
    }
  }
}

if (!process.exitCode) {
  console.log("✅ OpenSea policy looks good");
}
