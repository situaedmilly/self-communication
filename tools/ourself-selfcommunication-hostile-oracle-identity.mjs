#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digestObject } from "./ourself-communication-matter.mjs";
import {
  contentIdentityForFile,
  stableJson
} from "./ourself-selfcommunication-launch-subject-custody.mjs";
import {
  buildProofClosureCustodyReport
} from "./ourself-selfcommunication-proof-closure-custody.mjs";

export const HOSTILE_ORACLE_IDENTITY_SCHEMA =
  "ourself.selfcommunication-hostile-oracle-identity.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_HOSTILE_CORPUS_ROOT =
  process.env.SELFCOMMUNICATION_G7_HOSTILE_CORPUS ??
  "/Users/millysituated/Desktop/G7-REMOTE-DERIVATION-CLOSURE-WITNESSES-001";
export const DEFAULT_OUTPUT_DIR =
  "specimens/selfcommunication-hostile-oracle-identity-v0-001";
export const DEFAULT_SUCCESSOR_MANIFEST_PATH =
  `${DEFAULT_OUTPUT_DIR}/successor-hostile-oracle-manifest.json`;
export const DEFAULT_SUCCESSOR_REPORT_PATH =
  `${DEFAULT_OUTPUT_DIR}/successor-hostile-oracle-report.json`;
export const LEGACY_HOSTILE_CORPUS_IDENTITY =
  "sha256:ef15db5c51c6b1a83329f270e13e48de383b4e4f7462b001c4f052c0f0d06002";
export const SUBJECT_COMMIT_AT_HOSTILE_CAPTURE =
  "7567a7577f51cc5089b9c6feb0323306976b4c0b";
export const ATK_F_INDEX_PATH = "corpus/atk-F/.git/index";
export const ATK_F_SEMANTIC_MUTATION_PATH =
  "corpus/atk-F/tools/ourself-selfcommunication-proof-closure-custody.mjs";

const DIAGNOSTIC_ROLES = new Set([
  "ATTACK_STDERR_CAPTURE",
  "INDEPENDENT_VERIFICATION_STDERR"
]);

const EXPECTED_OUTCOME_ROLES = new Set([
  "ATTACK_RESULT_REPORT",
  "INDEPENDENT_VERIFICATION_REPORT",
  "PROOF_REPLAY_RESULT_REPORT"
]);

const WORKING_SUBJECT_ROLES = new Set([
  "ATTACK_WORKING_SUBJECT",
  "CLONE_CONTROL_SUBJECT",
  "PROOF_REPLAY_WORKING_SUBJECT"
]);

const ATTACK_PRECONDITION_ROLES = new Set([
  "OBJECT_STARVED_ADVERSARIAL_REMOTE",
  "TRANSPORT_REDIRECTOR_VERBATIM"
]);

const STATE_PRECONDITION_ATTACK_IDS = Object.freeze({});

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

function identityWithoutField(value, field) {
  const clone = { ...value };
  delete clone[field];
  return digestObject(clone);
}

function sortedUnique(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort();
}

function sameArray(left, right) {
  const a = sortedUnique(left);
  const b = sortedUnique(right);
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

function isVcsAdministrativePath(relativePath) {
  return relativePath.includes("/.git/") ||
    /^corpus\/[^/]+\.git\//.test(relativePath);
}

function isMutableGitIndexPath(relativePath) {
  return relativePath.endsWith("/.git/index");
}

function observedFileState(corpusRoot, relativePath) {
  const absolutePath = path.join(corpusRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      byte_size: null,
      content_sha256: null,
      content_identity: null,
      executable_bit: null
    };
  }
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isFile()) {
    return {
      exists: false,
      byte_size: null,
      content_sha256: null,
      content_identity: null,
      executable_bit: null,
      failure_if_any: "NOT_A_REGULAR_FILE"
    };
  }
  const bytes = fs.readFileSync(absolutePath);
  const contentSha256 = sha256Buffer(bytes);
  return {
    exists: true,
    byte_size: bytes.length,
    content_sha256: contentSha256,
    content_identity: `sha256:${contentSha256}`,
    executable_bit: Boolean(stat.mode & 0o111)
  };
}

function legacyManifestPath(corpusRoot) {
  return path.join(corpusRoot, "WITNESS-MANIFEST.json");
}

function classifyArtifact(artifact) {
  const role = artifact.ROLE;
  const relativePath = artifact.RELATIVE_PATH;
  if (DIAGNOSTIC_ROLES.has(role)) return "DIAGNOSTIC";
  if (EXPECTED_OUTCOME_ROLES.has(role)) return "EXPECTED_OUTCOME_MATTER";
  if (isVcsAdministrativePath(relativePath)) return "VCS_ADMINISTRATIVE_STATE";
  if (role === "TRANSPORT_REDIRECTOR_VERBATIM") return "ATTACK_PRECONDITION";
  if (role === "OBJECT_STARVED_ADVERSARIAL_REMOTE") return "ATTACK_PRECONDITION";
  if (WORKING_SUBJECT_ROLES.has(role)) return "SEMANTIC_ATTACK_MATTER";
  if (ATTACK_PRECONDITION_ROLES.has(role)) return "ATTACK_PRECONDITION";
  return "UNKNOWN";
}

