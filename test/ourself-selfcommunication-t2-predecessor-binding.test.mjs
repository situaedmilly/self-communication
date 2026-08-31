import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  adjudicateT2Predecessor,
  buildSelfcommunicationLaunchReadinessReport,
  LAUNCH_CONTROL_DISPOSITIONS
} from "../tools/ourself-selfcommunication-launch-readiness.mjs";
import { contentIdentityForFile } from "../tools/ourself-selfcommunication-launch-subject-custody.mjs";
import {
  adjudicateT2RequiredBindings,
  buildCustodiedLaunchSubjectFreeze,
  buildT2PredecessorReceiptFromBindings,
  CLAUDE_T2_SESSION_ID,
  DEFAULT_LAUNCH_SUBJECT_IDENTITY,
  extractBoundedT2Evidence,
  PATIENT_ZERO_MATTER_REF,
  PARTICIPATION_REF
} from "../tools/ourself-selfcommunication-t2-predecessor-binding.mjs";

const PATIENT_ZERO_BODY = [
  "ROUTE_ADJUDICATION_PROBE",
  "seat_claim=CODEXSELF",
  "probe_id=CL001-CODEX-ROUTE-001",
  "no_command_authority=true",
  "no_continuation_authority=true"
].join("\n");

function writeFixtureJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function writeSessionFile(dir, {
  toolUseUuid = "65ff1d07-b9b9-44e0-9a69-1aa64739921e",
  toolUseId = "toolu_01R5Udi2SjcSuuFkVECGNsmv",
  toolResultSessionId = CLAUDE_T2_SESSION_ID,
  sourceToolAssistantUUID = toolUseUuid,
  resultParentUuid = toolUseUuid
} = {}) {
  const sessionFile = path.join(dir, "claude-session.jsonl");
  const records = [
    {
      type: "user",
      uuid: "7078ceb3-5946-4fd2-99f8-bb915a32be87",
      parentUuid: "57df5ebd-93f6-4fcf-9ee7-e983e96f917f",
      sessionId: CLAUDE_T2_SESSION_ID,
      isSidechain: false,
      cwd: "/Users/millysituated/self-communication",
      userType: "external",
      message: {
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: "toolu_t1",
          content: "F1 determinism: true\nPZ obs count: 0 | claude PZ count: 0\nT1 final: PASS\nT1.5 final: PASS"
        }]
      }
    },
    {
      type: "assistant",
      uuid: toolUseUuid,
      parentUuid: "24fb9acb-e2c3-476c-973a-b529f8cb99f8",
      sessionId: CLAUDE_T2_SESSION_ID,
      isSidechain: false,
      cwd: "/Users/millysituated/self-communication",
      userType: "external",
      message: {
        role: "assistant",
        content: [{
          type: "tool_use",
          name: "Bash",
          id: toolUseId,
          input: {
            command: "gh api repos/situaedmilly/self-communication/issues/comments/5464975482 > pz_t2.json",
            description: "Perform the bound T2 GOCHECKIT"
          }
        }]
      }
    },
    {
      type: "user",
      uuid: "4ffa98b6-ea25-4291-84a5-d72dfe2d2c76",
      parentUuid: resultParentUuid,
      sessionId: toolResultSessionId,
      isSidechain: false,
      cwd: "/Users/millysituated",
      userType: "external",
      sourceToolAssistantUUID,
      message: {
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: toolUseId,
          content: [
            "RECONTACT_OK",
            "observation_occurrence:",
            "  observer: PO_interactive (CLAUDESELF_CHAMBER_219be5a6, opus-4-8), admitted GitHub capability (gh, principal situaedmilly)",
            "  comment_id: 5464975482",
            "  node_id: IC_kwDOT3unqM8AAAABRbzoeg",
            "  author(login): situaedmilly",
            "  created_at: 2026-08-29T21:26:03Z",
            "  observed_body_bytes: 133",
            "  observed_content_identity (independently computed at this endpoint): sha256:9bbc97aa41d7566d522d51912078ab5e419fd4ec3ed47f3591ae84c337415d98",
            "  recontact_time_utc: 2026-08-30T01:59:02.573496+00:00",
            "  first_line: ROUTE_ADJUDICATION_PROBE",
            "  contains ROUTE_ADJUDICATION_PROBE marker: True"
          ].join("\n")
        }]
      }
    },
    {
      type: "assistant",
      uuid: "f547269a-65a5-450d-badf-34bfc7a0d5d5",
      parentUuid: "856c90c3-967a-4cd6-9540-63831c45a451",
      sessionId: CLAUDE_T2_SESSION_ID,
      isSidechain: false,
      cwd: "/Users/millysituated/self-communication",
      userType: "external",
      message: {
        role: "assistant",
        content: [{
          type: "text",
          text: [
            "# CLAUDESELF_PATIENT_ZERO_T2_CALIBRATION_RECEIPT",
            "PATIENT_ZERO_PRE_STATE: Observed(PO_interactive, 5464975482) = FALSE",
            "PATIENT_ZERO_POST_STATE: Observed(PO_interactive, 5464975482) = TRUE",
            "## STANDING_CEILING",
            "ATTRIBUTION_ESTABLISHED_UNDER_T0 - OBSERVATION only.",
            "not truth; not agreement; not authority; not effect; not launch readiness."
          ].join("\n")
        }]
      }
    }
  ];
  fs.writeFileSync(sessionFile, records.map((record) => JSON.stringify(record)).join("\n"));
  return sessionFile;
}

