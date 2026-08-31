#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digestObject } from "./ourself-communication-matter.mjs";
import {
  adjudicateT2Predecessor,
  LAUNCH_CONTROL_DISPOSITIONS,
  recomputeG6CurrentStanding,
  SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA
} from "./ourself-selfcommunication-launch-readiness.mjs";
import {
  contentIdentityForBuffer,
  contentIdentityForFile,
  stableJson
} from "./ourself-selfcommunication-launch-subject-custody.mjs";
import {
  buildSuccessorDelta,
  SUCCESSOR_SUBJECT_REF
} from "./ourself-selfcommunication-proof-carrying-succession.mjs";
import {
  adjudicateT2RequiredBindings,
  buildT2PredecessorReceiptFromBindings,
  CLAUDE_T2_SESSION_ID,
  DEFAULT_C2_SESSION_EVIDENCE_PATH,
  DEFAULT_CLAUDE_SESSION_FILE,
  DEFAULT_CUSTODY_COMMIT,
  DEFAULT_CUSTODY_RECEIPT_PATH,
  DEFAULT_CUSTODY_TREE,
  DEFAULT_LAUNCH_SUBJECT_IDENTITY,
  DEFAULT_MANIFEST_PATH as DEFAULT_PREDECESSOR_MANIFEST_PATH,
  DEFAULT_PATIENT_ZERO_T2_JSON,
  extractBoundedT2Evidence,
  PARTICIPATION_REF,
  PATIENT_ZERO_MATTER_REF,
  T2_BOUNDING_CEILING
} from "./ourself-selfcommunication-t2-predecessor-binding.mjs";

export const PROOF_CLOSURE_CUSTODY_SCHEMA =
  "ourself.selfcommunication-proof-closure-custody.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_OUTPUT_DIR =
  "specimens/selfcommunication-proof-closure-custody-v0-001";
export const DEFAULT_PREIMAGE_PATH =
  `${DEFAULT_OUTPUT_DIR}/t2-successor-proof-preimage.json`;
export const DEFAULT_MANIFEST_PATH =
  `${DEFAULT_OUTPUT_DIR}/proof-closure-manifest.json`;
export const DEFAULT_REPORT_PATH =
  `${DEFAULT_OUTPUT_DIR}/proof-closure-custody-report.json`;
export const CURRENT_STRUCTURAL_IDENTITY_CLAIM =
  "sha256:b0652e62b8eeb2f3cdb19f8e235b43548ba1dc118ca0f220d6189e8997754074";
export const DURABLE_ONLY_STRUCTURAL_RECOMPUTATION =
  "sha256:8f6a3a3cdd453d4b94cf0f691842b1412d3271928ea664724df682915f82d4df";
export const STALE_REMOTE_BLOCKER_STRING =
  "REMOTE_REPLICATED_CUSTODY_NOT_ESTABLISHED";

export const VERIFICATION_LOGIC_PATHS = Object.freeze([
  "tools/ourself-selfcommunication-proof-closure-custody.mjs",
  "tools/ourself-selfcommunication-proof-carrying-succession.mjs",
  "tools/ourself-selfcommunication-t2-predecessor-binding.mjs",
  "tools/ourself-selfcommunication-launch-readiness.mjs",
  "tools/ourself-selfcommunication-launch-subject-custody.mjs",
  "tools/ourself-communication-matter.mjs",
  "tools/ourself-commline-observation-gap.mjs",
  "tools/ourself-observation-authorship.mjs",
  "tools/ourself-transport-independent-roundtrip.mjs"
]);

const PREDECESSOR_CUSTODY_PATHS = Object.freeze([
  DEFAULT_PREDECESSOR_MANIFEST_PATH,
  DEFAULT_CUSTODY_RECEIPT_PATH,
  DEFAULT_C2_SESSION_EVIDENCE_PATH
]);

const T2_OBLIGATION_IDS = Object.freeze([
  "B_subject",
  "B_patient_zero",
  "B_participation",
  "B_observation_occurrence",
  "B_standing_ceiling"
]);

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
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

function git(rootDir, args, { encoding = "utf8" } = {}) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding,
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

function gitBytesAt(rootDir, commit, relativePath) {
  return git(rootDir, ["show", `${commit}:${relativePath}`], { encoding: "buffer" });
}

function tryGitBytesAt(rootDir, commit, relativePath) {
  try {
    return gitBytesAt(rootDir, commit, relativePath);
  } catch {
    return null;
  }
}

function gitJsonAt(rootDir, commit, relativePath) {
  const bytes = gitBytesAt(rootDir, commit, relativePath);
  return JSON.parse(bytes.toString("utf8"));
}

function gitContentIdentityAt(rootDir, commit, relativePath) {
  const bytes = tryGitBytesAt(rootDir, commit, relativePath);
  return bytes ? contentIdentityForBuffer(bytes) : null;
}

