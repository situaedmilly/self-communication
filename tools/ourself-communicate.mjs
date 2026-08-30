#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const SCHEMA_ID = "selfcommunication.event.v0.1-candidate";

export const STAGE_ORDER = [
  "EXPRESSED",
  "TRANSMITTED",
  "OBSERVED",
  "UNDERSTOOD",
  "ADMITTED",
  "AUTHORIZED",
  "EFFECTED"
];

export const REQUIRED_NON_COLLAPSE = [
  "COMMUNICATED_MATTER != ADMITTED_MEANING",
  "ADMITTED_MEANING != AUTHORIZED_EFFECT",
  "ACK != HOLLABACK",
  "HOLLABACK != PROOF_OF_ACK",
  "ACK != AUTHORITY",
  "AUTHORITY != SUCCESSFUL_EFFECT",
  "POSSIBILITY != REALITY",
  "TRANSPORT != PROOF"
];

const REQUIRED_AUTHORITY_CEILING = {
  canonical_schema: "NOT_RATIFIED",
  network_transport: "NOT_AUTHORIZED",
  autonomous_mutation: "FORBIDDEN"
};

export function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function identityForText(text) {
  return `sha256:${sha256Text(text)}`;
}

export function createEvent(options) {
  const matter = requiredString(options.matter, "matter");
  const source = options.source || "SELF:UNKNOWN_SOURCE";
  const observer = options.observer || "SELF:CODEXSELF";
  const recipient = options.recipient || "SELF:OURSELF";
  const session = options.session || "LOCAL_SESSION";
  const createdAt = options.createdAt || currentIsoSecond();
  const matterSha = sha256Text(matter);
  const matterIdentity = `sha256:${matterSha}`;
  const eventSuffix = matterSha.slice(0, 12).toUpperCase();

  return {
    schema: SCHEMA_ID,
    event_id: `SCE-${createdAt.replace(/[-:]/g, "").replace("T", "-").replace("Z", "")}-${eventSuffix}`,
    artifact_status: "LOCAL_WITNESS_CANDIDATE_NOT_CANONICAL_SCHEMA",
    created_at: createdAt,
    source_actor_ref: source,
    target_actor_ref: recipient,
    matter_ref: {
      matter_id: "M1",
      content: matter,
      encoding: "utf8",
      identity: matterIdentity,
      expression_identity: {
        sha256: matterSha,
        byte_length: Buffer.byteLength(matter, "utf8"),
        encoding: "utf8"
      },
      manifestation: ["linguistic"]
    },
    darkmatterbox: {
      box_id: "DMB-LOCAL-CREATE-001",
      role: "BOUNDED_POSSIBILITY_CHAMBER",
      status: "OBSERVED",
      possible_interpretations: [
        {
          variant_id: "T1_EXACT",
          disposition: "OBSERVED",
          content: matter,
          identity: matterIdentity,
          derivation: "exact supplied matter bytes"
        },
        {
          variant_id: "T2_UNRESOLVED_ALTERNATIVE",
          disposition: "POSSIBLE",
          content: "",
          identity: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          derivation: "reserved unresolved alternative; not admitted"
        }
      ],
      actual_observation_ref: "O1",
      admitted_variant_ref: null,
      rejected_variant_refs: []
    },
    observation_identity: {
      observation_id: "O1",
      observer_ref: observer,
      observed_matter_identity: matterIdentity,
      observed_variant_ref: "T1_EXACT",
      observation_disposition: "OBSERVED"
    },
    admission_identity: {
      admission_id: "AD1",
      admitted_variant_ref: null,
      disposition: "NOT_APPLICABLE",
      meaning: "No meaning admitted by create command; downstream admission required."
    },
    authority_identity: {
      authority_id: "AUTH1",
      authority_ref: session,
      disposition: "NOT_APPLICABLE",
      scope: "event creation on stdout only; no mutation authority implied"
    },
    effect_identity: {
      effect_id: "E1",
      disposition: "NOT_APPLICABLE",
      effect: "No effect executed by create command."
    },
    trajectory: STAGE_ORDER.map((stage) => ({
      stage,
      disposition: stage === "EXPRESSED" || stage === "TRANSMITTED" ? "ESTABLISHED" : stage === "OBSERVED" || stage === "UNDERSTOOD" ? "OBSERVED" : "NOT_APPLICABLE",
      identity_ref: stage === "EXPRESSED" || stage === "TRANSMITTED" ? matterIdentity : stage === "OBSERVED" ? "O1" : null,
      note: `${stage} disposition recorded without retroactive identity collapse.`
    })),
    reality_dispositions: {
      EXPRESSED: "ESTABLISHED",
      TRANSMITTED: "ESTABLISHED",
      OBSERVED: "OBSERVED",
      UNDERSTOOD: "OBSERVED",
      ADMITTED: "NOT_APPLICABLE",
      AUTHORIZED: "NOT_APPLICABLE",
      EFFECTED: "NOT_APPLICABLE"
    },
    ack: {
      ack_id: "ACK1",
      kind: "ACK",
      claim: "WHAT_I_RECEIVED",
      observed_matter_identity: matterIdentity,
      observed_variant_ref: "T1_EXACT",
      authority_disposition: "NONE",
      proof_disposition: "NOT_PROOF_OF_AUTHORITY"
    },
    hollaback: {
      hollaback_id: "HB1",
      kind: "HOLLABACK",
      claim: "WHAT_HAPPENED_BECAUSE_OF_IT",
      effect_ref: null,
      effect_disposition: "NOT_APPLICABLE",
      proof_disposition: "NOT_PROOF_OF_ACK"
    },
    witness_refs: ["tools/ourself-communicate.mjs"],
    relation_refs: ["M1 -> O1", "O1 -> ACK1"],
    residue_refs: ["admission required before authority", "authority required before effect"],
    reconciliation_status: "LOCAL_EVENT_CREATED_NOT_ADMITTED",
    non_collapse: [...REQUIRED_NON_COLLAPSE],
    authority_ceiling: {
      canonical_schema: "NOT_RATIFIED",
      structural_transport: "NOT_AUTHORIZED",
      network_transport: "NOT_AUTHORIZED",
      multi_node_exchange: "NOT_AUTHORIZED",
      aethernet_exchange: "NOT_AUTHORIZED",
      SELFgraph_promotion: "NOT_AUTHORIZED",
      runtime_mutation: "NOT_AUTHORIZED",
      autonomous_reconciliation: "FORBIDDEN",
      autonomous_mutation: "FORBIDDEN",
      commit_authority: "NOT_EXERCISED",
      push_authority: "NOT_EXERCISED"
    }
  };
}