function writePatientZeroFile(dir) {
  const patientZeroJsonPath = path.join(dir, "pz_t2.json");
  writeFixtureJson(patientZeroJsonPath, {
    url: "https://api.github.com/repos/situaedmilly/self-communication/issues/comments/5464975482",
    html_url: "https://github.com/situaedmilly/self-communication/issues/1#issuecomment-5464975482",
    issue_url: "https://api.github.com/repos/situaedmilly/self-communication/issues/1",
    id: 5464975482,
    node_id: "IC_kwDOT3unqM8AAAABRbzoeg",
    user: { login: "situaedmilly" },
    author_association: "OWNER",
    created_at: "2026-08-29T21:26:03Z",
    updated_at: "2026-08-29T21:26:03Z",
    body: PATIENT_ZERO_BODY
  });
  return patientZeroJsonPath;
}

function launchSubjectRecontactFor(sessionFilePath) {
  return {
    launch_subject_custody: "ESTABLISHED",
    launch_subject_identity: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    every_required_manifest_member_recontactable: true,
    subject_closure_recontact_pass: true,
    launch_subject_manifest_identity: "sha256:manifest",
    manifest_path: "specimens/selfcommunication-launch-subject-custody-v0-001/launch-subject-manifest.json",
    custody_commit: "4357f7ace087db9b200dab6ebfe1b65fe1a46f17",
    custody_tree: "407dbf2e61046d9af7a8904bdd93af91e10fa412",
    custody_receipt_identity: "sha256:receipt",
    root_dir: process.cwd(),
    manifest_links: {
      c2_external_session_context: {
        subject_entry_id: "C2:EXTERNAL_SESSION_CONTEXT",
        content_identity: "sha256:c2"
      },
      c2_external_session_evidence: {
        source_identity: contentIdentityForFile(sessionFilePath),
        marker_findings: [
          { marker: PATIENT_ZERO_MATTER_REF, present: true, count: 1, first_index: 1 },
          { marker: "ROUTE_ADJUDICATION_PROBE", present: true, count: 1, first_index: 2 }
        ]
      },
      t2_candidate_predecessor_entries: [
        { subject_entry_id: "C1:doctrine/DMB-CAUSAL-MATTER-CONTINUITY-ATTACK-REPORT-v0.1-CANDIDATE.md" }
      ]
    }
  };
}

function boundFixtureEvidence(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-t2-"));
  const sessionFilePath = writeSessionFile(dir, overrides);
  const patientZeroJsonPath = writePatientZeroFile(dir);
  const evidence = extractBoundedT2Evidence({
    sessionFilePath,
    patientZeroJsonPath,
    preR4ReportPath: null
  });
  return {
    dir,
    sessionFilePath,
    evidence,
    custody: {
      evidence,
      path: "fixture/external-t2-predecessor-evidence.json",
      content_identity: "sha256:fixture",
      custody_species: "CONTENT_ADDRESSED_LOCAL_FILE",
      custody_ref: "content-addressed-local-file:fixture/external-t2-predecessor-evidence.json#sha256:fixture"
    }
  };
}

test("bounded T2 extraction preserves exact Patient Zero Matter without promoting launch authority", () => {
  const { evidence, sessionFilePath } = boundFixtureEvidence();

  assert.equal(evidence.patient_zero_matter.matter_ref, PATIENT_ZERO_MATTER_REF);
  assert.equal(evidence.patient_zero_matter.body_byte_count, 133);
  assert.equal(evidence.patient_zero_matter.body_content_identity, "sha256:9bbc97aa41d7566d522d51912078ab5e419fd4ec3ed47f3591ae84c337415d98");
  assert.equal(evidence.observation_output.recontact_ok, true);
  assert.equal(evidence.source_identity.claude_session_file, contentIdentityForFile(sessionFilePath));
  assert.equal(evidence.source_range_or_exact_extraction_rule.raw_provider_session_file_copied, false);
  assert.equal(evidence.provenance.extraction_not_promotion, true);
  assert.equal(evidence.provenance.patient_zero_reobservation_performed_in_this_phase, false);
  assert.ok(evidence.supports.includes("T2_OBSERVATION_OCCURRENCE"));
  assert.ok(evidence.does_not_support.includes("LAUNCH_AUTHORITY"));
});

