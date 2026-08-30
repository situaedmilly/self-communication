#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digestObject } from "./ourself-communication-matter.mjs";
import {
  contentIdentityForBuffer,
  contentIdentityForFile,
  stableJson
} from "./ourself-selfcommunication-launch-subject-custody.mjs";

export const PROOF_CARRYING_SUCCESSION_SCHEMA =
  "ourself.selfcommunication-proof-carrying-succession.v0.1";
export const LAUNCH_TARGET = "SELFCOMMUNICATION_LIVE_V0";
export const DEFAULT_REPORT_PATH =
  "specimens/selfcommunication-proof-carrying-succession-v0-001/proof-carrying-successor-report.json";

export const KNOWN_IDENTIFIERS = Object.freeze({
  A20E: "sha256:a20e63ee234f6564703e38e0b6da0682901b92469e6854821901ce8a5269cade",
  FIVE_DDD: "sha256:5ddd1d245ba6dd20aa00bc3f6a675ae620713e5a2f48b99e229605bf2ee88d5a",
  SEVEN34: "sha256:734de72bc70a10264db038fda24856094f8e62e17f9f088392778d4c1c4eaf1b",
  D49C: "sha256:d49c2c52d229519dc42a61d7dbce72e772fa7bfda319c27d8430d38ed9196949",
  LOCAL_HEAD: "4357f7ace087db9b200dab6ebfe1b65fe1a46f17",
  REMOTE_MAIN: "409c7bb5e5bb968a8fce5a88896508c30a774cae"
});

export const SUCCESSOR_SUBJECT_REF =
  "SELFCOMMUNICATION_LIVE_V0:PROOF_CARRYING_SUCCESSOR:20260830:001";

export const DEFAULT_RECONTACT_PATHS = Object.freeze([
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "package.json",
  "tools/ourself-selfcommunication-launch-readiness.mjs",
  "tools/ourself-selfcommunication-proof-carrying-succession.mjs",
  "test/ourself-selfcommunication-proof-carrying-succession.test.mjs",
  "specimens/selfcommunication-launch-subject-custody-v0-001/launch-subject-manifest.json",
  "inselfactions/ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001.json",
  "specimens/selfcommunication-launch-freeze-v0-001/custodied-launch-subject-freeze.json",
  "specimens/selfcommunication-t2-predecessor-binding-v0-001/t2-predecessor-binding-report.json",
  "specimens/selfcommunication-g7-open-binding-custody-v0-001/g7-open-binding-custody-report.json"
]);

export const DEFAULT_EXACT_CUSTODY_PATHS = Object.freeze([
  "tools/ourself-selfcommunication-launch-readiness.mjs",
  "tools/ourself-selfcommunication-proof-carrying-succession.mjs",
  "test/ourself-selfcommunication-proof-carrying-succession.test.mjs"
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

function git(rootDir, args, { encoding = "utf8", input = undefined } = {}) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding,
    input,
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

function readJsonIfExists(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

function writeStableJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), stableJson(value));
}

function stripKnownIdentityFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const clone = { ...value };
  for (const field of [
    "successor_launch_subject_identity",
    "structural_identity",
    "successor_structural_identity",
    "freeze_identity",
    "successor_freeze_identity",
    "report_identity"
  ]) {
    delete clone[field];
  }
  return clone;
}

function recomputeStructuralIdentity(value) {
  return digestObject(stripKnownIdentityFields(value));
}

function pathExists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function gitObjectIdForWorktreePath(rootDir, relativePath) {
  if (!pathExists(rootDir, relativePath)) return null;
  return tryGit(rootDir, ["hash-object", `--path=${relativePath}`, relativePath])?.trim() ?? null;
}

function gitObjectExists(rootDir, objectId) {
  if (!objectId) return false;
  return tryGit(rootDir, ["cat-file", "-e", objectId]) !== null;
}

function gitBlobAt(rootDir, ref, relativePath) {
  return tryGit(rootDir, ["rev-parse", `${ref}:${relativePath}`])?.trim() ?? null;
}

function currentGitStatusForPath(rootDir, relativePath) {
  const output = tryGit(rootDir, ["status", "--short", "--porcelain=v1", "--", relativePath]) ?? "";
  const line = output.trimEnd().split("\n").find(Boolean);
  if (!line) {
    return tryGit(rootDir, ["ls-files", "--error-unmatch", relativePath]) === null
      ? "UNTRACKED_ABSENT_OR_IGNORED"
      : "TRACKED_CLEAN";
  }
  const code = line.slice(0, 2);
  if (code === "??") return "UNTRACKED";
  if (code.includes("M")) return "MODIFIED";
  if (code.includes("A")) return "ADDED_IN_INDEX";
  if (code.includes("D")) return "DELETED";
  return `PORCELAIN_${code.trim() || "CHANGED"}`;
}

function reachableRefsForObject(rootDir, relativePath, objectId) {
  if (!objectId) return [];
  const refs = [];
  for (const ref of ["HEAD", "origin/main"]) {
    if (gitBlobAt(rootDir, ref, relativePath) === objectId) refs.push(ref);
  }
  return refs;
}

