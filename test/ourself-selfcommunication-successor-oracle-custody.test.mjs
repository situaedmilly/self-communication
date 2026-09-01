import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSuccessorOracleCustodyManifest,
  buildSuccessorOracleCustodyReport,
  computePacket002HostileCorpusIdentity,
  DEFAULT_CUSTODY_MANIFEST_PATH,
  exactSuccessorOracleCustodyPathSet,
  recontactCustodyManifestAtCommit,
  runExecutionDerivedAcceptance
} from "../tools/ourself-selfcommunication-successor-oracle-custody.mjs";
import { stableJson } from "../tools/ourself-selfcommunication-launch-subject-custody.mjs";

const REPO_ROOT = process.cwd();
const PACKET_002_CORPUS_ROOT =
  "/Users/millysituated/Desktop/G7-SUCCESSOR-HOSTILE-WITNESSES-002";

function gitIn(rootDir, args) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function copyPathIfPresent(sourceRoot, targetRoot, relativePath) {
  const source = path.join(sourceRoot, relativePath);
  if (!fs.existsSync(source)) return;
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function createCommittedWorkingTreeFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-custody-fixture-"));
  const workDir = path.join(tempDir, "work");
  gitIn(REPO_ROOT, ["clone", "--quiet", REPO_ROOT, workDir]);
  gitIn(workDir, ["config", "user.name", "SELFCOMMUNICATION Test"]);
  gitIn(workDir, ["config", "user.email", "selfcommunication@example.test"]);
  const { paths } = exactSuccessorOracleCustodyPathSet({ rootDir: REPO_ROOT });
  for (const relativePath of paths) {
    copyPathIfPresent(REPO_ROOT, workDir, relativePath);
  }
  gitIn(workDir, ["add", "-A", ...paths.filter((relativePath) => fs.existsSync(path.join(workDir, relativePath)))]);
  gitIn(workDir, ["commit", "--quiet", "--allow-empty", "-m", "packet 002 custody fixture"]);
  return {
    workDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function applyPacketMutation(workDir, mutationFile) {
  gitIn(workDir, ["apply", path.join(PACKET_002_CORPUS_ROOT, "corpus", "mutations", mutationFile)]);
}

function writeJsonFixture(rootDir, relativePath, value) {
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, stableJson(value));
}

test("successor oracle custody compiles the exact proof-carrying path set", () => {
  const { paths } = exactSuccessorOracleCustodyPathSet({ rootDir: process.cwd() });

  for (const requiredPath of [
    "tools/ourself-selfcommunication-successor-oracle-custody.mjs",
    "tools/ourself-selfcommunication-hostile-oracle-identity.mjs",
    "tools/ourself-selfcommunication-proof-closure-custody.mjs",
    "test/ourself-selfcommunication-successor-oracle-custody.test.mjs",
    "test/ourself-selfcommunication-hostile-oracle-identity.test.mjs",
    "test/ourself-selfcommunication-abc-repair-acceptance.test.mjs",
    "test/ourself-selfcommunication-proof-closure-custody.test.mjs",
    "specimens/selfcommunication-hostile-oracle-identity-v0-001/successor-hostile-oracle-manifest.json",
    "specimens/selfcommunication-hostile-oracle-identity-v0-001/successor-hostile-oracle-report.json",
    "specimens/selfcommunication-successor-oracle-custody-v0-001/successor-oracle-proof-carrying-custody-manifest.json",
    "tools/ourself-selfcommunication-successor-oracle-custody.mjs"
  ]) {
    assert.ok(paths.includes(requiredPath), requiredPath);
  }
  assert.equal(paths.includes("package.json"), false);
});

test("successor oracle custody manifest binds compiler identity as load-bearing Matter", () => {
  const manifest = buildSuccessorOracleCustodyManifest({ rootDir: process.cwd() });
  const compiler = manifest.minimum_durable_custody_set.find((entry) => (
    entry.PATH === "tools/ourself-selfcommunication-hostile-oracle-identity.mjs"
  ));
  const custodyCompiler = manifest.minimum_durable_custody_set.find((entry) => (
    entry.PATH === "tools/ourself-selfcommunication-successor-oracle-custody.mjs"
  ));

  assert.equal(compiler.PROOF_ROLE, "IDENTITY_PARTICIPATION_COMPILER");
  assert.equal(compiler.DEPENDENCY_CLASSIFICATION, "LOAD_BEARING");
  assert.match(compiler.CONTENT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  assert.ok(compiler.DEPENDENTS.includes("Q5:CLASSIFICATION_COMPILER_DRIFT"));
  assert.equal(custodyCompiler.PROOF_ROLE, "PROOF_CARRYING_CUSTODY_COMPILER");
  assert.match(manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  assert.equal(manifest.verification_closure_fixpoint.self_included, true);
  assert.equal(manifest.verification_closure_fixpoint.VERIFICATION_CLOSURE, "CLOSED");
});

test("Packet 002 hostile corpus identity is independently recomputed from tuple bytes", {
  skip: fs.existsSync(PACKET_002_CORPUS_ROOT) ? false : "Packet 002 hostile corpus not present"
}, () => {
  const identity = computePacket002HostileCorpusIdentity({
    corpusBundleRoot: PACKET_002_CORPUS_ROOT
  });

  assert.equal(identity.observed_sha256, "669fc715486786098b9ae65159aab90d20efbf08d44022c3e8dd79764fe5c81b");
  assert.equal(identity.file_count, 23);
  assert.equal(identity.DIGEST_MATCH, true);
});

test("successor oracle custody report preserves recomputable standing without package drift", () => {
  const fixture = createCommittedWorkingTreeFixture();
  try {
    const report = buildSuccessorOracleCustodyReport({
      rootDir: fixture.workDir,
      writeArtifacts: false,
      executeAcceptance: false
    });

    assert.equal(report.PATH_CONTENT_CHECKS_PASS, true);
    assert.equal(report.COMMITTED_PATH_CONTENT_CHECKS_PASS, true);
    assert.equal(report.OPERATIVE_PROOF_VECTOR.WORKTREE_SELF_BINDING, "MATCH");
    assert.equal(report.OPERATIVE_PROOF_VECTOR.COMMITTED_SELF_BINDING, "MATCH");
    assert.equal(report.OPERATIVE_PROOF_VECTOR.CUSTODIED_PROOF_RECONTACT, "PASS");
    assert.equal(report.OPERATIVE_PROOF_VECTOR.VERIFICATION_CLOSURE, "CLOSED");
    const requiredFixtureKeys = new Set(Object.entries(report.OPERATIVE_PROOF_VECTOR.LEG_DOMAINS)
      .flatMap(([leg, values]) => values.map((value) => `${leg}:${value}`)));
    const observedFixtureKeys = new Set(report.DETECTABILITY_FIXTURES
      .map((entry) => `${entry.leg}:${entry.value}`));
    assert.deepEqual([...observedFixtureKeys].sort(), [...requiredFixtureKeys].sort());
    assert.equal(report.DETECTABILITY_FIXTURES.every((entry) => (
      entry.fixture_status === "SHOWN_TO_FIRE" &&
      entry.observation_order.includes("production manifest")
    )), true);
    assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_A, "PASS");
    assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_B, "PASS");
    assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_C, "NOT_APPLICABLE_CURRENT_CORPUS");
    assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_D, "PASS");
    assert.equal(report.PRE_COMMIT_RECOMPUTATION.A_B_C_ACCEPTANCE, "NOT_RUN");
    assert.equal(report.EXECUTION_DERIVED_ACCEPTANCE.EXIT_CODE, null);
    assert.equal(report.EXECUTION_DERIVED_ACCEPTANCE.RESULT_PREIMAGE_IDENTITY, null);
    assert.equal(report.STANDING_LITERAL_CENSUS.find((entry) => entry.literal_ref === "A_B_C_ACCEPTANCE").disposition, "CONVERTED");
    assert.equal(report.CORPUS_REPLAY.corpus_identity.DIGEST_MATCH, true);
    assert.equal(report.EXACT_PATH_SET.includes("package.json"), false);
    assert.equal(report.BLOCKERS.includes("UNRELATED_STAGED_PATHS_PRESENT"), false);
    assert.equal(report.CURRENT_LAUNCH_STANDING, "NO_LAUNCH");
  } finally {
    fixture.cleanup();
  }
});

