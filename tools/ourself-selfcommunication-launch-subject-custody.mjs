#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSelfcommunicationLaunchReadinessReport,
  LAUNCH_CONTROL_DISPOSITIONS
} from "./ourself-selfcommunication-launch-readiness.mjs";
import { digestObject } from "./ourself-communication-matter.mjs";

export const LAUNCH_SUBJECT_CUSTODY_SCHEMA = "ourself.selfcommunication-launch-subject-custody.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_EXTERNAL_SESSION_FILE =
  "/Users/millysituated/.claude/projects/-Users-millysituated/219be5a6-1b6a-4212-90e2-2963de17b926.jsonl";
export const DEFAULT_OUTPUT_DIR = "specimens/selfcommunication-launch-subject-custody-v0-001";
export const DEFAULT_LAUNCH_READINESS_REPORT_PATH = "specimens/selfcommunication-launch-readiness-001.report.json";
export const DEFAULT_MANIFEST_PATH = `${DEFAULT_OUTPUT_DIR}/launch-subject-manifest.json`;
export const DEFAULT_RECEIPT_PATH = "inselfactions/ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001.json";
export const EXTERNAL_SESSION_MARKERS = ["5464975482", "ROUTE_ADJUDICATION_PROBE"];

export const REPOSITORY_NATIVE_REQUIRED_ENTRIES = [
  {
    path: "README.md",
    role: "BOOTSTRAP_PROJECTION_VALIDATION_SURFACE",
    required_for: ["BOOTSTRAP_RECONTACT", "VALIDATION_REPRODUCTION"],
    supports: ["CONTROLLING_REPOSITORY_BOOT_POINTERS"],
    does_not_support: ["LAUNCH_AUTHORITY", "CANONICAL_SCHEMA_PROMOTION"]
  },
  {
    path: "AGENTS.md",
    role: "CODEXSELF_BOOT_ORIENTATION",
    required_for: ["APPLICABLE_LAW_RECONTACT"],
    supports: ["CODEXSELF_BOOT_NON_COLLAPSE_LAW"],
    does_not_support: ["LAUNCH_AUTHORITY"]
  },
  {
    path: "CLAUDE.md",
    role: "CLAUDESELF_BOOT_ORIENTATION",
    required_for: ["APPLICABLE_LAW_RECONTACT", "CLAUDESELF_BOUNDARY_RECONTACT"],
    supports: ["CLAUDESELF_BOOT_NON_COLLAPSE_LAW"],
    does_not_support: ["CLAUDE_ENDPOINT_OBSERVATION"]
  },
  {
    path: "package.json",
    role: "LOCAL_VALIDATION_COMMAND_SURFACE",
    required_for: ["ADJUDICATION_REPRODUCTION", "VALIDATION_REPRODUCTION"],
    supports: ["NODE_TEST_VALIDATION_ENTRYPOINTS"],
    does_not_support: ["COMMIT_AUTHORITY"]
  },
  {
    path: "doctrine/OURSELF-BOOTSTRAP-SELFCOMMUNICATION-CONTRACT-v0.1-CANDIDATE.md",
    role: "BOOTSTRAP_CONTRACT_CANDIDATE",
    required_for: ["APPLICABLE_LAW_RECONTACT"],
    supports: ["OBSERVATION_ESTABLISHMENT_NON_COLLAPSE", "AUTHORITY_CEILING"],
    does_not_support: ["RATIFICATION", "LAUNCH_AUTHORITY"]
  },
  {
    path: "doctrine/OURSELF-COMMUNICATION-ECOSYSTEM-v0.1-CANDIDATE.md",
    role: "SELFCOMMUNICATION_CANDIDATE_DOCTRINE",
    required_for: ["LAUNCH_SUBJECT_SEMANTIC_PREIMAGE"],
    supports: ["COMMUNICATED_MATTER_ADMITTED_MEANING_NON_COLLAPSE", "CUSTODY_PLANE"],
    does_not_support: ["NETWORK_TRANSPORT_AUTHORITY", "CANONICAL_SCHEMA_PROMOTION"]
  },
  {
    path: "schemas/selfcommunication.event.v0.1-candidate.schema.json",
    role: "CANDIDATE_EVENT_SCHEMA",
    required_for: ["LOCAL_COMMUNICATION_WITNESS_REPRODUCTION"],
    supports: ["SELFCommunicationEvent_FIELD_CONTRACT"],
    does_not_support: ["CANONICAL_SCHEMA_PROMOTION"]
  },
  {
    path: "specimens/heartbeat-v0.selfcommunication.json",
    role: "LOCAL_COMMUNICATION_HEARTBEAT_SPECIMEN",
    required_for: ["LOCAL_COMMUNICATION_WITNESS_REPRODUCTION"],
    supports: ["ACK_HOLLABACK_NON_COLLAPSE_FIXTURE"],
    does_not_support: ["HTMLSELF_LAUNCH"]
  },
  {
    path: "tools/verify-bootstrap-contract.mjs",
    role: "BOOTSTRAP_PROJECTION_VERIFIER",
    required_for: ["BOOTSTRAP_VALIDATION_REPRODUCTION"],
    supports: ["AGENTS_CLAUDE_BOOT_POINTER_CHECK"],
    does_not_support: ["SEMANTIC_STANDING_PROOF"]
  },
  {
    path: "tools/ourself-communicate.mjs",
    role: "LOCAL_COMMUNICATION_VALIDATOR",
    required_for: ["LOCAL_COMMUNICATION_WITNESS_REPRODUCTION"],
    supports: ["HEARTBEAT_SPECIMEN_VALIDATION"],
    does_not_support: ["NETWORK_TRANSPORT"]
  },
  {
    path: "test/bootstrap-contract.test.mjs",
    role: "BOOTSTRAP_PROJECTION_TEST",
    required_for: ["VALIDATION_REPRODUCTION"],
    supports: ["BOOTSTRAP_VERIFIER_NEGATIVE_CONTROLS"],
    does_not_support: ["LAUNCH_AUTHORITY"]
  },
  {
    path: "test/ourself-communicate.test.mjs",
    role: "COMMUNICATION_WITNESS_TEST",
    required_for: ["VALIDATION_REPRODUCTION"],
    supports: ["COMMUNICATION_NON_COLLAPSE_NEGATIVE_CONTROLS"],
    does_not_support: ["CANONICAL_SCHEMA_PROMOTION"]
  },
  {
    path: "tools/ourself-communication-matter.mjs",
    role: "MATTER_IDENTITY_AND_DIGEST_HELPER",
    required_for: ["LAUNCH_COMPILER_EXECUTION", "ADJUDICATION_REPRODUCTION"],
    supports: ["DETERMINISTIC_OBJECT_DIGESTS"],
    does_not_support: ["CUSTODY_AUTHORITY"]
  },
  {
    path: "tools/ourself-commline-observation-gap.mjs",
    role: "COMMLINE_OBSERVATION_GAP_PREDECESSOR",
    required_for: ["LAUNCH_COMPILER_EXECUTION", "ADJUDICATION_REPRODUCTION"],
    supports: ["PATIENT_ZERO_BOUNDARY", "OBSERVATION_GAP_DERIVATION"],
    does_not_support: ["CLAUDE_WAKE_AUTHORITY"]
  },
  {
    path: "tools/ourself-observation-authorship.mjs",
    role: "OBSERVATION_AUTHORSHIP_PREDECESSOR",
    required_for: ["LAUNCH_COMPILER_EXECUTION", "ADJUDICATION_REPRODUCTION"],
    supports: ["AUTHORSHIP_GATE_PREIMAGE"],
    does_not_support: ["ENDPOINT_IDENTITY_ONTOLOGY"]
  },
  {
    path: "tools/ourself-transport-independent-roundtrip.mjs",
    role: "TRANSPORT_INDEPENDENCE_PREDECESSOR",
    required_for: ["LAUNCH_COMPILER_IMPORT_CLOSURE"],
    supports: ["TRANSPORT_PROOF_NON_COLLAPSE_FIXTURE"],
    does_not_support: ["CURRENT_LAUNCH_OBSERVED_STANDING"]
  },
  {
    path: "tools/ourself-selfcommunication-launch-readiness.mjs",
    role: "LAUNCH_READINESS_COMPILER",
    required_for: ["LAUNCH_ADJUDICATION_REPRODUCTION"],
    supports: ["TYPED_GATE_SEMANTICS", "G5_INSTRUMENTATION", "T2_PREDECESSOR_GATE", "G6_RECOMPUTATION"],
    does_not_support: ["LAUNCH_AUTHORITY", "R4_EXECUTION"]
  },
  {
    path: "test/ourself-selfcommunication-launch-readiness.test.mjs",
    role: "LAUNCH_READINESS_COMPILER_TESTS",
    required_for: ["VALIDATION_REPRODUCTION"],
    supports: ["BLOCKER_SEMANTICS_FIXTURES", "LAUNCH_DECISION_SENSITIVITY"],
    does_not_support: ["R4_EXECUTION"]
  },
  {
    path: "doctrine/DMB-CAUSAL-MATTER-CONTINUITY-ATTACK-REPORT-v0.1-CANDIDATE.md",
    role: "T2_CANDIDATE_PREDECESSOR_SOURCE",
    required_for: ["T2_REBIND_ATTEMPT"],
    supports: ["T2_CANDIDATE_REDUCTION"],
    does_not_support: ["T2_LAUNCH_SUBJECT_BINDING", "T2_OBSERVATION_OCCURRENCE"]
  },
  {
    path: "inselfactions/ISA-20260829-DMB-CAUSAL-MATTER-CONTINUITY-ATTACK-REPORT-001.json",
    role: "T2_CANDIDATE_PREDECESSOR_RECEIPT",
    required_for: ["T2_REBIND_ATTEMPT"],
    supports: ["T_INPUT_REDUCED_TO_T2_CANDIDATE_PRESSURE"],
    does_not_support: ["T2_LOAD_BEARING_PREDECESSOR_ESTABLISHMENT"]
  },
  {
    path: "specimens/hostile-preimage/dmb-causal-matter-continuity-witnesses.v0.1.json",
    role: "T2_CANDIDATE_STATIC_WITNESS_FIXTURE",
    required_for: ["T2_REBIND_ATTEMPT"],
    supports: ["CAUSAL_MATTER_CONTINUITY_ATTACK_FIXTURES"],
    does_not_support: ["T2_LAUNCH_SUBJECT_BINDING"]
  },
  {
    path: "specimens/selfcommunication-launch-readiness-001.report.json",
    role: "DERIVED_LAUNCH_READINESS_RECEIPT",
    required_for: ["ADJUDICATION_REPRODUCTION", "GATE_STANDING_RECONTACT"],
    supports: ["NO_LAUNCH_CURRENT_STANDING", "GATE_IDENTITY_MAP", "BLOCKER_SEMANTICS_TYPED"],
    does_not_support: ["FREEZE", "LAUNCH"]
  },
  {
    path: "tools/ourself-selfcommunication-launch-subject-custody.mjs",
    role: "CUSTODY_FORMATION_TOOL",
    required_for: ["CUSTODY_REPRODUCTION"],
    supports: ["C1_C2_C3_C4_MECHANICAL_FORMATION"],
    does_not_support: ["COMMIT_AUTHORITY", "FREEZE"]
  },
  {
    path: "test/ourself-selfcommunication-launch-subject-custody.test.mjs",
    role: "CUSTODY_FORMATION_TESTS",
    required_for: ["VALIDATION_REPRODUCTION"],
    supports: ["CONTENT_ADDRESSED_EVIDENCE_AND_MANIFEST_DETERMINISM"],
    does_not_support: ["DURABLE_GIT_REACHABILITY"]
  }
];