test("T2 bindings compile to PASS only from the five established mechanical bindings", () => {
  const { custody, sessionFilePath } = boundFixtureEvidence();
  const bindings = adjudicateT2RequiredBindings({
    launchSubjectRecontact: launchSubjectRecontactFor(sessionFilePath),
    t2EvidenceCustody: custody
  });
  const receipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication: bindings,
    t2EvidenceCustody: custody
  });
  const gate = adjudicateT2Predecessor({
    t2Receipt: receipt,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });

  assert.equal(bindings.all_required_bindings_established, true);
  assert.deepEqual(Object.values(bindings.binding_standings), [
    "ESTABLISHED",
    "ESTABLISHED",
    "ESTABLISHED",
    "ESTABLISHED",
    "ESTABLISHED"
  ]);
  assert.equal(receipt.subject_identity_binding, DEFAULT_LAUNCH_SUBJECT_IDENTITY);
  assert.equal(receipt.participation_binding, PARTICIPATION_REF);
  assert.equal(receipt.no_manual_pass_injection, true);
  assert.equal(gate.final_standing, "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED");
  assert.equal(gate.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
});

test("sibling or resumed transcript mismatch blocks T2 participation binding", () => {
  const { custody, sessionFilePath } = boundFixtureEvidence({
    toolResultSessionId: "SIBLING_SESSION",
    sourceToolAssistantUUID: "SIBLING_UUID",
    resultParentUuid: "SIBLING_UUID"
  });
  const bindings = adjudicateT2RequiredBindings({
    launchSubjectRecontact: launchSubjectRecontactFor(sessionFilePath),
    t2EvidenceCustody: custody
  });
  const receipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication: bindings,
    t2EvidenceCustody: custody
  });
  const gate = adjudicateT2Predecessor({
    t2Receipt: receipt,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });

  assert.equal(bindings.bindings.T2_PARTICIPATION_BINDING.standing, "BLOCKED");
  assert.equal(receipt.participation_binding, "NOT_BOUND");
  assert.equal(gate.final_standing, "T2_PREDECESSOR_BLOCKED_BY_BINDING_GAP");
  assert.equal(gate.checks.t2_required_bindings_established, false);
});

test("T2 subject binding requires the custodied launch subject identity", () => {
  const { custody, sessionFilePath } = boundFixtureEvidence();
  const recontact = {
    ...launchSubjectRecontactFor(sessionFilePath),
    launch_subject_identity: "sha256:wrong"
  };
  const bindings = adjudicateT2RequiredBindings({
    launchSubjectRecontact: recontact,
    t2EvidenceCustody: custody
  });
  const receipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication: bindings,
    t2EvidenceCustody: custody
  });
  const gate = adjudicateT2Predecessor({
    t2Receipt: receipt,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });

  assert.equal(bindings.bindings.T2_SUBJECT_BINDING.standing, "BLOCKED");
  assert.equal(receipt.subject_identity_binding, "NOT_BOUND");
  assert.equal(gate.checks.t2_subject_binding, false);
  assert.equal(gate.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
});

test("launch readiness consumes T2 as a typed predecessor and reprojects G6", () => {
  const { custody, sessionFilePath } = boundFixtureEvidence();
  const recontact = launchSubjectRecontactFor(sessionFilePath);
  const bindings = adjudicateT2RequiredBindings({
    launchSubjectRecontact: recontact,
    t2EvidenceCustody: custody
  });
  const receipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication: bindings,
    t2EvidenceCustody: custody
  });
  const report = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence: recontact.manifest_links.c2_external_session_evidence,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    t2Receipt: receipt
  });

  assert.equal(report.gates.t2_causal_matter_predecessor.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(report.g6_current_standing_result.current_standing, "CURRENT_G6_LATER_OBSERVATION_ESTABLISHED");
  assert.equal(report.g6_current_standing_result.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(report.gates.g7_session_file_union_attack.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(report.g5_instrument_result.final_standing, "G5_BLOCKED");
  assert.equal(report.g5_instrument_result.errors.includes("LAUNCH_SUBJECT_IDENTITY_MISSING"), false);
  assert.equal(report.launch_decision, "NO_LAUNCH");
});

test("new freeze is mintable after T2 and G6 pass while R4 remains ineligible", () => {
  const { custody, sessionFilePath } = boundFixtureEvidence();
  const recontact = launchSubjectRecontactFor(sessionFilePath);
  const bindings = adjudicateT2RequiredBindings({
    launchSubjectRecontact: recontact,
    t2EvidenceCustody: custody
  });
  const receipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication: bindings,
    t2EvidenceCustody: custody
  });
  const launchReadinessReport = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence: recontact.manifest_links.c2_external_session_evidence,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    t2Receipt: receipt
  });
  const freeze = buildCustodiedLaunchSubjectFreeze({
    launchSubjectRecontact: recontact,
    launchReadinessReport,
    t2PredecessorReceipt: receipt
  });

  assert.equal(freeze.new_freeze, "MINTED");
  assert.equal(freeze.freeze.current_launch_standing, "NO_LAUNCH");
  assert.equal(
    freeze.freeze.current_gate_vector.t2_causal_matter_predecessor.control_disposition,
    LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
  );
  assert.equal(
    freeze.freeze.current_gate_vector.g5_independent_hostile_pass.control_disposition,
    LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
  );
});