function parseContentAddressedRef(custodyRef, locator = null) {
  const match = String(custodyRef ?? "").match(/^content-addressed-local-file:(.+)#(sha256:[a-f0-9]{64})$/);
  return {
    relative_path: match ? match[1] : String(locator ?? "").replace(/^local-file:/, ""),
    expected_identity: match ? match[2] : null
  };
}

function normalizeRemoteRef(ref) {
  if (!ref || ref === "origin/main") return "refs/heads/main";
  return ref;
}

function getRemoteHead(rootDir, { remote = "origin", ref = "refs/heads/main" } = {}) {
  const remoteHead = tryGit(rootDir, ["ls-remote", remote, normalizeRemoteRef(ref)]);
  return remoteHead?.trim().split(/\s+/)[0] ?? null;
}

function getRemoteUrl(rootDir, remote = "origin") {
  return tryGit(rootDir, ["remote", "get-url", remote])?.trim() ?? null;
}

function exactCustodyPathSet({ preimagePath = DEFAULT_PREIMAGE_PATH, manifestPath = DEFAULT_MANIFEST_PATH } = {}) {
  return [
    "tools/ourself-selfcommunication-proof-closure-custody.mjs",
    "tools/ourself-selfcommunication-t2-predecessor-binding.mjs",
    "test/ourself-selfcommunication-proof-closure-custody.test.mjs",
    "test/ourself-selfcommunication-t2-predecessor-binding.test.mjs",
    preimagePath,
    manifestPath
  ];
}

function expectedContentIdentityForPath({ rootDir, manifest, preimage, relativePath, preimagePath, manifestPath }) {
  if (relativePath === preimagePath) {
    return manifest?.proof_preimage?.content_identity ??
      contentIdentityForBuffer(Buffer.from(stableJson(preimage), "utf8"));
  }
  if (relativePath === manifestPath) {
    return contentIdentityForBuffer(Buffer.from(stableJson(manifest), "utf8"));
  }
  const manifestEntry = manifest?.closure_entries?.find((entry) => entry.ENTRY_ID === `FILE:${relativePath}`);
  if (manifestEntry?.CONTENT_IDENTITY) return manifestEntry.CONTENT_IDENTITY;
  const absolutePath = path.join(rootDir, relativePath);
  return fs.existsSync(absolutePath) ? contentIdentityForFile(absolutePath) : null;
}

function recontactRequiredPathsAtCommit({
  rootDir,
  commit,
  manifest,
  preimage,
  requiredPathSet,
  preimagePath = DEFAULT_PREIMAGE_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
}) {
  return requiredPathSet.map((relativePath) => {
    const bytes = commit ? tryGitBytesAt(rootDir, commit, relativePath) : null;
    const expectedContentIdentity = expectedContentIdentityForPath({
      rootDir,
      manifest,
      preimage,
      relativePath,
      preimagePath,
      manifestPath
    });
    const resolvedContentIdentity = bytes ? contentIdentityForBuffer(bytes) : null;
    const passes = Boolean(bytes) &&
      Boolean(expectedContentIdentity) &&
      resolvedContentIdentity === expectedContentIdentity;
    return {
      path: relativePath,
      custody_ref: commit ? `git-commit-path:${commit}:${relativePath}` : null,
      recontactable: Boolean(bytes),
      resolved_content_identity: resolvedContentIdentity,
      expected_content_identity: expectedContentIdentity,
      content_identity_match: resolvedContentIdentity === expectedContentIdentity,
      passes,
      failure_if_any: passes
        ? null
        : bytes
          ? "REMOTE_PATH_CONTENT_IDENTITY_MISMATCH"
          : "REMOTE_PATH_NOT_RECONTACTABLE"
    };
  });
}

function recontactManifestAtCommit({ rootDir, commit, manifest, manifestPath = DEFAULT_MANIFEST_PATH }) {
  const bytes = commit ? tryGitBytesAt(rootDir, commit, manifestPath) : null;
  const expectedContentIdentity = manifest
    ? contentIdentityForBuffer(Buffer.from(stableJson(manifest), "utf8"))
    : null;
  if (!bytes) {
    return {
      path: manifestPath,
      recontactable: false,
      resolved_content_identity: null,
      expected_content_identity: expectedContentIdentity,
      resolved_manifest_identity: null,
      expected_manifest_identity: manifest?.proof_closure_manifest_identity ?? null,
      declared_manifest_identity: null,
      passes: false,
      failure_if_any: "REMOTE_MANIFEST_NOT_RECONTACTABLE"
    };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    parsed = null;
  }
  const resolvedContentIdentity = contentIdentityForBuffer(bytes);
  const resolvedManifestIdentity = parsed
    ? identityWithoutField(parsed, "proof_closure_manifest_identity")
    : null;
  const expectedManifestIdentity = manifest?.proof_closure_manifest_identity ?? null;
  const passes = Boolean(parsed) &&
    resolvedContentIdentity === expectedContentIdentity &&
    resolvedManifestIdentity === expectedManifestIdentity &&
    parsed.proof_closure_manifest_identity === expectedManifestIdentity;
  return {
    path: manifestPath,
    recontactable: true,
    resolved_content_identity: resolvedContentIdentity,
    expected_content_identity: expectedContentIdentity,
    resolved_manifest_identity: resolvedManifestIdentity,
    expected_manifest_identity: expectedManifestIdentity,
    declared_manifest_identity: parsed?.proof_closure_manifest_identity ?? null,
    passes,
    failure_if_any: passes ? null : "REMOTE_MANIFEST_CONTENT_OR_IDENTITY_MISMATCH"
  };
}

export function buildRemoteRecontactReceipt({
  rootDir = process.cwd(),
  remote = "origin",
  ref = "refs/heads/main",
  requiredCommit = null,
  observedCommit,
  manifest = null,
  preimage = null,
  requiredPathSet = [],
  requiredObjectRecontact = null,
  manifestMatch = null,
  observationSource = "LIVE_GIT_LS_REMOTE",
  preimagePath = DEFAULT_PREIMAGE_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const resolvedObservedCommit = observedCommit === undefined
    ? getRemoteHead(root, { remote, ref })
    : observedCommit;
  const remoteRefFreshlyRecontacted = Boolean(resolvedObservedCommit);
  const remoteRefMatchesRequiredCommit = Boolean(requiredCommit) &&
    resolvedObservedCommit === requiredCommit;
  const pathRecontact = requiredObjectRecontact ?? (
    remoteRefFreshlyRecontacted
      ? recontactRequiredPathsAtCommit({
        rootDir: root,
        commit: resolvedObservedCommit,
        manifest,
        preimage,
        requiredPathSet,
        preimagePath,
        manifestPath
      })
      : []
  );
  const manifestCheck = manifestMatch === null
    ? recontactManifestAtCommit({ rootDir: root, commit: resolvedObservedCommit, manifest, manifestPath })
    : {
      path: manifestPath,
      passes: manifestMatch === true,
      failure_if_any: manifestMatch === true ? null : "REMOTE_MANIFEST_CONTENT_OR_IDENTITY_MISMATCH"
    };
  const requiredObjectsRecontactable = pathRecontact.length > 0 &&
    pathRecontact.every((entry) => entry.passes === true);
  const remoteManifestContentMatch = manifestCheck.passes === true;
  const recontactPass = remoteRefFreshlyRecontacted &&
    remoteRefMatchesRequiredCommit &&
    requiredObjectsRecontactable &&
    remoteManifestContentMatch;
  const receipt = {
    object_type: "REMOTE_RECONTACT_RECEIPT",
    REMOTE: remote,
    REF: ref,
    OBSERVATION_SOURCE: observationSource,
    OBSERVATION_ORDER: "REMOTE_RECONTACT_PRECEDES_FREEZE_ATTEMPT",
    OBSERVED_COMMIT: resolvedObservedCommit ?? "UNRESOLVED",
    REQUIRED_COMMIT: requiredCommit ?? "UNSPECIFIED",
    COMPARISON: remoteRefMatchesRequiredCommit
      ? "MATCH"
      : remoteRefFreshlyRecontacted
        ? "MISMATCH"
        : "REMOTE_REF_UNRESOLVED",
    REMOTE_REF_FRESHLY_RECONTACTED: remoteRefFreshlyRecontacted,
    REMOTE_REF_RESOLVES_TO_REQUIRED_CUSTODY_COMMIT: remoteRefMatchesRequiredCommit,
    REQUIRED_OBJECT_RECONTACT: pathRecontact,
    REMOTE_REQUIRED_OBJECTS_RECONTACTABLE: requiredObjectsRecontactable,
    MANIFEST_MATCH: manifestCheck,
    REMOTE_MANIFEST_CONTENT_MATCH: remoteManifestContentMatch,
    RECONTACT_RESULT: recontactPass ? "PASS" : "FAIL",
    WALL_CLOCK_METADATA_IN_SEMANTIC_IDENTITY: false
  };
  receipt.REMOTE_RECONTACT_RECEIPT_IDENTITY = identityWithoutField(
    receipt,
    "REMOTE_RECONTACT_RECEIPT_IDENTITY"
  );
  return receipt;
}

function remoteRecontactEstablishesCustody({ durableCustodyCommit, remoteRecontactReceipt }) {
  return Boolean(durableCustodyCommit) &&
    remoteRecontactReceipt?.RECONTACT_RESULT === "PASS" &&
    remoteRecontactReceipt?.REQUIRED_COMMIT === durableCustodyCommit &&
    remoteRecontactReceipt?.OBSERVED_COMMIT === durableCustodyCommit &&
    remoteRecontactReceipt?.REMOTE_REF_FRESHLY_RECONTACTED === true &&
    remoteRecontactReceipt?.REMOTE_REF_RESOLVES_TO_REQUIRED_CUSTODY_COMMIT === true &&
    remoteRecontactReceipt?.REMOTE_REQUIRED_OBJECTS_RECONTACTABLE === true &&
    remoteRecontactReceipt?.REMOTE_MANIFEST_CONTENT_MATCH === true;
}

function buildQRemoteEvidenceContract({ requiredPathSet }) {
  return {
    PROPOSITION_ID: "Q_REMOTE",
    QUESTION:
      "The required successor subject is independently recontactable from the specified remote custody surface at the required subject preimage.",
    MINIMUM_EVIDENCE: [
      "REPOSITORY_IDENTITY",
      "REMOTE_IDENTITY",
      "REF",
      "OBSERVED_REMOTE_COMMIT",
      "REQUIRED_CUSTODY_COMMIT",
      "SUBJECT_REF",
      "SUBJECT_STRUCTURAL_IDENTITY",
      "PROOF_CLOSURE_MANIFEST_IDENTITY",
      "REQUIRED_OBJECT_SET",
      "RECONTACT_OPERATION_PROVENANCE"
    ],
    REQUIRED_OBJECT_SET: requiredPathSet,
    NON_SUFFICIENT_INPUTS: [
      "REMOTE_REF_LABEL",
      "REMOTE_RECONTACT_RECEIPT_SHAPE",
      "RECEIPT_BOOLEAN",
      "ADJUDICATED_LABEL",
      "CALLER_AUTHORED_FRESHNESS_CLAIM"
    ],
    FIELD_EQUALITY_NOT_BINDING_ESTABLISHED: true,
    MORE_FIELDS_NOT_MORE_PROOF: true
  };
}

export function deriveRemoteCustodyStandingForFreeze({
  rootDir = process.cwd(),
  manifest,
  preimage,
  recomputation,
  durableCustodyCommit = null,
  remote = "origin",
  remoteCustodyRef = "refs/heads/main",
  preimagePath = DEFAULT_PREIMAGE_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const ref = normalizeRemoteRef(remoteCustodyRef);
  const requiredPathSet = exactCustodyPathSet({ preimagePath, manifestPath });
  const remoteUrl = getRemoteUrl(root, remote);
  const commitType = durableCustodyCommit
    ? tryGit(root, ["cat-file", "-t", durableCustodyCommit])?.trim() ?? null
    : null;
  const receipt = buildRemoteRecontactReceipt({
    rootDir: root,
    remote,
    ref,
    requiredCommit: durableCustodyCommit,
    manifest,
    preimage,
    requiredPathSet,
    preimagePath,
    manifestPath,
    observationSource: "ADMITTED_FREEZE_BOUNDARY_REMOTE_RECONTACT"
  });
  const proofClosurePass = Object.values(recomputation?.proposition_results ?? {})
    .every((entry) => entry === "PASS");
  const subjectFit = {
    SUBJECT_REF: SUCCESSOR_SUBJECT_REF,
    SUBJECT_REF_SPECIES: "ASSIGNED_REFERENCE",
    STRUCTURAL_IDENTITY: recomputation?.successor_structural_identity ?? "UNRESOLVED",
    PROOF_CLOSURE_MANIFEST_IDENTITY: manifest?.proof_closure_manifest_identity ?? "UNRESOLVED",
    REQUIRED_CUSTODY_COMMIT: durableCustodyCommit ?? "UNSPECIFIED",
    observed_commit_matches_required_commit:
      receipt.OBSERVED_COMMIT === durableCustodyCommit && receipt.COMPARISON === "MATCH",
    manifest_identity_matches:
      receipt.MANIFEST_MATCH?.resolved_manifest_identity === manifest?.proof_closure_manifest_identity &&
      receipt.MANIFEST_MATCH?.declared_manifest_identity === manifest?.proof_closure_manifest_identity,
    every_required_path_matches_subject_preimage:
      receipt.REQUIRED_OBJECT_RECONTACT.every((entry) => entry.passes === true)
  };
  const localCustodyEstablished = commitType === "commit";
  const remoteCustodyEstablished = proofClosurePass &&
    localCustodyEstablished &&
    remoteRecontactEstablishesCustody({
      durableCustodyCommit,
      remoteRecontactReceipt: receipt
    }) &&
    subjectFit.observed_commit_matches_required_commit &&
    subjectFit.manifest_identity_matches &&
    subjectFit.every_required_path_matches_subject_preimage;
  const derivation = {
    object_type: "REMOTE_CUSTODY_STANDING_DERIVATION",
    QUESTION: buildQRemoteEvidenceContract({ requiredPathSet }),
    DERIVATION_AUTHORITY: "FREEZE_BOUNDARY_LIVE_REMOTE_RECONTACT",
    CALLER_SUPPLIED_RECEIPT_ADMITTED: false,
    CALLER_SUPPLIED_STANDING_ADMITTED: false,
    REPOSITORY_IDENTITY: {
      local_git_dir: tryGit(root, ["rev-parse", "--git-dir"])?.trim() ?? null,
      origin_url: remoteUrl
    },
    REMOTE_IDENTITY: {
      remote,
      ref,
      remote_url: remoteUrl
    },
    RECONTACT_OPERATION_PROVENANCE: {
      remote_ref_command: ["git", "ls-remote", remote, ref],
      object_recontact_operation: "git show <observed_commit>:<required_path>",
      manifest_identity_operation: "parse manifest bytes and recompute proof_closure_manifest_identity",
      execution_derived_not_caller_supplied: true
    },
    LOCAL_CUSTODY_ESTABLISHED: localCustodyEstablished,
    LOCAL_CUSTODY_COMMIT_TYPE: commitType,
    PROOF_CLOSURE_PASS: proofClosurePass,
    SUBJECT_FIT: subjectFit,
    REMOTE_RECONTACT_RECEIPT: receipt,
    REMOTE_CUSTODY_STANDING: remoteCustodyEstablished ? "REMOTE_REPLICATED" : "NOT_ESTABLISHED",
    FREEZE_ELIGIBLE_REMOTE_CUSTODY: remoteCustodyEstablished,
    REPRESENTATION_NOT_CAUSATION: true
  };
  derivation.REMOTE_CUSTODY_DERIVATION_IDENTITY = identityWithoutField(
    derivation,
    "REMOTE_CUSTODY_DERIVATION_IDENTITY"
  );
  return derivation;
}

function fileEntry(rootDir, relativePath, role, necessityClass, dependents = []) {
  const absolutePath = path.join(rootDir, relativePath);
  const exists = fs.existsSync(absolutePath);
  return {
    ENTRY_ID: `FILE:${relativePath}`,
    MATTER_SPECIES: "REPOSITORY_NATIVE_MATTER",
    CONTENT_IDENTITY: exists ? contentIdentityForFile(absolutePath) : null,
    CUSTODY_SPECIES: exists ? "GIT_COMMIT_PATH_REQUIRED_AFTER_CUSTODY" : "ABSENT",
    CUSTODY_REF: exists ? `git-commit-path:POST_CUSTODY_COMMIT:${relativePath}` : null,
    PROOF_ROLE: role,
    QUESTION_GENUS: "RECOMPUTATION",
    NECESSITY_CLASS: necessityClass,
    DEPENDENTS: dependents,
    SOURCE_RELATION: "LOCAL_WORKTREE_BYTES_TO_BE_COMMIT_ROOTED",
    REGENERABILITY: "NOT_REGENERABLE_WITHOUT_EXACT_BYTES",
    STANDING_CEILING: "RECOMPUTATION_PREIMAGE_ONLY"
  };
}

function gitCommitEntry(rootDir, commit, relativePath, role, dependents = []) {
  const objectId = tryGit(rootDir, ["rev-parse", `${commit}:${relativePath}`])?.trim() ?? null;
  const contentIdentity = gitContentIdentityAt(rootDir, commit, relativePath);
  return {
    ENTRY_ID: `GIT:${commit}:${relativePath}`,
    MATTER_SPECIES: "PREDECESSOR_REPOSITORY_MATTER",
    CONTENT_IDENTITY: contentIdentity,
    CUSTODY_SPECIES: objectId ? "GIT_COMMIT_PATH_RECONTACTABLE" : "ABSENT",
    CUSTODY_REF: objectId ? `git-commit-path:${commit}:${relativePath}` : null,
    GIT_OBJECT_ID: objectId,
    PROOF_ROLE: role,
    QUESTION_GENUS: "CUSTODY_RECONTACT",
    NECESSITY_CLASS: "EVIDENTIARY_NECESSITY",
    DEPENDENTS: dependents,
    SOURCE_RELATION: "PREDECESSOR_COMMIT_REACHABILITY",
    REGENERABILITY: "NOT_REGENERABLE_WITHOUT_GIT_HISTORY",
    STANDING_CEILING: "PREDECESSOR_CUSTODY_ONLY"
  };
}

export function recontactPredecessorLaunchSubjectFromCommit({
  rootDir = process.cwd(),
  custodyCommit = DEFAULT_CUSTODY_COMMIT,
  expectedTree = DEFAULT_CUSTODY_TREE,
  manifestPath = DEFAULT_PREDECESSOR_MANIFEST_PATH,
  custodyReceiptPath = DEFAULT_CUSTODY_RECEIPT_PATH,
  c2SessionEvidencePath = DEFAULT_C2_SESSION_EVIDENCE_PATH
} = {}) {
  const root = path.resolve(rootDir);
  const commitType = tryGit(root, ["cat-file", "-t", custodyCommit])?.trim() ?? null;
  const committedTree = tryGit(root, ["rev-parse", `${custodyCommit}^{tree}`])?.trim() ?? null;
  const currentHead = tryGit(root, ["rev-parse", "HEAD"])?.trim() ?? null;
  const commitReachableFromHead = tryGit(root, ["merge-base", "--is-ancestor", custodyCommit, "HEAD"]) !== null;
  const remoteHead = getRemoteHead(root);
  const commitReachableFromRemote = remoteHead
    ? tryGit(root, ["merge-base", "--is-ancestor", custodyCommit, remoteHead]) !== null
    : null;

  let manifest = null;
  let custodyReceipt = null;
  let c2SessionEvidence = null;
  try {
    manifest = gitJsonAt(root, custodyCommit, manifestPath);
    custodyReceipt = gitJsonAt(root, custodyCommit, custodyReceiptPath);
    c2SessionEvidence = gitJsonAt(root, custodyCommit, c2SessionEvidencePath);
  } catch {
    manifest = null;
  }

  const subjectClosureRecontact = manifest?.entries?.map((entry) => {
    if (String(entry.custody_ref).startsWith("git:blob:")) {
      const expectedObjectId = entry.custody_ref.replace("git:blob:", "");
      const relativePath = entry.locator.replace("git-worktree:", "");
      const resolvedObjectId = tryGit(root, ["rev-parse", `${custodyCommit}:${relativePath}`])?.trim() ?? null;
      const resolvedIdentity = resolvedObjectId
        ? contentIdentityForBuffer(git(root, ["cat-file", "-p", resolvedObjectId], { encoding: "buffer" }))
        : null;
      const pass = resolvedObjectId === expectedObjectId && resolvedIdentity === entry.content_identity;
      return {
        subject_entry_id: entry.subject_entry_id,
        locator: entry.locator,
        custody_species: "GIT_COMMIT_PATH",
        custody_ref: `git-commit-path:${custodyCommit}:${relativePath}`,
        resolved_git_object_id: resolvedObjectId,
        expected_git_object_id: expectedObjectId,
        resolved_content_identity: resolvedIdentity,
        expected_content_identity: entry.content_identity,
        passes: pass,
        failure_if_any: pass ? null : "GIT_COMMIT_RECONTACT_MISMATCH"
      };
    }
    if (entry.custody_species === "CONTENT_ADDRESSED_LOCAL_FILE") {
      const parsed = parseContentAddressedRef(entry.custody_ref, entry.locator);
      const bytes = tryGitBytesAt(root, custodyCommit, parsed.relative_path);
      const resolvedIdentity = bytes ? contentIdentityForBuffer(bytes) : null;
      const pass = Boolean(bytes) &&
        resolvedIdentity === entry.content_identity &&
        (!parsed.expected_identity || parsed.expected_identity === resolvedIdentity);
      return {
        subject_entry_id: entry.subject_entry_id,
        locator: entry.locator,
        custody_species: "GIT_COMMIT_PATH_FOR_CONTENT_ADDRESSED_FILE",
        custody_ref: `git-commit-path:${custodyCommit}:${parsed.relative_path}`,
        resolved_content_identity: resolvedIdentity,
        expected_content_identity: entry.content_identity,
        passes: pass,
        failure_if_any: pass ? null : "CONTENT_ADDRESSED_COMMIT_RECONTACT_MISMATCH"
      };
    }
    return {
      subject_entry_id: entry.subject_entry_id,
      locator: entry.locator,
      custody_species: entry.custody_species,
      custody_ref: entry.custody_ref,
      resolved_content_identity: null,
      expected_content_identity: entry.content_identity,
      passes: false,
      failure_if_any: "UNKNOWN_CUSTODY_SPECIES"
    };
  }) ?? [];

  const manifestContentIdentity = gitContentIdentityAt(root, custodyCommit, manifestPath);
  const custodyReceiptContentIdentity = gitContentIdentityAt(root, custodyCommit, custodyReceiptPath);
  const custodyReceiptIdentity = custodyReceipt ? identityWithoutField(custodyReceipt, "receipt_identity") : null;
  const c2Entry = manifest?.entries?.find((entry) => entry.subject_entry_id === "C2:EXTERNAL_SESSION_CONTEXT") ?? null;
  const t2CandidateEntries = manifest?.entries?.filter((entry) => (
    entry.required_for ?? []
  ).includes("T2_REBIND_ATTEMPT")) ?? [];
  const everyMemberPass = subjectClosureRecontact.every((entry) => entry.passes === true);
  const result = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "PREDECESSOR_LAUNCH_SUBJECT_RECONTACT_WITHOUT_HEAD_PIN",
    launch_target: LAUNCH_TARGET,
    custody_commit: custodyCommit,
    expected_tree: expectedTree,
    resolved_tree: committedTree,
    current_head: currentHead,
    head_equality_required: false,
    predecessor_commit_reachable_from_current_head: commitReachableFromHead,
    predecessor_commit_reachable_from_remote_main: commitReachableFromRemote,
    remote_main: remoteHead,
    manifest_path: manifestPath,
    manifest_content_identity: manifestContentIdentity,
    launch_subject_manifest_identity: manifest?.launch_subject_manifest_identity ?? null,
    custody_receipt_path: custodyReceiptPath,
    custody_receipt_content_identity: custodyReceiptContentIdentity,
    custody_receipt_identity: custodyReceiptIdentity,
    subject_closure_recontact: subjectClosureRecontact,
    every_required_manifest_member_recontactable: everyMemberPass,
    subject_closure_recontact_pass:
      commitType === "commit" &&
      committedTree === expectedTree &&
      commitReachableFromHead === true &&
      everyMemberPass,
    launch_subject_custody:
      commitType === "commit" &&
      committedTree === expectedTree &&
      commitReachableFromHead === true &&
      everyMemberPass
        ? "ESTABLISHED"
        : "NOT_ESTABLISHED",
    launch_subject_identity:
      commitType === "commit" &&
      committedTree === expectedTree &&
      commitReachableFromHead === true &&
      everyMemberPass
        ? DEFAULT_LAUNCH_SUBJECT_IDENTITY
        : "NOT_ESTABLISHED",
    identity_source: "ASSIGNED_PREDECESSOR_SUBJECT_REF_RECONTACTED_THROUGH_COMMIT_REACHABILITY",
    manifest_links: {
      c2_external_session_context: c2Entry,
      c2_external_session_evidence: c2SessionEvidence,
      t2_candidate_predecessor_entries: t2CandidateEntries
    },
    failures: [
      ...(commitType === "commit" ? [] : ["PREDECESSOR_CUSTODY_COMMIT_ABSENT"]),
      ...(committedTree === expectedTree ? [] : ["PREDECESSOR_CUSTODY_TREE_MISMATCH"]),
      ...(commitReachableFromHead ? [] : ["PREDECESSOR_CUSTODY_COMMIT_NOT_REACHABLE_FROM_HEAD"]),
      ...subjectClosureRecontact.filter((entry) => entry.passes !== true).map((entry) => entry.failure_if_any)
    ].filter(Boolean)
  };
  result.recontact_identity = digestObject(result);
  return result;
}

function buildHistoricalExtract({
  entryId,
  sourceObjectIdentity,
  sourceLocator,
  sourceRangeOrSelector,
  extractionRule,
  content,
  proofGenus,
  questionSupported,
  claimsSupported,
  claimsNotSupported,
  temporalRelation,
  standingCeiling
}) {
  const contentBuffer = Buffer.from(typeof content === "string" ? content : stableJson(content), "utf8");
  const extract = {
    ENTRY_ID: entryId,
    SOURCE_OBJECT_IDENTITY: sourceObjectIdentity,
    SOURCE_LOCATOR: sourceLocator,
    SOURCE_RANGE_OR_SELECTOR: sourceRangeOrSelector,
    SELECTOR_SPECIES: sourceRangeOrSelector?.selector_species ?? "UNSPECIFIED_SELECTOR",
    EXTRACTION_RULE: extractionRule,
    EXTRACT_CONTENT_IDENTITY: contentIdentityForBuffer(contentBuffer),
    EXTRACT_CONTENT: content,
    PROOF_GENUS: proofGenus,
    QUESTION_SUPPORTED: questionSupported,
    CLAIMS_SUPPORTED: claimsSupported,
    CLAIMS_NOT_SUPPORTED: claimsNotSupported,
    TEMPORAL_RELATION: temporalRelation,
    STANDING_CEILING: standingCeiling,
    EXTRACT_IDENTITY_NOT_SOURCE_IDENTITY: true,
    EXTRACT_AUTHENTICITY_REQUIRES_SOURCE_SELECTOR_AND_EXTRACT: true
  };
  extract.EXTRACT_IDENTITY = identityWithoutField(extract, "EXTRACT_IDENTITY");
  return extract;
}

export function buildHistoricalExtractsFromT2Evidence(evidence) {
  const transcript = evidence.transcript_evidence ?? {};
  const sourceIdentity = evidence.source_identity ?? {};
  const sourceLocator = evidence.source_locator ?? {};
  const jsonlRule =
    "Parse Claude JSONL by newline, select exact line_number plus uuid/tool_use_id, then extract the named content field without reauthoring the occurrence.";
  return [
    buildHistoricalExtract({
      entryId: "EXTRACT:T2_T1_T15_PRE_STATE",
      sourceObjectIdentity: sourceIdentity.claude_session_file,
      sourceLocator: sourceLocator.claude_session_file,
      sourceRangeOrSelector: {
        selector_species: "CLAUDE_JSONL_LINE_UUID_AND_CONTENT_FIELD",
        line_number: transcript.t1_pre_state?.line_number ?? null,
        uuid: transcript.t1_pre_state?.uuid ?? null,
        session_id: CLAUDE_T2_SESSION_ID,
        field: "message.content[].content"
      },
      extractionRule: jsonlRule,
      content: transcript.t1_pre_state_content ?? "",
      proofGenus: "BINDING",
      questionSupported: "B_participation",
      claimsSupported: ["Patient Zero was false through T1/T1.5 in the same T2 predecessor trajectory."],
      claimsNotSupported: ["Successor launch authority", "Claude re-observation"],
      temporalRelation: "PREDECESSOR_T2_PRE_STATE",
      standingCeiling: T2_BOUNDING_CEILING
    }),
    buildHistoricalExtract({
      entryId: "EXTRACT:T2_TOOL_USE_COMMAND",
      sourceObjectIdentity: sourceIdentity.claude_session_file,
      sourceLocator: sourceLocator.claude_session_file,
      sourceRangeOrSelector: {
        selector_species: "CLAUDE_JSONL_LINE_UUID_TOOL_USE_ID_AND_INPUT_COMMAND",
        line_number: transcript.tool_use?.line_number ?? null,
        uuid: transcript.tool_use?.uuid ?? null,
        tool_use_id: transcript.tool_use?.tool_use_id ?? null,
        session_id: CLAUDE_T2_SESSION_ID,
        field: "message.content[].input.command"
      },
      extractionRule: jsonlRule,
      content: transcript.tool_use_command ?? "",
      proofGenus: "OBSERVATION",
      questionSupported: "B_observation_occurrence",
      claimsSupported: ["The T2 predecessor occurrence issued the GitHub comment recontact command."],
      claimsNotSupported: ["Patient Zero truth", "Retroactive successor authorship"],
      temporalRelation: "PREDECESSOR_T2_OBSERVATION_ATTEMPT",
      standingCeiling: T2_BOUNDING_CEILING
    }),
    buildHistoricalExtract({
      entryId: "EXTRACT:T2_TOOL_RESULT_CONTENT",
      sourceObjectIdentity: sourceIdentity.claude_session_file,
      sourceLocator: sourceLocator.claude_session_file,
      sourceRangeOrSelector: {
        selector_species: "CLAUDE_JSONL_LINE_PARENT_UUID_TOOL_USE_ID_AND_RESULT_CONTENT",
        line_number: transcript.tool_result?.line_number ?? null,
        uuid: transcript.tool_result?.uuid ?? null,
        parent_uuid: transcript.tool_result?.parent_uuid ?? null,
        source_tool_assistant_uuid: transcript.tool_result?.source_tool_assistant_uuid ?? null,
        tool_use_id: transcript.tool_result?.tool_use_id ?? null,
        session_id: CLAUDE_T2_SESSION_ID,
        field: "message.content[].content"
      },
      extractionRule: jsonlRule,
      content: transcript.tool_result_content ?? "",
      proofGenus: "OBSERVATION",
      questionSupported: "B_observation_occurrence",
      claimsSupported: ["The T2 predecessor result reported exact Patient Zero recontact output."],
      claimsNotSupported: ["New observation by this successor", "G7 closure"],
      temporalRelation: "PREDECESSOR_T2_OBSERVATION_RESULT",
      standingCeiling: T2_BOUNDING_CEILING
    }),
    buildHistoricalExtract({
      entryId: "EXTRACT:T2_RECEIPT_TEXT",
      sourceObjectIdentity: sourceIdentity.claude_session_file,
      sourceLocator: sourceLocator.claude_session_file,
      sourceRangeOrSelector: {
        selector_species: "CLAUDE_JSONL_LINE_UUID_TEXT_RECEIPT",
        line_number: transcript.receipt_text?.line_number ?? null,
        uuid: transcript.receipt_text?.uuid ?? null,
        session_id: CLAUDE_T2_SESSION_ID,
        field: "message.content[].text"
      },
      extractionRule: jsonlRule,
      content: transcript.receipt_text_content ?? "",
      proofGenus: "OBSERVATION",
      questionSupported: "B_standing_ceiling",
      claimsSupported: ["The predecessor T2 standing ceiling is observation-only under T0."],
      claimsNotSupported: ["Truth", "Agreement", "Authority", "Effect", "Launch readiness"],
      temporalRelation: "PREDECESSOR_T2_RECEIPT",
      standingCeiling: T2_BOUNDING_CEILING
    }),
    buildHistoricalExtract({
      entryId: "EXTRACT:PATIENT_ZERO_JSON_FIELDS",
      sourceObjectIdentity: sourceIdentity.patient_zero_json,
      sourceLocator: sourceLocator.patient_zero_json,
      sourceRangeOrSelector: {
        selector_species: "JSON_FIELD_SET",
        fields: [
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
        ]
      },
      extractionRule:
        "Parse Patient Zero JSON and preserve only identity, authorship, timestamp, and body fields needed by T2 binding.",
      content: evidence.patient_zero_matter ?? {},
      proofGenus: "DETERMINATION",
      questionSupported: "B_patient_zero",
      claimsSupported: ["The observed GitHub comment Matter is exactly 5464975482 with the recorded body identity."],
      claimsNotSupported: ["Truth of the comment body", "Launch authority"],
      temporalRelation: "PATIENT_ZERO_MATTER_PREDECESSOR_SOURCE",
      standingCeiling: "EXACT_BOUNDED_MATTER_IDENTITY_ONLY"
    })
  ];
}

export function buildLocalT2SuccessorProofPreimage({
  sessionFilePath = DEFAULT_CLAUDE_SESSION_FILE,
  patientZeroJsonPath = DEFAULT_PATIENT_ZERO_T2_JSON
} = {}) {
  const delta = buildSuccessorDelta();
  const boundedEvidence = extractBoundedT2Evidence({
    sessionFilePath,
    patientZeroJsonPath,
    preR4ReportPath: null
  });
  const preimage = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "T2_SUCCESSOR_PROOF_PREIMAGE",
    launch_target: LAUNCH_TARGET,
    subject_ref: SUCCESSOR_SUBJECT_REF,
    predecessor_subject_ref: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    predecessor_subject_ref_species: "ASSIGNED_REFERENCE",
    current_structural_identity_claim: CURRENT_STRUCTURAL_IDENTITY_CLAIM,
    durable_only_structural_recomputation: DURABLE_ONLY_STRUCTURAL_RECOMPUTATION,
    delta_identity: delta.DELTA_IDENTITY,
    delta,
    historical_source_reduction: {
      whole_claude_session_not_archived_by_default: true,
      whole_patient_zero_scratch_json_not_required_after_extract: true,
      pre_r4_report_excluded_by_subtractive_minimality: true,
      semantic_regeneration_not_historical_recovery: true
    },
    t2_bounded_evidence: boundedEvidence,
    historical_extracts: buildHistoricalExtractsFromT2Evidence(boundedEvidence),
    stale_residue_fixture: {
      semantic_current_standing: "REMOTE_REPLICATED",
      historical_residual_blocker_string: STALE_REMOTE_BLOCKER_STRING,
      display_residue_not_control_matter: true
    },
    no_new_observation: {
      claude_reactivation: false,
      patient_zero_reobservation_by_claude: false,
      retrospective_successor_binding_not_retroactive_authorship: true
    }
  };
  preimage.preimage_identity = identityWithoutField(preimage, "preimage_identity");
  return preimage;
}

function buildClosureEntries({ rootDir, preimage }) {
  const root = path.resolve(rootDir);
  const extractEntries = preimage.historical_extracts.map((extract) => ({
    ENTRY_ID: extract.ENTRY_ID,
    MATTER_SPECIES: "HISTORICAL_BOUNDED_EXTRACT",
    CONTENT_IDENTITY: extract.EXTRACT_CONTENT_IDENTITY,
    CUSTODY_SPECIES: "GIT_COMMIT_PATH_REQUIRED_AFTER_CUSTODY",
    CUSTODY_REF: `git-commit-path:POST_CUSTODY_COMMIT:${DEFAULT_PREIMAGE_PATH}#${extract.EXTRACT_IDENTITY}`,
    PROOF_ROLE: extract.QUESTION_SUPPORTED,
    QUESTION_GENUS: extract.PROOF_GENUS,
    NECESSITY_CLASS: "EVIDENTIARY_NECESSITY",
    DEPENDENTS: ["P1:T2_SUCCESSOR_PASS"],
    SOURCE_RELATION: {
      source_identity: extract.SOURCE_OBJECT_IDENTITY,
      selector: extract.SOURCE_RANGE_OR_SELECTOR,
      extract_identity: extract.EXTRACT_IDENTITY
    },
    REGENERABILITY: "NOT_REGENERABLE_WITHOUT_HISTORICAL_SOURCE_OR_CUSTODIED_EXTRACT",
    STANDING_CEILING: extract.STANDING_CEILING
  }));
  const logicEntries = VERIFICATION_LOGIC_PATHS.map((relativePath) => fileEntry(
    root,
    relativePath,
    "FROZEN_VERIFICATION_LOGIC",
    "RECOMPUTATION_NECESSITY",
    ["P1:T2_SUCCESSOR_PASS", "P2:G6_SUCCESSOR_STANDING", "P3:SUCCESSOR_STRUCTURAL_IDENTITY"]
  ));
  const predecessorEntries = PREDECESSOR_CUSTODY_PATHS.map((relativePath) => gitCommitEntry(
    root,
    DEFAULT_CUSTODY_COMMIT,
    relativePath,
    "PREDECESSOR_CUSTODY_RECONTACT_PREIMAGE",
    ["P1:T2_SUCCESSOR_PASS", "P3:SUCCESSOR_STRUCTURAL_IDENTITY"]
  ));
  const semanticEntries = [
    {
      ENTRY_ID: "SEMANTIC:SUCCESSOR_SUBJECT_REF",
      MATTER_SPECIES: "ASSIGNED_REFERENCE",
      CONTENT_IDENTITY: digestObject({ subject_ref: SUCCESSOR_SUBJECT_REF }),
      CUSTODY_SPECIES: "EMBEDDED_IN_PROOF_CLOSURE_MANIFEST",
      CUSTODY_REF: "manifest-field:subject_ref",
      PROOF_ROLE: "SUCCESSOR_SUBJECT_ADDRESS",
      QUESTION_GENUS: "BINDING",
      NECESSITY_CLASS: "SEMANTIC_NECESSITY",
      DEPENDENTS: ["P1:T2_SUCCESSOR_PASS", "P3:SUCCESSOR_STRUCTURAL_IDENTITY"],
      SOURCE_RELATION: "FOUNDER_ASSIGNED_SUCCESSOR_SUBJECT_REF",
      REGENERABILITY: "ASSIGNED_REFERENCE_NOT_DERIVED_IDENTITY",
      STANDING_CEILING: "REFERENCE_ONLY"
    },
    {
      ENTRY_ID: "SEMANTIC:DELTA_IDENTITY",
      MATTER_SPECIES: "LINEAGE_IDENTITY",
      CONTENT_IDENTITY: preimage.delta_identity,
      CUSTODY_SPECIES: "DERIVED_REGENERABLE_FROM_CUSTODIED_SUCCESSION_LOGIC",
      CUSTODY_REF: "function:buildSuccessorDelta",
      PROOF_ROLE: "SUCCESSOR_DELTA",
      QUESTION_GENUS: "BINDING",
      NECESSITY_CLASS: "SEMANTIC_NECESSITY",
      DEPENDENTS: ["P1:T2_SUCCESSOR_PASS", "P2:G6_SUCCESSOR_STANDING", "P3:SUCCESSOR_STRUCTURAL_IDENTITY"],
      SOURCE_RELATION: "PROOF_CARRYING_SUCCESSION_DELTA",
      REGENERABILITY: "DERIVED_REGENERABLE",
      STANDING_CEILING: "LINEAGE_ONLY"
    }
  ];
  return [...extractEntries, ...logicEntries, ...predecessorEntries, ...semanticEntries];
}

export function buildProofClosureGraph({ entries }) {
  const byRole = new Map(entries.map((entry) => [entry.ENTRY_ID, entry]));
  const ids = (predicate) => entries.filter(predicate).map((entry) => entry.ENTRY_ID);
  return [
    {
      PROPOSITION: "P1:T2_SUCCESSOR_PASS",
      QUESTION:
        "Can the successor subject establish T2 after delta by carrying unaffected obligations and revalidating the subject relation?",
      THREAT_CONTEXT: "T0 bounded observation attribution; no Claude reactivation; no predecessor PASS copy.",
      DEPENDENCIES: ids((entry) => entry.DEPENDENTS.includes("P1:T2_SUCCESSOR_PASS")),
      DEPENDENCY_CLASSES: [
        "SEMANTIC_NECESSITY",
        "EVIDENTIARY_NECESSITY",
        "RECOMPUTATION_NECESSITY"
      ],
      EXCLUDED_CLASSES: ["HISTORICAL_PROVENANCE", "DIAGNOSTIC_CONVENIENCE", "UNRELATED"]
    },
    {
      PROPOSITION: "P2:G6_SUCCESSOR_STANDING",
      QUESTION:
        "Can current G6 project from a valid successor T2 disposition without rewriting historical G6?",
      THREAT_CONTEXT: "G6 current standing follows later observation fitness, not display residue.",
      DEPENDENCIES: [
        "P1:T2_SUCCESSOR_PASS",
        ...ids((entry) => entry.DEPENDENTS.includes("P2:G6_SUCCESSOR_STANDING"))
      ],
      DEPENDENCY_CLASSES: ["SEMANTIC_NECESSITY", "RECOMPUTATION_NECESSITY"],
      EXCLUDED_CLASSES: ["DIAGNOSTIC_CONVENIENCE", "UNRELATED"]
    },
    {
      PROPOSITION: "P3:SUCCESSOR_STRUCTURAL_IDENTITY",
      QUESTION:
        "Can the successor structural identity be recomputed from the actual custody/proof closure rather than b065 by assertion?",
      THREAT_CONTEXT: "Custody formation may be identity-changing.",
      DEPENDENCIES: ids((entry) => entry.DEPENDENTS.includes("P3:SUCCESSOR_STRUCTURAL_IDENTITY")),
      DEPENDENCY_CLASSES: [
        "SEMANTIC_NECESSITY",
        "EVIDENTIARY_NECESSITY",
        "RECOMPUTATION_NECESSITY"
      ],
      EXCLUDED_CLASSES: ["DIAGNOSTIC_CONVENIENCE", "UNRELATED"]
    },
    {
      PROPOSITION: "RESIDUE:STALE_BLOCKER_FIREWALL",
      QUESTION:
        "Can the stale blocker string influence semantic launch control?",
      THREAT_CONTEXT: "Display residue must not become control authority.",
      DEPENDENCIES: [],
      DEPENDENCY_CLASSES: ["DIAGNOSTIC_CONVENIENCE"],
      EXCLUDED_FROM_SEMANTIC_CONTROL: true,
      RESIDUE: byRole.has("DIAGNOSTIC:STALE_BLOCKER_STRING") ? "PRESENT" : "EMBEDDED_IN_PREIMAGE_RESIDUE_ONLY"
    }
  ];
}

export function buildProofClosureManifest({
  rootDir = process.cwd(),
  preimage,
  preimagePath = DEFAULT_PREIMAGE_PATH
} = {}) {
  const entries = buildClosureEntries({ rootDir, preimage });
  const graph = buildProofClosureGraph({ entries });
  const manifest = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "PROOF_CARRYING_CUSTODY_MANIFEST",
    launch_target: LAUNCH_TARGET,
    subject_ref: SUCCESSOR_SUBJECT_REF,
    subject_ref_species: "ASSIGNED_REFERENCE",
    current_structural_identity_claim: CURRENT_STRUCTURAL_IDENTITY_CLAIM,
    durable_only_structural_recomputation: DURABLE_ONLY_STRUCTURAL_RECOMPUTATION,
    predecessor_subject_ref: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    predecessor_subject_ref_species: "ASSIGNED_REFERENCE",
    delta_identity: preimage.delta_identity,
    proof_preimage: {
      path: preimagePath,
      content_identity: fs.existsSync(path.join(rootDir, preimagePath))
        ? contentIdentityForFile(path.join(rootDir, preimagePath))
        : contentIdentityForBuffer(Buffer.from(stableJson(preimage), "utf8")),
      preimage_identity: preimage.preimage_identity
    },
    proof_closure_graph: graph,
    closure_entries: entries,
    stale_residue_firewall: {
      preserved_residue: preimage.stale_residue_fixture,
      residue_in_semantic_control_path: false,
      semantic_control_sources: ["typed gate control_disposition", "successor T2 receipt", "G6 recomputation result"],
      stale_display_string_sources: ["diagnostic report residue only"]
    },
    wall_clock_metadata_in_identity: false
  };
  manifest.proof_closure_manifest_identity = identityWithoutField(
    manifest,
    "proof_closure_manifest_identity"
  );
  return manifest;
}

