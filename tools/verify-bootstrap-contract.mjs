#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const BOOT_CONTRACT_PATH = "doctrine/OURSELF-BOOTSTRAP-SELFCOMMUNICATION-CONTRACT-v0.1-CANDIDATE.md";

export const REQUIRED_PROJECTION_PHRASES = [
  "repository boot orientation",
  "OURSELF SELFCOMMUNICATION",
  "Every substantive agent operation may create accountable Matter",
  "Determine applicable authority",
  "Identify predecessor Matter",
  "Distinguish observation from establishment",
  "Distinguish communicated Matter from admitted meaning",
  "ACK != HOLLABACK",
  "transport != proof",
  "authority != task feasibility",
  "Do not silently mutate sealed doctrine",
  "canonical OURSELF standing",
  "INSELFACTION",
  "SELFCOMMUNICATION",
  BOOT_CONTRACT_PATH,
  "doctrine/OURSELF-COMMUNICATION-ECOSYSTEM-v0.1-CANDIDATE.md",
  "schemas/selfcommunication.event.v0.1-candidate.schema.json",
  "inselfactions/",
  "npm run verify:bootstrap",
  "npm test",
  "npm run validate:heartbeat"
];

export const REQUIRED_CONTRACT_PHRASES = [
  "CANDIDATE_BOOTSTRAP_CONTRACT",
  "ONE_COMMUNICATION_CONSTITUTION",
  "AGENTS.md = BOOT_POINTER_PLUS_NON_COLLAPSE_LAWS",
  "CLAUDE.md = BOOT_POINTER_PLUS_NON_COLLAPSE_LAWS_FOR_CLAUDESELF",
  "SELFCOMMUNICATION_DOCTRINE = SEMANTIC_SOURCE",
  "INSELFACTION = LIVING_ACTION_RECORD",
  "OBSERVATION != ESTABLISHMENT",
  "COMMUNICATED_MATTER != ADMITTED_MEANING",
  "ACK != HOLLABACK",
  "TRANSPORT != PROOF",
  "AUTHORITY != TASK_FEASIBILITY",
  "SEALED_DOCTRINE_NOT_SILENTLY_MUTATED",
  "FOREIGN_OR_CURRENT_SURFACE_STATE != CANONICAL_OURSELF_STANDING",
  "global_codex_home_mutation: NOT_PERFORMED",
  "commit_authority: NOT_EXERCISED",
  "push_authority: NOT_EXERCISED"
];

export function verifyText(label, content, requiredPhrases) {
  const normalizedContent = normalizeWhitespace(content);
  const missing = requiredPhrases.filter((phrase) => {
    const normalizedPhrase = normalizeWhitespace(phrase);
    return !normalizedContent.includes(normalizedPhrase);
  });
  return {
    label,
    ok: missing.length === 0,
    missing
  };
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function verifyBootstrapContract(rootDir = process.cwd()) {
  const checks = [
    ["contract", BOOT_CONTRACT_PATH, REQUIRED_CONTRACT_PHRASES],
    ["AGENTS.md", "AGENTS.md", REQUIRED_PROJECTION_PHRASES],
    ["CLAUDE.md", "CLAUDE.md", REQUIRED_PROJECTION_PHRASES],
    ["README.md", "README.md", [BOOT_CONTRACT_PATH, "AGENTS.md", "CLAUDE.md", "npm run verify:bootstrap"]]
  ].map(([label, relativePath, required]) => {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return {
        label,
        path: relativePath,
        ok: false,
        missing: ["FILE_MISSING"]
      };
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    return {
      path: relativePath,
      ...verifyText(label, content, required)
    };
  });

  return {
    verdict: checks.every((check) => check.ok) ? "PASS" : "FAIL",
    checks
  };
}

function main() {
  const result = verifyBootstrapContract();
  console.log(JSON.stringify(result, null, 2));
  return result.verdict === "PASS" ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = main();
}