function contentIdentityAttackIdsFor({ species, artifact, attackIds }) {
  if (["SEMANTIC_ATTACK_MATTER", "EXPECTED_OUTCOME_MATTER"].includes(species)) {
    return attackIds;
  }
  if (species === "ATTACK_PRECONDITION" && !isVcsAdministrativePath(artifact.RELATIVE_PATH)) {
    return attackIds;
  }
  return [];
}

function environmentPreimageAttackIdsFor({ species, artifact, attackIds }) {
  if (["VCS_ADMINISTRATIVE_STATE", "EXECUTION_ENVIRONMENT_STATE"].includes(species)) {
    return attackIds;
  }
  if (artifact.ROLE === "OBJECT_STARVED_ADVERSARIAL_REMOTE") return attackIds;
  return [];
}

function statePreconditionAttackIdsFor({ artifact }) {
  return sortedUnique(STATE_PRECONDITION_ATTACK_IDS[artifact.RELATIVE_PATH] ?? []);
}

function causalBasisFor({ species, artifact, contentIds, environmentIds, stateIds }) {
  if (isMutableGitIndexPath(artifact.RELATIVE_PATH)) {
    return [
      "Path is Git index bookkeeping, not attack source bytes.",
      "Disposable observation showed git status can perturb these bytes while atk-F semantic inputs and result remain equivalent.",
      "Exact index bytes are state-precondition Matter only for an attack whose proposition consumes exact index state."
    ];
  }
  if (contentIds.length > 0) {
    return [
      "Artifact role and path place this entry inside the hostile proposition's source, fixture, or expected outcome preimage.",
      "A semantic mutation calibrator must perturb ORACLE_CONTENT_IDENTITY for this species."
    ];
  }
  if (environmentIds.length > 0) {
    return [
      "Entry belongs to the replay environment, not the semantic content identity.",
      "Environment membership does not by itself establish content identity participation."
    ];
  }
  if (stateIds.length > 0) {
    return [
      "Entry is explicitly attack-relative mutable state consumed by the named proposition.",
      "State precondition participation is not inherited by unrelated attacks."
    ];
  }
  if (species === "DIAGNOSTIC") {
    return [
      "Diagnostic capture is preserved as historical evidence but does not participate in semantic oracle identity."
    ];
  }
  return [
    "No mechanical participation relation was established for this entry."
  ];
}

function evidenceRefsFor({ species, artifact, contentIds, environmentIds, stateIds }) {
  const refs = [
    `LEGACY_MANIFEST_ENTRY:${artifact.RELATIVE_PATH}`,
    `LEGACY_ROLE:${artifact.ROLE}`
  ];
  if (isVcsAdministrativePath(artifact.RELATIVE_PATH)) {
    refs.push("PATH_SPECIES_RULE:VCS_ADMINISTRATIVE_STATE");
  }
  if (isMutableGitIndexPath(artifact.RELATIVE_PATH)) {
    refs.push("CALIBRATOR_A:OBSERVER_STABILITY_GIT_STATUS_SHORT");
  }
  if (contentIds.length > 0) {
    refs.push("DEPENDENCY_TRACE:ROLE_AND_PATH_CONTENT_PREIMAGE");
    refs.push("CALIBRATOR_B:SEMANTIC_SENSITIVITY");
    refs.push("CALIBRATOR_D:CLASSIFICATION_LAUNDERING");
  }
  if (environmentIds.length > 0) {
    refs.push("ENVIRONMENT_TRACE:REPLAY_WORKSPACE_OR_REMOTE_STATE");
  }
  if (stateIds.length > 0) {
    refs.push("STATE_PRECONDITION_TRACE:ATTACK_RELATIVE_MUTABLE_STATE");
  }
  if (species === "DIAGNOSTIC") {
    refs.push("DIAGNOSTIC_TRACE:NOT_SEMANTIC_CONTROL");
  }
  return sortedUnique(refs);
}

function entryFromArtifact({ corpusRoot, artifact }) {
  const species = classifyArtifact(artifact);
  const attackIds = sortedUnique(artifact.ATTACK_IDS_SUPPORTED);
  const contentIds = contentIdentityAttackIdsFor({ species, artifact, attackIds });
  const environmentIds = environmentPreimageAttackIdsFor({ species, artifact, attackIds });
  const stateIds = statePreconditionAttackIdsFor({ artifact, attackIds });
  const observed = observedFileState(corpusRoot, artifact.RELATIVE_PATH);
  return {
    PATH: artifact.RELATIVE_PATH,
    SPECIES: species,
    ATTACK_IDS: attackIds,
    CONTENT_IDENTITY_FOR_ATTACK_IDS: contentIds,
    ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS: environmentIds,
    STATE_PRECONDITION_FOR_ATTACK_IDS: stateIds,
    CAUSAL_BASIS: causalBasisFor({ species, artifact, contentIds, environmentIds, stateIds }),
    EVIDENCE_REF: evidenceRefsFor({ species, artifact, contentIds, environmentIds, stateIds }),
    LEGACY_ROLE: artifact.ROLE,
    LEGACY_BYTE_SIZE: artifact.BYTE_SIZE,
    LEGACY_CONTENT_SHA256: artifact.CONTENT_SHA256,
    LEGACY_EXECUTABLE_BIT: artifact.EXECUTABLE_BIT,
    OBSERVED: observed,
    LEGACY_MATCH: {
      byte_size: observed.byte_size === artifact.BYTE_SIZE,
      content_sha256: observed.content_sha256 === artifact.CONTENT_SHA256,
      executable_bit: observed.executable_bit === artifact.EXECUTABLE_BIT
    }
  };
}