function localCloneRecontact(rootDir, relativePath, expectedContentIdentity) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-pcs-recontact-"));
  try {
    const clonePath = path.join(tempDir, "clone");
    execFileSync("git", ["clone", "--quiet", "--no-checkout", rootDir, clonePath], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const bytes = execFileSync("git", ["-C", clonePath, "show", `HEAD:${relativePath}`]);
    const resolved = contentIdentityForBuffer(bytes);
    return {
      path: relativePath,
      custody_species: "GIT_REACHABLE_LOCAL",
      recontact_method: "fresh_local_clone_show_HEAD_path",
      resolved_content_identity: resolved,
      expected_content_identity: expectedContentIdentity,
      independent_recontact: resolved === expectedContentIdentity ? "PASS" : "FAIL",
      failure_if_any: resolved === expectedContentIdentity ? null : "CONTENT_IDENTITY_MISMATCH"
    };
  } catch (error) {
    return {
      path: relativePath,
      custody_species: "GIT_REACHABLE_LOCAL",
      recontact_method: "fresh_local_clone_show_HEAD_path",
      resolved_content_identity: null,
      expected_content_identity: expectedContentIdentity,
      independent_recontact: "FAIL",
      failure_if_any: `LOCAL_GIT_RECONTACT_FAILED:${error.message}`
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function classifyCustodyDurability({
  exists,
  objectExistsLocal,
  localReachabilityRoots = [],
  remoteReplicated,
  independentRecontact
} = {}) {
  const species = [];
  if (exists) species.push("WORKTREE_ONLY");
  if (objectExistsLocal) species.push("GIT_OBJECT_DB_LOCAL");
  if (localReachabilityRoots.length > 0 && independentRecontact === "PASS") {
    species.push("GIT_REACHABLE_LOCAL");
  }
  if (remoteReplicated) species.push("REMOTE_REPLICATED");
  if (species.includes("GIT_REACHABLE_LOCAL") && species.includes("REMOTE_REPLICATED")) {
    species.push("MULTI_CUSTODIAN");
  }
  return {
    durability_species: species,
    sufficient_for_local_launch_custody: species.includes("GIT_REACHABLE_LOCAL"),
    sufficient_for_remote_launch_custody: species.includes("REMOTE_REPLICATED"),
    content_addressed_filename_not_storage: true,
    object_exists_not_object_reachable: objectExistsLocal && !species.includes("GIT_REACHABLE_LOCAL")
  };
}

function buildMatterEntry({ rootDir, relativePath, role, remoteHead }) {
  const absolutePath = path.join(rootDir, relativePath);
  const exists = fs.existsSync(absolutePath);
  const contentIdentity = exists ? contentIdentityForFile(absolutePath) : null;
  const objectId = gitObjectIdForWorktreePath(rootDir, relativePath);
  const objectExistsLocal = gitObjectExists(rootDir, objectId);
  const headBlob = gitBlobAt(rootDir, "HEAD", relativePath);
  const originBlob = gitBlobAt(rootDir, "origin/main", relativePath);
  const localReachabilityRoots = reachableRefsForObject(rootDir, relativePath, objectId);
  const cloneRecontact = localReachabilityRoots.includes("HEAD") && contentIdentity
    ? localCloneRecontact(rootDir, relativePath, contentIdentity)
    : {
      path: relativePath,
      custody_species: "GIT_REACHABLE_LOCAL",
      recontact_method: "fresh_local_clone_show_HEAD_path",
      resolved_content_identity: null,
      expected_content_identity: contentIdentity,
      independent_recontact: "FAIL",
      failure_if_any: "CURRENT_BYTES_NOT_REACHABLE_FROM_HEAD"
    };
  const remoteReplicated = Boolean(remoteHead) && originBlob === objectId && objectId !== null;
  const custody = classifyCustodyDurability({
    exists,
    objectExistsLocal,
    localReachabilityRoots,
    remoteReplicated,
    independentRecontact: cloneRecontact.independent_recontact
  });
  return {
    path: relativePath,
    role,
    exists,
    current_git_status: currentGitStatusForPath(rootDir, relativePath),
    content_identity: contentIdentity,
    git_object_id_for_current_bytes: objectId,
    object_exists_in_local_git_db: objectExistsLocal,
    head_blob_object_id: headBlob,
    origin_main_blob_object_id: originBlob,
    local_reachability_roots: localReachabilityRoots,
    remote_ref_checked: remoteHead ? "origin/main" : "REMOTE_REF_UNAVAILABLE",
    remote_ref_identity: remoteHead,
    remote_replicated_current_bytes: remoteReplicated,
    independent_recontact: cloneRecontact,
    ...custody
  };
}

function recontactGitRefs(rootDir) {
  const currentHead = tryGit(rootDir, ["rev-parse", "HEAD"])?.trim() ?? null;
  const currentBranch = tryGit(rootDir, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim() ?? null;
  const localOriginMain = tryGit(rootDir, ["rev-parse", "origin/main"])?.trim() ?? null;
  const remoteOriginMain = tryGit(rootDir, ["ls-remote", "origin", "refs/heads/main"])
    ?.trim()
    .split(/\s+/)[0] ?? null;
  const aheadBehind = tryGit(rootDir, ["rev-list", "--left-right", "--count", "origin/main...HEAD"])
    ?.trim()
    .split(/\s+/)
    .map(Number) ?? null;
  const statusPorcelain = tryGit(rootDir, ["status", "--porcelain=v1", "-uall"]) ?? "";
  return {
    current_head: currentHead,
    current_branch: currentBranch,
    local_origin_main: localOriginMain,
    remote_origin_main: remoteOriginMain,
    remote_recontact_matches_local_tracking: remoteOriginMain === localOriginMain,
    ahead_behind_origin_main_to_head: aheadBehind
      ? { behind: aheadBehind[0], ahead: aheadBehind[1] }
      : null,
    working_tree_dirty_paths: statusPorcelain.trimEnd().split("\n").filter(Boolean),
    local_remote_same_durability_domain: currentHead === remoteOriginMain
  };
}

function findIdentifierFiles(rootDir, identifiers) {
  const needles = identifiers.map((entry) => entry.replace("sha256:", ""));
  const hits = new Map(identifiers.map((entry) => [entry, []]));
  const rg = tryGit(rootDir, ["grep", "-n", "-I", "-e", needles.join("\\|"), "--", "."]);
  if (!rg) return Object.fromEntries(hits);
  for (const line of rg.trim().split("\n").filter(Boolean)) {
    for (const identifier of identifiers) {
      if (line.includes(identifier.replace("sha256:", "")) || line.includes(identifier)) {
        hits.get(identifier).push(line);
      }
    }
  }
  return Object.fromEntries(hits);
}

function identityEntryForA20(t2Report, previousFreeze) {
  const candidates = t2Report?.launch_subject_recontact?.identity_recomputation_candidates ?? {};
  const candidateMatches = Object.values(candidates).includes(KNOWN_IDENTIFIERS.A20E);
  return {
    identifier: KNOWN_IDENTIFIERS.A20E,
    primary_species: candidateMatches ? "STRUCTURAL_IDENTITY" : "ASSIGNED_REFERENCE",
    lawful_current_interpretation: candidateMatches
      ? "DETERMINISTIC_IDENTITY_REPRODUCED"
      : "FOUNDER_ASSIGNED_SUBJECT_REF_OR_PREDECESSOR_ASSIGNED_SUBJECT_REF",
    derivation_attempts: candidates,
    recomputed_value_matches_identifier: candidateMatches,
    issuer: "FOUNDER_AUTHORITY_AS_RECORDED_BY_PREDECESSOR_SUBJECT_USAGE",
    assignment_event: "Prior T2/freeze tooling consumed this value as launch_subject_identity.",
    referent: previousFreeze?.launch_subject_identity === KNOWN_IDENTIFIERS.A20E
      ? "predecessor launch subject reference"
      : "unverified predecessor subject reference",
    does_not_establish: [
      "CONTENT_IDENTITY",
      "STRUCTURAL_IDENTITY",
      "FREEZE_IDENTITY",
      "SUCCESSOR_IDENTITY",
      "REMOTE_CUSTODY"
    ],
    disposition: candidateMatches
      ? "RETAIN_DETERMINISTIC_IDENTITY_STANDING"
      : "MUST_NOT_RETAIN_CRYPTOGRAPHIC_OR_STRUCTURAL_IDENTITY_STANDING"
  };
}

function identityEntryFor5ddd(g7Report, rootDir) {
  const subjectPath = g7Report?.SUCCESSOR_SUBJECT_IF_ANY?.path ?? null;
  const subjectObject = subjectPath ? readJsonIfExists(rootDir, subjectPath) : null;
  const recomputed = subjectObject ? recomputeStructuralIdentity(subjectObject) : null;
  return {
    identifier: KNOWN_IDENTIFIERS.FIVE_DDD,
    primary_species: recomputed === KNOWN_IDENTIFIERS.FIVE_DDD ? "STRUCTURAL_IDENTITY" : "UNRESOLVED",
    canonicalization_rule: "digestObject(successor subject JSON with successor_launch_subject_identity removed)",
    exact_preimage: subjectPath,
    recomputed_value: recomputed,
    constituent_identities: subjectObject?.predecessor_closure?.map((entry) => entry.identity).filter(Boolean) ?? [],
    relations: subjectObject?.lineage ?? [],
    does_not_establish: [
      "CONTENT_IDENTITY",
      "CUSTODY_DURABILITY",
      "G7_CLOSURE",
      "R4_ELIGIBILITY",
      "LAUNCH"
    ],
    disposition: recomputed === KNOWN_IDENTIFIERS.FIVE_DDD
      ? "STRUCTURAL_IDENTITY_RECOGNIZED_WITH_SEPARATE_CUSTODY_STANDING"
      : "UNRESOLVED_RECOMPUTATION_FAILED_OR_PREIMAGE_ABSENT"
  };
}

function identityEntryFor734(rootDir, launchInstrumentEntry) {
  return {
    identifier: KNOWN_IDENTIFIERS.SEVEN34,
    primary_species: launchInstrumentEntry.content_identity === KNOWN_IDENTIFIERS.SEVEN34
      ? "CONTENT_IDENTITY"
      : "UNRESOLVED",
    derivation_function: "sha256(exact file bytes)",
    exact_preimage: "tools/ourself-selfcommunication-launch-readiness.mjs",
    recomputed_value: launchInstrumentEntry.content_identity,
    custody_standing: launchInstrumentEntry.durability_species,
    does_not_establish: [
      "CONTENT_ADDRESSED_STORAGE",
      "DURABLE_CUSTODY",
      "REMOTE_REPLICATION",
      "STRUCTURAL_IDENTITY"
    ],
    disposition: launchInstrumentEntry.content_identity === KNOWN_IDENTIFIERS.SEVEN34
      ? "CURRENT_CONTENT_IDENTITY_REPRODUCED_CUSTODY_SEPARATELY_ADJUDICATED"
      : "CURRENT_BYTES_DO_NOT_REPRODUCE_TARGET"
  };
}

function identityEntryForD49(g7Report) {
  const original = g7Report?.ORIGINAL_D49C_RECONTACT ?? {};
  return {
    identifier: KNOWN_IDENTIFIERS.D49C,
    primary_species: "UNRESOLVED",
    unresolved_scope: "historical launch-readiness object",
    historical_object_recontacted: original.ORIGINAL_OBJECT_RECONTACTED === true,
    semantic_regeneration_observed: original.SEMANTICALLY_SIMILAR_OBJECT_REGENERATED === true,
    exact_preimage: original.ORIGINAL_OBJECT_RECONTACTED === true
      ? "RECONTACTED_HISTORICAL_OBJECT"
      : "NOT_AVAILABLE_FROM_SEARCHED_CUSTODY",
    recomputed_value: original.semantic_regeneration_identity ?? null,
    disposition: "HISTORICAL_OBJECT_ABSENT_SEMANTIC_REGENERATION_NOT_RECOVERY",
    does_not_establish: [
      "HISTORICAL_RECOVERY",
      "PREDECESSOR_CUSTODY",
      "SUCCESSOR_PASS",
      "FREEZE_AUTHORITY"
    ]
  };
}

export function buildIdentitySpeciesMap({ rootDir, t2Report, g7Report, previousFreeze, matterEntries }) {
  const byPath = new Map(matterEntries.map((entry) => [entry.path, entry]));
  return [
    identityEntryForA20(t2Report, previousFreeze),
    identityEntryFor5ddd(g7Report, rootDir),
    identityEntryFor734(rootDir, byPath.get("tools/ourself-selfcommunication-launch-readiness.mjs") ?? {}),
    identityEntryForD49(g7Report),
    {
      identifier: KNOWN_IDENTIFIERS.LOCAL_HEAD,
      primary_species: "CUSTODY_IDENTITY",
      derivation_function: "Git commit object identity",
      referent: "local HEAD commit",
      custody_scope: "local repository reachability root",
      does_not_establish: ["REMOTE_REPLICATION", "SEMANTIC_PREIMAGE_VALIDITY", "LAUNCH"]
    },
    {
      identifier: KNOWN_IDENTIFIERS.REMOTE_MAIN,
      primary_species: "CUSTODY_IDENTITY",
      derivation_function: "Git remote refs/heads/main identity",
      referent: "origin/main remote ref as recontacted",
      custody_scope: "remote replicated history before this operation",
      does_not_establish: ["LOCAL_WORKTREE_CURRENT_BYTES", "SUCCESSOR_CUSTODY", "LAUNCH"]
    }
  ];
}

export function buildSuccessorDelta() {
  const delta = {
    S1: "PREDECESSOR_OVERLOADED_SUBJECT_MODEL",
    S2: "PROOF_CARRYING_SUCCESSOR_SUBJECT_MODEL",
    ADDED: [
      "SUBJECT_REF assigned-reference field",
      "STRUCTURAL_IDENTITY deterministic field",
      "CONTENT_ROOTS separated from subject reference",
      "CUSTODY_ROOTS separated by durability species",
      "DELTA_IDENTITY",
      "EVIDENCE_DEPENDENCY_MAP",
      "HEAD_PIN_FINDINGS"
    ],
    REMOVED: [
      "single opaque launch_subject_identity as simultaneous content/structural/founder/freeze/successor identity"
    ],
    CHANGED: [
      "a20e63ee primary species from implicit identity to assigned reference unless recomputed",
      "T2 transfer from automatic predecessor PASS to delta-sensitive adjudication",
      "content-addressed local filenames from durable custody claim to WORKTREE_ONLY unless Git or remote recontact proves otherwise",
      "G7 eligibility from label carry to subject/custody/evidence predicate"
    ],
    UNCHANGED: [
      "launch target remains SELFCOMMUNICATION_LIVE_V0",
      "current launch standing remains NO_LAUNCH",
      "historical d49c remains missing",
      "G5 remains blocked without valid R4 receipt",
      "G7 is not rerun"
    ],
    RELATION_CHANGED: [
      "T2 predecessor relation must bind to successor subject preimage before carry",
      "HEAD equality is not evidence validity unless HEAD is a required preimage member"
    ]
  };
  return {
    ...delta,
    DELTA_IDENTITY: digestObject(delta)
  };
}

export function buildEvidenceDependencyMap({ deltaIdentity }) {
  const items = [
    {
      evidence_id: "T2_PREDECESSOR_BINDING",
      QUESTION_SUPPORTED: "Does T2 provide bounded predecessor observation Matter for the launch subject?",
      REQUIRED_PREIMAGE_SET: [
        "subject_ref_or_identity_bound_in_T2_receipt",
        "Patient Zero comment 5464975482 body identity",
        "Claude T2 participation transcript records",
        "T2 observation occurrence output",
        "T0 standing ceiling text",
        "custodied source evidence bytes"
      ],
      RULE: "Evidence may transfer only when the successor delta does not intersect its required preimage.",
      STANDING_CEILING: "LOAD_BEARING_PREDECESSOR_ONLY",
      AffectedByDelta: "TRUE",
      delta_intersection: [
        "subject_ref_or_identity_bound_in_T2_receipt",
        "a20e63ee species adjudication",
        "successor subject ref and structural identity separation"
      ],
      disposition: "UNDERDETERMINED",
      no_manual_pass_injection: true
    },
    {
      evidence_id: "G6_CURRENT_STANDING",
      QUESTION_SUPPORTED: "Did lawful later observation resolve historical held hostile Matter?",
      REQUIRED_PREIMAGE_SET: [
        "T2 successor disposition",
        "T2 observation occurrence",
        "T2 standing ceiling"
      ],
      RULE: "G6 follows the current T2 successor disposition, not predecessor label text.",
      STANDING_CEILING: "NO_LAUNCH_GATE_EVIDENCE_ONLY",
      AffectedByDelta: "TRUE",
      delta_intersection: ["T2 successor disposition"],
      disposition: "REVALIDATION_REQUIRED"
    },
    {
      evidence_id: "g7_SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK",
      QUESTION_SUPPORTED: "Does context possession remain blocked from observation or authority standing?",
      REQUIRED_PREIMAGE_SET: [
        "bounded external session marker census",
        "context-present-not-observation law",
        "launch-readiness lower-case g7 gate logic"
      ],
      RULE: "Lower-case g7 may carry only as context-law evidence; it is not uppercase G7 closure.",
      STANDING_CEILING: "CARRIED_WITH_LINEAGE_CONTEXT_LAW_ONLY",
      AffectedByDelta: "FALSE",
      delta_intersection: [],
      disposition: "CARRIED_WITH_LINEAGE"
    },
    {
      evidence_id: "G5_INDEPENDENT_HOSTILE_REVIEW",
      QUESTION_SUPPORTED: "Does a valid independent hostile R4 receipt bind to the exact launch subject?",
      REQUIRED_PREIMAGE_SET: [
        "valid R4 receipt",
        "exact subject ref and structural identity",
        "required attack coverage",
        "independence proof"
      ],
      RULE: "No R4 receipt exists in this operation; G5 remains blocked.",
      STANDING_CEILING: "NO_LAUNCH",
      AffectedByDelta: "TRUE",
      delta_intersection: ["exact successor subject ref and structural identity"],
      disposition: "INVALIDATED_FOR_SUCCESSOR_UNTIL_NEW_R4_AFTER_G7"
    },
    {
      evidence_id: "H1_HISTORICAL_D49C_ABSENCE",
      QUESTION_SUPPORTED: "Was the historical d49c object recovered?",
      REQUIRED_PREIMAGE_SET: ["searched custody surfaces", "absence of exact original object match"],
      RULE: "Semantic regeneration is not historical recovery.",
      STANDING_CEILING: "BLOCKER_PRESSURE_PRESERVED",
      AffectedByDelta: "FALSE",
      delta_intersection: [],
      disposition: "CARRIED_WITH_LINEAGE"
    }
  ];
  return items.map((item) => ({
    ...item,
    DELTA_IDENTITY: deltaIdentity,
    dependency_identity: digestObject(item)
  }));
}

export function buildHeadPinFindings() {
  return [
    {
      rule_ref: "T2_LAUNCH_SUBJECT_RECONTACT_HEAD_EQUALS_4357F7AC",
      observed_head_pin: KNOWN_IDENTIFIERS.LOCAL_HEAD,
      asks_same_repository_position: true,
      asks_same_required_preimage: false,
      finding: "HEAD equality is lawful for proving the current checkout is at a custody commit, but not sufficient for T2 evidence carry.",
      repair: "For semantic evidence transfer, require exact preimage identities: subject ref/structural identity, Patient Zero content, transcript record identities, receipt ceiling, and custody refs.",
      repaired_by_successor_model: true
    },
    {
      rule_ref: "REMOTE_REPLICATION_HEAD_PIN",
      observed_remote_main: KNOWN_IDENTIFIERS.REMOTE_MAIN,
      asks_same_repository_position: true,
      asks_same_required_preimage: false,
      finding: "Remote origin/main and local HEAD are different durability domains.",
      repair: "Remote custody can be established only by non-force ref replication followed by remote recontact of exact subject bytes.",
      repaired_by_successor_model: true
    }
  ];
}

function buildSubjectModel({ matterEntries, identitySpeciesMap, delta, evidenceDependencyMap }) {
  const contentRoots = matterEntries
    .filter((entry) => entry.exists && entry.content_identity)
    .map((entry) => ({
      path: entry.path,
      role: entry.role,
      content_identity: entry.content_identity,
      git_object_id: entry.git_object_id_for_current_bytes
    }));
  const custodyRoots = matterEntries.map((entry) => ({
    path: entry.path,
    durability_species: entry.durability_species,
    local_reachability_roots: entry.local_reachability_roots,
    remote_replicated_current_bytes: entry.remote_replicated_current_bytes,
    independent_recontact: entry.independent_recontact.independent_recontact
  }));
  const core = {
    SUBJECT_REF: SUCCESSOR_SUBJECT_REF,
    SUBJECT_REF_SPECIES: "ASSIGNED_REFERENCE",
    STRUCTURAL_IDENTITY_RULE:
      "digestObject(subject core excluding STRUCTURAL_IDENTITY and custody roots that cannot be known before commit)",
    CONTENT_ROOTS: contentRoots,
    PREDECESSOR_SUBJECT_REF: KNOWN_IDENTIFIERS.A20E,
    PREDECESSOR_SUBJECT_REF_SPECIES: "ASSIGNED_REFERENCE",
    PREDECESSOR_STRUCTURAL_IDENTITY: "UNESTABLISHED_A20E_DOES_NOT_RECOMPUTE",
    DELTA_IDENTITY: delta.DELTA_IDENTITY,
    CARRIED_EVIDENCE: evidenceDependencyMap
      .filter((entry) => entry.disposition === "CARRIED_WITH_LINEAGE")
      .map((entry) => entry.evidence_id),
    REVALIDATED_EVIDENCE: [],
    INVALIDATED_EVIDENCE: evidenceDependencyMap
      .filter((entry) => String(entry.disposition).startsWith("INVALIDATED"))
      .map((entry) => entry.evidence_id),
    UNRESOLVED_EVIDENCE: evidenceDependencyMap
      .filter((entry) => ["UNDERDETERMINED", "REVALIDATION_REQUIRED"].includes(entry.disposition))
      .map((entry) => entry.evidence_id),
    STANDING_CEILING: "NO_LAUNCH",
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH"
  };
  const structuralIdentity = digestObject(core);
  return {
    ...core,
    STRUCTURAL_IDENTITY: structuralIdentity,
    CUSTODY_ROOTS: custodyRoots,
    SUBJECT_REF_NOT_STRUCTURAL_IDENTITY: SUCCESSOR_SUBJECT_REF !== structuralIdentity,
    STRUCTURAL_IDENTITY_NOT_CUSTODY_ROOT: !custodyRoots.some((entry) => entry.path === structuralIdentity),
    IDENTITY_SPECIES_MAP: identitySpeciesMap
  };
}

function buildRemotePrecheck({ rootDir, gitRefs }) {
  const commitsToReplicate = tryGit(rootDir, ["rev-list", "--reverse", "origin/main..HEAD"])
    ?.trim()
    .split("\n")
    .filter(Boolean) ?? [];
  return {
    LOCAL_REF: gitRefs.current_head,
    REMOTE_REF: gitRefs.remote_origin_main,
    EXPECTED_REMOTE_OLD: gitRefs.remote_origin_main,
    PROPOSED_REMOTE_NEW: gitRefs.current_head,
    COMMITS_TO_REPLICATE: commitsToReplicate,
    OBJECT_CLOSURE: "NOT_COMPUTED_UNTIL_EXACT_COMMIT_EXISTS",
    non_force_required: true,
    remote_currently_matches_expected_old: gitRefs.remote_origin_main === gitRefs.local_origin_main,
    custody_replication_only_not_launch: true
  };
}

function exactCustodySet(rootDir) {
  return DEFAULT_EXACT_CUSTODY_PATHS.filter((relativePath) => pathExists(rootDir, relativePath));
}

export function buildProofCarryingSuccessionReport({
  rootDir = process.cwd(),
  reportPath = DEFAULT_REPORT_PATH,
  writeReport = true
} = {}) {
  const root = path.resolve(rootDir);
  const gitRefs = recontactGitRefs(root);
  const previousFreeze = readJsonIfExists(root, "specimens/selfcommunication-launch-freeze-v0-001/custodied-launch-subject-freeze.json");
  const t2Report = readJsonIfExists(root, "specimens/selfcommunication-t2-predecessor-binding-v0-001/t2-predecessor-binding-report.json");
  const g7Report = readJsonIfExists(root, "specimens/selfcommunication-g7-open-binding-custody-v0-001/g7-open-binding-custody-report.json");
  const roles = new Map([
    ["AGENTS.md", "CODEXSELF_REPOSITORY_LAW"],
    ["CLAUDE.md", "CLAUDESELF_REPOSITORY_LAW"],
    ["README.md", "REPOSITORY_BOOTSTRAP_DOCUMENTATION"],
    ["package.json", "LOCAL_COMMAND_SURFACE"],
    ["tools/ourself-selfcommunication-launch-readiness.mjs", "CURRENT_LAUNCH_INSTRUMENT_734_PRESSURE"],
    ["tools/ourself-selfcommunication-proof-carrying-succession.mjs", "PROOF_CARRYING_SUCCESSION_MECHANISM"],
    ["test/ourself-selfcommunication-proof-carrying-succession.test.mjs", "FOCUSED_SUCCESSION_FIXTURE"],
    ["specimens/selfcommunication-launch-subject-custody-v0-001/launch-subject-manifest.json", "PREDECESSOR_LAUNCH_SUBJECT_MANIFEST"],
    ["inselfactions/ISA-20260830-SELFCOMMUNICATION-LAUNCH-SUBJECT-CUSTODY-001.json", "PREDECESSOR_CUSTODY_RECEIPT"],
    ["specimens/selfcommunication-launch-freeze-v0-001/custodied-launch-subject-freeze.json", "PREDECESSOR_FREEZE_LOCAL_MATTER"],
    ["specimens/selfcommunication-t2-predecessor-binding-v0-001/t2-predecessor-binding-report.json", "PREDECESSOR_T2_REPORT_LOCAL_MATTER"],
    ["specimens/selfcommunication-g7-open-binding-custody-v0-001/g7-open-binding-custody-report.json", "SUCCESSOR_G7_PRESSURE_REPORT_LOCAL_MATTER"]
  ]);
  const matterEntries = DEFAULT_RECONTACT_PATHS
    .map((relativePath) => buildMatterEntry({
      rootDir: root,
      relativePath,
      role: roles.get(relativePath) ?? "UNCLASSIFIED_RECONTACT_PATH",
      remoteHead: gitRefs.remote_origin_main
    }));
  const identitySpeciesMap = buildIdentitySpeciesMap({
    rootDir: root,
    t2Report,
    g7Report,
    previousFreeze,
    matterEntries
  });
  const delta = buildSuccessorDelta();
  const evidenceDependencyMap = buildEvidenceDependencyMap({ deltaIdentity: delta.DELTA_IDENTITY });
  const subjectModel = buildSubjectModel({
    matterEntries,
    identitySpeciesMap,
    delta,
    evidenceDependencyMap
  });
  const custodyDurabilityMap = matterEntries.map((entry) => ({
    path: entry.path,
    content_identity: entry.content_identity,
    git_object_id_for_current_bytes: entry.git_object_id_for_current_bytes,
    durability_species: entry.durability_species,
    sufficient_for_local_launch_custody: entry.sufficient_for_local_launch_custody,
    sufficient_for_remote_launch_custody: entry.sufficient_for_remote_launch_custody,
    object_exists_not_object_reachable: entry.object_exists_not_object_reachable,
    current_git_status: entry.current_git_status
  }));
  const destructionRecontactResults = matterEntries.map((entry) => entry.independent_recontact);
  const authorizedPathSet = exactCustodySet(root).sort();
  const authorizedEntries = matterEntries.filter((entry) => authorizedPathSet.includes(entry.path));
  const commitRequired = authorizedEntries.some((entry) => !entry.durability_species.includes("GIT_REACHABLE_LOCAL"));
  const t2Dependency = evidenceDependencyMap.find((entry) => entry.evidence_id === "T2_PREDECESSOR_BINDING");
  const report = {
    schema: PROOF_CARRYING_SUCCESSION_SCHEMA,
    object_type: "SELFCOMMUNICATION_LIVE_V0_PROOF_CARRYING_SUCCESSION_REPORT",
    destination: "GPTSELF_CURRENT",
    launch_target: LAUNCH_TARGET,
    authority: {
      HBCSELF: "ACTIVE",
      DARKMATTERBOX: "ACTIVE",
      current_launch_standing: "NO_LAUNCH",
      launch_authority: "NOT_AUTHORIZED",
      r4_authority: "NOT_AUTHORIZED",
      g7_rerun: "NOT_AUTHORIZED_NOT_EXECUTED"
    },
    PREDECESSOR_STANDING: {
      subject_ref: KNOWN_IDENTIFIERS.A20E,
      standing: "PREDECESSOR_LOCAL_CUSTODY_CLAIM_UNDER_HOSTILE_REVIEW",
      current_disposition: "NOT_CARRIED_AS_IDENTITY"
    },
    CURRENT_SUBJECT_GRAPH: {
      predecessor_subject_ref: KNOWN_IDENTIFIERS.A20E,
      successor_subject_ref: SUCCESSOR_SUBJECT_REF,
      successor_structural_identity: subjectModel.STRUCTURAL_IDENTITY,
      subject_ref_not_structural_identity: subjectModel.SUBJECT_REF_NOT_STRUCTURAL_IDENTITY,
      predecessor_freeze_identity: previousFreeze?.freeze_identity ?? null,
      g7_successor_subject_identity_claim: g7Report?.SUCCESSOR_SUBJECT_IF_ANY?.identity ?? null
    },
    CURRENT_IDENTITY_GRAPH: identitySpeciesMap,
    CURRENT_CUSTODY_GRAPH: custodyDurabilityMap,
    CURRENT_EVIDENCE_GRAPH: evidenceDependencyMap,
    IDENTITY_SPECIES_MAP: identitySpeciesMap,
    A20E_DISPOSITION: identitySpeciesMap.find((entry) => entry.identifier === KNOWN_IDENTIFIERS.A20E),
    SUBJECT_MODEL: subjectModel,
    CUSTODY_THEOREM: {
      theorem:
        "Custodied(M,C) only if an independent recontact can resolve exact accountable bytes for M from C and verify identity.",
      rejected_substitutes: [
        "file existence",
        "archive filename",
        "duplicate local copy",
        "stored digest string",
        "receipt saying custodied",
        "loose Git object without reachability"
      ],
      durability_species: [
        "WORKTREE_ONLY",
        "GIT_OBJECT_DB_LOCAL",
        "GIT_REACHABLE_LOCAL",
        "REMOTE_REPLICATED",
        "MULTI_CUSTODIAN"
      ]
    },
    CUSTODY_DURABILITY_MAP: custodyDurabilityMap,
    DESTRUCTION_RECONTACT_RESULTS: destructionRecontactResults,
    EXACT_CUSTODY_SET: authorizedPathSet,
    COMMIT_REQUIRED: commitRequired,
    PRE_COMMIT_HEAD: gitRefs.current_head,
    COMMIT_ID: "NOT_CREATED_BY_THIS_TOOL",
    LOCAL_GIT_CUSTODY_STANDING: commitRequired
      ? "GIT_REACHABLE_LOCAL_REQUIRED_NOT_YET_ESTABLISHED_FOR_EXACT_SET"
      : "GIT_REACHABLE_LOCAL_ESTABLISHED_FOR_EXACT_SET",
    REMOTE_PRECHECK: buildRemotePrecheck({ rootDir: root, gitRefs }),
    CUSTODY_REPLICATION_EXECUTED: false,
    REMOTE_REF_RESULT: {
      remote_origin_main: gitRefs.remote_origin_main,
      local_head: gitRefs.current_head,
      local_head_equals_remote_origin_main: gitRefs.current_head === gitRefs.remote_origin_main
    },
    REMOTE_RECONTACT_RESULT: "NOT_EXECUTED_BEFORE_CUSTODY_COMMIT",
    REMOTE_CUSTODY_STANDING: gitRefs.current_head === gitRefs.remote_origin_main
      ? "REMOTE_REPLICATED"
      : "NOT_REMOTE_REPLICATED",
    SUCCESSOR_DELTA: delta,
    DELTA_IDENTITY: delta.DELTA_IDENTITY,
    EVIDENCE_DEPENDENCY_MAP: evidenceDependencyMap,
    T2_REQUIRED_PREIMAGE: t2Dependency?.REQUIRED_PREIMAGE_SET ?? [],
    T2_AFFECTEDNESS: t2Dependency?.AffectedByDelta ?? "UNDERDETERMINED",
    T2_SUCCESSOR_DISPOSITION: t2Dependency?.disposition ?? "UNDERDETERMINED",
    HEAD_PIN_FINDINGS: buildHeadPinFindings(),
    PROOF_CARRYING_SUCCESSOR: {
      subject_ref: subjectModel.SUBJECT_REF,
      structural_identity: subjectModel.STRUCTURAL_IDENTITY,
      delta_identity: delta.DELTA_IDENTITY,
      carried_evidence: subjectModel.CARRIED_EVIDENCE,
      revalidated_evidence: subjectModel.REVALIDATED_EVIDENCE,
      invalidated_evidence: subjectModel.INVALIDATED_EVIDENCE,
      unresolved_evidence: subjectModel.UNRESOLVED_EVIDENCE,
      standing_ceiling: subjectModel.STANDING_CEILING
    },
    SUCCESSOR_STRUCTURAL_IDENTITY: subjectModel.STRUCTURAL_IDENTITY,
    SUCCESSOR_SUBJECT_REF: subjectModel.SUBJECT_REF,
    NEW_FREEZE: "NOT_MINTED",
    NEW_FREEZE_IDENTITY: "NOT_MINTED",
    G7_ELIGIBILITY: false,
    R4_ELIGIBILITY: false,
    FILES_CHANGED: authorizedPathSet,
    TEST_RESULTS: [],
    BLOCKERS: [
      "T2_SUCCESSOR_DISPOSITION_UNDERDETERMINED",
      "REMOTE_REPLICATED_CUSTODY_NOT_ESTABLISHED",
      "NEW_FREEZE_NOT_MINTED",
      "G7_NOT_RECLOSED",
      "R4_INELIGIBLE",
      "G5_REMAINS_BLOCKED"
    ],
    RESIDUE: [
      "Historical d49c remains missing.",
      "Pre-existing T2 and G7 local reports remain evidence pressure, not successor standing.",
      "Unrelated dirty and untracked Matter is excluded from the exact custody set.",
      "A post-commit report may record COMMIT_ID externally; a commit cannot contain its own object name."
    ],
    CURRENT_LAUNCH_STANDING: "NO_LAUNCH",
    NEXT_REQUIRED_SEAT: "T2_SUCCESSOR_REVALIDATION_AFTER_DURABLE_CUSTODY_OR_G7_CONTEXT_PROVENANCE_REVIEW_IF_REVALIDATED"
  };
  report.REPORT_IDENTITY = digestObject(report);
  if (writeReport) writeStableJsonFile(path.join(root, reportPath), report);
  return report;
}

function main() {
  const rootDir = valueAfter(process.argv, "--root") ?? process.cwd();
  const reportPath = valueAfter(process.argv, "--out") ?? DEFAULT_REPORT_PATH;
  const writeReport = !hasFlag(process.argv, "--no-write");
  const report = buildProofCarryingSuccessionReport({ rootDir, reportPath, writeReport });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