test("execution-derived acceptance returns NOT_RUN when execution is disabled", () => {
  const receipt = runExecutionDerivedAcceptance({
    rootDir: process.cwd(),
    execute: false
  });

  assert.equal(receipt.EXECUTION_DERIVED_ACCEPTANCE, "NOT_RUN");
  assert.equal(receipt.EXIT_CODE, null);
  assert.equal(receipt.source_literal_or_default_admitted, false);
});

test("execution-derived acceptance returns UNRESOLVED when the executor cannot enter the subject", () => {
  const receipt = runExecutionDerivedAcceptance({
    rootDir: path.join(os.tmpdir(), "selfcommunication-missing-subject"),
    execute: true
  });

  assert.equal(receipt.EXECUTION_DERIVED_ACCEPTANCE, "UNRESOLVED");
  assert.equal(receipt.EXIT_CODE, null);
  assert.match(receipt.error_if_any, /ENOENT|no such file/i);
});

test("missing load-bearing worktree bytes produce an unresolved worktree leg", () => {
  const fixture = createCommittedWorkingTreeFixture();
  try {
    fs.rmSync(path.join(fixture.workDir, "tools/ourself-selfcommunication-launch-readiness.mjs"));
    const report = buildSuccessorOracleCustodyReport({
      rootDir: fixture.workDir,
      writeArtifacts: false,
      executeAcceptance: false
    });

    assert.equal(report.OPERATIVE_PROOF_VECTOR.WORKTREE_SELF_BINDING, "UNRESOLVED");
    assert.equal(report.OPERATIVE_PROOF_VECTOR.VERIFICATION_CLOSURE, "UNRESOLVED");
    assert.ok(report.BLOCKERS.includes("CUSTODY_PATH_CONTENT_MISMATCH"));
  } finally {
    fixture.cleanup();
  }
});