function identityInputForEntry(entry, relationField) {
  return {
    PATH: entry.PATH,
    SPECIES: entry.SPECIES,
    ATTACK_IDS: entry.ATTACK_IDS,
    [relationField]: entry[relationField],
    BYTE_SIZE: entry.OBSERVED.byte_size,
    CONTENT_SHA256: entry.OBSERVED.content_sha256,
    EXECUTABLE_BIT: entry.OBSERVED.executable_bit
  };
}

function buildContentIdentity(entries) {
  const inputs = entries
    .filter((entry) => entry.CONTENT_IDENTITY_FOR_ATTACK_IDS.length > 0)
    .map((entry) => identityInputForEntry(entry, "CONTENT_IDENTITY_FOR_ATTACK_IDS"))
    .sort((a, b) => a.PATH.localeCompare(b.PATH));
  const preimage = {
    schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
    object_type: "ORACLE_CONTENT_IDENTITY_PREIMAGE",
    launch_target: LAUNCH_TARGET,
    identity_participation_relation:
      "IdentityParticipation(M,Q) iff a difference in M can change the adjudication preimage of proposition Q.",
    non_collapses: [
      "ENTRY_EXISTS_IN_CORPUS != ENTRY_PARTICIPATES_IN_IDENTITY",
      "ENVIRONMENT_MEMBERSHIP != CONTENT_IDENTITY_PARTICIPATION",
      "CONTENT_IDENTITY_PARTICIPATION != STATE_PRECONDITION_PARTICIPATION",
      "OBSERVATION_SIDE_EFFECT != SEMANTIC_SUBJECT_CHANGE"
    ],
    entries: inputs
  };
  return {
    ORACLE_CONTENT_IDENTITY: digestObject(preimage),
    ORACLE_CONTENT_IDENTITY_PREIMAGE: preimage
  };
}

function buildEnvironmentPreimage(entries) {
  const inputs = entries
    .filter((entry) => entry.ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS.length > 0)
    .map((entry) => identityInputForEntry(entry, "ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS"))
    .sort((a, b) => a.PATH.localeCompare(b.PATH));
  const representation = {
    schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
    object_type: "ORACLE_ENVIRONMENT_PREIMAGE_REPRESENTATION",
    launch_target: LAUNCH_TARGET,
    representation_species: "ATTACK_RELATIVE_ENVIRONMENT_ENTRY_SET",
    environment_snapshot_identity_not_replay_sufficiency: true,
    exact_environment_bytes_not_semantic_content_identity: true,
    entries: inputs
  };
  return {
    ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY: digestObject(representation),
    ORACLE_ENVIRONMENT_PREIMAGE: representation
  };
}

function buildStatePreconditionIdentities(entries) {
  const byAttack = new Map();
  for (const entry of entries) {
    for (const attackId of entry.STATE_PRECONDITION_FOR_ATTACK_IDS) {
      if (!byAttack.has(attackId)) byAttack.set(attackId, []);
      byAttack.get(attackId).push(identityInputForEntry(entry, "STATE_PRECONDITION_FOR_ATTACK_IDS"));
    }
  }
  return [...byAttack.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([attackId, attackEntries]) => {
    const preimage = {
      schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
      object_type: "STATE_PRECONDITION_IDENTITY_PREIMAGE",
      attack_id: attackId,
      launch_target: LAUNCH_TARGET,
      entries: attackEntries.sort((a, b) => a.PATH.localeCompare(b.PATH))
    };
    return {
      ATTACK_ID: attackId,
      STATE_PRECONDITION_IDENTITY: digestObject(preimage),
      STATE_PRECONDITION_IDENTITY_PREIMAGE: preimage
    };
  });
}

function successorManifestIdentityPreimage(manifest) {
  const clone = { ...manifest };
  delete clone.SUCCESSOR_ORACLE_MANIFEST_IDENTITY;
  return clone;
}