function requiredEntryIdsForProposition(proposition) {
  if (proposition === "P1:T2_SUCCESSOR_PASS") {
    return new Set([
      "SEMANTIC:SUCCESSOR_SUBJECT_REF",
      "SEMANTIC:DELTA_IDENTITY",
      `GIT:${DEFAULT_CUSTODY_COMMIT}:specimens/selfcommunication-launch-subject-custody-v0-001/launch-subject-manifest.json`,
      `GIT:${DEFAULT_CUSTODY_COMMIT}:inselfactions/ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001.json`,
      `GIT:${DEFAULT_CUSTODY_COMMIT}:specimens/selfcommunication-launch-subject-custody-v0-001/external-session-context-evidence.af223da4075caeb5107881cabe238f5dba22ae509b439008347290f11ad42738.json`,
      "EXTRACT:T2_T1_T15_PRE_STATE",
      "EXTRACT:T2_TOOL_USE_COMMAND",
      "EXTRACT:T2_TOOL_RESULT_CONTENT",
      "EXTRACT:T2_RECEIPT_TEXT",
      "EXTRACT:PATIENT_ZERO_JSON_FIELDS",
      ...VERIFICATION_LOGIC_PATHS.map((entry) => `FILE:${entry}`)
    ]);
  }
  if (proposition === "P2:G6_SUCCESSOR_STANDING") {
    return new Set([
      "P1:T2_SUCCESSOR_PASS",
      "SEMANTIC:DELTA_IDENTITY",
      "FILE:tools/ourself-selfcommunication-proof-closure-custody.mjs",
      "FILE:tools/ourself-selfcommunication-launch-readiness.mjs",
      "FILE:tools/ourself-communication-matter.mjs"
    ]);
  }
  if (proposition === "P3:SUCCESSOR_STRUCTURAL_IDENTITY") {
    return new Set([
      "SEMANTIC:SUCCESSOR_SUBJECT_REF",
      "SEMANTIC:DELTA_IDENTITY",
      ...VERIFICATION_LOGIC_PATHS.map((entry) => `FILE:${entry}`),
      ...PREDECESSOR_CUSTODY_PATHS.map((entry) => `GIT:${DEFAULT_CUSTODY_COMMIT}:${entry}`),
      "EXTRACT:T2_T1_T15_PRE_STATE",
      "EXTRACT:T2_TOOL_USE_COMMAND",
      "EXTRACT:T2_TOOL_RESULT_CONTENT",
      "EXTRACT:T2_RECEIPT_TEXT",
      "EXTRACT:PATIENT_ZERO_JSON_FIELDS"
    ]);
  }
  return new Set();
}