test("committed stale manifest recontact detects committed self-binding mismatch", () => {
  const fixture = createCommittedWorkingTreeFixture();
  try {
    const manifest = buildSuccessorOracleCustodyManifest({ rootDir: fixture.workDir });
    writeJsonFixture(fixture.workDir, DEFAULT_CUSTODY_MANIFEST_PATH, manifest);
    gitIn(fixture.workDir, ["add", DEFAULT_CUSTODY_MANIFEST_PATH]);
    gitIn(fixture.workDir, ["commit", "--quiet", "-m", "freeze stale baseline manifest"]);
    fs.appendFileSync(
      path.join(fixture.workDir, "tools/ourself-selfcommunication-launch-readiness.mjs"),
      "\n// stale committed manifest detectability fixture\n"
    );
    gitIn(fixture.workDir, ["add", "tools/ourself-selfcommunication-launch-readiness.mjs"]);
    gitIn(fixture.workDir, ["commit", "--quiet", "-m", "mutate committed load-bearing file"]);

    const recontact = recontactCustodyManifestAtCommit({
      rootDir: fixture.workDir,
      commit: "HEAD"
    });

    assert.equal(recontact.COMMITTED_PROOF_RECOMPUTABLE, "FAIL");
    assert.ok(recontact.committed_entries.some((entry) => (
      entry.PATH === "tools/ourself-selfcommunication-launch-readiness.mjs" &&
      entry.PASS === false
    )));
  } finally {
    fixture.cleanup();
  }
});

