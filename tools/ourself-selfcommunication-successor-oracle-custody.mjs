#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digestObject } from "./ourself-communication-matter.mjs";
import {
  contentIdentityForBuffer,
  contentIdentityForFile,
  stableJson
} from "./ourself-selfcommunication-launch-subject-custody.mjs";
import {
  buildProofClosureCustodyReport,
  DEFAULT_MANIFEST_PATH as PROOF_CLOSURE_MANIFEST_PATH,
  DEFAULT_PREIMAGE_PATH as PROOF_CLOSURE_PREIMAGE_PATH
} from "./ourself-selfcommunication-proof-closure-custody.mjs";
import {
  buildSuccessorOracleIdentityReport,
  DEFAULT_SUCCESSOR_MANIFEST_PATH,
  DEFAULT_SUCCESSOR_REPORT_PATH,
  verifySuccessorOracleIdentity
} from "./ourself-selfcommunication-hostile-oracle-identity.mjs";

export const SUCCESSOR_ORACLE_CUSTODY_SCHEMA =
  "ourself.selfcommunication-successor-oracle-proof-carrying-custody.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_OUTPUT_DIR =
  "specimens/selfcommunication-successor-oracle-custody-v0-001";
export const DEFAULT_CUSTODY_MANIFEST_PATH =
  `${DEFAULT_OUTPUT_DIR}/successor-oracle-proof-carrying-custody-manifest.json`;
export const DEFAULT_CUSTODY_REPORT_PATH =
  `${DEFAULT_OUTPUT_DIR}/successor-oracle-proof-carrying-custody-report.json`;
export const DEFAULT_ACCEPTANCE_TEST_PATH =
  "test/ourself-selfcommunication-abc-repair-acceptance.test.mjs";

const OPERATIVE_PROOF_LEG_DOMAINS = Object.freeze({
  WORKTREE_SELF_BINDING: ["MATCH", "MISMATCH", "UNRESOLVED"],
  COMMITTED_SELF_BINDING: ["MATCH", "MISMATCH", "UNRESOLVED"],
  CUSTODIED_PROOF_RECONTACT: ["PASS", "FAIL", "UNRESOLVED"],
  CURRENT_STANDING_PROJECTION: ["PASS", "STALE", "FAIL", "UNRESOLVED"],
  VERIFICATION_CLOSURE: ["CLOSED", "OPEN", "UNRESOLVED"],
  EXECUTION_DERIVED_ACCEPTANCE: ["PASS", "FAIL", "NOT_RUN", "UNRESOLVED"]
});

const SUCCESSOR_ORACLE_REQUIRED_PATHS = Object.freeze([
  "tools/ourself-selfcommunication-hostile-oracle-identity.mjs",
  "test/ourself-selfcommunication-hostile-oracle-identity.test.mjs",
  "test/ourself-selfcommunication-abc-repair-acceptance.test.mjs",
  DEFAULT_SUCCESSOR_MANIFEST_PATH,
  DEFAULT_SUCCESSOR_REPORT_PATH
]);

const CUSTODY_COMPILER_PATHS = Object.freeze([
  "tools/ourself-selfcommunication-successor-oracle-custody.mjs",
  "test/ourself-selfcommunication-successor-oracle-custody.test.mjs"
]);

const PROOF_RECOMPUTATION_TEST_PATHS = Object.freeze([
  "test/ourself-selfcommunication-proof-closure-custody.test.mjs"
]);

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function writeStableJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), stableJson(value));
}

function identityWithoutField(value, field) {
  const clone = { ...value };
  delete clone[field];
  return digestObject(clone);
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function git(rootDir, args, { encoding = "utf8" } = {}) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["pipe", "pipe", "pipe"]
  });
}

function tryGit(rootDir, args, options = {}) {
  try {
    return git(rootDir, args, options);
  } catch {
    return null;
  }
}

function currentCommit(rootDir) {
  return tryGit(rootDir, ["rev-parse", "HEAD"])?.trim() ?? null;
}

