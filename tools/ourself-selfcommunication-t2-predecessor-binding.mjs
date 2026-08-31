#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  adjudicateT2Predecessor,
  buildSelfcommunicationLaunchReadinessReport,
  LAUNCH_CONTROL_DISPOSITIONS,
  SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
  T0_ATTRIBUTION_CONTRACT
} from "./ourself-selfcommunication-launch-readiness.mjs";
import {
  contentIdentityForBuffer,
  contentIdentityForFile,
  stableJson
} from "./ourself-selfcommunication-launch-subject-custody.mjs";
import { digestObject } from "./ourself-communication-matter.mjs";

export const T2_PREDECESSOR_BINDING_SCHEMA = "ourself.selfcommunication-t2-predecessor-binding.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_LAUNCH_SUBJECT_IDENTITY =
  "sha256:a20e63ee234f6564703e38e0b6da0682901b92469e6854821901ce8a5269cade";
export const DEFAULT_CUSTODY_COMMIT = "4357f7ace087db9b200dab6ebfe1b65fe1a46f17";
export const DEFAULT_CUSTODY_TREE = "407dbf2e61046d9af7a8904bdd93af91e10fa412";
export const DEFAULT_MANIFEST_PATH =
  "specimens/selfcommunication-launch-subject-custody-v0-001/launch-subject-manifest.json";
export const DEFAULT_CUSTODY_RECEIPT_PATH =
  "inselfactions/ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001.json";
export const DEFAULT_C2_SESSION_EVIDENCE_PATH =
  "specimens/selfcommunication-launch-subject-custody-v0-001/external-session-context-evidence.af223da4075caeb5107881cabe238f5dba22ae509b439008347290f11ad42738.json";
export const DEFAULT_CLAUDE_SESSION_FILE =
  "/Users/millysituated/.claude/projects/-Users-millysituated/219be5a6-1b6a-4212-90e2-2963de17b926.jsonl";
export const DEFAULT_PATIENT_ZERO_T2_JSON =
  "/private/tmp/claude-501/-Users-millysituated/219be5a6-1b6a-4212-90e2-2963de17b926/scratchpad/pz_t2.json";
export const DEFAULT_PRE_R4_REPORT =
  "/private/tmp/claude-501/-Users-millysituated/219be5a6-1b6a-4212-90e2-2963de17b926/scratchpad/SELFCOMMUNICATION_LIVE_V0_PRE_R4_REPORT_001.md";
export const DEFAULT_OUTPUT_DIR = "specimens/selfcommunication-t2-predecessor-binding-v0-001";
export const DEFAULT_REPORT_PATH = `${DEFAULT_OUTPUT_DIR}/t2-predecessor-binding-report.json`;
export const DEFAULT_FREEZE_PATH =
  "specimens/selfcommunication-launch-freeze-v0-001/custodied-launch-subject-freeze.json";
export const PATIENT_ZERO_MATTER_REF = "5464975482";
export const PARTICIPATION_REF = "P_CLAUDE_LAUNCH_READINESS";
export const CLAUDE_T2_SESSION_ID = "219be5a6-1b6a-4212-90e2-2963de17b926";
export const T2_BOUNDING_CEILING = "LOAD_BEARING_PREDECESSOR_ONLY";

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeStableJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), stableJson(value));
}

function git(rootDir, args, encoding = "utf8") {
  return execFileSync("git", ["-C", rootDir, ...args], { encoding });
}

function stripIdentityField(value, field) {
  const clone = { ...value };
  delete clone[field];
  return clone;
}

function contentItems(record) {
  const content = record?.message?.content;
  return Array.isArray(content) ? content : [];
}

function itemText(item) {
  if (typeof item?.text === "string") return item.text;
  if (typeof item?.content === "string") return item.content;
  if (typeof item?.input?.command === "string") return item.input.command;
  return "";
}

function recordText(record) {
  return contentItems(record).map(itemText).join("\n");
}

function parseClaudeJsonl(sessionFilePath) {
  return fs.readFileSync(path.resolve(sessionFilePath), "utf8")
    .split("\n")
    .map((line, index) => {
      if (!line.trim()) return null;
      const record = JSON.parse(line);
      return { line_number: index + 1, record };
    })
    .filter(Boolean);
}

function summarizeTranscriptRecord(entry, item = null) {
  const record = entry?.record ?? {};
  return {
    line_number: entry?.line_number ?? null,
    type: record.type ?? null,
    uuid: record.uuid ?? null,
    parent_uuid: record.parentUuid ?? null,
    session_id: record.sessionId ?? null,
    is_sidechain: record.isSidechain ?? null,
    cwd: record.cwd ?? null,
    user_type: record.userType ?? null,
    message_role: record.message?.role ?? null,
    content_type: item?.type ?? null,
    tool_name: item?.name ?? null,
    tool_use_id: item?.id ?? item?.tool_use_id ?? null,
    source_tool_assistant_uuid: record.sourceToolAssistantUUID ?? null,
    text_identity: itemText(item ?? contentItems(record)[0] ?? {}).length > 0
      ? `sha256:${sha256Buffer(Buffer.from(itemText(item ?? contentItems(record)[0] ?? {}), "utf8"))}`
      : null
  };
}

function findT2TranscriptRecords(records) {
  const t1PreState = records.find(({ record }) => {
    const text = recordText(record);
    return text.includes("PZ obs count: 0") &&
      text.includes("T1 final: PASS") &&
      text.includes("T1.5 final: PASS");
  }) ?? null;
  const toolUseEntry = records.find(({ record }) => contentItems(record).some((item) => (
    item.type === "tool_use" &&
    item.name === "Bash" &&
    typeof item.input?.command === "string" &&
    item.input.command.includes("gh api repos/situaedmilly/self-communication/issues/comments/5464975482") &&
    item.input.command.includes("pz_t2.json")
  ))) ?? null;
  const toolUseItem = contentItems(toolUseEntry?.record).find((item) => (
    item.type === "tool_use" &&
    item.name === "Bash" &&
    typeof item.input?.command === "string" &&
    item.input.command.includes("issues/comments/5464975482")
  )) ?? null;
  const toolResultEntry = records.find(({ record }) => contentItems(record).some((item) => (
    item.type === "tool_result" &&
    item.tool_use_id === toolUseItem?.id &&
    typeof item.content === "string" &&
    item.content.includes("RECONTACT_OK") &&
    item.content.includes("comment_id: 5464975482")
  ))) ?? null;
  const toolResultItem = contentItems(toolResultEntry?.record).find((item) => (
    item.type === "tool_result" && item.tool_use_id === toolUseItem?.id
  )) ?? null;
  const receiptEntry = records.find(({ record }) => {
    const text = recordText(record);
    return text.includes("CLAUDESELF_PATIENT_ZERO_T2_CALIBRATION_RECEIPT") &&
      text.includes("STANDING_CEILING") &&
      text.includes("ATTRIBUTION_ESTABLISHED_UNDER_T0");
  }) ?? null;
  const receiptItem = contentItems(receiptEntry?.record).find((item) => item.type === "text") ?? null;
  return {
    t1_pre_state: t1PreState ? summarizeTranscriptRecord(t1PreState, contentItems(t1PreState.record)[0]) : null,
    tool_use: toolUseEntry ? summarizeTranscriptRecord(toolUseEntry, toolUseItem) : null,
    tool_result: toolResultEntry ? summarizeTranscriptRecord(toolResultEntry, toolResultItem) : null,
    receipt_text: receiptEntry ? summarizeTranscriptRecord(receiptEntry, receiptItem) : null,
    t1_pre_state_content: t1PreState ? itemText(contentItems(t1PreState.record)[0]) : null,
    tool_use_command: toolUseItem?.input?.command ?? null,
    tool_result_content: toolResultItem?.content ?? null,
    receipt_text_content: receiptItem?.text ?? null
  };
}