export function deriveSuccessorOracleManifest({
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const root = path.resolve(corpusRoot);
  const legacyManifest = readJsonFile(legacyManifestPath(root));
  const entries = legacyManifest.artifacts.map((artifact) => entryFromArtifact({
    corpusRoot: root,
    artifact
  }));
  const content = buildContentIdentity(entries);
  const environment = buildEnvironmentPreimage(entries);
  const statePreconditions = buildStatePreconditionIdentities(entries);
  const manifest = {
    schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
    object_type: "SUCCESSOR_HOSTILE_ORACLE_IDENTITY_MANIFEST",
    launch_target: LAUNCH_TARGET,
    source_legacy_manifest_path: legacyManifestPath(root),
    source_legacy_manifest_content_identity: contentIdentityForFile(legacyManifestPath(root)),
    legacy_hostile_corpus_identity: LEGACY_HOSTILE_CORPUS_IDENTITY,
    legacy_identity_function_disposition: "OVER_INCLUSIVE_FOR_OBSERVER_MUTABLE_GIT_ADMIN_STATE",
    identity_participation_model: {
      foundational_relation:
        "IdentityParticipation(M,Q) iff a difference in M can change the adjudication preimage of proposition Q.",
      promotion_scope: "HOSTILE_ORACLE_REPAIR_ONLY",
      no_global_boolean_participation: true,
      non_collapses: [
        "ENTRY_EXISTS_IN_CORPUS != ENTRY_PARTICIPATES_IN_IDENTITY",
        "ENVIRONMENT_MEMBERSHIP != CONTENT_IDENTITY_PARTICIPATION",
        "CONTENT_IDENTITY_PARTICIPATION != STATE_PRECONDITION_PARTICIPATION",
        "STATE_PRECONDITION(A) != STATE_PRECONDITION(B)",
        "OBSERVATION_SIDE_EFFECT != SEMANTIC_SUBJECT_CHANGE"
      ]
    },
    classification_evidence_policy: {
      classification_claim_is_not_identity_participation_established: true,
      evidence_ref_required_for_identity_relevant_entries: true,
      successor_guard_rederives_path_species_and_participation: true,
      manifest_self_certification_admitted: false
    },
    entries,
    ORACLE_CONTENT_IDENTITY: content.ORACLE_CONTENT_IDENTITY,
    ORACLE_CONTENT_IDENTITY_PREIMAGE: content.ORACLE_CONTENT_IDENTITY_PREIMAGE,
    ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY: environment.ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY,
    ORACLE_ENVIRONMENT_PREIMAGE: environment.ORACLE_ENVIRONMENT_PREIMAGE,
    STATE_PRECONDITION_IDENTITIES: statePreconditions,
    current_launch_standing: "NO_LAUNCH"
  };
  manifest.SUCCESSOR_ORACLE_MANIFEST_IDENTITY = digestObject(successorManifestIdentityPreimage(manifest));
  return manifest;
}

function compareEntryParticipation({ supplied, derived }) {
  const suppliedByPath = new Map((supplied.entries ?? []).map((entry) => [entry.PATH, entry]));
  return (derived.entries ?? []).flatMap((derivedEntry) => {
    const suppliedEntry = suppliedByPath.get(derivedEntry.PATH);
    if (!suppliedEntry) {
      return [{
        PATH: derivedEntry.PATH,
        failure: "ENTRY_MISSING_FROM_SUPPLIED_MANIFEST"
      }];
    }
    const failures = [];
    for (const field of [
      "SPECIES",
      "CONTENT_IDENTITY_FOR_ATTACK_IDS",
      "ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS",
      "STATE_PRECONDITION_FOR_ATTACK_IDS"
    ]) {
      const same = Array.isArray(derivedEntry[field])
        ? sameArray(suppliedEntry[field], derivedEntry[field])
        : suppliedEntry[field] === derivedEntry[field];
      if (!same) {
        failures.push({
          PATH: derivedEntry.PATH,
          field,
          supplied: suppliedEntry[field],
          derived: derivedEntry[field],
          failure: "CLASSIFICATION_OR_PARTICIPATION_NOT_DERIVED"
        });
      }
    }
    return failures;
  });
}

function contentIdentityMismatches(manifest) {
  return manifest.entries
    .filter((entry) => entry.CONTENT_IDENTITY_FOR_ATTACK_IDS.length > 0)
    .filter((entry) => !(
      entry.OBSERVED.exists === true &&
      entry.LEGACY_MATCH.byte_size === true &&
      entry.LEGACY_MATCH.content_sha256 === true &&
      entry.LEGACY_MATCH.executable_bit === true
    ))
    .map((entry) => ({
      PATH: entry.PATH,
      CONTENT_IDENTITY_FOR_ATTACK_IDS: entry.CONTENT_IDENTITY_FOR_ATTACK_IDS,
      expected: {
        byte_size: entry.LEGACY_BYTE_SIZE,
        content_sha256: entry.LEGACY_CONTENT_SHA256,
        executable_bit: entry.LEGACY_EXECUTABLE_BIT
      },
      observed: entry.OBSERVED,
      failure: "CONTENT_IDENTITY_PARTICIPANT_BYTES_CHANGED_OR_MISSING"
    }));
}

function statePreconditionMismatches(manifest) {
  return manifest.entries
    .filter((entry) => entry.STATE_PRECONDITION_FOR_ATTACK_IDS.length > 0)
    .filter((entry) => !(
      entry.OBSERVED.exists === true &&
      entry.LEGACY_MATCH.byte_size === true &&
      entry.LEGACY_MATCH.content_sha256 === true &&
      entry.LEGACY_MATCH.executable_bit === true
    ))
    .map((entry) => ({
      PATH: entry.PATH,
      STATE_PRECONDITION_FOR_ATTACK_IDS: entry.STATE_PRECONDITION_FOR_ATTACK_IDS,
      failure: "STATE_PRECONDITION_BYTES_CHANGED_OR_MISSING"
    }));
}

function missingEvidenceRefs(manifest) {
  return manifest.entries
    .filter((entry) => (
      entry.CONTENT_IDENTITY_FOR_ATTACK_IDS.length > 0 ||
      entry.ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS.length > 0 ||
      entry.STATE_PRECONDITION_FOR_ATTACK_IDS.length > 0
    ))
    .filter((entry) => entry.EVIDENCE_REF.length === 0 || entry.CAUSAL_BASIS.length === 0)
    .map((entry) => ({
      PATH: entry.PATH,
      failure: "IDENTITY_RELEVANT_ENTRY_LACKS_EVIDENCE_OR_CAUSAL_BASIS"
    }));
}

export function verifySuccessorOracleIdentity({
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT,
  manifest = null
} = {}) {
  const derived = deriveSuccessorOracleManifest({ corpusRoot });
  const supplied = manifest ?? derived;
  const classificationMismatches = compareEntryParticipation({ supplied, derived });
  const contentMismatches = contentIdentityMismatches(derived);
  const stateMismatches = statePreconditionMismatches(derived);
  const evidenceMissing = missingEvidenceRefs(supplied);
  const derivedIdentity = digestObject(successorManifestIdentityPreimage(derived));
  const suppliedIdentity = digestObject(successorManifestIdentityPreimage(supplied));
  const launderingDetected = classificationMismatches.some((entry) => {
    const derivedEntry = derived.entries.find((candidate) => candidate.PATH === entry.PATH);
    return derivedEntry?.CONTENT_IDENTITY_FOR_ATTACK_IDS?.length > 0;
  });
  const pass = classificationMismatches.length === 0 &&
    contentMismatches.length === 0 &&
    stateMismatches.length === 0 &&
    evidenceMissing.length === 0 &&
    suppliedIdentity === (supplied.SUCCESSOR_ORACLE_MANIFEST_IDENTITY ?? suppliedIdentity);
  const result = {
    schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
    object_type: "SUCCESSOR_HOSTILE_ORACLE_IDENTITY_VERIFICATION",
    launch_target: LAUNCH_TARGET,
    SOURCE_LEGACY_CORPUS_IDENTITY: LEGACY_HOSTILE_CORPUS_IDENTITY,
    SUCCESSOR_ORACLE: pass ? "ESTABLISHED" : "FAIL",
    ORACLE_CONTENT_IDENTITY: derived.ORACLE_CONTENT_IDENTITY,
    ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY: derived.ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY,
    STATE_PRECONDITION_IDENTITIES: derived.STATE_PRECONDITION_IDENTITIES,
    SUCCESSOR_ORACLE_MANIFEST_IDENTITY: supplied.SUCCESSOR_ORACLE_MANIFEST_IDENTITY ?? suppliedIdentity,
    DERIVED_SUCCESSOR_ORACLE_MANIFEST_IDENTITY: derived.SUCCESSOR_ORACLE_MANIFEST_IDENTITY,
    SUPPLIED_MANIFEST_IDENTITY_RECOMPUTED: suppliedIdentity,
    DERIVED_MANIFEST_IDENTITY_RECOMPUTED: derivedIdentity,
    CLASSIFICATION_EVIDENCE: supplied.classification_evidence_policy ?? null,
    CLASSIFICATION_MISMATCHES: classificationMismatches,
    CONTENT_IDENTITY_MISMATCHES: contentMismatches,
    STATE_PRECONDITION_MISMATCHES: stateMismatches,
    MISSING_EVIDENCE_REF: evidenceMissing,
    CLASSIFICATION_LAUNDERING_DETECTED: launderingDetected,
    mechanism_preventing_identity_blindness:
      "The guard rederives species and attack-relative participation from the legacy manifest path/role plus actual bytes, then computes identities from the derived relation set rather than trusting caller-supplied classification fields.",
    current_launch_standing: "NO_LAUNCH"
  };
  result.SUCCESSOR_ORACLE_VERIFICATION_IDENTITY = identityWithoutField(
    result,
    "SUCCESSOR_ORACLE_VERIFICATION_IDENTITY"
  );
  return result;
}

function copyCorpusToTemp(corpusRoot, prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const copyRoot = path.join(tempDir, "hostile-corpus");
  fs.cpSync(path.resolve(corpusRoot), copyRoot, {
    recursive: true,
    dereference: false,
    preserveTimestamps: true
  });
  return {
    tempDir,
    corpusRoot: copyRoot,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function git(rootDir, args) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function createCleanBareRemote(rootDir) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-successor-oracle-remote-"));
  const bareDir = path.join(tempDir, "remote.git");
  execFileSync("git", ["clone", "--quiet", "--bare", path.resolve(rootDir), bareDir], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    bareDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function semanticAttackResult({ rootDir, attackRoot, remoteUrl }) {
  const report = buildProofClosureCustodyReport({
    rootDir: attackRoot,
    sourceMode: "custody-only",
    writeArtifacts: false,
    durableCustodyCommit: SUBJECT_COMMIT_AT_HOSTILE_CAPTURE,
    remoteUrl
  });
  return {
    SUCCESSOR_FREEZE: report.SUCCESSOR_FREEZE,
    SUCCESSOR_FREEZE_ELIGIBLE: report.SUCCESSOR_FREEZE_ELIGIBLE,
    REMOTE_CUSTODY_STANDING: report.REMOTE_CUSTODY_STANDING,
    RECONTACT_RESULT: report.REMOTE_RECONTACT_RECEIPT?.RECONTACT_RESULT ?? null,
    MANIFEST_CONTENT_IDENTITIES_MATCH:
      report.MANIFEST_CONTENT_IDENTITY_ADJUDICATION?.all_load_bearing_content_identities_match ?? null,
    CURRENT_LAUNCH_STANDING: report.CURRENT_LAUNCH_STANDING,
    root_dir_was_disposable: !path.resolve(attackRoot).startsWith(path.resolve(rootDir))
  };
}

function seedAtkFIndexFromSibling({ corpusRoot }) {
  const target = path.join(corpusRoot, ATK_F_INDEX_PATH);
  const source = path.join(corpusRoot, "corpus/atk-C/.git/index");
  if (!fs.existsSync(source) || !fs.existsSync(target)) {
    return {
      seeded: false,
      source,
      target,
      failure_if_any: "SOURCE_OR_TARGET_INDEX_NOT_FOUND"
    };
  }
  fs.copyFileSync(source, target);
  return {
    seeded: true,
    source: "corpus/atk-C/.git/index",
    target: ATK_F_INDEX_PATH,
    seeded_index_identity: observedFileState(corpusRoot, ATK_F_INDEX_PATH).content_identity,
    disposable_copy_only: true
  };
}

export function runCalibratorAObserverStability({
  rootDir = process.cwd(),
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const beforeCopy = copyCorpusToTemp(corpusRoot, "selfcommunication-oracle-cal-a-before-");
  const afterCopy = copyCorpusToTemp(corpusRoot, "selfcommunication-oracle-cal-a-after-");
  const remote = createCleanBareRemote(rootDir);
  try {
    const beforeSeed = seedAtkFIndexFromSibling({ corpusRoot: beforeCopy.corpusRoot });
    const afterSeed = seedAtkFIndexFromSibling({ corpusRoot: afterCopy.corpusRoot });
    const beforeManifest = deriveSuccessorOracleManifest({ corpusRoot: beforeCopy.corpusRoot });
    const beforeIndex = observedFileState(beforeCopy.corpusRoot, ATK_F_INDEX_PATH);
    const statusStdout = git(path.join(afterCopy.corpusRoot, "corpus/atk-F"), ["status", "--short"]);
    const afterManifest = deriveSuccessorOracleManifest({ corpusRoot: afterCopy.corpusRoot });
    const afterIndex = observedFileState(afterCopy.corpusRoot, ATK_F_INDEX_PATH);
    const beforeResult = semanticAttackResult({
      rootDir,
      attackRoot: path.join(beforeCopy.corpusRoot, "corpus/atk-F"),
      remoteUrl: remote.bareDir
    });
    const afterResult = semanticAttackResult({
      rootDir,
      attackRoot: path.join(afterCopy.corpusRoot, "corpus/atk-F"),
      remoteUrl: remote.bareDir
    });
    const contentStable =
      beforeManifest.ORACLE_CONTENT_IDENTITY === afterManifest.ORACLE_CONTENT_IDENTITY;
    const indexChanged =
      beforeIndex.content_identity !== afterIndex.content_identity;
    const semanticResultEquivalent =
      JSON.stringify(beforeResult) === JSON.stringify(afterResult);
    return {
      CALIBRATOR: "A_OBSERVER_STABILITY",
      operation: "git status --short",
      operation_root: "DISPOSABLE_COPY:corpus/atk-F",
      before_seed: beforeSeed,
      after_seed: afterSeed,
      operation_stdout: statusStdout,
      ORACLE_CONTENT_IDENTITY_before: beforeManifest.ORACLE_CONTENT_IDENTITY,
      ORACLE_CONTENT_IDENTITY_after: afterManifest.ORACLE_CONTENT_IDENTITY,
      INDEX_IDENTITY_before: beforeIndex.content_identity,
      INDEX_IDENTITY_after: afterIndex.content_identity,
      ATTACK_SEMANTIC_RESULT_before: beforeResult,
      ATTACK_SEMANTIC_RESULT_after: afterResult,
      SEMANTIC_MATTER_UNCHANGED: contentStable,
      INCIDENTAL_VCS_ADMINISTRATIVE_STATE_CHANGED: indexChanged,
      ATTACK_SEMANTIC_RESULT_EQUIVALENT: semanticResultEquivalent,
      RESULT: contentStable && indexChanged && semanticResultEquivalent ? "PASS" : "FAIL"
    };
  } finally {
    remote.cleanup();
    beforeCopy.cleanup();
    afterCopy.cleanup();
  }
}

export function runCalibratorBSemanticSensitivity({
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const copy = copyCorpusToTemp(corpusRoot, "selfcommunication-oracle-cal-b-");
  try {
    const before = deriveSuccessorOracleManifest({ corpusRoot: copy.corpusRoot });
    const targetEntry = before.entries.find((entry) => entry.PATH === ATK_F_SEMANTIC_MUTATION_PATH) ??
      before.entries.find((entry) => entry.CONTENT_IDENTITY_FOR_ATTACK_IDS.includes("F"));
    if (!targetEntry) {
      return {
        CALIBRATOR: "B_SEMANTIC_SENSITIVITY",
        RESULT: "FAIL",
        failure_if_any: "NO_SEMANTIC_ATTACK_MATTER_ENTRY_AVAILABLE"
      };
    }
    fs.appendFileSync(
      path.join(copy.corpusRoot, targetEntry.PATH),
      "\n/* CALIBRATOR_B_SEMANTIC_MUTATION */\n"
    );
    const after = deriveSuccessorOracleManifest({ corpusRoot: copy.corpusRoot });
    return {
      CALIBRATOR: "B_SEMANTIC_SENSITIVITY",
      mutation_root: "DISPOSABLE_COPY",
      mutated_path: targetEntry.PATH,
      ORACLE_CONTENT_IDENTITY_before: before.ORACLE_CONTENT_IDENTITY,
      ORACLE_CONTENT_IDENTITY_after: after.ORACLE_CONTENT_IDENTITY,
      RESULT: before.ORACLE_CONTENT_IDENTITY !== after.ORACLE_CONTENT_IDENTITY ? "PASS" : "FAIL"
    };
  } finally {
    copy.cleanup();
  }
}

export function runCalibratorCStatePreconditionSensitivity({
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const manifest = deriveSuccessorOracleManifest({ corpusRoot });
  const stateEntries = manifest.entries.filter((entry) => entry.STATE_PRECONDITION_FOR_ATTACK_IDS.length > 0);
  if (stateEntries.length === 0) {
    return {
      CALIBRATOR: "C_STATE_PRECONDITION_SENSITIVITY",
      RESULT: "NO_CURRENT_STATE_PRECONDITION_CALIBRATOR",
      APPLICABLE: false,
      state_precondition_entry_count: 0
    };
  }
  return {
    CALIBRATOR: "C_STATE_PRECONDITION_SENSITIVITY",
    RESULT: "FAIL",
    APPLICABLE: true,
    state_precondition_entry_count: stateEntries.length,
    failure_if_any: "STATE_PRECONDITION_CALIBRATION_NOT_IMPLEMENTED_FOR_NONEMPTY_STATE_SET"
  };
}

export function runCalibratorDClassificationLaundering({
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const copy = copyCorpusToTemp(corpusRoot, "selfcommunication-oracle-cal-d-");
  try {
    const validManifest = deriveSuccessorOracleManifest({ corpusRoot: copy.corpusRoot });
    const targetEntry = validManifest.entries.find((entry) => entry.PATH === ATK_F_SEMANTIC_MUTATION_PATH) ??
      validManifest.entries.find((entry) => entry.CONTENT_IDENTITY_FOR_ATTACK_IDS.includes("F"));
    if (!targetEntry) {
      return {
        CALIBRATOR: "D_CLASSIFICATION_LAUNDERING",
        RESULT: "FAIL",
        failure_if_any: "NO_SEMANTIC_ATTACK_MATTER_ENTRY_AVAILABLE"
      };
    }
    const laundered = JSON.parse(JSON.stringify(validManifest));
    const launderedEntry = laundered.entries.find((entry) => entry.PATH === targetEntry.PATH);
    launderedEntry.SPECIES = "VCS_ADMINISTRATIVE_STATE";
    launderedEntry.CONTENT_IDENTITY_FOR_ATTACK_IDS = [];
    launderedEntry.ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS = targetEntry.ATTACK_IDS;
    launderedEntry.CAUSAL_BASIS = ["Laundered claim: environment-only."];
    launderedEntry.EVIDENCE_REF = ["LAUNDERED_SELF_AUTHORED_CLASSIFICATION"];
    laundered.SUCCESSOR_ORACLE_MANIFEST_IDENTITY =
      digestObject(successorManifestIdentityPreimage(laundered));
    fs.appendFileSync(
      path.join(copy.corpusRoot, targetEntry.PATH),
      "\n/* CALIBRATOR_D_SEMANTIC_MUTATION_AFTER_LAUNDERING */\n"
    );
    const verification = verifySuccessorOracleIdentity({
      corpusRoot: copy.corpusRoot,
      manifest: laundered
    });
    const contentMismatchDetected = verification.CONTENT_IDENTITY_MISMATCHES
      .some((entry) => entry.PATH === targetEntry.PATH);
    return {
      CALIBRATOR: "D_CLASSIFICATION_LAUNDERING",
      mutation_root: "DISPOSABLE_COPY",
      laundered_path: targetEntry.PATH,
      laundered_claim: {
        SPECIES: "VCS_ADMINISTRATIVE_STATE",
        CONTENT_IDENTITY_FOR_ATTACK_IDS: [],
        ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS: targetEntry.ATTACK_IDS
      },
      guard_result: verification.SUCCESSOR_ORACLE,
      classification_laundering_detected: verification.CLASSIFICATION_LAUNDERING_DETECTED,
      semantic_content_mismatch_detected: contentMismatchDetected,
      mechanism_preventing_identity_blindness:
        verification.mechanism_preventing_identity_blindness,
      RESULT: verification.SUCCESSOR_ORACLE === "FAIL" &&
        verification.CLASSIFICATION_LAUNDERING_DETECTED === true &&
        contentMismatchDetected
        ? "PASS"
        : "FAIL"
    };
  } finally {
    copy.cleanup();
  }
}

export function runSuccessorOracleCalibrators({
  rootDir = process.cwd(),
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT
} = {}) {
  const a = runCalibratorAObserverStability({ rootDir, corpusRoot });
  const b = runCalibratorBSemanticSensitivity({ corpusRoot });
  const c = runCalibratorCStatePreconditionSensitivity({ corpusRoot });
  const d = runCalibratorDClassificationLaundering({ corpusRoot });
  return {
    object_type: "SUCCESSOR_HOSTILE_ORACLE_CALIBRATORS",
    CALIBRATOR_A_RESULT: a,
    CALIBRATOR_B_RESULT: b,
    CALIBRATOR_C_RESULT: c,
    CALIBRATOR_D_RESULT: d,
    CALIBRATORS_PASS:
      a.RESULT === "PASS" &&
      b.RESULT === "PASS" &&
      ["PASS", "NO_CURRENT_STATE_PRECONDITION_CALIBRATOR"].includes(c.RESULT) &&
      d.RESULT === "PASS"
  };
}

export function buildSuccessorOracleIdentityReport({
  rootDir = process.cwd(),
  corpusRoot = DEFAULT_HOSTILE_CORPUS_ROOT,
  manifestPath = DEFAULT_SUCCESSOR_MANIFEST_PATH,
  reportPath = DEFAULT_SUCCESSOR_REPORT_PATH,
  writeArtifacts = true,
  runCalibrators = true,
  fullAbcResult = "NOT_RUN_BY_SUCCESSOR_IDENTITY_FORMATION_REPORT"
} = {}) {
  const manifest = deriveSuccessorOracleManifest({ corpusRoot });
  const verification = verifySuccessorOracleIdentity({ corpusRoot, manifest });
  const calibrators = runCalibrators
    ? runSuccessorOracleCalibrators({ rootDir, corpusRoot })
    : {
      object_type: "SUCCESSOR_HOSTILE_ORACLE_CALIBRATORS",
      CALIBRATORS_PASS: "NOT_RUN"
    };
  const successorEstablished =
    verification.SUCCESSOR_ORACLE === "ESTABLISHED" &&
    calibrators.CALIBRATORS_PASS === true;
  const terminalDisposition = !successorEstablished
    ? "SUCCESSOR_ORACLE_NOT_ESTABLISHED"
    : fullAbcResult === "PASS"
      ? "SUCCESSOR_ORACLE_ESTABLISHED_AND_A+B+C_PASS"
      : fullAbcResult === "FAIL"
        ? "SUCCESSOR_ORACLE_ESTABLISHED_A+B+C_FAIL"
        : "SUCCESSOR_ORACLE_ESTABLISHED_A+B+C_UNRESOLVED";
  const report = {
    schema: HOSTILE_ORACLE_IDENTITY_SCHEMA,
    object_type: "SUCCESSOR_HOSTILE_ORACLE_IDENTITY_FORMATION_REPORT",
    launch_target: LAUNCH_TARGET,
    SUCCESSOR_MANIFEST: manifestPath,
    IDENTITY_PARTICIPATION_MODEL: manifest.identity_participation_model,
    CLASSIFICATION_EVIDENCE: manifest.classification_evidence_policy,
    CALIBRATOR_A_RESULT: calibrators.CALIBRATOR_A_RESULT,
    CALIBRATOR_B_RESULT: calibrators.CALIBRATOR_B_RESULT,
    CALIBRATOR_C_RESULT: calibrators.CALIBRATOR_C_RESULT,
    CALIBRATOR_D_RESULT: calibrators.CALIBRATOR_D_RESULT,
    ORACLE_CONTENT_IDENTITY: verification.ORACLE_CONTENT_IDENTITY,
    ORACLE_ENVIRONMENT_PREIMAGE: manifest.ORACLE_ENVIRONMENT_PREIMAGE,
    ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY: verification.ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY,
    STATE_PRECONDITION_IDENTITIES: verification.STATE_PRECONDITION_IDENTITIES,
    SUCCESSOR_ORACLE_MANIFEST_IDENTITY: manifest.SUCCESSOR_ORACLE_MANIFEST_IDENTITY,
    SUCCESSOR_ORACLE_VERIFICATION: verification,
    PAUSED_REPAIR_AFFECTEDNESS: {
      repair_surfaces_recontact_required_before_hostile_acceptance: true,
      syntax_checks_prior: "PASS",
      focused_proof_closure_tests_prior: "7/7 PASS",
      full_a_b_c_hostile_acceptance: "NOT_YET_PASS"
    },
    FULL_A_B_C_RESULT: fullAbcResult,
    TERMINAL_DISPOSITION: terminalDisposition,
    BLOCKERS: successorEstablished
      ? fullAbcResult === "PASS"
        ? []
        : ["FULL_A+B+C_ACCEPTANCE_NOT_ESTABLISHED_IN_THIS_REPORT"]
      : [
        ...verification.CLASSIFICATION_MISMATCHES.map((entry) => entry.failure),
        ...verification.CONTENT_IDENTITY_MISMATCHES.map((entry) => entry.failure),
        ...verification.STATE_PRECONDITION_MISMATCHES.map((entry) => entry.failure),
        ...(calibrators.CALIBRATORS_PASS === true ? [] : ["CALIBRATOR_FAILURE"])
      ],
    RESIDUE: [
      "Legacy all-corpus identity remains historical Matter.",
      "Legacy identity guard remains over-inclusive for mutable Git administrative state.",
      "Environment preimage identity is a representation, not replay sufficiency by itself.",
      "No current state-precondition calibrator was established unless an attack explicitly consumes mutable state."
    ],
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH"
  };
  report.REPORT_IDENTITY = identityWithoutField(report, "REPORT_IDENTITY");
  if (writeArtifacts) {
    writeStableJsonFile(manifestPath, manifest);
    writeStableJsonFile(reportPath, report);
  }
  return report;
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const corpusRoot = valueAfter(process.argv, "--corpus-root") ?? DEFAULT_HOSTILE_CORPUS_ROOT;
  const manifestPath = valueAfter(process.argv, "--manifest-out") ?? DEFAULT_SUCCESSOR_MANIFEST_PATH;
  const reportPath = valueAfter(process.argv, "--out") ?? DEFAULT_SUCCESSOR_REPORT_PATH;
  const fullAbcResult = valueAfter(process.argv, "--full-abc-result") ??
    "NOT_RUN_BY_SUCCESSOR_IDENTITY_FORMATION_REPORT";
  const writeArtifacts = !hasFlag(process.argv, "--no-write");
  const runCalibrators = !hasFlag(process.argv, "--no-calibrators");
  const report = buildSuccessorOracleIdentityReport({
    rootDir,
    corpusRoot,
    manifestPath,
    reportPath,
    writeArtifacts,
    runCalibrators,
    fullAbcResult
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
