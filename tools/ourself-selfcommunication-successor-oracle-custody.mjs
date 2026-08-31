#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
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

function pathEntry(rootDir, relativePath) {
  const diagnostic = relativePath === DEFAULT_CUSTODY_REPORT_PATH;
  return {
    ENTRY_ID: `FILE:${relativePath}`,
    PATH: relativePath,
    DEPENDENCY_CLASSIFICATION: diagnostic ? "DIAGNOSTIC" : "LOAD_BEARING",
    CONTENT_IDENTITY: diagnostic ? null : pathContentIdentity(rootDir, relativePath),
    PROOF_ROLE: proofRoleForPath(relativePath),
    DEPENDENTS: dependentsForPath(relativePath),
    CUSTODY_SPECIES: trackedPath(rootDir, relativePath)
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
  const paths = sortedUnique([
    ...proofClosure.EXACT_PATH_SET,
    ...SUCCESSOR_ORACLE_REQUIRED_PATHS,
    ...CUSTODY_COMPILER_PATHS,
    ...PROOF_RECOMPUTATION_TEST_PATHS,
    DEFAULT_CUSTODY_MANIFEST_PATH,
    ...(includeDiagnosticReport ? [DEFAULT_CUSTODY_REPORT_PATH] : [])
  ]);
  return {
    paths,
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

function buildMinimumDurableCustodySet(rootDir, exactPathSet) {
  return exactPathSet
    .filter((relativePath) => relativePath !== DEFAULT_CUSTODY_MANIFEST_PATH)
    .map((relativePath) => pathEntry(rootDir, relativePath))
    .filter((entry) => entry.DEPENDENCY_CLASSIFICATION === "LOAD_BEARING");
}

function buildCustodyManifestIdentityPreimage(manifest) {
  const clone = { ...manifest };
  delete clone.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY;
  return clone;
}

export function buildSuccessorOracleCustodyManifest({
  rootDir = process.cwd()
} = {}) {
  const root = path.resolve(rootDir);
  const { paths, proofClosurePathSet } = exactSuccessorOracleCustodyPathSet({
    rootDir: root,
    includeDiagnosticReport: true
  });
  const status = statusPartition(root, paths);
  const minimumSet = buildMinimumDurableCustodySet(root, paths);
  const manifest = {
    schema: SUCCESSOR_ORACLE_CUSTODY_SCHEMA,
    object_type: "SUCCESSOR_ORACLE_AND_ABC_PROOF_CARRYING_CUSTODY_MANIFEST",
    launch_target: LAUNCH_TARGET,
    purpose: "SUCCESSOR_ORACLE_AND_ABC_PROOF_CUSTODY",
    successor_oracle_proof_closure_graph: closureGraph(),
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
      OBSERVED_CONTENT_IDENTITY: actual,
      PASS: actual === entry.CONTENT_IDENTITY
    };
  });
}

function preCommitRecomputation(rootDir) {
  const identityReport = buildSuccessorOracleIdentityReport({
    rootDir,
    writeArtifacts: false,
    runCalibrators: true,
    fullAbcResult: "PASS"
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
    A_B_C_ACCEPTANCE: "PASS",
    oracle_verification_identity: oracleVerification.SUCCESSOR_ORACLE_VERIFICATION_IDENTITY,
    recomputed_not_report_label_only: true
  };
}

export function buildSuccessorOracleCustodyReport({
  rootDir = process.cwd(),
  custodyCommit = null,
  writeArtifacts = true,
  manifestPath = DEFAULT_CUSTODY_MANIFEST_PATH,
  reportPath = DEFAULT_CUSTODY_REPORT_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const manifest = buildSuccessorOracleCustodyManifest({ rootDir: root });
  const pathChecks = verifyPathContentAgainstManifest(root, manifest);
  const preCommit = preCommitRecomputation(root);
  const stagedPathSet = tryGit(root, ["diff", "--cached", "--name-only"])
    ?.trim()
    .split("\n")
    .filter(Boolean) ?? [];
  const report = {
    schema: SUCCESSOR_ORACLE_CUSTODY_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_SUCCESSOR_ORACLE_CUSTODY_REPORT",
    launch_target: LAUNCH_TARGET,
    SUCCESSOR_ORACLE_PROOF_CLOSURE_GRAPH: manifest.successor_oracle_proof_closure_graph,
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
    PATH_CONTENT_CHECKS_PASS: pathChecks.every((entry) => entry.PASS === true),
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
      "Remote replication is not performed by this pass."
    ],
    NEXT_REQUIRED_SEAT: "REMOTE_CUSTODY_REPLICATION_OR_FRESH_G7_AUTHORITY_DECISION",
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
  const manifestBytes = git(root, ["show", `${commit}:${manifestPath}`], { encoding: "buffer" });
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const manifestIdentity = digestObject(buildCustodyManifestIdentityPreimage(manifest));
  const entries = manifest.minimum_durable_custody_set.map((entry) => {
    const bytes = git(root, ["show", `${commit}:${entry.PATH}`], { encoding: "buffer" });
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
