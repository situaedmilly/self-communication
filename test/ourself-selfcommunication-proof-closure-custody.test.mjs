import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRemoteRecontactReceipt,
  buildProofClosureCustodyReport,
  buildSuccessorFreeze,
  CURRENT_STRUCTURAL_IDENTITY_CLAIM,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_PREIMAGE_PATH,
  STALE_REMOTE_BLOCKER_STRING
} from "../tools/ourself-selfcommunication-proof-closure-custody.mjs";

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

function passingRemoteReceipt(overrides = {}) {
  const requiredCommit = overrides.requiredCommit ?? "a".repeat(40);
  return buildRemoteRecontactReceipt({
    observationSource: "TEST_REMOTE_OBSERVATION",
    requiredCommit,
    observedCommit: requiredCommit,
    requiredObjectRecontact: [{
      path: "specimens/selfcommunication-proof-closure-custody-v0-001/proof-closure-manifest.json",
      recontactable: true,
      content_identity_match: true,
      passes: true,
      failure_if_any: null
    }],
    manifestMatch: true,
    ...overrides
  });
}

function freezeFromReceipt(receipt, durableCustodyCommit = "a".repeat(40)) {
  return buildSuccessorFreeze({
    manifest: custodyOnlyReport.PROOF_CARRYING_MANIFEST,
    recomputation: custodyOnlyReport.DURABLE_CUSTODY_RECOMPUTATION,
    durableCustodyCommit,
    remoteRecontactReceipt: receipt
  });
}

test("remote custody freeze predicate is evidence-derived, not label-derived", () => {
  const requiredCommit = "a".repeat(40);
  const behindCommit = "b".repeat(40);
  const wrongCommit = "c".repeat(40);

  const noRemoteRef = freezeFromReceipt(passingRemoteReceipt({
    requiredCommit,
    observedCommit: null,
    requiredObjectRecontact: [],
    manifestMatch: false
  }));
  assert.equal(noRemoteRef.SUCCESSOR_FREEZE, "NOT_MINTED");

  const remoteBehind = freezeFromReceipt(passingRemoteReceipt({
    requiredCommit,
    observedCommit: behindCommit
  }));
  assert.equal(remoteBehind.SUCCESSOR_FREEZE, "NOT_MINTED");

  const wrongRemoteCommit = freezeFromReceipt(passingRemoteReceipt({
    requiredCommit,
    observedCommit: wrongCommit
  }));
  assert.equal(wrongRemoteCommit.SUCCESSOR_FREEZE, "NOT_MINTED");

  const objectRecontactFailure = freezeFromReceipt(passingRemoteReceipt({
    requiredCommit,
    requiredObjectRecontact: [{
      path: "specimens/selfcommunication-proof-closure-custody-v0-001/proof-closure-manifest.json",
      recontactable: false,
      content_identity_match: false,
      passes: false,
      failure_if_any: "REMOTE_PATH_NOT_RECONTACTABLE"
    }]
  }));
  assert.equal(objectRecontactFailure.SUCCESSOR_FREEZE, "NOT_MINTED");

  const successfulRemoteRecontact = freezeFromReceipt(passingRemoteReceipt({ requiredCommit }));
  assert.equal(successfulRemoteRecontact.SUCCESSOR_FREEZE, "MINTED");
  assert.match(successfulRemoteRecontact.SUCCESSOR_FREEZE_IDENTITY, /^sha256:[a-f0-9]{64}$/);

  const staleSuccessfulReceipt = passingRemoteReceipt({
    requiredCommit: behindCommit,
    observedCommit: behindCommit
  });
  const staleReceiptAgainstNewSubject = freezeFromReceipt(staleSuccessfulReceipt, requiredCommit);
  assert.equal(staleReceiptAgainstNewSubject.SUCCESSOR_FREEZE, "NOT_MINTED");
});