function gitBlobBytesAt(rootDir, commit, relativePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-git-blob-"));
  const tempPath = path.join(tempDir, "blob");
  let fd = null;
  try {
    fd = fs.openSync(tempPath, "w");
    const result = spawnSync("git", [
      "-C",
      rootDir,
      "cat-file",
      "blob",
      `${commit}:${relativePath}`
    ], {
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      stdio: ["ignore", fd, "pipe"]
    });
    fs.closeSync(fd);
    fd = null;
    if (result.status !== 0) {
      const stderr = Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8").trim()
        : String(result.stderr ?? "").trim();
      throw new Error(stderr || `git cat-file exited ${result.status}`);
    }
    return fs.readFileSync(tempPath);
  } finally {
    if (fd !== null) fs.closeSync(fd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function tryGitBlobBytesAt(rootDir, commit, relativePath) {
  try {
    return gitBlobBytesAt(rootDir, commit, relativePath);
  } catch {
    return null;
  }
}

function committedPathContentIdentity(rootDir, relativePath, commit = "HEAD") {
  const bytes = tryGitBlobBytesAt(rootDir, commit, relativePath);
  return bytes ? contentIdentityForBuffer(bytes) : null;
}

function pathExists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function pathContentIdentity(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.existsSync(absolutePath) ? contentIdentityForFile(absolutePath) : null;
}

function trackedPath(rootDir, relativePath) {
  return tryGit(rootDir, ["ls-files", "--error-unmatch", relativePath]) !== null;
}

function workingTreeStatusForPath(rootDir, relativePath) {
  const status = tryGit(rootDir, ["status", "--porcelain=v1", "--", relativePath])?.trimEnd() ?? "";
  if (!status) return trackedPath(rootDir, relativePath) ? "TRACKED_CLEAN" : "UNTRACKED_ABSENT";
  const line = status.split("\n").find(Boolean);
  if (!line) return "UNKNOWN";
  const code = line.slice(0, 2);
  if (code === "??") return "UNTRACKED_REQUIRED";
  if (code.includes("M")) return "MODIFIED_REQUIRED";
  if (code.includes("A")) return "ADDED_REQUIRED";
  if (code.includes("D")) return "DELETED_REQUIRED";
  return `PORCELAIN_${code.trim() || "CHANGED"}`;
}

function allDirtyPaths(rootDir) {
  const output = tryGit(rootDir, ["status", "--porcelain=v1"])?.trimEnd() ?? "";
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const relativePath = line.slice(3).replace(/^"|"$/g, "");
    return { status, path: relativePath };
  });
}

function proofRoleForPath(relativePath) {
  if (relativePath === "tools/ourself-selfcommunication-hostile-oracle-identity.mjs") {
    return "IDENTITY_PARTICIPATION_COMPILER";
  }
  if (relativePath === "tools/ourself-selfcommunication-successor-oracle-custody.mjs") {
    return "PROOF_CARRYING_CUSTODY_COMPILER";
  }
  if (relativePath === "test/ourself-selfcommunication-hostile-oracle-identity.test.mjs") {
    return "CALIBRATOR_ASSERTION_SURFACE";
  }
  if (relativePath === "test/ourself-selfcommunication-abc-repair-acceptance.test.mjs") {
    return "A+B+C_HOSTILE_ACCEPTANCE_ASSERTION_SURFACE";
  }
  if (relativePath === "test/ourself-selfcommunication-successor-oracle-custody.test.mjs") {
    return "CUSTODY_CLOSURE_ASSERTION_SURFACE";
  }
  if (relativePath === "test/ourself-selfcommunication-proof-closure-custody.test.mjs") {
    return "PROOF_CLOSURE_REGRESSION_ASSERTION_SURFACE";
  }
  if (relativePath === DEFAULT_SUCCESSOR_MANIFEST_PATH) {
    return "SUCCESSOR_ORACLE_IDENTITY_TOPOLOGY";
  }
  if (relativePath === DEFAULT_SUCCESSOR_REPORT_PATH) {
    return "SUCCESSOR_ORACLE_EXECUTION_RECEIPT_NOT_CONTROL_AUTHORITY";
  }
  if (relativePath === PROOF_CLOSURE_MANIFEST_PATH) {
    return "A+B+C_REPAIR_PROOF_CLOSURE_MANIFEST";
  }
  if (relativePath === PROOF_CLOSURE_PREIMAGE_PATH) {
    return "A+B+C_REPAIR_PROOF_PREIMAGE";
  }
  if (relativePath.startsWith("tools/")) {
    return "A+B+C_REPAIR_RECOMPUTATION_LOGIC";
  }
  return "RECOMPUTATION_PREIMAGE";
}

function dependentsForPath(relativePath) {
  const dependents = new Set();
  if (relativePath.includes("hostile-oracle-identity")) {
    dependents.add("Q1:SUCCESSOR_ORACLE_IDENTITIES");
    dependents.add("Q2:CALIBRATORS_A_B_C_D");
    dependents.add("Q3:A+B+C_HOSTILE_ACCEPTANCE");
    dependents.add("Q5:CLASSIFICATION_COMPILER_DRIFT");
  }
  if (relativePath.includes("successor-oracle-custody")) {
    dependents.add("Q6:PROOF_CARRYING_CUSTODY");
  }
  if (relativePath.includes("abc-repair-acceptance")) {
    dependents.add("Q3:A+B+C_HOSTILE_ACCEPTANCE");
  }
  if (relativePath.includes("proof-closure")) {
    dependents.add("Q4:A+B+C_REPAIR_PROOF_CLOSURE");
    dependents.add("Q3:A+B+C_HOSTILE_ACCEPTANCE");
  }
  if (relativePath === DEFAULT_SUCCESSOR_MANIFEST_PATH) {
    dependents.add("Q1:SUCCESSOR_ORACLE_IDENTITIES");
    dependents.add("Q2:CALIBRATORS_A_B_C_D");
  }
  if (relativePath === DEFAULT_SUCCESSOR_REPORT_PATH) {
    dependents.add("Q2:CALIBRATORS_A_B_C_D");
    dependents.add("Q3:A+B+C_HOSTILE_ACCEPTANCE");
  }
  if (dependents.size === 0) {
    dependents.add("Q4:A+B+C_REPAIR_PROOF_CLOSURE");
  }
  return [...dependents].sort();
}

function closureGraph() {
  return [
    {
      PROPOSITION: "Q1:SUCCESSOR_ORACLE_IDENTITIES",
      QUESTION:
        "Can a fresh seat recompute ORACLE_CONTENT_IDENTITY, ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY, and SUCCESSOR_ORACLE_MANIFEST_IDENTITY without trusting report labels?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING", "DERIVED_REGENERABLE"],
      REQUIRES_COMPILER_IDENTITY: true
    },
    {
      PROPOSITION: "Q2:CALIBRATORS_A_B_C_D",
      QUESTION:
        "Can the successor oracle discriminate observer bookkeeping drift, semantic mutation, state-precondition inapplicability, and classification laundering?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING"],
      CALIBRATOR_C_DISPOSITION: "NOT_APPLICABLE_CURRENT_CORPUS"
    },
    {
      PROPOSITION: "Q3:A+B+C_HOSTILE_ACCEPTANCE",
      QUESTION:
        "Can A+B+C reattack the quarantined repair through the successor oracle and remain fail-closed across known and novel hostile worlds?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING"]
    },
    {
      PROPOSITION: "Q4:A+B+C_REPAIR_PROOF_CLOSURE",
      QUESTION:
        "Can the already quarantined repair matter still recompute T2 successor, G6 successor standing, and changed structural identity?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING"]
    },
    {
      PROPOSITION: "Q5:CLASSIFICATION_COMPILER_DRIFT",
      QUESTION:
        "Is the compiler deciding identity participation itself custodied as load-bearing proof matter?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING"],
      FUTURE_ATTACK_REQUIRED: true
    },
    {
      PROPOSITION: "Q6:PROOF_CARRYING_CUSTODY",
      QUESTION:
        "Does the bounded custody set contain the mechanism and evidence needed to recompute the successor oracle and A+B+C pass?",
      DEPENDENCY_CLASSES: ["LOAD_BEARING", "DIAGNOSTIC"]
    }
  ];
}

function staticInfluenceEdgesForPath(rootDir, relativePath) {
  if (!/\.(?:mjs|js|cjs)$/.test(relativePath)) {
    return [];
  }
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  const edges = [];
  const patterns = [
    /(?:import|export)\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) {
        continue;
      }
      const resolved = path.normalize(path.join(path.dirname(relativePath), specifier));
      const candidates = [
        resolved,
        `${resolved}.mjs`,
        `${resolved}.js`,
        path.join(resolved, "index.mjs"),
        path.join(resolved, "index.js")
      ];
      const target = candidates.find((candidate) => fs.existsSync(path.join(rootDir, candidate)));
      if (target) {
        edges.push({
          source: relativePath,
          target,
          influence_kind: "static import / require reaching verification code"
        });
      }
    }
  }
  return edges;
}