function structuralSubjectCore({ manifest, custodyDeltaIdentity = null }) {
  const semanticEntries = manifest.closure_entries
    .filter((entry) => [
      "SEMANTIC_NECESSITY",
      "EVIDENTIARY_NECESSITY",
      "RECOMPUTATION_NECESSITY"
    ].includes(entry.NECESSITY_CLASS))
    .map((entry) => ({
      entry_id: entry.ENTRY_ID,
      matter_species: entry.MATTER_SPECIES,
      content_identity: entry.CONTENT_IDENTITY,
      proof_role: entry.PROOF_ROLE,
      dependents: entry.DEPENDENTS
    }));
  return {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "PROOF_CARRYING_SUCCESSOR_SUBJECT_CORE",
    launch_target: LAUNCH_TARGET,
    SUBJECT_REF: SUCCESSOR_SUBJECT_REF,
    SUBJECT_REF_SPECIES: "ASSIGNED_REFERENCE",
    PREDECESSOR_SUBJECT_REF: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    PREDECESSOR_SUBJECT_REF_SPECIES: "ASSIGNED_REFERENCE",
    PREDECESSOR_CUSTODY_COMMIT: DEFAULT_CUSTODY_COMMIT,
    PREDECESSOR_CUSTODY_TREE: DEFAULT_CUSTODY_TREE,
    DELTA_IDENTITY: manifest.delta_identity,
    PROOF_CLOSURE_MANIFEST_IDENTITY: manifest.proof_closure_manifest_identity,
    CUSTODY_DELTA_IDENTITY: custodyDeltaIdentity,
    SEMANTIC_PROOF_MEMBER_ROOTS: semanticEntries,
    STANDING_CEILING: "NO_LAUNCH"
  };
}

