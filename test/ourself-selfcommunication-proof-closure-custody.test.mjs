import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildProofClosureCustodyReport,
  buildSuccessorFreeze,
  CURRENT_STRUCTURAL_IDENTITY_CLAIM,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_PREIMAGE_PATH,
  STALE_REMOTE_BLOCKER_STRING
} from "../tools/ourself-selfcommunication-proof-closure-custody.mjs";

const REPO_ROOT = process.cwd();
const REQUIRED_CUSTODY_PATHS = Object.freeze([
  "tools/ourself-selfcommunication-proof-closure-custody.mjs",
  "tools/ourself-selfcommunication-t2-predecessor-binding.mjs",
  "test/ourself-selfcommunication-proof-closure-custody.test.mjs",
  "test/ourself-selfcommunication-t2-predecessor-binding.test.mjs",
  DEFAULT_PREIMAGE_PATH,
  DEFAULT_MANIFEST_PATH
]);

const custodyOnlyReport = buildProofClosureCustodyReport({
  sourceMode: "custody-only",
  writeArtifacts: false,
  preimagePath: DEFAULT_PREIMAGE_PATH,
  manifestPath: DEFAULT_MANIFEST_PATH
});

test("proof closure custody recomputes successor T2, G6, and a changed structural identity", () => {
  const report = custodyOnlyReport;

  assert.equal(report.T2_SUCCESSOR_PASS_RECOMPUTATION, "PASS");
  assert.equal(report.G6_SUCCESSOR_STANDING_RECOMPUTATION, "PASS");
  assert.equal(report.STRUCTURAL_IDENTITY_RECOMPUTATION, "PASS");
  assert.equal(report.DURABLE_CUSTODY_RECOMPUTATION.custody_object_identity_checks.all_identity_checks_pass, true);
  assert.equal(report.IDENTITY_EFFECT_ADJUDICATION, "CUSTODY_IDENTITY_CHANGING");
  assert.notEqual(report.SUCCESSOR_STRUCTURAL_IDENTITY, CURRENT_STRUCTURAL_IDENTITY_CLAIM);
  assert.equal(report.CURRENT_LAUNCH_STANDING, "NO_LAUNCH");
});

test("subtractive minimality treats each load-bearing proof member as irreducible", () => {
  const report = custodyOnlyReport;
  const byId = new Map(report.SUBTRACTIVE_MINIMALITY_RESULTS.map((entry) => [entry.ENTRY_ID, entry]));

  for (const entryId of [
    "EXTRACT:T2_T1_T15_PRE_STATE",
    "EXTRACT:T2_TOOL_USE_COMMAND",
    "EXTRACT:T2_TOOL_RESULT_CONTENT",
    "EXTRACT:T2_RECEIPT_TEXT",
    "EXTRACT:PATIENT_ZERO_JSON_FIELDS",
    "SEMANTIC:SUCCESSOR_SUBJECT_REF",
    "SEMANTIC:DELTA_IDENTITY",
    "FILE:tools/ourself-selfcommunication-proof-closure-custody.mjs",
    "FILE:tools/ourself-selfcommunication-t2-predecessor-binding.mjs"
  ]) {
    assert.equal(byId.get(entryId)?.MINIMUM_SET_DISPOSITION, "IRREDUCIBLE");
  }
});