export const CUSTODY_ARTIFACT_PATHS = [
  DEFAULT_MANIFEST_PATH,
  DEFAULT_RECEIPT_PATH
];

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function contentIdentityForBuffer(buffer) {
  return `sha256:${sha256Buffer(buffer)}`;
}

export function contentIdentityForFile(filePath) {
  return contentIdentityForBuffer(fs.readFileSync(filePath));
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map((entry) => sortDeep(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}

function writeStableJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), stableJson(value));
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function git(rootDir, args, options = {}) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding: options.encoding ?? "utf8",
    input: options.input
  });
}

function tryGit(rootDir, args, options = {}) {
  try {
    return execFileSync("git", ["-C", rootDir, ...args], {
      encoding: options.encoding ?? "utf8",
      input: options.input,
      stdio: ["pipe", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}

function splitPorcelainPath(line) {
  if (!line) return null;
  return line.slice(3).replace(/^"|"$/g, "");
}

export function currentGitStatusForPath(rootDir, relativePath) {
  const output = tryGit(rootDir, ["status", "--short", "--porcelain=v1", "--", relativePath]) ?? "";
  const line = output.trimEnd().split("\n").find(Boolean);
  if (line) {
    const code = line.slice(0, 2);
    if (code === "??") return "UNTRACKED";
    if (code.includes("M")) return "MODIFIED";
    if (code.includes("A")) return "ADDED_IN_INDEX";
    if (code.includes("D")) return "DELETED";
    return `PORCELAIN_${code.trim() || "CHANGED"}`;
  }
  const tracked = tryGit(rootDir, ["ls-files", "--error-unmatch", relativePath]);
  return tracked === null ? "UNTRACKED_ABSENT_OR_IGNORED" : "TRACKED_CLEAN";
}

function trackedAtHeadBlob(rootDir, relativePath) {
  const output = tryGit(rootDir, ["rev-parse", `HEAD:${relativePath}`]);
  return output ? output.trim() : null;
}

export function gitObjectFormationForPath(rootDir, relativePath, { writeObject = true } = {}) {
  const absolutePath = path.join(rootDir, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const objectId = git(rootDir, [
    "hash-object",
    ...(writeObject ? ["-w"] : []),
    `--path=${relativePath}`,
    relativePath
  ]).trim();
  const headBlob = trackedAtHeadBlob(rootDir, relativePath);
  const currentStatus = currentGitStatusForPath(rootDir, relativePath);
  const durableRecontactable = headBlob === objectId;
  return {
    path: relativePath,
    content_identity: contentIdentityForBuffer(bytes),
    byte_count: bytes.length,
    current_git_status: currentStatus,
    object_id_if_formed: objectId,
    c1a_git_object_formation: Boolean(objectId),
    head_blob_object_id: headBlob,
    current_reachability_root: durableRecontactable
      ? "HEAD"
      : "NO_DURABLE_GIT_ROOT_FOR_CURRENT_BYTES",
    durable_recontactable: durableRecontactable,
    c1b_durable_git_reachability: durableRecontactable
  };
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (index <= haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) return count;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

export function extractExternalSessionContextEvidence({
  sessionFilePath = DEFAULT_EXTERNAL_SESSION_FILE,
  markers = EXTERNAL_SESSION_MARKERS
} = {}) {
  const resolved = path.resolve(sessionFilePath);
  const bytes = fs.readFileSync(resolved);
  const text = bytes.toString("utf8");
  const evidence = {
    schema: LAUNCH_SUBJECT_CUSTODY_SCHEMA,
    object_type: "BOUNDED_EXTERNAL_SESSION_CONTEXT_EVIDENCE",
    evidence_id: "EXTERNAL_SESSION_CONTEXT_219be5a6_5464975482_ROUTE_ADJUDICATION_PROBE_V0",
    source_locator: resolved,
    source_identity: contentIdentityForBuffer(bytes),
    source_byte_count: bytes.length,
    source_range_or_exact_extraction_rule: {
      extraction_species: "MARKER_PRESENCE_CENSUS",
      encoding: "utf8",
      markers: [...markers],
      operation: "full source decoded as utf8; record marker present/count/first_index only",
      raw_source_bytes_copied: false
    },
    provenance: {
      source_species: "EXTERNAL_CLAUDE_SESSION_FILE",
      local_recontact_path: resolved,
      extracted_by: "CODEXSELF",
      extraction_not_promotion: true,
      external_session_context_not_ourself_observation: true
    },
    interpretation_context: {
      launch_target: LAUNCH_TARGET,
      gate: "g7_SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK",
      context_present_not_observation: true,
      context_present_not_authority: true
    },
    role: "BOUNDED_EXTERNAL_SESSION_CONTEXT_PREIMAGE",
    marker_findings: markers.map((marker) => ({
      marker,
      present: text.includes(marker),
      count: countOccurrences(text, marker),
      first_index: text.indexOf(marker)
    })),
    supports: [
      "SESSION_FILE_UNION_CONTEXT_LAUNDERING_RISK_CENSUS",
      "PATIENT_ZERO_MARKER_CONTEXT_PRESENT"
    ],
    does_not_support: [
      "OURSELF_OBSERVATION",
      "CLAUDE_GOCHECKIT_OCCURRENCE",
      "T2_OBSERVATION_OCCURRENCE",
      "LAUNCH_AUTHORITY",
      "R4_RECEIPT"
    ],
    summary_not_source_preimage: true
  };
  evidence.evidence_identity = digestObject(evidence);
  return evidence;
}

export function writeContentAddressedEvidence({
  rootDir,
  outputDir = DEFAULT_OUTPUT_DIR,
  evidence
}) {
  const relativeDir = outputDir;
  const serialized = stableJson(evidence);
  const contentIdentity = contentIdentityForBuffer(Buffer.from(serialized, "utf8"));
  const hex = contentIdentity.replace("sha256:", "");
  const relativePath = path.join(relativeDir, `external-session-context-evidence.${hex}.json`);
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serialized);
  return {
    evidence,
    path: relativePath,
    content_identity: contentIdentity,
    custody_species: "CONTENT_ADDRESSED_LOCAL_FILE",
    custody_ref: `content-addressed-local-file:${relativePath}#${contentIdentity}`
  };
}

function buildRepositoryEntry({ rootDir, spec, writeObject }) {
  const formed = gitObjectFormationForPath(rootDir, spec.path, { writeObject });
  return {
    subject_entry_id: `C1:${spec.path}`,
    matter_species: "REPOSITORY_NATIVE_MATTER",
    locator: `git-worktree:${spec.path}`,
    custody_species: "GIT_BLOB_OBJECT_CUSTODY_PENDING_DURABLE_ROOT",
    custody_ref: `git:blob:${formed.object_id_if_formed}`,
    role: spec.role,
    required_for: [...spec.required_for],
    supports: [...spec.supports],
    does_not_support: [...spec.does_not_support],
    load_bearing: true,
    preserves_exact_bytes: true,
    preserves_identity: true,
    independently_recontactable: formed.durable_recontactable,
    mutation_required: false,
    commit_required_for_durable_reachability: !formed.durable_recontactable,
    founder_authority_required: !formed.durable_recontactable ? "COMMIT_AUTHORITY" : "NONE",
    effect_on_current_standing: "NO_LAUNCH_UNCHANGED",
    rollback: "remove proposed future commit before commit; loose Git object is inert if unreachable",
    conflicts: [],
    ...formed
  };
}

function externalEvidenceManifestEntry(externalEvidence) {
  return {
    subject_entry_id: "C2:EXTERNAL_SESSION_CONTEXT",
    matter_species: "BOUNDED_EXTERNAL_EVIDENCE",
    locator: `local-file:${externalEvidence.path}`,
    content_identity: externalEvidence.content_identity,
    custody_species: externalEvidence.custody_species,
    custody_ref: externalEvidence.custody_ref,
    role: "BOUNDED_EXTERNAL_SESSION_CONTEXT_PREIMAGE",
    required_for: ["SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK", "T1_PATIENT_ZERO_CONTEXT_CENSUS"],
    supports: [...externalEvidence.evidence.supports],
    does_not_support: [...externalEvidence.evidence.does_not_support],
    load_bearing: true,
    preserves_exact_bytes: true,
    preserves_identity: true,
    independently_recontactable: true,
    mutation_required: false,
    commit_required_for_durable_reachability: false,
    founder_authority_required: "NONE_FOR_C2_CONTENT_ADDRESSED_LOCAL_FILE",
    effect_on_current_standing: "NO_LAUNCH_UNCHANGED",
    rollback: `delete ${externalEvidence.path} before any commit if custody election is withdrawn`,
    conflicts: []
  };
}

export function buildLaunchSubjectManifest({
  repositoryEntries,
  externalEvidenceEntries,
  launchReadinessReport
}) {
  const entries = [...repositoryEntries, ...externalEvidenceEntries]
    .map((entry) => ({
      subject_entry_id: entry.subject_entry_id,
      matter_species: entry.matter_species,
      locator: entry.locator,
      content_identity: entry.content_identity,
      custody_species: entry.custody_species,
      custody_ref: entry.custody_ref,
      role: entry.role,
      required_for: entry.required_for,
      supports: entry.supports,
      does_not_support: entry.does_not_support,
      load_bearing: entry.load_bearing,
      independently_recontactable: entry.independently_recontactable
    }))
    .sort((a, b) => a.subject_entry_id.localeCompare(b.subject_entry_id));
  const allRecontactable = entries.every((entry) => entry.independently_recontactable === true);
  const manifest = {
    schema: LAUNCH_SUBJECT_CUSTODY_SCHEMA,
    object_type: "LAUNCH_SUBJECT_MANIFEST",
    launch_target: LAUNCH_TARGET,
    custody_election: {
      c1: "GIT_BASED_CUSTODY_FOR_REPOSITORY_NATIVE_MATTER",
      c2: "CONTENT_ADDRESSED_CUSTODY_FOR_BOUNDED_EXTERNAL_EVIDENCE",
      c3: "DETERMINISTIC_LAUNCH_SUBJECT_MANIFEST",
      c4: "INSELFACTION_CUSTODY_BOUNDARY_RECEIPT"
    },
    identity_law: {
      content_identity_not_custody: true,
      manifest_identity_not_launch_subject_identity: true,
      implementation_not_launch_subject: true,
      manifest_identity_excludes_incidental_wall_clock_metadata: true
    },
    required_theorem: "ResolveCustody(E.custody_ref) -> exact E.content_identity for every load-bearing manifest entry",
    entries,
    launch_readiness_report_identity: launchReadinessReport.report_identity,
    launch_decision: launchReadinessReport.launch_decision,
    current_launch_standing: launchReadinessReport.current_launch_standing,
    every_required_manifest_member_recontactable: allRecontactable,
    launch_subject_custody: allRecontactable ? "ESTABLISHED" : "NOT_ESTABLISHED",
    launch_subject_identity: allRecontactable ? "PENDING_MANIFEST_IDENTITY" : "NOT_ESTABLISHED"
  };
  const identityPayload = {
    schema: manifest.schema,
    object_type: manifest.object_type,
    launch_target: manifest.launch_target,
    custody_election: manifest.custody_election,
    entries: manifest.entries,
    launch_readiness_report_identity: manifest.launch_readiness_report_identity,
    launch_decision: manifest.launch_decision,
    current_launch_standing: manifest.current_launch_standing
  };
  manifest.launch_subject_manifest_identity = digestObject(identityPayload);
  if (allRecontactable) {
    manifest.launch_subject_identity = digestObject({
      launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
      complete_custodied_object_closure: entries.map((entry) => ({
        subject_entry_id: entry.subject_entry_id,
        content_identity: entry.content_identity,
        custody_ref: entry.custody_ref
      }))
    });
  }
  return manifest;
}

export function recontactManifestEntry({ rootDir, entry }) {
  if (entry.custody_species === "GIT_BLOB_OBJECT_CUSTODY_PENDING_DURABLE_ROOT") {
    const objectId = entry.custody_ref.replace("git:blob:", "");
    const bytes = execFileSync("git", ["-C", rootDir, "cat-file", "-p", objectId]);
    const resolvedIdentity = contentIdentityForBuffer(bytes);
    return {
      subject_entry_id: entry.subject_entry_id,
      custody_species: entry.custody_species,
      custody_ref: entry.custody_ref,
      resolved_content_identity: resolvedIdentity,
      expected_content_identity: entry.content_identity,
      exact_bytes_resolved: resolvedIdentity === entry.content_identity,
      durable_recontactable: false,
      passes: false,
      failure_if_any: resolvedIdentity === entry.content_identity
        ? "C1B_DURABLE_GIT_REACHABILITY_MISSING"
        : "CONTENT_IDENTITY_MISMATCH"
    };
  }
  if (entry.custody_species === "CONTENT_ADDRESSED_LOCAL_FILE") {
    const match = entry.custody_ref.match(/^content-addressed-local-file:(.+)#(sha256:[a-f0-9]{64})$/);
    const relativePath = match ? match[1] : entry.locator.replace("local-file:", "");
    const resolvedIdentity = contentIdentityForFile(path.join(rootDir, relativePath));
    return {
      subject_entry_id: entry.subject_entry_id,
      custody_species: entry.custody_species,
      custody_ref: entry.custody_ref,
      resolved_content_identity: resolvedIdentity,
      expected_content_identity: entry.content_identity,
      exact_bytes_resolved: resolvedIdentity === entry.content_identity,
      durable_recontactable: resolvedIdentity === entry.content_identity,
      passes: resolvedIdentity === entry.content_identity,
      failure_if_any: resolvedIdentity === entry.content_identity ? null : "CONTENT_IDENTITY_MISMATCH"
    };
  }
  return {
    subject_entry_id: entry.subject_entry_id,
    custody_species: entry.custody_species,
    custody_ref: entry.custody_ref,
    resolved_content_identity: null,
    expected_content_identity: entry.content_identity,
    exact_bytes_resolved: false,
    durable_recontactable: false,
    passes: false,
    failure_if_any: "UNKNOWN_CUSTODY_SPECIES"
  };
}

function collectGitStatusPaths(rootDir) {
  const output = git(rootDir, ["status", "--porcelain=v1", "-uall"]);
  return output.trimEnd().split("\n").filter(Boolean).map(splitPorcelainPath).filter(Boolean);
}

function classifyPathSets({ rootDir, proposedPathSet }) {
  const proposed = new Set(proposedPathSet);
  const statusPaths = collectGitStatusPaths(rootDir);
  const trackedExisting = proposedPathSet.filter((relativePath) => {
    const status = currentGitStatusForPath(rootDir, relativePath);
    return status !== "UNTRACKED" && status !== "UNTRACKED_ABSENT_OR_IGNORED";
  });
  const untrackedRequired = proposedPathSet.filter((relativePath) => {
    const status = currentGitStatusForPath(rootDir, relativePath);
    return status === "UNTRACKED" || status === "UNTRACKED_ABSENT_OR_IGNORED";
  });
  const excludedUnrelated = statusPaths.filter((relativePath) => !proposed.has(relativePath)).sort();
  return {
    tracked_existing: trackedExisting,
    untracked_required: untrackedRequired,
    excluded_unrelated: excludedUnrelated
  };
}

function buildT2RebindResult(launchReadinessReport) {
  const t2 = launchReadinessReport.t2_gate_result;
  const missing = Object.entries(t2.checks ?? {})
    .filter(([, value]) => value !== true)
    .map(([key]) => key);
  return {
    object_type: "T2_REBIND_RESULT",
    t2_receipt_exists: t2.t2_receipt_exists,
    t2_subject_binding: t2.t2_subject_binding,
    t2_patient_zero_binding: t2.t2_patient_zero_binding,
    t2_participation_binding: t2.t2_participation_binding,
    t2_observation_occurrence: t2.t2_observation_occurrence,
    t2_standing_ceiling: t2.t2_standing_ceiling,
    t2_causal_matter_predecessor: t2.final_standing === "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED"
      ? "MECHANICALLY_ADJUDICATED"
      : "BLOCKED",
    no_manual_pass_injection: true,
    missing_relations: missing
  };
}

function buildFreezeEligibility({ manifest, launchReadinessReport }) {
  const t2Rebind = buildT2RebindResult(launchReadinessReport);
  const predicates = {
    LAUNCH_SUBJECT_CUSTODY_ESTABLISHED: manifest.launch_subject_custody === "ESTABLISHED",
    LAUNCH_SUBJECT_IDENTITY_ESTABLISHED: manifest.launch_subject_identity !== "NOT_ESTABLISHED",
    EVERY_REQUIRED_MANIFEST_MEMBER_RECONTACTABLE: manifest.every_required_manifest_member_recontactable === true,
    T2_PREDECESSOR_MECHANICALLY_ADJUDICATED: t2Rebind.t2_causal_matter_predecessor === "MECHANICALLY_ADJUDICATED",
    G6_CURRENT_STANDING_RECOMPUTED: Boolean(launchReadinessReport.g6_current_standing_result?.result_identity),
    G7_ROUTING_AMBIGUITY_CLOSED: launchReadinessReport.g7_homonym_map?.final_standing === "G7_ROUTING_AMBIGUITY_CLOSED_BY_FOUNDER",
    G5_INSTRUMENTATION_EVIDENCE_SENSITIVE: launchReadinessReport.g5_instrument_result?.final_standing === "G5_BLOCKED" &&
      launchReadinessReport.g5_instrument_result?.errors?.includes("NO_VALID_R4_RECEIPT"),
    BLOCKER_SEMANTICS_TYPED: launchReadinessReport.blocker_semantics_result?.final_standing === "BLOCKER_SEMANTICS_TYPED_CONTROL_ESTABLISHED",
    LAUNCH_DECISION_SENSITIVITY_PASS: launchReadinessReport.launch_decision_sensitivity_tests?.every((entry) => entry.discriminated) === true
  };
  return {
    predicates,
    failing_predicates: Object.entries(predicates)
      .filter(([, value]) => value !== true)
      .map(([key]) => key),
    new_freeze: Object.values(predicates).every(Boolean) ? "MINTABLE" : "NOT_MINTED"
  };
}

function createInselfactionReceipt({
  manifest,
  manifestPath,
  manifestContentIdentity,
  c1Refs,
  c2Refs,
  custodyCensus,
  freezeEligibility,
  launchReadinessReport,
  unresolvedResidue
}) {
  const receipt = {
    inselfaction_id: "ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001",
    schema: "inselfaction.v0.1",
    session: "CODEXSELF",
    immutable: true,
    relates_to: LAUNCH_TARGET,
    operation: {
      title: "SELFCOMMUNICATION_LIVE_V0 composed launch-subject custody formation",
      authority_exercised: "MILASOPHAHR Founder custody election: C1 Git object formation, C2 bounded external evidence custody, C3 deterministic manifest, C4 custody-boundary receipt; no commit, push, launch, R4, or G7 closure.",
      custody_formation_date: "2026-08-30",
      implementation_scope: "Custody formation, manifest, receipt, T2 rebinding attempt, G6 recomputation, G7 routing application, and validation.",
      not_done: [
        "No commit",
        "No push",
        "No launch",
        "No G7 closure attack",
        "No R4 execution",
        "No historical evidence rewriting",
        "No Patient Zero rewriting"
      ]
    },
    launch_subject_manifest_ref: {
      path: manifestPath,
      launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
      content_identity: manifestContentIdentity
    },
    launch_subject_identity: manifest.launch_subject_identity,
    c1_refs: c1Refs.map((entry) => ({
      path: entry.path,
      object_id: entry.object_id_if_formed,
      content_identity: entry.content_identity,
      durable_recontactable: entry.durable_recontactable
    })),
    c2_refs: c2Refs,
    custody_census: custodyCensus,
    custody_formation_act: "C1A_OBJECTS_FORMED_C2_OBJECT_WRITTEN_C3_MANIFEST_WRITTEN_C4_RECEIPT_WRITTEN",
    authority_surface: {
      commit_authority: "NOT_GRANTED",
      push_authority: "NOT_GRANTED",
      launch_authority: "NOT_GRANTED",
      r4_authority: "NOT_GRANTED",
      g7_closure_authority: "NOT_GRANTED"
    },
    unresolved_residue: unresolvedResidue,
    freeze_eligibility: freezeEligibility,
    t2_rebind_result: buildT2RebindResult(launchReadinessReport),
    g6_historical_standing: launchReadinessReport.g6_historical_standing,
    g6_current_standing: launchReadinessReport.g6_current_standing_result?.current_standing,
    g7_routing_result: launchReadinessReport.g7_homonym_map?.final_standing,
    current_launch_standing: launchReadinessReport.current_launch_standing
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

export function formLaunchSubjectCustody({
  rootDir = process.cwd(),
  sessionFilePath = DEFAULT_EXTERNAL_SESSION_FILE,
  outputDir = DEFAULT_OUTPUT_DIR,
  manifestPath = DEFAULT_MANIFEST_PATH,
  receiptPath = DEFAULT_RECEIPT_PATH,
  launchReadinessReportPath = DEFAULT_LAUNCH_READINESS_REPORT_PATH,
  writeGitObjects = true
} = {}) {
  const root = path.resolve(rootDir);
  const externalEvidence = writeContentAddressedEvidence({
    rootDir: root,
    outputDir,
    evidence: extractExternalSessionContextEvidence({ sessionFilePath })
  });
  const launchReadinessReport = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence: externalEvidence.evidence
  });
  writeStableJsonFile(path.join(root, launchReadinessReportPath), launchReadinessReport);

  const repositoryEntries = REPOSITORY_NATIVE_REQUIRED_ENTRIES
    .map((spec) => buildRepositoryEntry({ rootDir: root, spec, writeObject: writeGitObjects }));
  const externalEntries = [externalEvidenceManifestEntry(externalEvidence)];
  const manifest = buildLaunchSubjectManifest({
    repositoryEntries,
    externalEvidenceEntries: externalEntries,
    launchReadinessReport
  });
  writeStableJsonFile(path.join(root, manifestPath), manifest);
  const manifestContentIdentity = contentIdentityForFile(path.join(root, manifestPath));
  const subjectClosureRecontactTest = manifest.entries.map((entry) => recontactManifestEntry({ rootDir: root, entry }));
  const everyClosureMemberRecontactable = subjectClosureRecontactTest.every((entry) => entry.passes === true);
  manifest.every_required_manifest_member_recontactable = everyClosureMemberRecontactable;
  manifest.launch_subject_custody = everyClosureMemberRecontactable ? "ESTABLISHED" : "NOT_ESTABLISHED";
  manifest.launch_subject_identity = everyClosureMemberRecontactable
    ? digestObject({
      launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
      subject_closure_recontact_test: subjectClosureRecontactTest
    })
    : "NOT_ESTABLISHED";
  writeStableJsonFile(path.join(root, manifestPath), manifest);

  const proposedCommitPathSet = [
    ...REPOSITORY_NATIVE_REQUIRED_ENTRIES.map((entry) => entry.path),
    externalEvidence.path,
    ...CUSTODY_ARTIFACT_PATHS
  ].sort();
  const pathSets = classifyPathSets({ rootDir: root, proposedPathSet: proposedCommitPathSet });
  const freezeEligibility = buildFreezeEligibility({ manifest, launchReadinessReport });
  const unresolvedResidue = [
    ...repositoryEntries
      .filter((entry) => entry.durable_recontactable !== true)
      .map((entry) => `C1B_DURABLE_GIT_REACHABILITY_MISSING:${entry.path}`),
    ...freezeEligibility.failing_predicates
  ];
  const receipt = createInselfactionReceipt({
    manifest,
    manifestPath,
    manifestContentIdentity: contentIdentityForFile(path.join(root, manifestPath)),
    c1Refs: repositoryEntries,
    c2Refs: [{
      evidence_id: externalEvidence.evidence.evidence_id,
      path: externalEvidence.path,
      content_identity: externalEvidence.content_identity,
      custody_ref: externalEvidence.custody_ref,
      source_identity: externalEvidence.evidence.source_identity
    }],
    custodyCensus: {
      tracked_existing: pathSets.tracked_existing,
      untracked_required: pathSets.untracked_required,
      external_required: [externalEvidence.evidence.evidence_id],
      excluded_unrelated: pathSets.excluded_unrelated,
      proposed_commit_path_set: proposedCommitPathSet
    },
    freezeEligibility,
    launchReadinessReport,
    unresolvedResidue
  });
  writeStableJsonFile(path.join(root, receiptPath), receipt);

  const custodyArtifactObjectFormation = CUSTODY_ARTIFACT_PATHS.map((relativePath) =>
    gitObjectFormationForPath(root, relativePath, { writeObject: writeGitObjects })
  );
  const c1DurableBlocked = repositoryEntries.some((entry) => entry.durable_recontactable !== true) ||
    custodyArtifactObjectFormation.some((entry) => entry.durable_recontactable !== true);
  const result = {
    schema: LAUNCH_SUBJECT_CUSTODY_SCHEMA,
    object_type: "COMPOSED_LAUNCH_SUBJECT_CUSTODY_FORMATION_RESULT",
    launch_target: LAUNCH_TARGET,
    custody_election: {
      C1: "GIT-BASED_CUSTODY_FOR_REPOSITORY_NATIVE_MATTER",
      C2: "CONTENT-ADDRESSED_CUSTODY_FOR_BOUNDED_EXTERNAL_EVIDENCE",
      C3: "DETERMINISTIC_LAUNCH_SUBJECT_MANIFEST",
      C4: "INSELFACTION_CUSTODY_BOUNDARY_RECEIPT"
    },
    tracked_existing: pathSets.tracked_existing,
    untracked_required: pathSets.untracked_required,
    external_required: [{
      evidence_id: externalEvidence.evidence.evidence_id,
      source_locator: externalEvidence.evidence.source_locator,
      source_identity: externalEvidence.evidence.source_identity,
      source_range_or_exact_extraction_rule: externalEvidence.evidence.source_range_or_exact_extraction_rule,
      content_identity: externalEvidence.content_identity,
      provenance: externalEvidence.evidence.provenance,
      interpretation_context: externalEvidence.evidence.interpretation_context,
      role: externalEvidence.evidence.role,
      supports: externalEvidence.evidence.supports,
      does_not_support: externalEvidence.evidence.does_not_support,
      custody_ref: externalEvidence.custody_ref
    }],
    excluded_unrelated: pathSets.excluded_unrelated,
    c1a_git_object_formation: repositoryEntries.map((entry) => ({
      path: entry.path,
      role: entry.role,
      content_identity: entry.content_identity,
      current_git_status: entry.current_git_status,
      object_id_if_formed: entry.object_id_if_formed,
      current_reachability_root: entry.current_reachability_root,
      durable_recontactable: entry.durable_recontactable
    })),
    c1b_durable_git_reachability: {
      established: !c1DurableBlocked,
      founder_commit_authority_required: c1DurableBlocked,
      proposed_commit_path_set: proposedCommitPathSet,
      object_ids: [
        ...repositoryEntries.map((entry) => ({
          path: entry.path,
          object_id: entry.object_id_if_formed,
          content_identity: entry.content_identity
        })),
        ...custodyArtifactObjectFormation.map((entry) => ({
          path: entry.path,
          object_id: entry.object_id_if_formed,
          content_identity: entry.content_identity
        })),
        {
          path: externalEvidence.path,
          object_id: "NOT_FORMED_C2_CONTENT_ADDRESSED_CUSTODY",
          content_identity: externalEvidence.content_identity
        }
      ],
      tree_preimage_if_applicable: "NOT_COMPUTED_NO_STAGING_NO_COMMIT_AUTHORITY",
      unrelated_paths_excluded: pathSets.excluded_unrelated,
      expected_commit_effect: "Make exact C1 repository-native objects and C3/C4 custody artifacts durably reachable from a Git commit without admitting excluded unrelated dirty Matter.",
      rollback_boundary: "Before commit, remove proposed paths from any future index operation; after commit, revert that exact commit only."
    },
    founder_commit_authority_required: c1DurableBlocked,
    proposed_commit_path_set: c1DurableBlocked ? proposedCommitPathSet : [],
    c2_external_evidence_custody: externalEntries,
    launch_subject_manifest: manifest,
    launch_subject_manifest_identity: manifest.launch_subject_manifest_identity,
    subject_closure_recontact_test: subjectClosureRecontactTest,
    launch_subject_identity: manifest.launch_subject_identity,
    inselfaction_receipt: {
      path: receiptPath,
      receipt_identity: receipt.receipt_identity
    },
    t2_rebind_result: buildT2RebindResult(launchReadinessReport),
    g6_historical_standing: launchReadinessReport.g6_historical_standing,
    g6_current_standing: launchReadinessReport.g6_current_standing_result?.current_standing,
    g7_routing_result: launchReadinessReport.g7_homonym_map,
    new_freeze: freezeEligibility.new_freeze,
    new_freeze_identity: "NOT_MINTED",
    freeze_eligibility: freezeEligibility,
    files_changed: [
      "tools/ourself-selfcommunication-launch-readiness.mjs",
      "tools/ourself-selfcommunication-launch-subject-custody.mjs",
      "test/ourself-selfcommunication-launch-readiness.test.mjs",
      "test/ourself-selfcommunication-launch-subject-custody.test.mjs",
      launchReadinessReportPath,
      externalEvidence.path,
      manifestPath,
      receiptPath,
      "package.json"
    ],
    blockers: unresolvedResidue,
    residue: [
      "C1A Git blob objects are formed but not durably reachable.",
      "C1B requires explicit Founder commit authority.",
      "T2 remains blocked by missing launch-subject, Patient Zero, participation, observation-occurrence, and standing-ceiling bindings.",
      "G5 remains blocked because no valid R4 receipt was supplied or executed."
    ],
    g7_eligibility: "FALSE_NO_FREEZE",
    r4_eligibility: false,
    next_required_seat: c1DurableBlocked
      ? "FOUNDER_COMMIT_AUTHORITY_SEAT_FOR_EXACT_PROPOSED_PATH_SET"
      : "T2_PREDECESSOR_BINDING_SEAT",
    current_launch_standing: "NO_LAUNCH"
  };
  result.result_identity = digestObject(result);
  return result;
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const sessionFilePath = valueAfter(process.argv, "--external-session-file") ?? DEFAULT_EXTERNAL_SESSION_FILE;
  const outputDir = valueAfter(process.argv, "--out-dir") ?? DEFAULT_OUTPUT_DIR;
  const manifestPath = valueAfter(process.argv, "--manifest") ?? DEFAULT_MANIFEST_PATH;
  const receiptPath = valueAfter(process.argv, "--receipt") ?? DEFAULT_RECEIPT_PATH;
  const launchReadinessReportPath =
    valueAfter(process.argv, "--launch-readiness-report") ?? DEFAULT_LAUNCH_READINESS_REPORT_PATH;
  const writeGitObjects = !hasFlag(process.argv, "--no-write-git-objects");
  const result = formLaunchSubjectCustody({
    rootDir,
    sessionFilePath,
    outputDir,
    manifestPath,
    receiptPath,
    launchReadinessReportPath,
    writeGitObjects
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