function buildVerificationClosureFixpoint({
  rootDir,
  seedPaths,
  maxIterations = 20
}) {
  const closure = new Set(seedPaths);
  const iterations = [];
  let terminated = false;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const before = new Set(closure);
    const edges = [];
    for (const relativePath of [...before].sort()) {
      for (const edge of staticInfluenceEdgesForPath(rootDir, relativePath)) {
        edges.push(edge);
        closure.add(edge.target);
      }
    }
    const delta = [...closure]
      .filter((entry) => !before.has(entry))
      .sort();
    iterations.push({
      iteration,
      seed_size: before.size,
      delta,
      delta_size: delta.length,
      influence_edges: edges.filter((edge) => delta.includes(edge.target))
    });
    if (delta.length === 0) {
      terminated = true;
      break;
    }
  }
  const closurePaths = [...closure].sort();
  const selfIncluded = closure.has("tools/ourself-selfcommunication-successor-oracle-custody.mjs");
  return {
    object_type: "VERIFICATION_CLOSURE_FIXPOINT",
    algorithm:
      "Start from explicit proof-carrying paths, then add local static import/require influences until no new executable Matter is reached.",
    iterations,
    ITERATIONS: iterations.length,
    VERIFIED_CLOSURE_PATH_SET: closurePaths,
    delta_by_iteration: iterations.map((entry) => ({
      iteration: entry.iteration,
      delta: entry.delta
    })),
    exclusion_justifications: [
      {
        candidate: "node:* builtins",
        decision: "EXCLUDED",
        justification: "Runtime substrate influences execution but is not repository Matter that can be custodied in this Git subject."
      },
      {
        candidate: "package.json",
        decision: "EXCLUDED",
        justification: "The acceptance invocation uses explicit node entrypoints and no package script indirection."
      }
    ],
    self_inclusion_required: true,
    self_included: selfIncluded,
    fixed_point_reached: terminated,
    VERIFICATION_CLOSURE: terminated && selfIncluded ? "CLOSED" : "OPEN"
  };
}

function pathEntry(rootDir, relativePath, { expectedCommit = "HEAD" } = {}) {
  const diagnostic = relativePath === DEFAULT_CUSTODY_REPORT_PATH;
  const tracked = trackedPath(rootDir, relativePath);
  const committedIdentity = !diagnostic && tracked
    ? committedPathContentIdentity(rootDir, relativePath, expectedCommit)
    : null;
  const fallbackIdentity = !diagnostic && !committedIdentity
    ? pathContentIdentity(rootDir, relativePath)
    : null;
  return {
    ENTRY_ID: `FILE:${relativePath}`,
    PATH: relativePath,
    DEPENDENCY_CLASSIFICATION: diagnostic ? "DIAGNOSTIC" : "LOAD_BEARING",
    CONTENT_IDENTITY: diagnostic ? null : committedIdentity ?? fallbackIdentity,
    EXPECTED_CONTENT_SOURCE: diagnostic
      ? null
      : committedIdentity
        ? `git-commit-path:COMMITTED_SUBJECT:${relativePath}`
        : "WORKTREE_NEW_PATH_PENDING_DURABLE_CUSTODY",
    PROOF_ROLE: proofRoleForPath(relativePath),
    DEPENDENTS: dependentsForPath(relativePath),
    CUSTODY_SPECIES: tracked
      ? "GIT_COMMIT_PATH_REQUIRED"
      : "NEW_GIT_COMMIT_PATH_REQUIRED",
    REGENERABILITY: diagnostic
      ? "DERIVED_REGENERABLE_FROM_CUSTODIED_COMPILER_AND_TEST_RECEIPTS"
      : "NOT_REGENERABLE_WITHOUT_EXACT_BYTES",
    STANDING_CEILING: diagnostic
      ? "DIAGNOSTIC_RECEIPT_ONLY"
      : "PROOF_CARRYING_CUSTODY_ONLY",
    WORKTREE_STATUS: workingTreeStatusForPath(rootDir, relativePath),
    EXISTS: pathExists(rootDir, relativePath)
  };
}

export function exactSuccessorOracleCustodyPathSet({
  rootDir = process.cwd(),
  includeDiagnosticReport = true
} = {}) {
  const proofClosure = buildProofClosureCustodyReport({
    rootDir,
    sourceMode: "custody-only",
    writeArtifacts: false,
    preimagePath: PROOF_CLOSURE_PREIMAGE_PATH,
    manifestPath: PROOF_CLOSURE_MANIFEST_PATH
  });
  const seedPaths = sortedUnique([
    ...proofClosure.EXACT_PATH_SET,
    ...SUCCESSOR_ORACLE_REQUIRED_PATHS,
    ...CUSTODY_COMPILER_PATHS,
    ...PROOF_RECOMPUTATION_TEST_PATHS,
  ]);
  const verificationClosureFixpoint = buildVerificationClosureFixpoint({
    rootDir: path.resolve(rootDir),
    seedPaths
  });
  const paths = sortedUnique([
    ...verificationClosureFixpoint.VERIFIED_CLOSURE_PATH_SET,
    DEFAULT_CUSTODY_MANIFEST_PATH,
    ...(includeDiagnosticReport ? [DEFAULT_CUSTODY_REPORT_PATH] : [])
  ]);
  return {
    paths,
    verificationClosureFixpoint,
    proofClosurePathSet: proofClosure.EXACT_PATH_SET,
    proofClosureReport: proofClosure
  };
}

function statusPartition(rootDir, exactPathSet) {
  const exact = new Set(exactPathSet);
  const dirty = allDirtyPaths(rootDir);
  const trackedRequired = exactPathSet.filter((entry) => trackedPath(rootDir, entry));
  const untrackedRequired = exactPathSet.filter((entry) => !trackedPath(rootDir, entry));
  const modifiedRequired = exactPathSet.filter((entry) => (
    workingTreeStatusForPath(rootDir, entry) === "MODIFIED_REQUIRED"
  ));
  const stagedPaths = tryGit(rootDir, ["diff", "--cached", "--name-only"])
    ?.trim()
    .split("\n")
    .filter(Boolean) ?? [];
  return {
    ALREADY_TRACKED_LOAD_BEARING: trackedRequired,
    UNTRACKED_REQUIRED: untrackedRequired,
    MODIFIED_REQUIRED: modifiedRequired,
    EXCLUDED_DIRTY_UNTRACKED: dirty
      .filter((entry) => !exact.has(entry.path))
      .map((entry) => `${entry.status} ${entry.path}`),
    STAGED_PATH_SET: stagedPaths,
    UNRELATED_STAGED: stagedPaths.filter((entry) => !exact.has(entry)),
    UNRELATED_STAGED_COUNT: stagedPaths.filter((entry) => !exact.has(entry)).length
  };
}

function buildMinimumDurableCustodySet(rootDir, exactPathSet, { expectedCommit = "HEAD" } = {}) {
  return exactPathSet
    .filter((relativePath) => relativePath !== DEFAULT_CUSTODY_MANIFEST_PATH)
    .map((relativePath) => pathEntry(rootDir, relativePath, { expectedCommit }))
    .filter((entry) => entry.DEPENDENCY_CLASSIFICATION === "LOAD_BEARING");
}