test("historical extracts bind source identity, deterministic selector, and extract identity", () => {
  const report = custodyOnlyReport;

  assert.equal(report.HISTORICAL_EXTRACTS.length, 5);
  for (const extract of report.HISTORICAL_EXTRACTS) {
    assert.match(extract.SOURCE_OBJECT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
    assert.ok(extract.SOURCE_LOCATOR);
    assert.ok(extract.SOURCE_RANGE_OR_SELECTOR);
    assert.match(extract.EXTRACT_CONTENT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
    assert.match(extract.EXTRACT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
    assert.equal(extract.EXTRACT_IDENTITY_NOT_SOURCE_IDENTITY, true);
    assert.equal(extract.EXTRACT_AUTHENTICITY_REQUIRES_SOURCE_SELECTOR_AND_EXTRACT, true);
  }
});

test("stale blocker residue is preserved but excluded from semantic control", () => {
  const report = custodyOnlyReport;

  assert.equal(
    report.PROOF_CARRYING_MANIFEST.stale_residue_firewall.preserved_residue.historical_residual_blocker_string,
    STALE_REMOTE_BLOCKER_STRING
  );
  assert.equal(report.PROOF_CARRYING_MANIFEST.stale_residue_firewall.residue_in_semantic_control_path, false);
  assert.deepEqual(
    report.PROOF_CARRYING_MANIFEST.proof_closure_graph.find((entry) => entry.PROPOSITION === "RESIDUE:STALE_BLOCKER_FIREWALL").DEPENDENCIES,
    []
  );
});

function gitIn(rootDir, args) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

function createRemoteFixture({ omitPath = null, mutatePath = null } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-remote-derivation-"));
  const workDir = path.join(tempDir, "work");
  const bareDir = path.join(tempDir, "remote.git");
  fs.mkdirSync(workDir, { recursive: true });
  gitIn(workDir, ["init", "--quiet"]);
  gitIn(workDir, ["config", "user.name", "SELFCOMMUNICATION Test"]);
  gitIn(workDir, ["config", "user.email", "selfcommunication@example.test"]);

  for (const relativePath of REQUIRED_CUSTODY_PATHS) {
    if (relativePath === omitPath) continue;
    const source = path.join(REPO_ROOT, relativePath);
    const target = path.join(workDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    if (relativePath === mutatePath) {
      fs.appendFileSync(target, "\nMUTATED_REMOTE_FIXTURE\n");
    }
  }

  gitIn(workDir, ["add", ...REQUIRED_CUSTODY_PATHS.filter((entry) => entry !== omitPath)]);
  gitIn(workDir, ["commit", "--quiet", "-m", "remote evidence fixture"]);
  gitIn(workDir, ["init", "--bare", "--quiet", bareDir]);
  gitIn(workDir, ["remote", "add", "origin", bareDir]);
  gitIn(workDir, ["push", "--quiet", "origin", "HEAD:refs/heads/main"]);

  return {
    tempDir,
    workDir,
    bareDir,
    commit: gitIn(workDir, ["rev-parse", "HEAD"]),
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function advanceRemoteFixture(fixture) {
  fs.writeFileSync(path.join(fixture.workDir, "advance.txt"), "advance remote ref\n");
  gitIn(fixture.workDir, ["add", "advance.txt"]);
  gitIn(fixture.workDir, ["commit", "--quiet", "-m", "advance remote ref"]);
  gitIn(fixture.workDir, ["push", "--quiet", "origin", "HEAD:refs/heads/main"]);
  return gitIn(fixture.workDir, ["rev-parse", "HEAD"]);
}

function freezeFromFixture(fixture, overrides = {}) {
  return buildSuccessorFreeze({
    rootDir: fixture.workDir,
    manifest: custodyOnlyReport.PROOF_CARRYING_MANIFEST,
    preimage: readJson(DEFAULT_PREIMAGE_PATH),
    recomputation: custodyOnlyReport.DURABLE_CUSTODY_RECOMPUTATION,
    durableCustodyCommit: fixture.commit,
    remoteCustodyRef: "refs/heads/main",
    ...overrides
  });
}

test("freeze boundary derives remote custody instead of accepting receipt-shaped representation", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-forged-receipt-"));
  try {
    const forgedAllTrueReceipt = {
      object_type: "REMOTE_RECONTACT_RECEIPT",
      OBSERVATION_SOURCE: "CALLER_AUTHORED_FRESH_CLAIM",
      OBSERVED_COMMIT: "a".repeat(40),
      REQUIRED_COMMIT: "a".repeat(40),
      COMPARISON: "MATCH",
      REMOTE_REF_FRESHLY_RECONTACTED: true,
      REMOTE_REF_RESOLVES_TO_REQUIRED_CUSTODY_COMMIT: true,
      REMOTE_REQUIRED_OBJECTS_RECONTACTABLE: true,
      REMOTE_MANIFEST_CONTENT_MATCH: true,
      RECONTACT_RESULT: "PASS"
    };
    const forgedFreeze = buildSuccessorFreeze({
      rootDir: tempDir,
      manifest: custodyOnlyReport.PROOF_CARRYING_MANIFEST,
      preimage: readJson(DEFAULT_PREIMAGE_PATH),
      recomputation: custodyOnlyReport.DURABLE_CUSTODY_RECOMPUTATION,
      durableCustodyCommit: "a".repeat(40),
      remoteCustodyRef: "refs/heads/main",
      remoteRecontactReceipt: forgedAllTrueReceipt,
      remoteCustodyStanding: { CURRENT_STANDING: "REMOTE_REPLICATED", adjudicated: true }
    });

    assert.equal(forgedFreeze.SUCCESSOR_FREEZE, "NOT_MINTED");
    assert.equal(forgedFreeze.REMOTE_CUSTODY_DERIVATION.CALLER_SUPPLIED_RECEIPT_ADMITTED, false);
    assert.equal(forgedFreeze.REMOTE_CUSTODY_DERIVATION.REMOTE_CUSTODY_STANDING, "NOT_ESTABLISHED");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("remote evidence derivation closure fails closed across hostile custody worlds", () => {
  const validFixture = createRemoteFixture();
  try {
    const successfulRemoteRecontact = freezeFromFixture(validFixture);
    assert.equal(successfulRemoteRecontact.SUCCESSOR_FREEZE, "MINTED");
    assert.match(successfulRemoteRecontact.SUCCESSOR_FREEZE_IDENTITY, /^sha256:[a-f0-9]{64}$/);
    assert.equal(
      successfulRemoteRecontact.REMOTE_CUSTODY_DERIVATION.REMOTE_RECONTACT_RECEIPT.RECONTACT_RESULT,
      "PASS"
    );

    const missingRef = freezeFromFixture(validFixture, {
      remoteCustodyRef: "refs/heads/definitely-not-main"
    });
    assert.equal(missingRef.SUCCESSOR_FREEZE, "NOT_MINTED");

    const staleCommit = validFixture.commit;
    advanceRemoteFixture(validFixture);
    const staleRemoteEvidence = freezeFromFixture(validFixture, {
      durableCustodyCommit: staleCommit
    });
    assert.equal(staleRemoteEvidence.SUCCESSOR_FREEZE, "NOT_MINTED");
  } finally {
    validFixture.cleanup();
  }

  const missingObjectFixture = createRemoteFixture({
    omitPath: "test/ourself-selfcommunication-proof-closure-custody.test.mjs"
  });
  try {
    const missingObject = freezeFromFixture(missingObjectFixture);
    assert.equal(missingObject.SUCCESSOR_FREEZE, "NOT_MINTED");
  } finally {
    missingObjectFixture.cleanup();
  }

  const wrongManifestFixture = createRemoteFixture({
    mutatePath: DEFAULT_MANIFEST_PATH
  });
  try {
    const wrongManifest = freezeFromFixture(wrongManifestFixture);
    assert.equal(wrongManifest.SUCCESSOR_FREEZE, "NOT_MINTED");
  } finally {
    wrongManifestFixture.cleanup();
  }
});