export function validateEvent(event) {
  const errors = [];
  const warnings = [];

  if (!isObject(event)) {
    return { ok: false, errors: ["event must be a JSON object"], warnings };
  }

  requireEqual(event.schema, SCHEMA_ID, "schema", errors);
  requireNonEmptyString(event.event_id, "event_id", errors);
  requireNonEmptyString(event.artifact_status, "artifact_status", errors);
  requireNonEmptyString(event.created_at, "created_at", errors);
  requireNonEmptyString(event.source_actor_ref, "source_actor_ref", errors);
  requireNonEmptyString(event.target_actor_ref, "target_actor_ref", errors);

  validateMatter(event.matter_ref, errors);
  validateDarkmatterbox(event.darkmatterbox, errors);
  validateObservationAndAck(event, errors, warnings);
  validateAdmissionAuthorityEffect(event, errors);
  validateTrajectory(event, errors);
  validateNonCollapse(event.non_collapse, errors);
  validateAuthorityCeiling(event.authority_ceiling, errors);

  if (!Array.isArray(event.witness_refs)) errors.push("witness_refs must be an array");
  if (!Array.isArray(event.relation_refs)) errors.push("relation_refs must be an array");
  if (!Array.isArray(event.residue_refs)) errors.push("residue_refs must be an array");
  requireNonEmptyString(event.reconciliation_status, "reconciliation_status", errors);

  return { ok: errors.length === 0, errors, warnings };
}

function validateMatter(matter, errors) {
  if (!isObject(matter)) {
    errors.push("matter_ref must be an object");
    return;
  }
  requireNonEmptyString(matter.matter_id, "matter_ref.matter_id", errors);
  requireEqual(matter.encoding, "utf8", "matter_ref.encoding", errors);
  if (typeof matter.content !== "string") {
    errors.push("matter_ref.content must be a string");
    return;
  }

  const digest = sha256Text(matter.content);
  const identity = `sha256:${digest}`;
  requireEqual(matter.identity, identity, "matter_ref.identity", errors);

  const expression = matter.expression_identity;
  if (!isObject(expression)) {
    errors.push("matter_ref.expression_identity must be an object");
  } else {
    requireEqual(expression.sha256, digest, "matter_ref.expression_identity.sha256", errors);
    requireEqual(expression.byte_length, Buffer.byteLength(matter.content, "utf8"), "matter_ref.expression_identity.byte_length", errors);
    requireEqual(expression.encoding, "utf8", "matter_ref.expression_identity.encoding", errors);
  }

  if (!Array.isArray(matter.manifestation) || matter.manifestation.length === 0) {
    errors.push("matter_ref.manifestation must be a non-empty array");
  }
}