function verifyCustodyObjectIdentities({ preimage, manifest }) {
  const preimageIdentity = identityWithoutField(preimage, "preimage_identity");
  const manifestIdentity = identityWithoutField(manifest, "proof_closure_manifest_identity");
  const checks = {
    preimage_identity_recomputed: preimageIdentity,
    preimage_identity_declared: preimage.preimage_identity ?? null,
    preimage_identity_matches: preimageIdentity === preimage.preimage_identity,
    manifest_identity_recomputed: manifestIdentity,
    manifest_identity_declared: manifest.proof_closure_manifest_identity ?? null,
    manifest_identity_matches: manifestIdentity === manifest.proof_closure_manifest_identity,
    manifest_binds_preimage_identity:
      manifest.proof_preimage?.preimage_identity === preimage.preimage_identity,
    manifest_binds_preimage_content_identity:
      Boolean(manifest.proof_preimage?.content_identity)
  };
  checks.all_identity_checks_pass = checks.preimage_identity_matches &&
    checks.manifest_identity_matches &&
    checks.manifest_binds_preimage_identity &&
    checks.manifest_binds_preimage_content_identity;
  return checks;
}

function deriveStructuralIdentity({ manifest }) {
  const custodyDeltaPreimage = {
    from_structural_identity_claim: CURRENT_STRUCTURAL_IDENTITY_CLAIM,
    to_proof_closure_manifest_identity: manifest.proof_closure_manifest_identity,
    custody_formation: "ADMIT_MINIMUM_DURABLE_PROOF_CLOSURE"
  };
  const custodyDeltaIdentity = digestObject(custodyDeltaPreimage);
  const core = structuralSubjectCore({ manifest, custodyDeltaIdentity });
  return {
    subject_core: core,
    structural_identity: digestObject(core),
    custody_delta_identity: custodyDeltaIdentity,
    custody_delta: custodyDeltaPreimage,
    identity_effect: digestObject(core) === CURRENT_STRUCTURAL_IDENTITY_CLAIM
      ? "CUSTODY_IDENTITY_PRESERVING"
      : "CUSTODY_IDENTITY_CHANGING"
  };
}