function parseObservationOutput(output) {
  const text = String(output ?? "");
  const valueAfterLabel = (label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };
  const bytes = valueAfterLabel("observed_body_bytes");
  return {
    recontact_ok: text.includes("RECONTACT_OK"),
    observer: valueAfterLabel("observer"),
    comment_id: valueAfterLabel("comment_id"),
    node_id: valueAfterLabel("node_id"),
    author_login: valueAfterLabel("author(login)"),
    created_at: valueAfterLabel("created_at"),
    observed_body_bytes: bytes ? Number(bytes) : null,
    observed_content_identity: valueAfterLabel("observed_content_identity (independently computed at this endpoint)"),
    recontact_time_utc: valueAfterLabel("recontact_time_utc"),
    first_line: valueAfterLabel("first_line"),
    contains_route_adjudication_probe_marker: valueAfterLabel("contains ROUTE_ADJUDICATION_PROBE marker") === "True"
  };
}

function readPatientZeroMatter(patientZeroJsonPath) {
  const resolvedPath = path.resolve(patientZeroJsonPath);
  const json = readJsonFile(resolvedPath);
  const body = String(json.body ?? "");
  const bodyBytes = Buffer.from(body, "utf8");
  return {
    source_locator: resolvedPath,
    source_identity: contentIdentityForFile(resolvedPath),
    matter_species: "GITHUB_ISSUE_COMMENT",
    matter_ref: String(json.id ?? ""),
    api_url: json.url ?? null,
    html_url: json.html_url ?? null,
    issue_url: json.issue_url ?? null,
    comment_id: json.id ?? null,
    node_id: json.node_id ?? null,
    author_login: json.user?.login ?? null,
    author_association: json.author_association ?? null,
    created_at: json.created_at ?? null,
    updated_at: json.updated_at ?? null,
    body,
    body_byte_count: bodyBytes.length,
    body_content_identity: contentIdentityForBuffer(bodyBytes),
    first_line: body.split("\n")[0] ?? ""
  };
}

function extractPreR4T2Section(preR4ReportPath) {
  if (!preR4ReportPath || !fs.existsSync(path.resolve(preR4ReportPath))) return null;
  const text = fs.readFileSync(path.resolve(preR4ReportPath), "utf8");
  const start = text.indexOf("## T2_RECONTACT");
  if (start === -1) return null;
  const next = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, next === -1 ? text.length : next).trim();
  return {
    source_locator: path.resolve(preR4ReportPath),
    source_identity: contentIdentityForFile(preR4ReportPath),
    section_identity: `sha256:${sha256Buffer(Buffer.from(section, "utf8"))}`,
    section_text: section
  };
}

export function extractBoundedT2Evidence({
  sessionFilePath = DEFAULT_CLAUDE_SESSION_FILE,
  patientZeroJsonPath = DEFAULT_PATIENT_ZERO_T2_JSON,
  preR4ReportPath = DEFAULT_PRE_R4_REPORT
} = {}) {
  const sessionResolved = path.resolve(sessionFilePath);
  const records = parseClaudeJsonl(sessionResolved);
  const transcript = findT2TranscriptRecords(records);
  const patientZeroMatter = readPatientZeroMatter(patientZeroJsonPath);
  const observationOutput = parseObservationOutput(transcript.tool_result_content);
  const preR4T2Section = extractPreR4T2Section(preR4ReportPath);
  const evidence = {
    schema: T2_PREDECESSOR_BINDING_SCHEMA,
    object_type: "BOUNDED_EXTERNAL_T2_PREDECESSOR_EVIDENCE",
    evidence_id: "T2_PATIENT_ZERO_RECONTACT_219be5a6_5464975482_V0",
    source_locator: {
      claude_session_file: sessionResolved,
      patient_zero_json: patientZeroMatter.source_locator,
      pre_r4_report: preR4T2Section?.source_locator ?? null
    },
    source_identity: {
      claude_session_file: contentIdentityForFile(sessionResolved),
      patient_zero_json: patientZeroMatter.source_identity,
      pre_r4_report: preR4T2Section?.source_identity ?? null
    },
    source_range_or_exact_extraction_rule: {
      extraction_species: "BOUNDED_T2_PATIENT_ZERO_OBSERVATION_PREIMAGE",
      raw_provider_session_file_copied: false,
      claude_jsonl_records: [
        transcript.t1_pre_state,
        transcript.tool_use,
        transcript.tool_result,
        transcript.receipt_text
      ].filter(Boolean).map((entry) => ({
        line_number: entry.line_number,
        uuid: entry.uuid,
        parent_uuid: entry.parent_uuid,
        session_id: entry.session_id,
        content_type: entry.content_type,
        tool_use_id: entry.tool_use_id,
        text_identity: entry.text_identity
      })),
      patient_zero_json_fields: [
        "url",
        "html_url",
        "issue_url",
        "id",
        "node_id",
        "user.login",
        "author_association",
        "created_at",
        "updated_at",
        "body"
      ],
      pre_r4_report_section: preR4T2Section ? "## T2_RECONTACT" : null
    },
    provenance: {
      source_species: "EXTERNAL_CLAUDE_SESSION_FILE_PLUS_SCRATCHPAD_JSON",
      extracted_by: "CODEXSELF",
      extraction_not_promotion: true,
      summary_not_source_preimage: true,
      external_session_context_not_ourself_observation: true,
      patient_zero_reobservation_performed_in_this_phase: false
    },
    interpretation_context: {
      launch_target: LAUNCH_TARGET,
      launch_subject_identity: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
      patient_zero_matter_ref: PATIENT_ZERO_MATTER_REF,
      participation_ref: PARTICIPATION_REF,
      t2_predecessor_not_launch_authority: true,
      retrospective_binding_not_retroactive_authorship: true
    },
    role: "BOUNDED_EXTERNAL_T2_OBSERVATION_PREIMAGE",
    transcript_evidence: {
      ...transcript,
      tool_use_command_identity: transcript.tool_use_command
        ? `sha256:${sha256Buffer(Buffer.from(transcript.tool_use_command, "utf8"))}`
        : null,
      tool_result_content_identity: transcript.tool_result_content
        ? `sha256:${sha256Buffer(Buffer.from(transcript.tool_result_content, "utf8"))}`
        : null,
      receipt_text_identity: transcript.receipt_text_content
        ? `sha256:${sha256Buffer(Buffer.from(transcript.receipt_text_content, "utf8"))}`
        : null
    },
    patient_zero_matter: patientZeroMatter,
    observation_output: observationOutput,
    pre_r4_t2_section: preR4T2Section,
    supports: [
      "T2_PATIENT_ZERO_BINDING",
      "T2_PARTICIPATION_BINDING",
      "T2_OBSERVATION_OCCURRENCE",
      "T2_STANDING_CEILING",
      "T2_RETROSPECTIVE_LAUNCH_SUBJECT_PREDECESSOR_BINDING"
    ],
    does_not_support: [
      "TRUTH_OF_PATIENT_ZERO_BODY",
      "AGREEMENT_WITH_PATIENT_ZERO_BODY",
      "LAUNCH_AUTHORITY",
      "G7_CONTEXT_PROVENANCE_CLOSURE",
      "R4_RECEIPT",
      "LAUNCH_READY"
    ],
    proof_jurisdiction: {
      observation_not_truth: true,
      observation_not_agreement: true,
      observation_not_authority: true,
      observation_not_effect: true,
      observation_not_launch_ready: true,
      no_evidence_crosses_proof_jurisdiction: true
    }
  };
  evidence.evidence_identity = digestObject(evidence);
  return evidence;
}

