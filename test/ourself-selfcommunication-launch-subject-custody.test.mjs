import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildLaunchSubjectManifest,
  contentIdentityForFile,
  extractExternalSessionContextEvidence,
  stableJson,
  writeContentAddressedEvidence
} from "../tools/ourself-selfcommunication-launch-subject-custody.mjs";
import { buildSelfcommunicationLaunchReadinessReport } from "../tools/ourself-selfcommunication-launch-readiness.mjs";

test("external Claude session evidence extraction is bounded to marker census", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-custody-"));
  const sessionFile = path.join(dir, "claude-session.jsonl");
  fs.writeFileSync(sessionFile, "{\"message\":\"ROUTE_ADJUDICATION_PROBE 5464975482\"}\n");

  const evidence = extractExternalSessionContextEvidence({ sessionFilePath: sessionFile });
  const byMarker = new Map(evidence.marker_findings.map((entry) => [entry.marker, entry]));

  assert.equal(evidence.source_identity, contentIdentityForFile(sessionFile));
  assert.equal(evidence.provenance.extraction_not_promotion, true);
  assert.equal(evidence.provenance.external_session_context_not_ourself_observation, true);
  assert.equal(evidence.summary_not_source_preimage, true);
  assert.equal(byMarker.get("5464975482").present, true);
  assert.equal(byMarker.get("ROUTE_ADJUDICATION_PROBE").present, true);
  assert.ok(evidence.does_not_support.includes("OURSELF_OBSERVATION"));
  assert.ok(evidence.does_not_support.includes("T2_OBSERVATION_OCCURRENCE"));
});

test("content-addressed evidence custody binds filename to exact object bytes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-custody-root-"));
  const evidence = {
    schema: "test",
    object_type: "BOUNDED_EXTERNAL_SESSION_CONTEXT_EVIDENCE",
    evidence_id: "EVIDENCE_TEST",
    source_locator: "/tmp/source.jsonl",
    source_identity: "sha256:source",
    source_byte_count: 1,
    source_range_or_exact_extraction_rule: { extraction_species: "MARKER_PRESENCE_CENSUS" },
    provenance: { extraction_not_promotion: true },
    interpretation_context: { gate: "g7_SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK" },
    role: "BOUNDED_EXTERNAL_SESSION_CONTEXT_PREIMAGE",
    marker_findings: [{ marker: "5464975482", present: true, count: 1, first_index: 0 }],
    supports: ["SESSION_FILE_UNION_CONTEXT_LAUNDERING_RISK_CENSUS"],
    does_not_support: ["OURSELF_OBSERVATION"],
    summary_not_source_preimage: true,
    evidence_identity: "sha256:evidence"
  };

  const result = writeContentAddressedEvidence({ rootDir: root, outputDir: "out", evidence });
  const absolutePath = path.join(root, result.path);

  assert.equal(result.content_identity, contentIdentityForFile(absolutePath));
  assert.ok(result.path.includes(result.content_identity.replace("sha256:", "")));
  assert.equal(result.custody_ref, `content-addressed-local-file:${result.path}#${result.content_identity}`);
});

test("bounded external evidence is sufficient for launch session-union adjudication", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-custody-"));
  const sessionFile = path.join(dir, "claude-session.jsonl");
  fs.writeFileSync(sessionFile, "{\"message\":\"ROUTE_ADJUDICATION_PROBE 5464975482\"}\n");
  const evidence = extractExternalSessionContextEvidence({ sessionFilePath: sessionFile });

  const report = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence: evidence
  });

  assert.equal(
    report.algebra.session_file_union.evidence_source,
    "CONTENT_ADDRESSED_EXTERNAL_SESSION_CONTEXT_EVIDENCE"
  );
  assert.equal(report.algebra.session_file_union.raw_provider_session_file_required_for_this_claim, false);
  assert.equal(report.gates.g7_session_file_union_attack.control_disposition, "SATISFIED");
});

test("launch subject manifest identity is deterministic and distinct from subject identity", () => {
  const repositoryEntry = {
    subject_entry_id: "C1:tools/example.mjs",
    matter_species: "REPOSITORY_NATIVE_MATTER",
    locator: "git-worktree:tools/example.mjs",
    content_identity: "sha256:repo",
    custody_species: "GIT_BLOB_OBJECT_CUSTODY_PENDING_DURABLE_ROOT",
    custody_ref: "git:blob:abc123",
    role: "TEST_REPOSITORY_ENTRY",
    required_for: ["TEST"],
    supports: ["TEST_SUPPORT"],
    does_not_support: ["LAUNCH_AUTHORITY"],
    load_bearing: true,
    independently_recontactable: false
  };
  const externalEntry = {
    subject_entry_id: "C2:EXTERNAL_SESSION_CONTEXT",
    matter_species: "BOUNDED_EXTERNAL_EVIDENCE",
    locator: "local-file:external.json",
    content_identity: "sha256:external",
    custody_species: "CONTENT_ADDRESSED_LOCAL_FILE",
    custody_ref: "content-addressed-local-file:external.json#sha256:external",
    role: "BOUNDED_EXTERNAL_SESSION_CONTEXT_PREIMAGE",
    required_for: ["TEST"],
    supports: ["TEST_SUPPORT"],
    does_not_support: ["OURSELF_OBSERVATION"],
    load_bearing: true,
    independently_recontactable: true
  };
  const launchReadinessReport = {
    report_identity: "sha256:report",
    launch_decision: "NO_LAUNCH",
    current_launch_standing: "NO_LAUNCH"
  };
  const first = buildLaunchSubjectManifest({
    repositoryEntries: [repositoryEntry],
    externalEvidenceEntries: [externalEntry],
    launchReadinessReport
  });
  const second = buildLaunchSubjectManifest({
    repositoryEntries: [repositoryEntry],
    externalEvidenceEntries: [externalEntry],
    launchReadinessReport
  });

  assert.equal(first.launch_subject_manifest_identity, second.launch_subject_manifest_identity);
  assert.equal(stableJson(first), stableJson(second));
  assert.equal(first.identity_law.manifest_identity_not_launch_subject_identity, true);
  assert.equal(first.launch_subject_identity, "NOT_ESTABLISHED");
});