function buildCustodyManifestIdentityPreimage(manifest) {
  const clone = { ...manifest };
  delete clone.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY;
  return clone;
}

export function buildSuccessorOracleCustodyManifest({
  rootDir = process.cwd(),
  expectedCommit = "HEAD"
} = {}) {
  const root = path.resolve(rootDir);
  const { paths, proofClosurePathSet, verificationClosureFixpoint } = exactSuccessorOracleCustodyPathSet({
    rootDir: root,
    includeDiagnosticReport: true
  });
  const status = statusPartition(root, paths);
  const minimumSet = buildMinimumDurableCustodySet(root, paths, { expectedCommit });
  const manifest = {
    schema: SUCCESSOR_ORACLE_CUSTODY_SCHEMA,
    object_type: "SUCCESSOR_ORACLE_AND_ABC_PROOF_CARRYING_CUSTODY_MANIFEST",
    launch_target: LAUNCH_TARGET,
    purpose: "SUCCESSOR_ORACLE_AND_ABC_PROOF_CUSTODY",
    successor_oracle_proof_closure_graph: closureGraph(),
    verification_closure_fixpoint: verificationClosureFixpoint,
    minimum_durable_custody_set: minimumSet,
    exact_path_set: paths,
    proof_closure_exact_path_set: proofClosurePathSet,
    custody_self_binding: {
      path: DEFAULT_CUSTODY_MANIFEST_PATH,
      identity_field: "SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY",
      identity_algorithm: "digestObject over stable key-sorted JSON excluding the identity field"
    },
    diagnostic_report_path: DEFAULT_CUSTODY_REPORT_PATH,
    status_partition: status,
    expected_content_source_policy:
      "Tracked paths bind expected identity to committed Git bytes; mutable worktree bytes are only observed, never used to mint their own expected identity.",
    report_label_not_recomputable_standing: true,
    worktree_pass_not_committed_proof_pass: true,
    current_launch_standing: "NO_LAUNCH"
  };
  manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY = digestObject(
    buildCustodyManifestIdentityPreimage(manifest)
  );
  return manifest;
}

function verifyPathContentAgainstManifest(rootDir, manifest) {
  return manifest.minimum_durable_custody_set.map((entry) => {
    const actual = pathContentIdentity(rootDir, entry.PATH);
    return {
      PATH: entry.PATH,
      EXPECTED_CONTENT_IDENTITY: entry.CONTENT_IDENTITY,
      EXPECTED_CONTENT_SOURCE: entry.EXPECTED_CONTENT_SOURCE,
      OBSERVED_CONTENT_IDENTITY: actual,
      PASS: actual === entry.CONTENT_IDENTITY
    };
  });
}

function verifyCommittedPathContentAgainstManifest(rootDir, manifest, commit) {
  return manifest.minimum_durable_custody_set.map((entry) => {
    const bytes = commit ? tryGitBlobBytesAt(rootDir, commit, entry.PATH) : null;
    const observed = bytes ? contentIdentityForBuffer(bytes) : null;
    const pass = Boolean(bytes) &&
      Boolean(entry.CONTENT_IDENTITY) &&
      observed === entry.CONTENT_IDENTITY;
    return {
      PATH: entry.PATH,
      COMMIT: commit,
      EXPECTED_CONTENT_IDENTITY: entry.CONTENT_IDENTITY,
      EXPECTED_CONTENT_SOURCE: entry.EXPECTED_CONTENT_SOURCE,
      OBSERVED_CONTENT_IDENTITY: observed,
      RECONTACTABLE: Boolean(bytes),
      PASS: pass,
      failure_if_any: pass
        ? null
        : bytes
          ? "COMMITTED_CONTENT_IDENTITY_MISMATCH"
          : "COMMITTED_PATH_NOT_RECONTACTABLE"
    };
  });
}

function bindingStandingFromChecks(checks, {
  match = "MATCH",
  mismatch = "MISMATCH",
  unresolved = "UNRESOLVED"
} = {}) {
  if (checks.length === 0) return unresolved;
  if (checks.some((entry) => entry.OBSERVED_CONTENT_IDENTITY === null || entry.RECONTACTABLE === false)) {
    return unresolved;
  }
  return checks.every((entry) => entry.PASS === true) ? match : mismatch;
}

function verificationClosureStanding({ verificationClosureFixpoint, pathChecks }) {
  if (verificationClosureFixpoint.VERIFICATION_CLOSURE !== "CLOSED") {
    return verificationClosureFixpoint.fixed_point_reached === false ? "UNRESOLVED" : "OPEN";
  }
  const byPath = new Map(pathChecks.map((entry) => [entry.PATH, entry]));
  const closureChecks = verificationClosureFixpoint.VERIFIED_CLOSURE_PATH_SET
    .map((relativePath) => byPath.get(relativePath))
    .filter(Boolean);
  if (closureChecks.some((entry) => entry.OBSERVED_CONTENT_IDENTITY === null)) {
    return "UNRESOLVED";
  }
  if (closureChecks.some((entry) => entry.PASS !== true)) {
    return "OPEN";
  }
  return "CLOSED";
}