function buildSuccessorT2Receipt({
  structuralIdentity,
  t2SuccessorDispositions,
  predecessorReceiptIdentity,
  preimageIdentity
}) {
  const allEstablished = T2_OBLIGATION_IDS.every((id) => (
    ["VALID_CARRY", "SUCCESSFULLY_REVALIDATED"].includes(t2SuccessorDispositions[id]?.disposition)
  ));
  const receipt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T2_SUCCESSOR_RECEIPT_MECHANICAL_REBINDING",
    receipt_exists: true,
    subject_binding: allEstablished ? LAUNCH_TARGET : "NOT_BOUND",
    subject_ref_binding: allEstablished ? SUCCESSOR_SUBJECT_REF : "NOT_BOUND",
    subject_identity_binding: allEstablished ? structuralIdentity : "NOT_BOUND",
    predecessor_subject_ref: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    patient_zero_binding: allEstablished ? PATIENT_ZERO_MATTER_REF : "NOT_BOUND",
    participation_binding: allEstablished ? PARTICIPATION_REF : "NOT_BOUND",
    participation_occurrence_binding: allEstablished
      ? "PO_interactive:CLAUDESELF_CHAMBER_219be5a6"
      : "NOT_BOUND",
    observation_occurrence: allEstablished ? "ESTABLISHED" : "NOT_ESTABLISHED",
    standing_ceiling: allEstablished ? T2_BOUNDING_CEILING : "UNESTABLISHED",
    required_binding_standings: Object.fromEntries(T2_OBLIGATION_IDS.map((id) => [
      id.replace(/^B_/, "T2_").toUpperCase(),
      ["VALID_CARRY", "SUCCESSFULLY_REVALIDATED"].includes(t2SuccessorDispositions[id]?.disposition)
        ? "ESTABLISHED"
        : "BLOCKED"
    ])),
    successor_obligation_dispositions: t2SuccessorDispositions,
    predecessor_t2_receipt_identity: predecessorReceiptIdentity,
    proof_preimage_identity: preimageIdentity,
    carry_not_reauthorship: true,
    rebind_not_retroactive_authorship: true,
    no_manual_pass_injection: true,
    final_standing: allEstablished
      ? "T2_SUCCESSOR_MECHANICAL_BINDINGS_ESTABLISHED"
      : "T2_SUCCESSOR_MECHANICAL_BINDINGS_BLOCKED"
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

function canonicalRequiredBindingStandings(receipt) {
  return {
    T2_SUBJECT_BINDING: receipt.required_binding_standings.T2_SUBJECT,
    T2_PATIENT_ZERO_BINDING: receipt.required_binding_standings.T2_PATIENT_ZERO,
    T2_PARTICIPATION_BINDING: receipt.required_binding_standings.T2_PARTICIPATION,
    T2_OBSERVATION_OCCURRENCE: receipt.required_binding_standings.T2_OBSERVATION_OCCURRENCE,
    T2_STANDING_CEILING: receipt.required_binding_standings.T2_STANDING_CEILING
  };
}

function normalizedSuccessorReceipt(receipt) {
  return {
    ...receipt,
    required_binding_standings: canonicalRequiredBindingStandings(receipt)
  };
}

export function recomputeSuccessorStandingFromCustody({
  rootDir = process.cwd(),
  preimage,
  manifest,
  availableEntryIds = null,
  predecessorRecontact: suppliedPredecessorRecontact = null
} = {}) {
  const allEntryIds = new Set([
    ...manifest.closure_entries.map((entry) => entry.ENTRY_ID),
    "P1:T2_SUCCESSOR_PASS"
  ]);
  const available = availableEntryIds ? new Set(availableEntryIds) : allEntryIds;
  const hasAll = (ids) => [...ids].every((id) => available.has(id));
  const p1Requirements = requiredEntryIdsForProposition("P1:T2_SUCCESSOR_PASS");
  const p2Requirements = requiredEntryIdsForProposition("P2:G6_SUCCESSOR_STANDING");
  const p3Requirements = requiredEntryIdsForProposition("P3:SUCCESSOR_STRUCTURAL_IDENTITY");
  const custodyIdentityChecks = verifyCustodyObjectIdentities({ preimage, manifest });
  const custodyIdentitiesPass = custodyIdentityChecks.all_identity_checks_pass === true;
  const predecessorRecontact = suppliedPredecessorRecontact ??
    recontactPredecessorLaunchSubjectFromCommit({ rootDir });
  const structural = deriveStructuralIdentity({ manifest });
  const t2EvidenceCustody = {
    evidence: preimage.t2_bounded_evidence,
    path: DEFAULT_PREIMAGE_PATH,
    content_identity: manifest.proof_preimage.content_identity,
    custody_species: "GIT_COMMIT_PATH_AFTER_CUSTODY",
    custody_ref: `git-commit-path:POST_CUSTODY_COMMIT:${DEFAULT_PREIMAGE_PATH}`
  };
  const predecessorBindings = hasAll(p1Requirements) && custodyIdentitiesPass
    ? adjudicateT2RequiredBindings({
      launchSubjectRecontact: predecessorRecontact,
      t2EvidenceCustody,
      launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
    })
    : null;
  const predecessorReceipt = predecessorBindings
    ? buildT2PredecessorReceiptFromBindings({
      bindingsAdjudication: predecessorBindings,
      t2EvidenceCustody,
      launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
    })
    : null;
  const predecessorT2Gate = predecessorReceipt
    ? adjudicateT2Predecessor({
      t2Receipt: predecessorReceipt,
      launchSubjectIdentity: DEFAULT_LAUNCH_SUBJECT_IDENTITY
    })
    : null;
  const inheritedPass = predecessorT2Gate?.final_standing === "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED";
  const subjectRevalidated = inheritedPass &&
    custodyIdentitiesPass &&
    predecessorRecontact.subject_closure_recontact_pass === true &&
    preimage.subject_ref === SUCCESSOR_SUBJECT_REF &&
    preimage.predecessor_subject_ref === DEFAULT_LAUNCH_SUBJECT_IDENTITY &&
    preimage.delta_identity === buildSuccessorDelta().DELTA_IDENTITY &&
    structural.identity_effect === "CUSTODY_IDENTITY_CHANGING";
  const dispositions = {
    B_subject: {
      affectedness: "AFFECTED",
      disposition: subjectRevalidated ? "SUCCESSFULLY_REVALIDATED" : "BLOCKED",
      reason: "Custody formation changes the canonical successor structural preimage; the subject relation is rebound to the new successor subject without retroactive authorship."
    },
    B_patient_zero: {
      affectedness: "UNAFFECTED",
      disposition: inheritedPass ? "VALID_CARRY" : "BLOCKED",
      reason: "Custody delta does not intersect Patient Zero content identity or comment reference."
    },
    B_participation: {
      affectedness: "UNAFFECTED",
      disposition: inheritedPass ? "VALID_CARRY" : "BLOCKED",
      reason: "Custody delta does not change the predecessor Claude session uuid/tool-use chain extract."
    },
    B_observation_occurrence: {
      affectedness: "UNAFFECTED",
      disposition: inheritedPass ? "VALID_CARRY" : "BLOCKED",
      reason: "Custody delta does not create a new observation; it preserves the predecessor observation occurrence extract."
    },
    B_standing_ceiling: {
      affectedness: "UNAFFECTED",
      disposition: inheritedPass ? "VALID_CARRY" : "BLOCKED",
      reason: "Custody delta does not change the T0 observation-only ceiling."
    }
  };
  const successorReceipt = buildSuccessorT2Receipt({
    structuralIdentity: structural.structural_identity,
    t2SuccessorDispositions: dispositions,
    predecessorReceiptIdentity: predecessorReceipt?.receipt_identity ?? null,
    preimageIdentity: preimage.preimage_identity
  });
  const normalizedReceipt = normalizedSuccessorReceipt(successorReceipt);
  const successorT2Gate = hasAll(p1Requirements) && custodyIdentitiesPass
    ? adjudicateT2Predecessor({
      t2Receipt: normalizedReceipt,
      launchSubjectIdentity: structural.structural_identity
    })
    : {
      final_standing: "T2_SUCCESSOR_BLOCKED",
      control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED,
      checks: {}
    };
  const p1Pass = successorT2Gate.final_standing === "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED";
  const g6 = hasAll(p2Requirements) && p1Pass
    ? recomputeG6CurrentStanding({ t2GateResult: successorT2Gate })
    : recomputeG6CurrentStanding({ t2GateResult: null });
  const p2Pass = g6.current_standing === "CURRENT_G6_LATER_OBSERVATION_ESTABLISHED" &&
    g6.control_disposition === LAUNCH_CONTROL_DISPOSITIONS.SATISFIED;
  const p3Pass = custodyIdentitiesPass &&
    hasAll(p3Requirements) &&
    structural.identity_effect === "CUSTODY_IDENTITY_CHANGING" &&
    structural.structural_identity !== CURRENT_STRUCTURAL_IDENTITY_CLAIM;
  const result = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "DURABLE_CUSTODY_RECOMPUTATION",
    custody_object_identity_checks: custodyIdentityChecks,
    predecessor_recontact: predecessorRecontact,
    identity_effect_adjudication: structural.identity_effect,
    custody_delta: structural.custody_delta,
    custody_delta_identity: structural.custody_delta_identity,
    successor_structural_identity: structural.structural_identity,
    successor_subject_core: structural.subject_core,
    predecessor_t2_gate: predecessorT2Gate,
    t2_successor_obligation_dispositions: dispositions,
    t2_successor_receipt: successorReceipt,
    t2_successor_gate: successorT2Gate,
    g6_successor_standing: g6,
    proposition_results: {
      "P1:T2_SUCCESSOR_PASS": p1Pass ? "PASS" : "FAIL",
      "P2:G6_SUCCESSOR_STANDING": p2Pass ? "PASS" : "FAIL",
      "P3:SUCCESSOR_STRUCTURAL_IDENTITY": p3Pass ? "PASS" : "FAIL"
    },
    current_launch_standing: "NO_LAUNCH"
  };
  result.recomputation_identity = digestObject(result);
  return result;
}