export function writeContentAddressedT2Evidence({
  rootDir,
  outputDir = DEFAULT_OUTPUT_DIR,
  evidence
}) {
  const serialized = stableJson(evidence);
  const contentIdentity = contentIdentityForBuffer(Buffer.from(serialized, "utf8"));
  const hex = contentIdentity.replace("sha256:", "");
  const relativePath = path.join(outputDir, `external-t2-predecessor-evidence.${hex}.json`);
  writeStableJsonFile(path.join(rootDir, relativePath), evidence);
  return {
    evidence,
    path: relativePath,
    content_identity: contentIdentity,
    custody_species: "CONTENT_ADDRESSED_LOCAL_FILE",
    custody_ref: `content-addressed-local-file:${relativePath}#${contentIdentity}`
  };
}

function parseContentAddressedRef(custodyRef, locator) {
  const match = custodyRef.match(/^content-addressed-local-file:(.+)#(sha256:[a-f0-9]{64})$/);
  return {
    relative_path: match ? match[1] : locator.replace("local-file:", ""),
    expected_identity: match ? match[2] : null
  };
}

export function recontactLaunchSubjectCustody({
  rootDir = process.cwd(),
  custodyCommit = DEFAULT_CUSTODY_COMMIT,
  expectedTree = DEFAULT_CUSTODY_TREE,
  manifestPath = DEFAULT_MANIFEST_PATH,
  custodyReceiptPath = DEFAULT_CUSTODY_RECEIPT_PATH,
  c2SessionEvidencePath = DEFAULT_C2_SESSION_EVIDENCE_PATH,
  expectedLaunchSubjectIdentity = DEFAULT_LAUNCH_SUBJECT_IDENTITY
} = {}) {
  const root = path.resolve(rootDir);
  const currentHead = git(root, ["rev-parse", "HEAD"]).trim();
  const committedTree = git(root, ["rev-parse", `${custodyCommit}^{tree}`]).trim();
  const manifest = readJsonFile(path.join(root, manifestPath));
  const custodyReceipt = readJsonFile(path.join(root, custodyReceiptPath));
  const c2SessionEvidence = readJsonFile(path.join(root, c2SessionEvidencePath));
  const manifestContentIdentity = contentIdentityForFile(path.join(root, manifestPath));
  const custodyReceiptContentIdentity = contentIdentityForFile(path.join(root, custodyReceiptPath));
  const custodyReceiptIdentity = digestObject(stripIdentityField(custodyReceipt, "receipt_identity"));

  const subjectClosureRecontact = manifest.entries.map((entry) => {
    if (entry.custody_ref.startsWith("git:blob:")) {
      const expectedObjectId = entry.custody_ref.replace("git:blob:", "");
      const relativePath = entry.locator.replace("git-worktree:", "");
      const resolvedObjectId = git(root, ["rev-parse", `${custodyCommit}:${relativePath}`]).trim();
      const resolvedBytes = git(root, ["cat-file", "-p", resolvedObjectId], "buffer");
      const resolvedIdentity = contentIdentityForBuffer(resolvedBytes);
      const pass = resolvedObjectId === expectedObjectId && resolvedIdentity === entry.content_identity;
      return {
        subject_entry_id: entry.subject_entry_id,
        locator: entry.locator,
        custody_species: entry.custody_species,
        custody_ref: entry.custody_ref,
        reachability_root: `git-commit:${custodyCommit}`,
        resolved_git_object_id: resolvedObjectId,
        expected_git_object_id: expectedObjectId,
        resolved_content_identity: resolvedIdentity,
        expected_content_identity: entry.content_identity,
        exact_bytes_resolved: resolvedIdentity === entry.content_identity,
        durable_recontactable: pass,
        passes: pass,
        failure_if_any: pass ? null : "GIT_COMMIT_RECONTACT_MISMATCH"
      };
    }
    if (entry.custody_species === "CONTENT_ADDRESSED_LOCAL_FILE") {
      const parsed = parseContentAddressedRef(entry.custody_ref, entry.locator);
      const resolvedIdentity = contentIdentityForFile(path.join(root, parsed.relative_path));
      const pass = resolvedIdentity === entry.content_identity && (
        !parsed.expected_identity || parsed.expected_identity === resolvedIdentity
      );
      return {
        subject_entry_id: entry.subject_entry_id,
        locator: entry.locator,
        custody_species: entry.custody_species,
        custody_ref: entry.custody_ref,
        reachability_root: entry.custody_ref,
        resolved_content_identity: resolvedIdentity,
        expected_content_identity: entry.content_identity,
        exact_bytes_resolved: resolvedIdentity === entry.content_identity,
        durable_recontactable: pass,
        passes: pass,
        failure_if_any: pass ? null : "CONTENT_ADDRESSED_RECONTACT_MISMATCH"
      };
    }
    return {
      subject_entry_id: entry.subject_entry_id,
      locator: entry.locator,
      custody_species: entry.custody_species,
      custody_ref: entry.custody_ref,
      reachability_root: null,
      resolved_content_identity: null,
      expected_content_identity: entry.content_identity,
      exact_bytes_resolved: false,
      durable_recontactable: false,
      passes: false,
      failure_if_any: "UNKNOWN_CUSTODY_SPECIES"
    };
  });

  const c3ManifestObjectId = git(root, ["rev-parse", `${custodyCommit}:${manifestPath}`]).trim();
  const c3ManifestBytes = git(root, ["cat-file", "-p", c3ManifestObjectId], "buffer");
  const c3ManifestRecontact = {
    path: manifestPath,
    custody_species: "GIT_COMMIT_PATH",
    reachability_root: `git-commit:${custodyCommit}`,
    git_object_id: c3ManifestObjectId,
    content_identity: contentIdentityForBuffer(c3ManifestBytes),
    expected_content_identity: manifestContentIdentity,
    passes: contentIdentityForBuffer(c3ManifestBytes) === manifestContentIdentity
  };
  const c4ReceiptObjectId = git(root, ["rev-parse", `${custodyCommit}:${custodyReceiptPath}`]).trim();
  const c4ReceiptBytes = git(root, ["cat-file", "-p", c4ReceiptObjectId], "buffer");
  const c4ReceiptRecontact = {
    path: custodyReceiptPath,
    custody_species: "GIT_COMMIT_PATH",
    reachability_root: `git-commit:${custodyCommit}`,
    git_object_id: c4ReceiptObjectId,
    content_identity: contentIdentityForBuffer(c4ReceiptBytes),
    expected_content_identity: custodyReceiptContentIdentity,
    receipt_identity: custodyReceiptIdentity,
    passes: contentIdentityForBuffer(c4ReceiptBytes) === custodyReceiptContentIdentity
  };

  const manifestEntriesPass = subjectClosureRecontact.every((entry) => entry.passes === true);
  const closurePass = manifestEntriesPass &&
    currentHead === custodyCommit &&
    committedTree === expectedTree &&
    c3ManifestRecontact.passes === true &&
    c4ReceiptRecontact.passes === true;
  const c2Entry = manifest.entries.find((entry) => entry.subject_entry_id === "C2:EXTERNAL_SESSION_CONTEXT") ?? null;
  const t2CandidateEntries = manifest.entries.filter((entry) => (
    entry.required_for ?? []
  ).includes("T2_REBIND_ATTEMPT"));
  const identityCandidates = {
    manifest_identity_plus_minimal_closure: digestObject({
      launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
      complete_custodied_object_closure: manifest.entries.map((entry) => ({
        subject_entry_id: entry.subject_entry_id,
        content_identity: entry.content_identity,
        custody_ref: entry.custody_ref
      }))
    }),
    manifest_identity_plus_commit_recontact: digestObject({
      launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
      subject_closure_recontact: subjectClosureRecontact
    }),
    custody_root_plus_manifest_and_receipt: digestObject({
      custody_commit: custodyCommit,
      custody_tree: committedTree,
      manifest_content_identity: manifestContentIdentity,
      custody_receipt_identity: custodyReceiptIdentity
    })
  };

  const result = {
    schema: T2_PREDECESSOR_BINDING_SCHEMA,
    object_type: "LAUNCH_SUBJECT_RECONTACT",
    launch_target: LAUNCH_TARGET,
    root_dir: root,
    current_head: currentHead,
    custody_commit: custodyCommit,
    custody_tree: committedTree,
    expected_tree: expectedTree,
    head_matches_custody_root: currentHead === custodyCommit,
    tree_matches_expected: committedTree === expectedTree,
    manifest_path: manifestPath,
    manifest_content_identity: manifestContentIdentity,
    launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
    custody_receipt_path: custodyReceiptPath,
    custody_receipt_content_identity: custodyReceiptContentIdentity,
    custody_receipt_identity: custodyReceiptIdentity,
    manifest_entries_count: manifest.entries.length,
    subject_closure_recontact: subjectClosureRecontact,
    c1_git_blob_reachability: {
      passed: subjectClosureRecontact.filter((entry) => entry.custody_ref.startsWith("git:blob:") && entry.passes).length,
      total: subjectClosureRecontact.filter((entry) => entry.custody_ref.startsWith("git:blob:")).length
    },
    c2_content_addressed_recontact: subjectClosureRecontact.find((entry) => entry.subject_entry_id === "C2:EXTERNAL_SESSION_CONTEXT") ?? null,
    c3_manifest_recontact: c3ManifestRecontact,
    c4_inselfaction_receipt_recontact: c4ReceiptRecontact,
    every_required_manifest_member_recontactable: manifestEntriesPass,
    subject_closure_recontact_pass: closurePass,
    launch_subject_custody: closurePass ? "ESTABLISHED" : "NOT_ESTABLISHED",
    launch_subject_identity: closurePass ? expectedLaunchSubjectIdentity : "NOT_ESTABLISHED",
    identity_source: "FOUNDER_SUPPLIED_C1B_PREDECESSOR_ID_RECONTACTED_AGAINST_CURRENT_CUSTODY_ROOT",
    identity_recomputation_candidates: identityCandidates,
    identity_recomputation_candidate_matches_expected: Object.values(identityCandidates).includes(expectedLaunchSubjectIdentity),
    manifest_links: {
      c2_external_session_context: c2Entry,
      c2_external_session_evidence: c2SessionEvidence,
      t2_candidate_predecessor_entries: t2CandidateEntries
    },
    failures: [
      ...(currentHead === custodyCommit ? [] : ["HEAD_NOT_AT_CUSTODY_COMMIT"]),
      ...(committedTree === expectedTree ? [] : ["CUSTODY_TREE_MISMATCH"]),
      ...subjectClosureRecontact.filter((entry) => entry.passes !== true).map((entry) => entry.failure_if_any),
      ...(c3ManifestRecontact.passes ? [] : ["C3_MANIFEST_RECONTACT_FAILED"]),
      ...(c4ReceiptRecontact.passes ? [] : ["C4_RECEIPT_RECONTACT_FAILED"])
    ].filter(Boolean)
  };
  result.recontact_identity = digestObject(result);
  return result;
}

function standingOf(condition) {
  return condition ? "ESTABLISHED" : "BLOCKED";
}

function bindingRecord({
  binding_id,
  question,
  proof_genus,
  source_matter,
  derivation,
  evidence,
  standing,
  ceiling
}) {
  const record = {
    binding_id,
    question,
    proof_genus,
    source_matter,
    derivation,
    evidence,
    standing,
    ceiling
  };
  record.binding_identity = digestObject(record);
  return record;
}

export function adjudicateT2RequiredBindings({
  launchSubjectRecontact,
  t2EvidenceCustody,
  launchSubjectIdentity = DEFAULT_LAUNCH_SUBJECT_IDENTITY
} = {}) {
  const evidence = t2EvidenceCustody?.evidence ?? t2EvidenceCustody;
  const pz = evidence?.patient_zero_matter ?? {};
  const output = evidence?.observation_output ?? {};
  const transcript = evidence?.transcript_evidence ?? {};
  const c2SessionEvidence = launchSubjectRecontact?.manifest_links?.c2_external_session_evidence ?? {};
  const c2Entry = launchSubjectRecontact?.manifest_links?.c2_external_session_context ?? {};
  const t2CandidateEntries = launchSubjectRecontact?.manifest_links?.t2_candidate_predecessor_entries ?? [];
  const markerFindings = c2SessionEvidence.marker_findings ?? [];
  const markerByName = new Map(markerFindings.map((entry) => [entry.marker, entry]));
  const sameSessionSource = c2SessionEvidence.source_identity === evidence?.source_identity?.claude_session_file;
  const markerCoversPatientZero = markerByName.get(PATIENT_ZERO_MATTER_REF)?.present === true;
  const markerCoversRouteProbe = markerByName.get("ROUTE_ADJUDICATION_PROBE")?.present === true;

  const subjectBindingEstablished =
    launchSubjectRecontact?.launch_subject_custody === "ESTABLISHED" &&
    launchSubjectRecontact?.launch_subject_identity === launchSubjectIdentity &&
    launchSubjectRecontact?.every_required_manifest_member_recontactable === true &&
    c2Entry?.subject_entry_id === "C2:EXTERNAL_SESSION_CONTEXT" &&
    sameSessionSource &&
    markerCoversPatientZero &&
    markerCoversRouteProbe &&
    t2CandidateEntries.length > 0;

  const patientZeroBindingEstablished =
    pz.matter_ref === PATIENT_ZERO_MATTER_REF &&
    pz.comment_id === Number(PATIENT_ZERO_MATTER_REF) &&
    pz.node_id === "IC_kwDOT3unqM8AAAABRbzoeg" &&
    pz.issue_url === "https://api.github.com/repos/situaedmilly/self-communication/issues/1" &&
    pz.body_content_identity === "sha256:9bbc97aa41d7566d522d51912078ab5e419fd4ec3ed47f3591ae84c337415d98" &&
    pz.body_byte_count === 133 &&
    pz.first_line === "ROUTE_ADJUDICATION_PROBE" &&
    output.comment_id === PATIENT_ZERO_MATTER_REF &&
    output.node_id === pz.node_id &&
    output.observed_content_identity === pz.body_content_identity &&
    output.observed_body_bytes === pz.body_byte_count;

  const toolUse = transcript.tool_use ?? {};
  const toolResult = transcript.tool_result ?? {};
  const t1PreState = transcript.t1_pre_state ?? {};
  const receiptText = transcript.receipt_text ?? {};
  const participationBindingEstablished =
    toolUse.session_id === CLAUDE_T2_SESSION_ID &&
    toolResult.session_id === CLAUDE_T2_SESSION_ID &&
    t1PreState.session_id === CLAUDE_T2_SESSION_ID &&
    receiptText.session_id === CLAUDE_T2_SESSION_ID &&
    toolUse.is_sidechain === false &&
    toolResult.is_sidechain === false &&
    t1PreState.is_sidechain === false &&
    receiptText.is_sidechain === false &&
    toolResult.parent_uuid === toolUse.uuid &&
    toolResult.source_tool_assistant_uuid === toolUse.uuid &&
    toolResult.tool_use_id === toolUse.tool_use_id &&
    transcript.t1_pre_state_content?.includes("PZ obs count: 0") === true &&
    transcript.t1_pre_state_content?.includes("claude PZ count: 0") === true &&
    transcript.t1_pre_state_content?.includes("T1 final: PASS") === true &&
    transcript.t1_pre_state_content?.includes("T1.5 final: PASS") === true &&
    transcript.tool_result_content?.includes("RECONTACT_OK") === true &&
    transcript.tool_use_command?.includes("gh api repos/situaedmilly/self-communication/issues/comments/5464975482") &&
    transcript.tool_use_command?.includes("pz_t2.json") &&
    transcript.receipt_text_content?.includes("PATIENT_ZERO_PRE_STATE") &&
    transcript.receipt_text_content?.includes("PATIENT_ZERO_POST_STATE");

  const observationOccurrenceEstablished =
    output.recontact_ok === true &&
    output.observer?.includes("PO_interactive") === true &&
    output.observer?.includes("CLAUDESELF_CHAMBER_219be5a6") === true &&
    output.comment_id === PATIENT_ZERO_MATTER_REF &&
    output.node_id === pz.node_id &&
    output.author_login === pz.author_login &&
    output.created_at === pz.created_at &&
    output.observed_content_identity === pz.body_content_identity &&
    output.first_line === "ROUTE_ADJUDICATION_PROBE" &&
    output.contains_route_adjudication_probe_marker === true &&
    Boolean(output.recontact_time_utc);

  const normalizedReceiptText = String(transcript.receipt_text_content ?? "")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const standingCeilingEstablished =
    normalizedReceiptText.includes("attribution_established_under_t0") &&
    normalizedReceiptText.includes("observation only") &&
    normalizedReceiptText.includes("not truth") &&
    normalizedReceiptText.includes("not agreement") &&
    normalizedReceiptText.includes("not authority") &&
    normalizedReceiptText.includes("not effect") &&
    normalizedReceiptText.includes("not launch readiness") &&
    evidence?.proof_jurisdiction?.observation_not_launch_ready === true &&
    T0_ATTRIBUTION_CONTRACT.maximum_standing === "ATTRIBUTION_ESTABLISHED_UNDER_T0";

  const bindings = {
    T2_SUBJECT_BINDING: bindingRecord({
      binding_id: "T2_SUBJECT_BINDING",
      question: `Why is historical T2 relevant predecessor Matter for ${launchSubjectIdentity}?`,
      proof_genus: "BINDING",
      source_matter: [
        {
          species: "HISTORICAL_T2_MATTER",
          evidence_id: evidence?.evidence_id,
          evidence_identity: evidence?.evidence_identity,
          custody_ref: t2EvidenceCustody?.custody_ref ?? null
        },
        {
          species: "C2_MANIFEST_ENTRY",
          subject_entry_id: c2Entry?.subject_entry_id ?? null,
          content_identity: c2Entry?.content_identity ?? null,
          source_identity: c2SessionEvidence.source_identity ?? null
        },
        {
          species: "C3_LAUNCH_SUBJECT_MANIFEST",
          manifest_identity: launchSubjectRecontact?.launch_subject_manifest_identity ?? null,
          manifest_path: launchSubjectRecontact?.manifest_path ?? null
        },
        {
          species: "CUSTODY_ROOT",
          commit: launchSubjectRecontact?.custody_commit ?? null,
          tree: launchSubjectRecontact?.custody_tree ?? null
        }
      ],
      derivation: {
        retrospective_binding_not_retroactive_authorship: true,
        historical_t2_source_session_identity: evidence?.source_identity?.claude_session_file ?? null,
        c2_manifest_source_identity: c2SessionEvidence.source_identity ?? null,
        same_session_source: sameSessionSource,
        c2_marker_covers_patient_zero: markerCoversPatientZero,
        c2_marker_covers_route_probe: markerCoversRouteProbe,
        t2_candidate_entries_in_launch_subject_manifest: t2CandidateEntries.map((entry) => entry.subject_entry_id),
        launch_subject_recontact_pass: launchSubjectRecontact?.subject_closure_recontact_pass === true
      },
      evidence: [
        "T2 evidence source identity equals the custodied C2 external-session evidence source identity.",
        "C2 marker census records Patient Zero and route probe markers in the launch subject manifest closure.",
        "C3 launch subject manifest includes the T2 candidate predecessor source Matter entries.",
        "Current custody root recontact resolves every required manifest member."
      ],
      standing: standingOf(subjectBindingEstablished),
      ceiling: "RETROSPECTIVE_PREDECESSOR_RELEVANCE_ONLY_NOT_RETROACTIVE_AUTHORSHIP"
    }),
    T2_PATIENT_ZERO_BINDING: bindingRecord({
      binding_id: "T2_PATIENT_ZERO_BINDING",
      question: "Did T2 target exact GitHub Matter 5464975482?",
      proof_genus: "DETERMINATION",
      source_matter: [
        {
          species: "PATIENT_ZERO_GITHUB_COMMENT_JSON",
          source_locator: pz.source_locator ?? null,
          source_identity: pz.source_identity ?? null
        },
        {
          species: "CLAUDE_T2_TOOL_RESULT",
          line_number: toolResult.line_number ?? null,
          text_identity: toolResult.text_identity ?? null
        }
      ],
      derivation: {
        comment_id_matches: pz.comment_id === Number(PATIENT_ZERO_MATTER_REF),
        node_id_matches_expected: pz.node_id === "IC_kwDOT3unqM8AAAABRbzoeg",
        body_identity_matches_tool_output: pz.body_content_identity === output.observed_content_identity,
        byte_count_matches_tool_output: pz.body_byte_count === output.observed_body_bytes,
        first_line_matches: pz.first_line === output.first_line
      },
      evidence: {
        matter_ref: pz.matter_ref,
        node_id: pz.node_id,
        body_content_identity: pz.body_content_identity,
        body_byte_count: pz.body_byte_count,
        first_line: pz.first_line
      },
      standing: standingOf(patientZeroBindingEstablished),
      ceiling: "EXACT_BOUNDED_MATTER_IDENTITY_ONLY"
    }),
    T2_PARTICIPATION_BINDING: bindingRecord({
      binding_id: "T2_PARTICIPATION_BINDING",
      question: "Was T2 performed by the exact interactive Claude participation whose Patient Zero standing remained false through T1/T1.5?",
      proof_genus: "BINDING",
      source_matter: [
        { species: "T1_T1_5_PRE_STATE_TOOL_RESULT", line_number: t1PreState.line_number ?? null, uuid: t1PreState.uuid ?? null },
        { species: "T2_TOOL_USE", line_number: toolUse.line_number ?? null, uuid: toolUse.uuid ?? null, tool_use_id: toolUse.tool_use_id ?? null },
        { species: "T2_TOOL_RESULT", line_number: toolResult.line_number ?? null, uuid: toolResult.uuid ?? null, parent_uuid: toolResult.parent_uuid ?? null },
        { species: "T2_RECEIPT_TEXT", line_number: receiptText.line_number ?? null, uuid: receiptText.uuid ?? null }
      ],
      derivation: {
        self_continuity_not_session_not_occurrence_not_participation: true,
        same_provider_session_id: [
          t1PreState.session_id,
          toolUse.session_id,
          toolResult.session_id,
          receiptText.session_id
        ].every((sessionId) => sessionId === CLAUDE_T2_SESSION_ID),
        no_sidechain_records: [t1PreState, toolUse, toolResult, receiptText].every((entry) => entry.is_sidechain === false),
        tool_result_parent_binds_tool_use: toolResult.parent_uuid === toolUse.uuid,
        tool_result_source_assistant_binds_tool_use: toolResult.source_tool_assistant_uuid === toolUse.uuid,
        tool_result_id_binds_tool_use_id: toolResult.tool_use_id === toolUse.tool_use_id,
        t1_t15_false_predecessor_present: transcript.t1_pre_state?.text_identity !== null,
        receipt_names_pre_and_post_state: transcript.receipt_text_content?.includes("PATIENT_ZERO_PRE_STATE") === true &&
          transcript.receipt_text_content?.includes("PATIENT_ZERO_POST_STATE") === true,
        sibling_resume_fork_not_satisfied_without_same_uuid_chain: true
      },
      evidence: {
        provider_session_id: CLAUDE_T2_SESSION_ID,
        participation_ref: PARTICIPATION_REF,
        occurrence_label: "PO_interactive",
        tool_use_uuid: toolUse.uuid ?? null,
        tool_result_parent_uuid: toolResult.parent_uuid ?? null,
        tool_result_source_tool_assistant_uuid: toolResult.source_tool_assistant_uuid ?? null
      },
      standing: standingOf(participationBindingEstablished),
      ceiling: "PROVIDER_TRANSCRIPT_PARTICIPATION_BINDING_UNDER_T0_NOT_UNIVERSAL_IDENTITY_PROOF"
    }),
    T2_OBSERVATION_OCCURRENCE: bindingRecord({
      binding_id: "T2_OBSERVATION_OCCURRENCE",
      question: "Did an actual fresh T2 observation occurrence happen?",
      proof_genus: "OBSERVATION",
      source_matter: [
        { species: "BASH_TOOL_USE", line_number: toolUse.line_number ?? null, tool_use_id: toolUse.tool_use_id ?? null },
        { species: "BASH_TOOL_RESULT", line_number: toolResult.line_number ?? null, tool_use_id: toolResult.tool_use_id ?? null },
        { species: "PATIENT_ZERO_JSON", source_identity: pz.source_identity ?? null }
      ],
      derivation: {
        occurrence_birth: "PROVIDER_TRANSCRIPT_TOOL_USE_RECORD",
        participation_binding: participationBindingEstablished ? "ESTABLISHED" : "BLOCKED",
        registered_key: "MODEL_MECHANISM_REPORTED_IN_T2_RECEIPT_WITH_T0_CEILING",
        observation_capability: "gh api under shared principal as recorded by tool result",
        observation_grant: "Founder GOCHECKIT act in historical T2 transcript",
        gocheckit_act: transcript.tool_use_command?.includes("gh api repos/situaedmilly/self-communication/issues/comments/5464975482") === true,
        observation_occurrence: output.recontact_ok === true,
        observation_evidence: output.observed_content_identity === pz.body_content_identity
      },
      evidence: {
        recontact_ok: output.recontact_ok,
        observer: output.observer,
        comment_id: output.comment_id,
        node_id: output.node_id,
        recontact_time_utc: output.recontact_time_utc,
        observed_content_identity: output.observed_content_identity
      },
      standing: standingOf(observationOccurrenceEstablished),
      ceiling: T0_ATTRIBUTION_CONTRACT.maximum_standing
    }),
    T2_STANDING_CEILING: bindingRecord({
      binding_id: "T2_STANDING_CEILING",
      question: "What maximum standing does T2 earn?",
      proof_genus: "OBSERVATION",
      source_matter: [
        { species: "T2_RECEIPT_TEXT", line_number: receiptText.line_number ?? null, text_identity: receiptText.text_identity ?? null },
        { species: "T0_ATTRIBUTION_CONTRACT", ref: T0_ATTRIBUTION_CONTRACT.ref }
      ],
      derivation: {
        observation_not_truth: evidence?.proof_jurisdiction?.observation_not_truth === true,
        observation_not_agreement: evidence?.proof_jurisdiction?.observation_not_agreement === true,
        observation_not_authority: evidence?.proof_jurisdiction?.observation_not_authority === true,
        observation_not_effect: evidence?.proof_jurisdiction?.observation_not_effect === true,
        observation_not_launch_ready: evidence?.proof_jurisdiction?.observation_not_launch_ready === true,
        t0_does_not_exclude: T0_ATTRIBUTION_CONTRACT.does_not_exclude
      },
      evidence: {
        maximum_standing: T0_ATTRIBUTION_CONTRACT.maximum_standing,
        launch_gate_ceiling: T2_BOUNDING_CEILING,
        receipt_ceiling_text_present: transcript.receipt_text_content?.includes("STANDING_CEILING") === true
      },
      standing: standingOf(standingCeilingEstablished),
      ceiling: T2_BOUNDING_CEILING
    })
  };
  const result = {
    schema: T2_PREDECESSOR_BINDING_SCHEMA,
    object_type: "T2_REQUIRED_BINDINGS_ADJUDICATION",
    launch_target: LAUNCH_TARGET,
    launch_subject_identity: launchSubjectIdentity,
    bindings,
    binding_standings: Object.fromEntries(
      Object.entries(bindings).map(([key, value]) => [key, value.standing])
    ),
    all_required_bindings_established: Object.values(bindings).every((entry) => entry.standing === "ESTABLISHED"),
    no_manual_pass_injection: true
  };
  result.bindings_identity = digestObject(result);
  return result;
}

export function buildT2PredecessorReceiptFromBindings({
  bindingsAdjudication,
  t2EvidenceCustody,
  launchSubjectIdentity = DEFAULT_LAUNCH_SUBJECT_IDENTITY
} = {}) {
  const standings = bindingsAdjudication?.binding_standings ?? {};
  const allEstablished = bindingsAdjudication?.all_required_bindings_established === true;
  const receipt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T2_PREDECESSOR_RECEIPT_MECHANICAL_BINDING",
    receipt_exists: true,
    subject_binding: standings.T2_SUBJECT_BINDING === "ESTABLISHED" ? LAUNCH_TARGET : "NOT_BOUND",
    subject_identity_binding: standings.T2_SUBJECT_BINDING === "ESTABLISHED" ? launchSubjectIdentity : "NOT_BOUND",
    patient_zero_binding: standings.T2_PATIENT_ZERO_BINDING === "ESTABLISHED" ? PATIENT_ZERO_MATTER_REF : "NOT_BOUND",
    participation_binding: standings.T2_PARTICIPATION_BINDING === "ESTABLISHED" ? PARTICIPATION_REF : "NOT_BOUND",
    participation_occurrence_binding: standings.T2_PARTICIPATION_BINDING === "ESTABLISHED"
      ? "PO_interactive:CLAUDESELF_CHAMBER_219be5a6"
      : "NOT_BOUND",
    observation_occurrence: standings.T2_OBSERVATION_OCCURRENCE === "ESTABLISHED" ? "ESTABLISHED" : "NOT_ESTABLISHED",
    standing_ceiling: standings.T2_STANDING_CEILING === "ESTABLISHED" ? T2_BOUNDING_CEILING : "UNESTABLISHED",
    required_binding_standings: standings,
    bindings_identity: bindingsAdjudication?.bindings_identity ?? null,
    t2_evidence_identity: t2EvidenceCustody?.evidence?.evidence_identity ?? null,
    t2_evidence_custody_ref: t2EvidenceCustody?.custody_ref ?? null,
    t2_not_truth_authority_effect_or_launch_readiness: true,
    no_manual_pass_injection: true,
    final_standing: allEstablished
      ? "T2_MECHANICAL_BINDINGS_ESTABLISHED"
      : "T2_MECHANICAL_BINDINGS_BLOCKED"
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

function launchGateVector(launchReadinessReport) {
  return Object.fromEntries(Object.entries(launchReadinessReport.gates ?? {}).map(([gateRef, gate]) => [gateRef, {
    gate_id: gate.gate_id,
    standing: gate.standing,
    control_disposition: gate.control_disposition,
    evidence_ref: gate.evidence_ref,
    raw_standing: gate.raw_standing ?? null
  }]));
}

function buildFreezeEligibility({ launchSubjectRecontact, launchReadinessReport }) {
  const t2Gate = launchReadinessReport.t2_gate_result;
  const g6 = launchReadinessReport.g6_current_standing_result;
  const predicates = {
    T2_CAUSAL_MATTER_PREDECESSOR_PASS:
      t2Gate?.final_standing === "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED",
    G6_CURRENT_PROJECTION_NON_BLOCKING:
      g6?.current_standing === "CURRENT_G6_LATER_OBSERVATION_ESTABLISHED" &&
      g6?.control_disposition === LAUNCH_CONTROL_DISPOSITIONS.SATISFIED,
    LAUNCH_SUBJECT_IDENTITY_RECONTACTABLE:
      launchSubjectRecontact?.launch_subject_identity === DEFAULT_LAUNCH_SUBJECT_IDENTITY &&
      launchSubjectRecontact?.launch_subject_custody === "ESTABLISHED",
    CUSTODY_CLOSURE_PASS:
      launchSubjectRecontact?.subject_closure_recontact_pass === true,
    G7_NAMING_ROUTING_CLOSED:
      launchReadinessReport.g7_homonym_map?.final_standing === "G7_ROUTING_AMBIGUITY_CLOSED_BY_FOUNDER",
    G5_INSTRUMENTATION_EVIDENCE_SENSITIVE:
      launchReadinessReport.g5_instrument_result?.final_standing === "G5_BLOCKED" &&
      launchReadinessReport.g5_instrument_result?.errors?.includes("NO_VALID_R4_RECEIPT") &&
      !launchReadinessReport.g5_instrument_result?.errors?.includes("LAUNCH_SUBJECT_IDENTITY_MISSING"),
    BLOCKER_SEMANTICS_TYPED:
      launchReadinessReport.blocker_semantics_result?.final_standing === "BLOCKER_SEMANTICS_TYPED_CONTROL_ESTABLISHED",
    LAUNCH_DECISION_SENSITIVITY_PASS:
      launchReadinessReport.launch_decision_sensitivity_tests?.every((entry) => entry.discriminated) === true
  };
  return {
    predicates,
    failing_predicates: Object.entries(predicates)
      .filter(([, value]) => value !== true)
      .map(([key]) => key),
    new_freeze: Object.values(predicates).every(Boolean) ? "MINTED" : "NOT_MINTED"
  };
}

export function buildCustodiedLaunchSubjectFreeze({
  launchSubjectRecontact,
  launchReadinessReport,
  t2PredecessorReceipt,
  freezeEligibility = buildFreezeEligibility({ launchSubjectRecontact, launchReadinessReport })
} = {}) {
  if (freezeEligibility.new_freeze !== "MINTED") {
    return {
      new_freeze: "NOT_MINTED",
      new_freeze_identity: "NOT_MINTED",
      freeze_eligibility: freezeEligibility,
      freeze: null
    };
  }
  const freeze = {
    schema: T2_PREDECESSOR_BINDING_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_CUSTODIED_LAUNCH_SUBJECT_FREEZE",
    artifact_status: "FROZEN_SUBJECT_BEFORE_G7_R4_NOT_LAUNCH",
    launch_target: LAUNCH_TARGET,
    launch_subject_identity: launchSubjectRecontact.launch_subject_identity,
    custody_root: {
      git_commit: launchSubjectRecontact.custody_commit,
      commit_tree: launchSubjectRecontact.custody_tree,
      manifest_identity: launchSubjectRecontact.launch_subject_manifest_identity,
      custody_receipt_identity: launchSubjectRecontact.custody_receipt_identity
    },
    t2_predecessor_identity: launchReadinessReport.t2_gate_result.result_identity,
    t2_predecessor_receipt_identity: t2PredecessorReceipt.receipt_identity,
    current_gate_vector: launchGateVector(launchReadinessReport),
    launch_instrument_identity: contentIdentityForFile(path.join(
      launchSubjectRecontact.root_dir,
      "tools/ourself-selfcommunication-launch-readiness.mjs"
    )),
    launch_readiness_report_identity: launchReadinessReport.report_identity,
    current_launch_standing: "NO_LAUNCH",
    freeze_law: {
      freeze_not_launch: true,
      freeze_not_g7_execution: true,
      freeze_not_r4_execution: true,
      freeze_not_push: true,
      display_labels_have_zero_control_authority: true
    }
  };
  freeze.freeze_identity = digestObject(freeze);
  return {
    new_freeze: "MINTED",
    new_freeze_identity: freeze.freeze_identity,
    freeze_eligibility: freezeEligibility,
    freeze
  };
}

export function buildT2PredecessorBindingReport({
  rootDir = process.cwd(),
  sessionFilePath = DEFAULT_CLAUDE_SESSION_FILE,
  patientZeroJsonPath = DEFAULT_PATIENT_ZERO_T2_JSON,
  preR4ReportPath = DEFAULT_PRE_R4_REPORT,
  outputDir = DEFAULT_OUTPUT_DIR,
  reportPath = DEFAULT_REPORT_PATH,
  freezePath = DEFAULT_FREEZE_PATH,
  writeArtifacts = true
} = {}) {
  const root = path.resolve(rootDir);
  const launchSubjectRecontact = recontactLaunchSubjectCustody({ rootDir: root });
  const boundedEvidence = extractBoundedT2Evidence({ sessionFilePath, patientZeroJsonPath, preR4ReportPath });
  const t2EvidenceCustody = writeArtifacts
    ? writeContentAddressedT2Evidence({ rootDir: root, outputDir, evidence: boundedEvidence })
    : {
      evidence: boundedEvidence,
      path: "NOT_WRITTEN",
      content_identity: contentIdentityForBuffer(Buffer.from(stableJson(boundedEvidence), "utf8")),
      custody_species: "CONTENT_ADDRESSED_LOCAL_FILE_NOT_WRITTEN",
      custody_ref: "NOT_WRITTEN"
    };
  const bindingsAdjudication = adjudicateT2RequiredBindings({
    launchSubjectRecontact,
    t2EvidenceCustody,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });
  const t2PredecessorReceipt = buildT2PredecessorReceiptFromBindings({
    bindingsAdjudication,
    t2EvidenceCustody,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });
  const launchReadinessReport = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence: launchSubjectRecontact.manifest_links.c2_external_session_evidence,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    t2Receipt: t2PredecessorReceipt
  });
  const t2PredecessorResult = adjudicateT2Predecessor({
    t2Receipt: t2PredecessorReceipt,
    launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
  });
  const freeze = buildCustodiedLaunchSubjectFreeze({
    launchSubjectRecontact,
    launchReadinessReport,
    t2PredecessorReceipt
  });
  if (writeArtifacts && freeze.freeze) {
    writeStableJsonFile(path.join(root, freezePath), freeze.freeze);
  }

  const report = {
    schema: T2_PREDECESSOR_BINDING_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_T2_PREDECESSOR_BINDING_REPORT",
    destination: "GPTSELF_CURRENT",
    launch_target: LAUNCH_TARGET,
    launch_subject_recontact: launchSubjectRecontact,
    t2_source_matter: {
      evidence_id: boundedEvidence.evidence_id,
      evidence_identity: boundedEvidence.evidence_identity,
      content_identity: t2EvidenceCustody.content_identity,
      custody_species: t2EvidenceCustody.custody_species,
      custody_ref: t2EvidenceCustody.custody_ref,
      source_locator: boundedEvidence.source_locator,
      source_identity: boundedEvidence.source_identity,
      source_range_or_exact_extraction_rule: boundedEvidence.source_range_or_exact_extraction_rule,
      supports: boundedEvidence.supports,
      does_not_support: boundedEvidence.does_not_support
    },
    t2_subject_binding: bindingsAdjudication.bindings.T2_SUBJECT_BINDING,
    t2_patient_zero_binding: bindingsAdjudication.bindings.T2_PATIENT_ZERO_BINDING,
    t2_participation_binding: bindingsAdjudication.bindings.T2_PARTICIPATION_BINDING,
    t2_observation_occurrence: bindingsAdjudication.bindings.T2_OBSERVATION_OCCURRENCE,
    t2_standing_ceiling: bindingsAdjudication.bindings.T2_STANDING_CEILING,
    t2_predecessor_receipt: t2PredecessorReceipt,
    t2_predecessor_result: t2PredecessorResult,
    g6_historical_standing: launchReadinessReport.g6_historical_standing,
    g6_current_standing: launchReadinessReport.g6_current_standing_result.current_standing,
    launch_gate_vector: launchGateVector(launchReadinessReport),
    launch_decision: launchReadinessReport.launch_decision,
    launch_blockers: launchReadinessReport.launch_blockers,
    new_freeze: freeze.new_freeze,
    new_freeze_identity: freeze.new_freeze_identity,
    new_freeze_path: freeze.freeze ? freezePath : null,
    freeze_eligibility: freeze.freeze_eligibility,
    g7_eligibility: freeze.new_freeze === "MINTED"
      ? "G7_CONTEXT_PROVENANCE_CLOSURE_ELIGIBLE"
      : "FALSE_NO_FREEZE",
    r4_eligibility: false,
    files_changed: [
      "tools/ourself-selfcommunication-launch-readiness.mjs",
      "tools/ourself-selfcommunication-t2-predecessor-binding.mjs",
      "test/ourself-selfcommunication-t2-predecessor-binding.test.mjs",
      "package.json",
      t2EvidenceCustody.path,
      reportPath,
      ...(freeze.freeze ? [freezePath] : [])
    ],
    test_results: [],
    blockers: [
      ...freeze.freeze_eligibility.failing_predicates,
      ...launchReadinessReport.launch_blockers.map((entry) => `${entry.gate_ref}:${entry.blocker_reason}`)
    ],
    residue: [
      "T2 is established only as an observation/load-bearing predecessor, not truth, agreement, authority, effect, or launch readiness.",
      "T0 ceiling still does not exclude privileged same-host compromise, provider-internal rewrite, or OS-level transcript/process tampering.",
      "New T2 evidence and freeze artifacts are local worktree Matter until separately committed; no commit or push was authorized in this phase.",
      "G7 context-provenance closure was not executed. R4 remains false until G7 closes under the new frozen subject."
    ],
    next_required_seat: freeze.new_freeze === "MINTED"
      ? "G7_CONTEXT_PROVENANCE_CLOSURE_SEAT_FOR_NEW_FROZEN_SUBJECT"
      : "T2_PREDECESSOR_BINDING_REPAIR_SEAT",
    current_launch_standing: "NO_LAUNCH"
  };
  report.report_identity = digestObject(report);
  if (writeArtifacts) {
    writeStableJsonFile(path.join(root, reportPath), report);
  }
  return report;
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const sessionFilePath = valueAfter(process.argv, "--claude-session-file") ?? DEFAULT_CLAUDE_SESSION_FILE;
  const patientZeroJsonPath = valueAfter(process.argv, "--patient-zero-json") ?? DEFAULT_PATIENT_ZERO_T2_JSON;
  const preR4ReportPath = valueAfter(process.argv, "--pre-r4-report") ?? DEFAULT_PRE_R4_REPORT;
  const outputDir = valueAfter(process.argv, "--out-dir") ?? DEFAULT_OUTPUT_DIR;
  const reportPath = valueAfter(process.argv, "--out") ?? DEFAULT_REPORT_PATH;
  const freezePath = valueAfter(process.argv, "--freeze") ?? DEFAULT_FREEZE_PATH;
  const writeArtifacts = !hasFlag(process.argv, "--no-write");
  const report = buildT2PredecessorBindingReport({
    rootDir,
    sessionFilePath,
    patientZeroJsonPath,
    preR4ReportPath,
    outputDir,
    reportPath,
    freezePath,
    writeArtifacts
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