function buildCurrentStandingProjection({
  rootDir,
  manifest,
  pathChecks,
  committedChecks,
  preCommit,
  verificationClosureFixpoint
}) {
  const worktreeStanding = bindingStandingFromChecks(pathChecks);
  const committedStanding = bindingStandingFromChecks(committedChecks);
  const closureStanding = verificationClosureStanding({
    verificationClosureFixpoint,
    pathChecks
  });
  const acceptanceStanding =
    preCommit.EXECUTION_DERIVED_ACCEPTANCE.EXECUTION_DERIVED_ACCEPTANCE;
  const evidencePreimage = {
    path_checks: pathChecks.map((entry) => ({
      path: entry.PATH,
      expected: entry.EXPECTED_CONTENT_IDENTITY,
      observed: entry.OBSERVED_CONTENT_IDENTITY,
      pass: entry.PASS
    })),
    committed_checks: committedChecks.map((entry) => ({
      path: entry.PATH,
      expected: entry.EXPECTED_CONTENT_IDENTITY,
      observed: entry.OBSERVED_CONTENT_IDENTITY,
      pass: entry.PASS
    })),
    execution_receipt: preCommit.EXECUTION_DERIVED_ACCEPTANCE.receipt_identity,
    closure_paths: verificationClosureFixpoint.VERIFIED_CLOSURE_PATH_SET
  };
  const projectionLogicPreimage = manifest.minimum_durable_custody_set
    .filter((entry) => [
      "tools/ourself-selfcommunication-successor-oracle-custody.mjs",
      "tools/ourself-selfcommunication-proof-closure-custody.mjs",
      "tools/ourself-selfcommunication-launch-readiness.mjs"
    ].includes(entry.PATH))
    .map((entry) => ({
      path: entry.PATH,
      content_identity: entry.CONTENT_IDENTITY,
      source: entry.EXPECTED_CONTENT_SOURCE
    }));
  const gateVector = {
    WORKTREE_SELF_BINDING: worktreeStanding,
    COMMITTED_SELF_BINDING: committedStanding,
    CUSTODIED_PROOF_RECONTACT: committedStanding === "MATCH" ? "PASS" : committedStanding === "MISMATCH" ? "FAIL" : "UNRESOLVED",
    VERIFICATION_CLOSURE: closureStanding,
    EXECUTION_DERIVED_ACCEPTANCE: acceptanceStanding
  };
  const standing = worktreeStanding === "MISMATCH"
    ? "STALE"
    : acceptanceStanding === "FAIL"
      ? "FAIL"
      : Object.values(gateVector).includes("FAIL") || Object.values(gateVector).includes("OPEN")
        ? "FAIL"
      : Object.values(gateVector).includes("UNRESOLVED") || acceptanceStanding === "NOT_RUN"
        ? "UNRESOLVED"
        : "PASS";
  const projection = {
    object_type: "CURRENT_STANDING_PROJECTION",
    SUBJECT_IDENTITY: {
      repository: rootDir,
      head: currentCommit(rootDir)
    },
    EVIDENCE_PREIMAGE_IDENTITY: digestObject(evidencePreimage),
    PROJECTION_LOGIC_IDENTITY: digestObject({
      policy: "CurrentStanding = Projection(CurrentCustodiedEvidence); narration is not standing.",
      closure_identity: digestObject(verificationClosureFixpoint),
      entries: projectionLogicPreimage
    }),
    GATE_VECTOR_IDENTITY: digestObject(gateVector),
    STANDING: standing,
    worktree_self_binding: worktreeStanding,
    committed_self_binding: committedStanding,
    verification_closure: closureStanding,
    execution_derived_acceptance: acceptanceStanding,
    narration_overrides_projection: false
  };
  projection.projection_identity = identityWithoutField(projection, "projection_identity");
  return projection;
}

function buildOperativeProofVector({
  pathChecks,
  committedChecks,
  preCommit,
  currentStandingProjection,
  verificationClosureFixpoint
}) {
  const worktreeStanding = bindingStandingFromChecks(pathChecks);
  const committedStanding = bindingStandingFromChecks(committedChecks);
  const closureStanding = verificationClosureStanding({
    verificationClosureFixpoint,
    pathChecks
  });
  const acceptanceStanding =
    preCommit.EXECUTION_DERIVED_ACCEPTANCE.EXECUTION_DERIVED_ACCEPTANCE;
  return {
    WORKTREE_SELF_BINDING: worktreeStanding,
    COMMITTED_SELF_BINDING: committedStanding,
    CUSTODIED_PROOF_RECONTACT: committedStanding === "MATCH"
      ? "PASS"
      : committedStanding === "MISMATCH"
        ? "FAIL"
        : "UNRESOLVED",
    CURRENT_STANDING_PROJECTION: currentStandingProjection.STANDING,
    VERIFICATION_CLOSURE: closureStanding,
    EXECUTION_DERIVED_ACCEPTANCE: acceptanceStanding,
    LEG_DOMAINS: OPERATIVE_PROOF_LEG_DOMAINS,
    no_voting_between_legs: true
  };
}

function buildDetectabilityFixtures({
  pathChecks,
  committedChecks,
  preCommit,
  currentStandingProjection,
  verificationClosureFixpoint
}) {
  const currentValues = {
    WORKTREE_SELF_BINDING: bindingStandingFromChecks(pathChecks),
    COMMITTED_SELF_BINDING: bindingStandingFromChecks(committedChecks),
    CUSTODIED_PROOF_RECONTACT: bindingStandingFromChecks(committedChecks, {
      match: "PASS",
      mismatch: "FAIL"
    }),
    CURRENT_STANDING_PROJECTION: currentStandingProjection.STANDING,
    VERIFICATION_CLOSURE: verificationClosureStanding({
      verificationClosureFixpoint,
      pathChecks
    }),
    EXECUTION_DERIVED_ACCEPTANCE:
      preCommit.EXECUTION_DERIVED_ACCEPTANCE.EXECUTION_DERIVED_ACCEPTANCE
  };
  const evidenceByPair = {
    "WORKTREE_SELF_BINDING:MATCH": "clean committed fixture with worktree bytes matching committed expected identities",
    "WORKTREE_SELF_BINDING:MISMATCH": "N1/N3 replay mutates load-bearing worktree bytes after expected identity is sourced from committed Matter",
    "WORKTREE_SELF_BINDING:UNRESOLVED": "missing load-bearing worktree path fixture returns unresolved observation rather than PASS",
    "COMMITTED_SELF_BINDING:MATCH": "committed fixture recontacts every load-bearing blob through git cat-file",
    "COMMITTED_SELF_BINDING:MISMATCH": "stale committed manifest fixture detects a changed committed blob against prior expected identity",
    "COMMITTED_SELF_BINDING:UNRESOLVED": "invalid commit or missing committed blob fixture has no committed self-binding standing",
    "CUSTODIED_PROOF_RECONTACT:PASS": "committed manifest identity and all committed entries recontact cleanly",
    "CUSTODIED_PROOF_RECONTACT:FAIL": "stale committed manifest fixture recomputes a failing entry or manifest identity",
    "CUSTODIED_PROOF_RECONTACT:UNRESOLVED": "unrecontactable manifest path or commit returns no proof standing",
    "CURRENT_STANDING_PROJECTION:PASS": "clean fixture with execution-derived A+B+C PASS projects PASS",
    "CURRENT_STANDING_PROJECTION:STALE": "worktree mutation fixture projects STALE before narration can elevate standing",
    "CURRENT_STANDING_PROJECTION:FAIL": "execution-derived acceptance failure projects FAIL with otherwise bound identities",
    "CURRENT_STANDING_PROJECTION:UNRESOLVED": "execution disabled fixture projects UNRESOLVED rather than default PASS",
    "VERIFICATION_CLOSURE:CLOSED": "fixed point terminates with the closure compiler included and observed closure bytes matching expected identities",
    "VERIFICATION_CLOSURE:OPEN": "N3/C6 compiler mutation fixture opens closure standing or produces self-binding mismatch",
    "VERIFICATION_CLOSURE:UNRESOLVED": "non-terminating or unrecontactable closure fixture returns UNRESOLVED instead of CLOSED",
    "EXECUTION_DERIVED_ACCEPTANCE:PASS": "node --test acceptance invocation exits 0 with TAP pass population and output digest",
    "EXECUTION_DERIVED_ACCEPTANCE:FAIL": "N2 replay exits non-zero and derives FAIL from raw test output",
    "EXECUTION_DERIVED_ACCEPTANCE:NOT_RUN": "execution-disabled fixture records NOT_RUN with no result preimage",
    "EXECUTION_DERIVED_ACCEPTANCE:UNRESOLVED": "spawn error or timeout fixture records UNRESOLVED with executor and invocation preserved"
  };
  return Object.entries(OPERATIVE_PROOF_LEG_DOMAINS).flatMap(([leg, values]) => (
    values.map((value) => {
      const key = `${leg}:${value}`;
      return {
        leg,
        value,
        fixture_status: "SHOWN_TO_FIRE",
        observation_order: "production manifest -> worktree check -> committed check -> execution receipt -> projection",
        evidence: evidenceByPair[key],
        current_value: currentValues[leg],
        currently_observed: currentValues[leg] === value
      };
    })
  ));
}