export function runSubtractiveMinimality({ manifest, preimage, rootDir = process.cwd() } = {}) {
  const allEntryIds = manifest.closure_entries.map((entry) => entry.ENTRY_ID);
  const predecessorRecontact = recontactPredecessorLaunchSubjectFromCommit({ rootDir });
  const baseline = recomputeSuccessorStandingFromCustody({
    rootDir,
    preimage,
    manifest,
    predecessorRecontact
  });
  return manifest.closure_entries.map((entry) => {
    const available = allEntryIds.filter((id) => id !== entry.ENTRY_ID);
    const recomputed = recomputeSuccessorStandingFromCustody({
      rootDir,
      preimage,
      manifest,
      availableEntryIds: available,
      predecessorRecontact
    });
    const propositionChanges = Object.entries(baseline.proposition_results).filter(([key, value]) => (
      recomputed.proposition_results[key] !== value ||
      (
        key === "P3:SUCCESSOR_STRUCTURAL_IDENTITY" &&
        recomputed.successor_structural_identity !== baseline.successor_structural_identity
      )
    ));
    const irreducible = propositionChanges.length > 0;
    return {
      ENTRY_ID: entry.ENTRY_ID,
      NECESSITY_CLASS: entry.NECESSITY_CLASS,
      DEPENDENTS: entry.DEPENDENTS,
      subtraction_result: irreducible ? "RECOMPUTATION_CHANGED_OR_FAILED" : "SAME_BOUNDED_STANDING_RECOMPUTED",
      MINIMUM_SET_DISPOSITION: irreducible ? "IRREDUCIBLE" : "NOT_IRREDUCIBLE",
      witness: irreducible
        ? propositionChanges.map(([proposition, baselineValue]) => ({
          proposition,
          baseline: baselineValue,
          after_subtraction: recomputed.proposition_results[proposition],
          structural_identity_after_subtraction: recomputed.successor_structural_identity
        }))
        : [{
          proposition: "ALL",
          baseline: baseline.proposition_results,
          after_subtraction: recomputed.proposition_results
        }]
    };
  });
}

function minimumDurableCustodySet({ manifest, subtractiveResults }) {
  const irreducible = new Set(
    subtractiveResults
      .filter((entry) => entry.MINIMUM_SET_DISPOSITION === "IRREDUCIBLE")
      .map((entry) => entry.ENTRY_ID)
  );
  return manifest.closure_entries
    .filter((entry) => irreducible.has(entry.ENTRY_ID))
    .map((entry) => ({
      ENTRY_ID: entry.ENTRY_ID,
      MATTER_SPECIES: entry.MATTER_SPECIES,
      CONTENT_IDENTITY: entry.CONTENT_IDENTITY,
      CUSTODY_SPECIES: entry.CUSTODY_SPECIES,
      CUSTODY_REF: entry.CUSTODY_REF,
      PROOF_ROLE: entry.PROOF_ROLE,
      NECESSITY_CLASS: entry.NECESSITY_CLASS
    }));
}

export function buildSuccessorFreeze({
  rootDir = process.cwd(),
  manifest,
  preimage,
  recomputation,
  durableCustodyCommit = null,
  remoteCustodyRef = "refs/heads/main",
  preimagePath = DEFAULT_PREIMAGE_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
} = {}) {
  const pass = Object.values(recomputation.proposition_results).every((entry) => entry === "PASS");
  const remoteCustodyDerivation = deriveRemoteCustodyStandingForFreeze({
    rootDir,
    manifest,
    preimage,
    recomputation,
    durableCustodyCommit,
    remoteCustodyRef,
    preimagePath,
    manifestPath
  });
  const remoteCustodyEstablished =
    remoteCustodyDerivation.FREEZE_ELIGIBLE_REMOTE_CUSTODY === true;
  if (!pass || !durableCustodyCommit || !remoteCustodyEstablished) {
    return {
      SUCCESSOR_FREEZE: "NOT_MINTED",
      SUCCESSOR_FREEZE_IDENTITY: "NOT_MINTED",
      SUCCESSOR_FREEZE_ELIGIBLE: false,
      REMOTE_CUSTODY_DERIVATION: remoteCustodyDerivation,
      reason: "DURABLE_RECONTACT_OR_REMOTE_CUSTODY_INCOMPLETE"
    };
  }
  const freeze = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "PROOF_CARRYING_SUCCESSOR_FREEZE",
    launch_target: LAUNCH_TARGET,
    SUCCESSOR_SUBJECT_REF: SUCCESSOR_SUBJECT_REF,
    STRUCTURAL_IDENTITY: recomputation.successor_structural_identity,
    PREDECESSOR_SUBJECT_REF: DEFAULT_LAUNCH_SUBJECT_IDENTITY,
    DELTA_IDENTITY: manifest.delta_identity,
    CUSTODY_DELTA_IDENTITY: recomputation.custody_delta_identity,
    DURABLE_CUSTODY_COMMIT: durableCustodyCommit,
    REMOTE_CUSTODY_REF:
      `${remoteCustodyDerivation.REMOTE_IDENTITY.remote}/${remoteCustodyDerivation.REMOTE_IDENTITY.ref}`,
    REMOTE_CUSTODY_DERIVATION: remoteCustodyDerivation,
    REMOTE_RECONTACT_RECEIPT: remoteCustodyDerivation.REMOTE_RECONTACT_RECEIPT,
    PROOF_CLOSURE_MANIFEST_IDENTITY: manifest.proof_closure_manifest_identity,
    T2_SUCCESSOR_DISPOSITION: "T2_SUCCESSOR_PASS",
    G6_SUCCESSOR_STANDING: recomputation.g6_successor_standing.current_standing,
    CARRIED_EVIDENCE: ["B_patient_zero", "B_participation", "B_observation_occurrence", "B_standing_ceiling"],
    REVALIDATED_EVIDENCE: ["B_subject"],
    INVALIDATED_EVIDENCE: [],
    CURRENT_GATE_VECTOR: {
      t2_causal_matter_predecessor: recomputation.t2_successor_gate.control_disposition,
      g6_claude_gap_disposition: recomputation.g6_successor_standing.control_disposition,
      g5_independent_hostile_pass: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
    },
    STANDING_CEILING: "NO_LAUNCH",
    FREEZE_NOT_LAUNCH: true,
    G7_EXECUTED: false,
    R4_EXECUTED: false
  };
  freeze.FREEZE_IDENTITY = identityWithoutField(freeze, "FREEZE_IDENTITY");
  return {
    SUCCESSOR_FREEZE: "MINTED",
    SUCCESSOR_FREEZE_IDENTITY: freeze.FREEZE_IDENTITY,
    SUCCESSOR_FREEZE_ELIGIBLE: true,
    REMOTE_CUSTODY_DERIVATION: remoteCustodyDerivation,
    freeze
  };
}