function validateDarkmatterbox(box, errors) {
  if (!isObject(box)) {
    errors.push("darkmatterbox must be an object");
    return;
  }

  requireEqual(box.role, "BOUNDED_POSSIBILITY_CHAMBER", "darkmatterbox.role", errors);
  requireNonEmptyString(box.box_id, "darkmatterbox.box_id", errors);
  requireNonEmptyString(box.actual_observation_ref, "darkmatterbox.actual_observation_ref", errors);

  if (!Array.isArray(box.possible_interpretations) || box.possible_interpretations.length === 0) {
    errors.push("darkmatterbox.possible_interpretations must be a non-empty array");
    return;
  }

  const variantIds = new Set();
  for (const [index, variant] of box.possible_interpretations.entries()) {
    const path = `darkmatterbox.possible_interpretations[${index}]`;
    if (!isObject(variant)) {
      errors.push(`${path} must be an object`);
      continue;
    }
    requireNonEmptyString(variant.variant_id, `${path}.variant_id`, errors);
    if (variant.variant_id) variantIds.add(variant.variant_id);
    if (typeof variant.content !== "string") {
      errors.push(`${path}.content must be a string`);
    } else {
      requireEqual(variant.identity, identityForText(variant.content), `${path}.identity`, errors);
    }
    requireNonEmptyString(variant.derivation, `${path}.derivation`, errors);
  }

  if (box.admitted_variant_ref !== null && box.admitted_variant_ref !== undefined && !variantIds.has(box.admitted_variant_ref)) {
    errors.push("darkmatterbox.admitted_variant_ref must reference a possible interpretation");
  }

  if (!Array.isArray(box.rejected_variant_refs)) {
    errors.push("darkmatterbox.rejected_variant_refs must be an array");
  } else {
    for (const ref of box.rejected_variant_refs) {
      if (!variantIds.has(ref)) errors.push(`darkmatterbox.rejected_variant_refs contains unknown variant ${ref}`);
    }
  }
}

function validateObservationAndAck(event, errors, warnings) {
  const observation = event.observation_identity;
  const ack = event.ack;

  if (!isObject(observation)) {
    errors.push("observation_identity must be an object");
    return;
  }
  requireNonEmptyString(observation.observation_id, "observation_identity.observation_id", errors);
  requireNonEmptyString(observation.observer_ref, "observation_identity.observer_ref", errors);
  requireNonEmptyString(observation.observed_matter_identity, "observation_identity.observed_matter_identity", errors);
  requireNonEmptyString(observation.observed_variant_ref, "observation_identity.observed_variant_ref", errors);

  if (!isObject(ack)) {
    errors.push("ack must be an object");
    return;
  }
  requireEqual(ack.kind, "ACK", "ack.kind", errors);
  requireEqual(ack.claim, "WHAT_I_RECEIVED", "ack.claim", errors);
  requireEqual(ack.authority_disposition, "NONE", "ack.authority_disposition", errors);
  requireEqual(ack.proof_disposition, "NOT_PROOF_OF_AUTHORITY", "ack.proof_disposition", errors);
  requireEqual(ack.observed_matter_identity, observation.observed_matter_identity, "ack.observed_matter_identity", errors);

  if (event.matter_ref?.identity && ack.observed_matter_identity !== event.matter_ref.identity) {
    warnings.push("ACK observed matter differs from original matter; this may be valid only if downstream admission preserves the mismatch explicitly.");
  }
}