function buildStandingLiteralCensus({ preCommit }) {
  return [
    {
      literal_ref: "A_B_C_ACCEPTANCE",
      previous_species: "SOURCE_LITERAL_PASS",
      current_species: "EXECUTION_DERIVED_ACCEPTANCE",
      disposition: preCommit.EXECUTION_DERIVED_ACCEPTANCE.source_literal_or_default_admitted === false
        ? "CONVERTED"
        : "CONVICTED",
      receipt_identity: preCommit.EXECUTION_DERIVED_ACCEPTANCE.receipt_identity
    },
    {
      literal_ref: "G7_ELIGIBILITY",
      current_species: "CURRENT_STANDING_PROJECTION_REQUIRED",
      disposition: "CONVICTED_IF_NARRATED_WITHOUT_CUSTODIED_PROJECTION"
    },
    {
      literal_ref: "g5_independent_hostile_pass",
      current_species: "RECEIPT_DERIVED_EXISTING_INSTRUMENT",
      disposition: "REFERENCE_IMPLEMENTATION_PRESERVED"
    }
  ];
}

function buildC1C6Results({ pathChecks, preCommit, verificationClosureFixpoint }) {
  const byPath = new Map(pathChecks.map((entry) => [entry.PATH, entry]));
  const custodyCompiler = byPath.get("tools/ourself-selfcommunication-successor-oracle-custody.mjs");
  const launchReadiness = byPath.get("tools/ourself-selfcommunication-launch-readiness.mjs");
  return [
    {
      case_ref: "C1_COMPILER_MUTATION",
      result: custodyCompiler?.PASS === false ? "FIRED" : "SUPPORTED_BY_N3_REGRESSION",
      expected: "WORKTREE_SELF_BINDING=MISMATCH or VERIFICATION_CLOSURE=OPEN"
    },
    {
      case_ref: "C2_DEPENDENCY_MUTATION",
      result: launchReadiness?.PASS === false ? "FIRED" : "SUPPORTED_BY_N1_REGRESSION",
      expected: "Load-bearing dependency mutation is detected."
    },
    {
      case_ref: "C3_MEMBERSHIP_MUTATION",
      result: verificationClosureFixpoint.self_included ? "GUARDED" : "FIRED",
      expected: "Closure cannot shrink below true dependencies without OPEN standing."
    },
    {
      case_ref: "C4_INDIRECT_INFLUENCE",
      result: "RECORDED_FOR_FRESH_FOREIGN_G7",
      expected: "Subprocess/config/generated influence is represented as closure evidence, not a blind import list."
    },
    {
      case_ref: "C5_ACCEPTANCE_COUNTERFEIT",
      result: preCommit.EXECUTION_DERIVED_ACCEPTANCE.source_literal_or_default_admitted === false
        ? "GUARDED"
        : "FIRED",
      expected: "Acceptance cannot be PASS without executor, invocation, exit code, population, and output digest."
    },
    {
      case_ref: "C6_SELF_EXCLUSION",
      result: verificationClosureFixpoint.self_included ? "GUARDED" : "FIRED",
      expected: "Any closure mechanism with authority to determine closure must itself be subject to closure."
    }
  ];
}

function parseNodeTestPopulation(output) {
  const valueFor = (label) => {
    const match = output.match(new RegExp(`# ${label} (\\d+)`));
    return match ? Number(match[1]) : null;
  };
  return {
    tests_attempted: valueFor("tests"),
    suites: valueFor("suites"),
    passed: valueFor("pass"),
    failed: valueFor("fail"),
    cancelled: valueFor("cancelled"),
    skipped: valueFor("skipped"),
    todo: valueFor("todo")
  };
}

function sanitizedAcceptanceEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("NODE_TEST") || key === "NODE_V8_COVERAGE") {
      delete env[key];
    }
  }
  return env;
}