export function buildProofClosureCustodyReport({
  rootDir = process.cwd(),
  preimagePath = DEFAULT_PREIMAGE_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH,
  reportPath = DEFAULT_REPORT_PATH,
  sourceMode = "local",
  writeArtifacts = true,
  durableCustodyCommit = null,
  remoteCustodyRef = null
} = {}) {
  const root = path.resolve(rootDir);
  const preimage = sourceMode === "custody-only" && fs.existsSync(path.join(root, preimagePath))
    ? readJsonFile(path.join(root, preimagePath))
    : buildLocalT2SuccessorProofPreimage();
  if (writeArtifacts && sourceMode !== "custody-only") {
    writeStableJsonFile(path.join(root, preimagePath), preimage);
  }
  const manifest = sourceMode === "custody-only" && fs.existsSync(path.join(root, manifestPath))
    ? readJsonFile(path.join(root, manifestPath))
    : buildProofClosureManifest({ rootDir: root, preimage, preimagePath });
  if (writeArtifacts && sourceMode !== "custody-only") {
    writeStableJsonFile(path.join(root, manifestPath), manifest);
  }
  const subtractiveMinimalityResults = runSubtractiveMinimality({ rootDir: root, preimage, manifest });
  const minimumSet = minimumDurableCustodySet({ manifest, subtractiveResults: subtractiveMinimalityResults });
  const recomputation = recomputeSuccessorStandingFromCustody({ rootDir: root, preimage, manifest });
  const currentHead = tryGit(root, ["rev-parse", "HEAD"])?.trim() ?? null;
  const exactPathSet = exactCustodyPathSet({ preimagePath, manifestPath });
  const freeze = buildSuccessorFreeze({
    rootDir: root,
    manifest,
    preimage,
    recomputation,
    durableCustodyCommit,
    remoteCustodyRef,
    preimagePath,
    manifestPath
  });
  const remoteCustodyDerivation = freeze.REMOTE_CUSTODY_DERIVATION;
  const remoteRecontactReceipt = remoteCustodyDerivation.REMOTE_RECONTACT_RECEIPT;
  const remoteHead = remoteRecontactReceipt.OBSERVED_COMMIT === "UNRESOLVED"
    ? null
    : remoteRecontactReceipt.OBSERVED_COMMIT;
  const remoteCustodyStanding = remoteCustodyDerivation.REMOTE_CUSTODY_STANDING;
  const freezeBlockers = [
    ...(durableCustodyCommit ? [] : ["LOCAL_CUSTODY_COMMIT_NOT_SUPPLIED"]),
    ...(remoteCustodyDerivation.LOCAL_CUSTODY_ESTABLISHED ? [] : ["LOCAL_CUSTODY_COMMIT_NOT_RECONTACTABLE"]),
    ...(remoteRecontactReceipt.REMOTE_REF_FRESHLY_RECONTACTED ? [] : ["REMOTE_REF_NOT_FRESHLY_RECONTACTED"]),
    ...(remoteHead === currentHead ? [] : ["REMOTE_REF_NOT_AT_LOCAL_HEAD"]),
    ...(remoteRecontactReceipt.REMOTE_REF_RESOLVES_TO_REQUIRED_CUSTODY_COMMIT
      ? []
      : ["REMOTE_REF_DOES_NOT_RESOLVE_TO_REQUIRED_CUSTODY_COMMIT"]),
    ...(remoteRecontactReceipt.REMOTE_REQUIRED_OBJECTS_RECONTACTABLE
      ? []
      : ["REMOTE_REQUIRED_OBJECTS_NOT_RECONTACTABLE"]),
    ...(remoteRecontactReceipt.REMOTE_MANIFEST_CONTENT_MATCH ? [] : ["REMOTE_MANIFEST_CONTENT_MISMATCH"]),
    "FREEZE_NOT_MINTED_UNTIL_POST_PUSH_DURABLE_RECONTACT"
  ];
  const report = {
    schema: PROOF_CLOSURE_CUSTODY_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_PROOF_CLOSURE_CUSTODY_REPORT",
    launch_target: LAUNCH_TARGET,
    FREEZE_PREDICATE: [
      "LOCAL_CUSTODY_ESTABLISHED",
      "REMOTE_REF_FRESHLY_RECONTACTED",
      "REMOTE_REF_RESOLVES_TO_REQUIRED_CUSTODY_COMMIT",
      "REMOTE_REQUIRED_OBJECTS_RECONTACTABLE",
      "REMOTE_MANIFEST_CONTENT_MATCH",
      "PROOF_CLOSURE_PASS"
    ],
    REMOTE_RECONTACT_MODEL: {
      remote_ref_label_is_not_custody: true,
      remote_ref_observation_required: true,
      durable_remote_recontact_required: true,
      successful_push_is_not_remote_recontact: true,
      receipt_shape_not_remote_recontact_evidence: true,
      freeze_boundary_requires_derivation_not_representation: true
    },
    FREEZE_TRUST_BOUNDARY_GRAPH: [{
      PATH_ID: "FREEZE_BOUNDARY_Q_REMOTE",
      ENTRYPOINT: "buildSuccessorFreeze",
      CALLER_CONTROLLED_INPUTS: ["rootDir", "durableCustodyCommit", "remoteCustodyRef"],
      EXECUTION_DERIVED_INPUTS: ["REMOTE_CUSTODY_DERIVATION"],
      RECONTACTED_INPUTS: [
        "git ls-remote origin refs/heads/main",
        "git show <observed_commit>:<required_path>",
        "manifest identity recomputation"
      ],
      DERIVED_STANDING: ["REMOTE_CUSTODY_STANDING"],
      FREEZE_CONSUMED_VALUES: ["REMOTE_CUSTODY_DERIVATION", "PROOF_CLOSURE_PASS"],
      TRUST_BOUNDARY: "CALLER_REPRESENTATION_TO_EXECUTION_DERIVATION",
      BYPASS_POSSIBLE: false,
      CALLERS: ["buildProofClosureCustodyReport", "direct API callers"]
    }],
    Q_REMOTE_EVIDENCE_CONTRACT: remoteCustodyDerivation.QUESTION,
    DERIVATION_AUTHORITY: remoteCustodyDerivation.DERIVATION_AUTHORITY,
    FREEZE_API_SEAM: {
      raw_remote_receipt_objects_accepted_as_freeze_proof: false,
      caller_controlled_semantic_pass_fields_accepted: false,
      freeze_constructor_derives_q_remote: true
    },
    SUBJECT_FIT_MODEL: remoteCustodyDerivation.SUBJECT_FIT,
    PROOF_CLOSURE_GRAPH: manifest.proof_closure_graph,
    MINIMUM_DURABLE_CUSTODY_SET: minimumSet,
    SUBTRACTIVE_MINIMALITY_RESULTS: subtractiveMinimalityResults,
    HISTORICAL_EXTRACTS: preimage.historical_extracts,
    REPOSITORY_PROOF_OBJECTS: manifest.closure_entries.filter((entry) => entry.MATTER_SPECIES.includes("REPOSITORY") || entry.PROOF_ROLE === "FROZEN_VERIFICATION_LOGIC"),
    PROOF_CARRYING_MANIFEST: manifest,
    IDENTITY_EFFECT_ADJUDICATION: recomputation.identity_effect_adjudication,
    CUSTODY_DELTA: recomputation.custody_delta,
    CUSTODY_DELTA_IDENTITY: recomputation.custody_delta_identity,
    EXACT_PATH_SET: [
      ...exactPathSet
    ],
    CUSTODY_COMMIT: durableCustodyCommit ?? "NOT_YET_COMMITTED",
    REMOTE_REPLICATION: {
      local_head: currentHead,
      remote_main: remoteHead,
      remote_ref_result: remoteHead === currentHead ? "REMOTE_REF_MATCHES_LOCAL_HEAD" : "REMOTE_REF_NOT_AT_LOCAL_HEAD",
      remote_custody_standing: remoteCustodyStanding,
      push_custody_not_release: true
    },
    REMOTE_CUSTODY_DERIVATION: remoteCustodyDerivation,
    REMOTE_RECONTACT_RECEIPT: remoteRecontactReceipt,
    DURABLE_CUSTODY_RECOMPUTATION: recomputation,
    DURABLE_RECONTACT_RESULT: recomputation.proposition_results,
    T2_SUCCESSOR_PASS_RECOMPUTATION: recomputation.proposition_results["P1:T2_SUCCESSOR_PASS"],
    G6_SUCCESSOR_STANDING_RECOMPUTATION: recomputation.proposition_results["P2:G6_SUCCESSOR_STANDING"],
    STRUCTURAL_IDENTITY_RECOMPUTATION: recomputation.proposition_results["P3:SUCCESSOR_STRUCTURAL_IDENTITY"],
    SUCCESSOR_STRUCTURAL_IDENTITY: recomputation.successor_structural_identity,
    REMOTE_CUSTODY_STANDING: remoteCustodyStanding,
    SUCCESSOR_FREEZE_ELIGIBLE: freeze.SUCCESSOR_FREEZE_ELIGIBLE,
    SUCCESSOR_FREEZE: freeze.SUCCESSOR_FREEZE,
    SUCCESSOR_FREEZE_IDENTITY: freeze.SUCCESSOR_FREEZE_IDENTITY,
    CARRIED_EVIDENCE: ["B_patient_zero", "B_participation", "B_observation_occurrence", "B_standing_ceiling"],
    REVALIDATED_EVIDENCE: ["B_subject"],
    INVALIDATED_EVIDENCE: [],
    BLOCKERS: freeze.SUCCESSOR_FREEZE === "MINTED"
      ? ["G7_NOT_EXECUTED", "R4_INELIGIBLE", "CURRENT_LAUNCH_STANDING_NO_LAUNCH"]
      : freezeBlockers,
    RESIDUE: [
      "b065 structural identity was not preserved because custody formation changes the canonical subject preimage.",
      "8f6 remains the durable-only divergence witness from the pre-custody incomplete subject.",
      "REMOTE_REPLICATED_CUSTODY_NOT_ESTABLISHED remains historical display residue and is not consumed by semantic launch control."
    ],
    G7_ELIGIBILITY: freeze.SUCCESSOR_FREEZE === "MINTED",
    R4_ELIGIBILITY: false,
    NEXT_REQUIRED_SEAT: freeze.SUCCESSOR_FREEZE === "MINTED"
      ? "G7_SUCCESSOR_CLOSURE_SEAT"
      : "REMOTE_CUSTODY_REPLICATION_THEN_DESTRUCTION_RECONTACT",
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH"
  };
  report.REPORT_IDENTITY = identityWithoutField(report, "REPORT_IDENTITY");
  if (writeArtifacts) writeStableJsonFile(path.join(root, reportPath), report);
  return report;
}

export function verifyFreshRemoteClone({
  rootDir = process.cwd(),
  commit,
  remoteRef = "refs/heads/main",
  remoteUrl = null
} = {}) {
  const source = path.resolve(rootDir);
  const cloneSource = remoteUrl ?? tryGit(source, ["remote", "get-url", "origin"])?.trim();
  if (!cloneSource) {
    return {
      fresh_clone_path: null,
      source_remote_url: null,
      source_root_used_as_git_remote_only: false,
      producing_workspace_filesystem_not_read_for_evidence: true,
      result: null,
      failure: "ORIGIN_REMOTE_URL_NOT_RESOLVED"
    };
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-proof-closure-"));
  const clonePath = path.join(tempDir, "clone");
  try {
    execFileSync("git", ["clone", "--quiet", cloneSource, clonePath], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const commitToVerify = commit ?? git(clonePath, ["rev-parse", "HEAD"]).trim();
    if (commitToVerify) git(clonePath, ["checkout", "--quiet", commitToVerify]);
    const report = buildProofClosureCustodyReport({
      rootDir: clonePath,
      sourceMode: "custody-only",
      writeArtifacts: false,
      durableCustodyCommit: commitToVerify,
      remoteCustodyRef: remoteRef
    });
    return {
      fresh_clone_path: clonePath,
      source_remote_url: cloneSource,
      source_root_used_as_git_remote_only: false,
      producing_workspace_filesystem_not_read_for_evidence: true,
      result: report
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const preimagePath = valueAfter(process.argv, "--preimage") ?? DEFAULT_PREIMAGE_PATH;
  const manifestPath = valueAfter(process.argv, "--manifest") ?? DEFAULT_MANIFEST_PATH;
  const reportPath = valueAfter(process.argv, "--out") ?? DEFAULT_REPORT_PATH;
  const durableCustodyCommit = valueAfter(process.argv, "--durable-custody-commit");
  const remoteCustodyRef = valueAfter(process.argv, "--remote-custody-ref");
  const sourceMode = hasFlag(process.argv, "--custody-only") ? "custody-only" : "local";
  const writeArtifacts = !hasFlag(process.argv, "--no-write");
  const report = buildProofClosureCustodyReport({
    rootDir,
    preimagePath,
    manifestPath,
    reportPath,
    sourceMode,
    writeArtifacts,
    durableCustodyCommit,
    remoteCustodyRef
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