function validateAdmissionAuthorityEffect(event, errors) {
  const admission = event.admission_identity;
  const authority = event.authority_identity;
  const effect = event.effect_identity;
  const hollaback = event.hollaback;
  const variants = new Set((event.darkmatterbox?.possible_interpretations || []).map((variant) => variant.variant_id));

  if (!isObject(admission)) errors.push("admission_identity must be an object");
  if (!isObject(authority)) errors.push("authority_identity must be an object");
  if (!isObject(effect)) errors.push("effect_identity must be an object");
  if (!isObject(hollaback)) errors.push("hollaback must be an object");
  if (!isObject(admission) || !isObject(authority) || !isObject(effect) || !isObject(hollaback)) return;

  requireNonEmptyString(admission.admission_id, "admission_identity.admission_id", errors);
  requireNonEmptyString(admission.disposition, "admission_identity.disposition", errors);
  if (admission.disposition === "ADMITTED" && !variants.has(admission.admitted_variant_ref)) {
    errors.push("admission_identity.admitted_variant_ref must reference an existing possible interpretation when disposition is ADMITTED");
  }

  requireNonEmptyString(authority.authority_id, "authority_identity.authority_id", errors);
  requireNonEmptyString(authority.disposition, "authority_identity.disposition", errors);
  if (authority.disposition === "AUTHORIZED") {
    requireNonEmptyString(authority.authority_ref, "authority_identity.authority_ref", errors);
  }

  requireNonEmptyString(effect.effect_id, "effect_identity.effect_id", errors);
  requireNonEmptyString(effect.disposition, "effect_identity.disposition", errors);
  requireEqual(hollaback.kind, "HOLLABACK", "hollaback.kind", errors);
  requireEqual(hollaback.claim, "WHAT_HAPPENED_BECAUSE_OF_IT", "hollaback.claim", errors);
  requireEqual(hollaback.proof_disposition, "NOT_PROOF_OF_ACK", "hollaback.proof_disposition", errors);
  if (effect.disposition === "EFFECTED") {
    requireEqual(hollaback.effect_ref, effect.effect_id, "hollaback.effect_ref", errors);
  }
}

function validateTrajectory(event, errors) {
  if (!Array.isArray(event.trajectory)) {
    errors.push("trajectory must be an array");
    return;
  }

  const stages = event.trajectory.map((entry) => entry?.stage);
  if (JSON.stringify(stages) !== JSON.stringify(STAGE_ORDER)) {
    errors.push(`trajectory stages must appear exactly as ${STAGE_ORDER.join(" -> ")}`);
  }

  if (!isObject(event.reality_dispositions)) {
    errors.push("reality_dispositions must be an object");
    return;
  }

  for (const stage of STAGE_ORDER) {
    requireNonEmptyString(event.reality_dispositions[stage], `reality_dispositions.${stage}`, errors);
  }
}

function validateNonCollapse(nonCollapse, errors) {
  if (!Array.isArray(nonCollapse)) {
    errors.push("non_collapse must be an array");
    return;
  }
  for (const law of REQUIRED_NON_COLLAPSE) {
    if (!nonCollapse.includes(law)) {
      errors.push(`non_collapse missing required law: ${law}`);
    }
  }
}

function validateAuthorityCeiling(ceiling, errors) {
  if (!isObject(ceiling)) {
    errors.push("authority_ceiling must be an object");
    return;
  }
  for (const [key, value] of Object.entries(REQUIRED_AUTHORITY_CEILING)) {
    requireEqual(ceiling[key], value, `authority_ceiling.${key}`, errors);
  }
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function currentIsoSecond() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requireNonEmptyString(value, path, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireEqual(actual, expected, path, errors) {
  if (actual !== expected) {
    errors.push(`${path} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCliArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = value;
      index += 1;
    }
  }
  return args;
}

function summarizeEvent(event, result) {
  return {
    verdict: result.ok ? "PASS" : "FAIL",
    event_id: event.event_id,
    matter_identity: event.matter_ref?.identity,
    observed_matter_identity: event.observation_identity?.observed_matter_identity,
    ack_identity: event.ack?.observed_matter_identity,
    admitted_variant_ref: event.admission_identity?.admitted_variant_ref ?? null,
    authority_disposition: event.authority_identity?.disposition,
    effect_disposition: event.effect_identity?.disposition,
    reconciliation_status: event.reconciliation_status,
    errors: result.errors,
    warnings: result.warnings
  };
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help") {
    console.log("Usage: ourself-communicate <create|validate|inspect> [args]");
    console.log("  create --matter <text> [--source SELF:X] [--observer SELF:Y] [--recipient SELF:Z]");
    console.log("  validate <event.json>");
    console.log("  inspect <event.json>");
    return 0;
  }

  if (command === "create") {
    const args = parseCliArgs(rest);
    const event = createEvent({
      matter: args.matter,
      source: args.source,
      observer: args.observer,
      recipient: args.recipient,
      session: args.session
    });
    console.log(JSON.stringify(event, null, 2));
    return 0;
  }

  if (command === "validate" || command === "inspect") {
    const [path] = rest;
    if (!path) throw new Error(`${command} requires a JSON file path`);
    const event = readJson(path);
    const result = validateEvent(event);
    const summary = summarizeEvent(event, result);
    console.log(JSON.stringify(summary, null, 2));
    return result.ok ? 0 : 1;
  }

  throw new Error(`Unknown command: ${command}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