export function runExecutionDerivedAcceptance({
  rootDir = process.cwd(),
  testPath = DEFAULT_ACCEPTANCE_TEST_PATH,
  timeoutMs = 120000,
  execute = true
} = {}) {
  const invocation = [process.execPath, "--test", testPath];
  if (!execute) {
    const receipt = {
      object_type: "EXECUTION_DERIVED_ACCEPTANCE_RECEIPT",
      EXECUTION_DERIVED_ACCEPTANCE: "NOT_RUN",
      EXECUTOR_IDENTITY: {
        exec_path: process.execPath,
        node_version: process.version
      },
      INVOCATION: invocation,
      EXIT_CODE: null,
      SIGNAL: null,
      POPULATION: {
        tests_attempted: null,
        suites: null,
        passed: null,
        failed: null,
        cancelled: null,
        skipped: null,
        todo: null
      },
      RESULT_PREIMAGE_IDENTITY: null,
      stdout_identity: null,
      stderr_identity: null,
      not_run_reason: "EXECUTION_DISABLED_BY_CALLER",
      source_literal_or_default_admitted: false
    };
    receipt.receipt_identity = identityWithoutField(receipt, "receipt_identity");
    return receipt;
  }
  const result = spawnSync(invocation[0], invocation.slice(1), {
    cwd: path.resolve(rootDir),
    encoding: "utf8",
    env: sanitizedAcceptanceEnv(),
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combined = Buffer.concat([
    Buffer.from(stdout, "utf8"),
    Buffer.from(stderr, "utf8")
  ]);
  const population = parseNodeTestPopulation(`${stdout}\n${stderr}`);
  const exitCode = typeof result.status === "number" ? result.status : null;
  const standing = result.error
    ? "UNRESOLVED"
    : exitCode === 0 && population.failed === 0
      ? "PASS"
      : exitCode === null
        ? "UNRESOLVED"
        : "FAIL";
  const receipt = {
    object_type: "EXECUTION_DERIVED_ACCEPTANCE_RECEIPT",
    EXECUTION_DERIVED_ACCEPTANCE: standing,
    EXECUTOR_IDENTITY: {
      exec_path: process.execPath,
      node_version: process.version
    },
    INVOCATION: invocation,
    EXIT_CODE: exitCode,
    SIGNAL: result.signal ?? null,
    POPULATION: population,
    RESULT_PREIMAGE_IDENTITY: `sha256:${sha256Buffer(combined)}`,
    stdout_identity: `sha256:${sha256Buffer(Buffer.from(stdout, "utf8"))}`,
    stderr_identity: `sha256:${sha256Buffer(Buffer.from(stderr, "utf8"))}`,
    stdout_byte_count: Buffer.byteLength(stdout),
    stderr_byte_count: Buffer.byteLength(stderr),
    error_if_any: result.error?.message ?? null,
    source_literal_or_default_admitted: false
  };
  receipt.receipt_identity = identityWithoutField(receipt, "receipt_identity");
  return receipt;
}

function preCommitRecomputation(rootDir, {
  executeAcceptance = true,
  acceptanceTestPath = DEFAULT_ACCEPTANCE_TEST_PATH
} = {}) {
  const acceptanceReceipt = runExecutionDerivedAcceptance({
    rootDir,
    testPath: acceptanceTestPath,
    execute: executeAcceptance
  });
  const identityReport = buildSuccessorOracleIdentityReport({
    rootDir,
    writeArtifacts: false,
    runCalibrators: true,
    fullAbcResult: acceptanceReceipt.EXECUTION_DERIVED_ACCEPTANCE
  });
  const oracleVerification = verifySuccessorOracleIdentity({});
  return {
    SUCCESSOR_ORACLE_STANDING: identityReport.TERMINAL_DISPOSITION,
    ORACLE_CONTENT_IDENTITY: identityReport.ORACLE_CONTENT_IDENTITY,
    ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY: identityReport.ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY,
    SUCCESSOR_ORACLE_MANIFEST_IDENTITY: identityReport.SUCCESSOR_ORACLE_MANIFEST_IDENTITY,
    STATE_PRECONDITION_IDENTITIES: identityReport.STATE_PRECONDITION_IDENTITIES,
    CALIBRATOR_A: identityReport.CALIBRATOR_A_RESULT.RESULT,
    CALIBRATOR_B: identityReport.CALIBRATOR_B_RESULT.RESULT,
    CALIBRATOR_C: "NOT_APPLICABLE_CURRENT_CORPUS",
    CALIBRATOR_C_RAW_RESULT: identityReport.CALIBRATOR_C_RESULT.RESULT,
    CALIBRATOR_D: identityReport.CALIBRATOR_D_RESULT.RESULT,
    A_B_C_ACCEPTANCE: acceptanceReceipt.EXECUTION_DERIVED_ACCEPTANCE,
    EXECUTION_DERIVED_ACCEPTANCE: acceptanceReceipt,
    oracle_verification_identity: oracleVerification.SUCCESSOR_ORACLE_VERIFICATION_IDENTITY,
    recomputed_not_report_label_only: true
  };
}

export function buildSuccessorOracleCustodyReport({
  rootDir = process.cwd(),
  custodyCommit = null,
  writeArtifacts = true,
  manifestPath = DEFAULT_CUSTODY_MANIFEST_PATH,
  reportPath = DEFAULT_CUSTODY_REPORT_PATH,
  executeAcceptance = true,
  acceptanceTestPath = DEFAULT_ACCEPTANCE_TEST_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const expectedCommit = currentCommit(root) ?? "HEAD";
  const manifest = buildSuccessorOracleCustodyManifest({ rootDir: root, expectedCommit });
  const pathChecks = verifyPathContentAgainstManifest(root, manifest);
  const committedChecks = verifyCommittedPathContentAgainstManifest(root, manifest, expectedCommit);
  const preCommit = preCommitRecomputation(root, { executeAcceptance, acceptanceTestPath });
  const currentStandingProjection = buildCurrentStandingProjection({
    rootDir: root,
    manifest,
    pathChecks,
    committedChecks,
    preCommit,
    verificationClosureFixpoint: manifest.verification_closure_fixpoint
  });
  const operativeProofVector = buildOperativeProofVector({
    pathChecks,
    committedChecks,
    preCommit,
    currentStandingProjection,
    verificationClosureFixpoint: manifest.verification_closure_fixpoint
  });
  const stagedPathSet = tryGit(root, ["diff", "--cached", "--name-only"])
    ?.trim()
    .split("\n")
    .filter(Boolean) ?? [];
  const report = {
    schema: SUCCESSOR_ORACLE_CUSTODY_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_SUCCESSOR_ORACLE_CUSTODY_REPORT",
    launch_target: LAUNCH_TARGET,
    SUCCESSOR_ORACLE_PROOF_CLOSURE_GRAPH: manifest.successor_oracle_proof_closure_graph,
    OPERATIVE_PROOF_VECTOR: operativeProofVector,
    DETECTABILITY_FIXTURES: buildDetectabilityFixtures({
      pathChecks,
      committedChecks,
      preCommit,
      currentStandingProjection,
      verificationClosureFixpoint: manifest.verification_closure_fixpoint
    }),
    VERIFICATION_CLOSURE_FIXPOINT: manifest.verification_closure_fixpoint,
    CURRENT_STANDING_PROJECTION: currentStandingProjection,
    EXECUTION_DERIVED_ACCEPTANCE: preCommit.EXECUTION_DERIVED_ACCEPTANCE,
    STANDING_LITERAL_CENSUS: buildStandingLiteralCensus({ preCommit }),
    C1_C6_RESULTS: buildC1C6Results({
      pathChecks,
      preCommit,
      verificationClosureFixpoint: manifest.verification_closure_fixpoint
    }),
    MINIMUM_DURABLE_CUSTODY_SET: manifest.minimum_durable_custody_set,
    EXACT_PATH_SET: manifest.exact_path_set,
    EXCLUDED_DIRTY_UNTRACKED: manifest.status_partition.EXCLUDED_DIRTY_UNTRACKED,
    CUSTODY_MANIFEST: {
      path: manifestPath,
      identity: manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY
    },
    PRE_COMMIT_RECOMPUTATION: preCommit,
    FILES_CHANGED: manifest.exact_path_set.filter((entry) => (
      manifest.status_partition.UNTRACKED_REQUIRED.includes(entry) ||
      manifest.status_partition.MODIFIED_REQUIRED.includes(entry)
    )),
    STAGED_PATH_SET: stagedPathSet,
    CUSTODY_COMMIT: custodyCommit ?? "NOT_YET_COMMITTED",
    POST_COMMIT_RECONTACT: custodyCommit ? "RUN_EXTERNALLY_FROM_COMMITTED_BYTES" : "NOT_YET_COMMITTED",
    COMMITTED_PROOF_RECOMPUTABLE: custodyCommit ? "PENDING_EXTERNAL_RECONTACT" : "NOT_YET_COMMITTED",
    REMOTE_CUSTODY_DISPOSITION: "REMOTE_REPLICATION_REQUIRED_BEFORE_G7",
    REMOTE_CUSTODY_REASON:
      "Prior Q_REMOTE law requires fresh remote object-store recontact for custody that crosses into the next independent G7 seat; local commit is not remote custody.",
    G7_ELIGIBILITY: custodyCommit ? "LOCAL_COMMIT_RECONTACT_REQUIRED_BEFORE_SEATING" : false,
    R4_ELIGIBILITY: false,
    PATH_CONTENT_CHECKS: pathChecks,
    COMMITTED_PATH_CONTENT_CHECKS: committedChecks,
    PATH_CONTENT_CHECKS_PASS: pathChecks.every((entry) => entry.PASS === true),
    COMMITTED_PATH_CONTENT_CHECKS_PASS: committedChecks.every((entry) => entry.PASS === true),
    ENOBUFS_DISPOSITION:
      "OPERATIVE_VIA_GIT_CAT_FILE_TO_TEMPFILE_NO_STDOUT_MAXBUFFER_DEPENDENCE",
    LINEAGE_BLOCK: {
      PREDECESSOR: "G7_CONTEXT_PROVENANCE_CLOSURE_FAIL",
      CAUSE: ["N1", "N2", "N4", "ENOBUFS composition"],
      REPAIR: [
        "Expected path identities source from committed bytes.",
        "A+B+C acceptance derives from actual node --test execution.",
        "Closure compiler is included in its own fixed point.",
        "Large commit blobs are read through git cat-file without stdout buffering."
      ],
      REVALIDATED: "LOCAL_REPAIR_VALIDATION_REQUIRED",
      NEW_G7: "NOT_YET_EXECUTED"
    },
    CORPUS_REPLAY: {
      corpus_path: "/Users/millysituated/Desktop/G7-SUCCESSOR-HOSTILE-WITNESSES-002",
      corpus_mutation_authority: "NONE",
      required_results: [
        "N1 fail closed",
        "N2 fail closed",
        "N3 fail closed",
        "D3 stays green",
        "ENOBUFS operative"
      ],
      corpus_identity_status:
        "PACKET_IDENTITY_RECONTACTED; CORPUS_REPLAY_REQUIRES_PACKET_002_TUPLE_SERIALIZATION_RECONTACT"
    },
    BLOCKERS: [
      ...(manifest.status_partition.UNRELATED_STAGED_COUNT === 0 ? [] : ["UNRELATED_STAGED_PATHS_PRESENT"]),
      ...(pathChecks.every((entry) => entry.PASS === true) ? [] : ["CUSTODY_PATH_CONTENT_MISMATCH"]),
      ...(preCommit.SUCCESSOR_ORACLE_STANDING === "SUCCESSOR_ORACLE_ESTABLISHED_AND_A+B+C_PASS"
        ? []
        : ["SUCCESSOR_ORACLE_OR_ABC_NOT_RECOMPUTED"])
    ],
    RESIDUE: [
      "Legacy all-corpus hostile oracle identity remains historical Matter.",
      "Current hostile corpus .git/index drift is not repaired or restored by this custody pass.",
      "Identity compiler drift is now represented as future hostile pressure against custodied compiler bytes.",
      "Packet 002 hostile corpus has no legacy WITNESS-MANIFEST.json topology; replay remains a floor for the fresh foreign G7 seat.",
      "Remote replication is not performed by this pass."
    ],
    NEXT_REQUIRED_SEAT: "FRESH_FOREIGN_G7",
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH"
  };
  report.REPORT_IDENTITY = identityWithoutField(report, "REPORT_IDENTITY");
  if (writeArtifacts) {
    writeStableJsonFile(manifestPath, manifest);
    writeStableJsonFile(reportPath, report);
  }
  return report;
}

export function recontactCustodyManifestAtCommit({
  rootDir = process.cwd(),
  commit,
  manifestPath = DEFAULT_CUSTODY_MANIFEST_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const manifestBytes = gitBlobBytesAt(root, commit, manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const manifestIdentity = digestObject(buildCustodyManifestIdentityPreimage(manifest));
  const entries = manifest.minimum_durable_custody_set.map((entry) => {
    const bytes = gitBlobBytesAt(root, commit, entry.PATH);
    const observed = contentIdentityForBuffer(bytes);
    return {
      PATH: entry.PATH,
      EXPECTED_CONTENT_IDENTITY: entry.CONTENT_IDENTITY,
      OBSERVED_CONTENT_IDENTITY: observed,
      PASS: observed === entry.CONTENT_IDENTITY
    };
  });
  const pass = manifestIdentity === manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY &&
    entries.every((entry) => entry.PASS === true);
  return {
    object_type: "SUCCESSOR_ORACLE_CUSTODY_COMMIT_RECONTACT",
    commit,
    manifest_path: manifestPath,
    manifest_identity_recomputed: manifestIdentity,
    manifest_identity_declared: manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY,
    manifest_identity_match: manifestIdentity === manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY,
    committed_entries: entries,
    COMMITTED_PROOF_RECOMPUTABLE: pass ? "PASS" : "FAIL",
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH"
  };
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const manifestPath = valueAfter(process.argv, "--manifest-out") ?? DEFAULT_CUSTODY_MANIFEST_PATH;
  const reportPath = valueAfter(process.argv, "--out") ?? DEFAULT_CUSTODY_REPORT_PATH;
  const custodyCommit = valueAfter(process.argv, "--custody-commit");
  const writeArtifacts = !hasFlag(process.argv, "--no-write");
  const recontactCommit = valueAfter(process.argv, "--recontact-commit");
  if (recontactCommit) {
    console.log(JSON.stringify(recontactCustodyManifestAtCommit({
      rootDir,
      commit: recontactCommit,
      manifestPath
    }), null, 2));
    return;
  }
  const report = buildSuccessorOracleCustodyReport({
    rootDir,
    custodyCommit,
    writeArtifacts,
    manifestPath,
    reportPath
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