test("N1 and N3 load-bearing mutations fail closed against committed expected identities", {
  skip: fs.existsSync(PACKET_002_CORPUS_ROOT) ? false : "Packet 002 hostile corpus not present"
}, () => {
  const n1 = createCommittedWorkingTreeFixture();
  try {
    applyPacketMutation(n1.workDir, "N1-launch-readiness.patch");
    const report = buildSuccessorOracleCustodyReport({
      rootDir: n1.workDir,
      writeArtifacts: false,
      executeAcceptance: false
    });
    const launchReadiness = report.PATH_CONTENT_CHECKS.find((entry) => (
      entry.PATH === "tools/ourself-selfcommunication-launch-readiness.mjs"
    ));
    assert.equal(launchReadiness.PASS, false);
    assert.equal(report.OPERATIVE_PROOF_VECTOR.WORKTREE_SELF_BINDING, "MISMATCH");
    assert.ok(report.BLOCKERS.includes("CUSTODY_PATH_CONTENT_MISMATCH"));
  } finally {
    n1.cleanup();
  }

  const n3 = createCommittedWorkingTreeFixture();
  try {
    applyPacketMutation(n3.workDir, "N3-self-compiler.patch");
    const report = buildSuccessorOracleCustodyReport({
      rootDir: n3.workDir,
      writeArtifacts: false,
      executeAcceptance: false
    });
    const compiler = report.PATH_CONTENT_CHECKS.find((entry) => (
      entry.PATH === "tools/ourself-selfcommunication-successor-oracle-custody.mjs"
    ));
    assert.equal(compiler.PASS, false);
    assert.equal(report.OPERATIVE_PROOF_VECTOR.WORKTREE_SELF_BINDING, "MISMATCH");
    assert.equal(report.OPERATIVE_PROOF_VECTOR.VERIFICATION_CLOSURE, "OPEN");
    assert.ok(report.C1_C6_RESULTS.some((entry) => (
      entry.case_ref === "C1_COMPILER_MUTATION" &&
      ["FIRED", "SUPPORTED_BY_N3_REGRESSION"].includes(entry.result)
    )));
  } finally {
    n3.cleanup();
  }
});

test("N2 acceptance counterfeit is derived as FAIL from actual suite execution", {
  skip: fs.existsSync(PACKET_002_CORPUS_ROOT) ? false : "Packet 002 hostile corpus not present"
}, () => {
  const fixture = createCommittedWorkingTreeFixture();
  try {
    applyPacketMutation(fixture.workDir, "N2-break-family-C.patch");
    const report = buildSuccessorOracleCustodyReport({
      rootDir: fixture.workDir,
      writeArtifacts: false
    });

    assert.equal(report.PRE_COMMIT_RECOMPUTATION.A_B_C_ACCEPTANCE, "FAIL");
    assert.equal(report.EXECUTION_DERIVED_ACCEPTANCE.EXECUTION_DERIVED_ACCEPTANCE, "FAIL");
    assert.match(report.EXECUTION_DERIVED_ACCEPTANCE.RESULT_PREIMAGE_IDENTITY, /^sha256:[a-f0-9]{64}$/);
    assert.ok(report.BLOCKERS.includes("SUCCESSOR_ORACLE_OR_ABC_NOT_RECOMPUTED"));
  } finally {
    fixture.cleanup();
  }
});

test("successor oracle custody report preserves recomputable standing without package drift on live checkout", () => {
  const report = buildSuccessorOracleCustodyReport({
    rootDir: process.cwd(),
    writeArtifacts: false,
    executeAcceptance: false
  });

  assert.equal(report.PRE_COMMIT_RECOMPUTATION.A_B_C_ACCEPTANCE, "NOT_RUN");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_A, "PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_B, "PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_C, "NOT_APPLICABLE_CURRENT_CORPUS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_D, "PASS");
  assert.equal(report.EXACT_PATH_SET.includes("package.json"), false);
  assert.equal(report.BLOCKERS.includes("UNRELATED_STAGED_PATHS_PRESENT"), false);
  assert.equal(report.CURRENT_LAUNCH_STANDING, "NO_LAUNCH");
});
