#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAck,
  createCommunicationEvent,
  createEmission,
  createMatter,
  createObservation,
  digestObject
} from "./ourself-communication-matter.mjs";

export const COMMLINE_OBSERVATION_GAP_SCHEMA = "ourself.commline-observation-gap.v0.1-candidate";

export const COMMLINE_NON_COLLAPSE = [
  "FRONTIER_CURSOR != OBSERVATION_SEMANTICS",
  "SELF_REF != ENDPOINT_OCCURRENCE_REF",
  "SELF_REF != SESSION_REF",
  "SELF_REF != PARTICIPATION_REF",
  "SESSION_READY != NO_UNOBSERVED_MATTER",
  "NOTIFASELF != WEBHOOK",
  "NOTIFASELF_ELIGIBILITY != ACTIVATION_DELIVERY",
  "ACTIVATION_DELIVERY != OBSERVATION",
  "GOCHECKIT != COMPREHENSION",
  "ACK_EXACT != ACK_COMMUNICATED",
  "ACK_EXISTS != SENDER_KNOWS_ACK",
  "NOTEPAD != COMMLINE",
  "COMMLINE != MATTER_LEDGER",
  "OBSERVATION_GAP != FAILED_COMMUNICATION",
  "PARTICIPATION != PARTICIPATION_OCCURRENCE",
  "CONTEXT_INHERITED != OBSERVATION_INHERITED",
  "CONTEXT_INHERITED != AUTHORITY_INHERITED",
  "OCCURRENCE_KNOWLEDGE != SELF_CONTINUITY_KNOWLEDGE",
  "KNOWLEDGE_PROPAGATION != KNOWLEDGE_AGGREGATION",
  "ADDRESSABLE != OBSERVATION_REQUIRED",
  "OBSERVATION_OBLIGATION != ADDRESSABILITY",
  "EQUAL_CURRENT_KNOWLEDGE != EQUAL_EPISTEMIC_HISTORY"
];

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function sameSet(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(value, null, 2)}\n`);
}

function entryForMatter(matter) {
  return {
    matter_ref: matter.matter_ref,
    matter_identity: matter.content_identity,
    producer_ref: matter.producer_ref,
    species: matter.species,
    byte_count: matter.byte_count
  };
}

function indexMatter(commline) {
  return new Map(commline.matter_entries.map((entry) => [entry.matter_ref, entry]));
}

function observationMatchesParticipation(observation, participation) {
  return observation?.event_type === "OBSERVATION" &&
    observation?.payload?.participation_ref === participation.participation_ref &&
    observation?.actor_ref === participation.endpoint_occurrence_ref;
}

function observationMatchesParticipationOccurrence(observation, participationOccurrence) {
  return observation?.event_type === "OBSERVATION" &&
    observation?.payload?.participation_ref === participationOccurrence.participation_ref &&
    observation?.payload?.participation_occurrence_ref === participationOccurrence.participation_occurrence_ref &&
    observation?.actor_ref === participationOccurrence.endpoint_occurrence_ref;
}

export function createCommline({
  commlineRef = "CL_001",
  matterEntries = [],
  relationRef = "COMMLINE_RELATION_CANDIDATE"
} = {}) {
  const commline = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "COMMLINE",
    commline_ref: commlineRef,
    relation_ref: relationRef,
    relation_kind: "DURABLE_ADDRESSABLE_CAUSAL_MATTER_RELATION",
    matter_entries: matterEntries.map(entryForMatter),
    matter_identity_refs: matterEntries.map((matter) => matter.content_identity),
    participant_relative_observation_state: true,
    frontier_cursor_is_optional_realization: true,
    matter_ledger_not_commline: true,
    notepad_not_commline: true
  };
  commline.commline_identity = digestObject(commline);
  return commline;
}

export function createParticipation({
  participationRef,
  commline,
  selfRef,
  endpointOccurrenceRef,
  sessionRef,
  addressableMatterRefs = null
} = {}) {
  const refs = addressableMatterRefs ?? commline.matter_entries.map((entry) => entry.matter_ref);
  const participation = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "PARTICIPATION",
    participation_ref: participationRef,
    commline_ref: commline.commline_ref,
    self_ref: selfRef,
    endpoint_occurrence_ref: endpointOccurrenceRef,
    session_ref: sessionRef,
    addressable_matter_refs: unique(refs),
    self_ref_not_endpoint_occurrence_ref: selfRef !== endpointOccurrenceRef,
    self_ref_not_session_ref: selfRef !== sessionRef,
    self_ref_not_participation_ref: selfRef !== participationRef,
    endpoint_occurrence_not_participation: endpointOccurrenceRef !== participationRef
  };
  participation.participation_identity = digestObject(participation);
  return participation;
}

export function createParticipationOccurrence({
  participation,
  participationOccurrenceRef,
  endpointOccurrenceRef = null,
  sessionRef = null,
  occurrenceStatus = "ACTIVE",
  contextAncestryRefs = [],
  predecessorOccurrenceRef = null,
  addressableMatterRefs = null,
  observationObligationMatterRefs = []
} = {}) {
  const occurrence = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "PARTICIPATION_OCCURRENCE",
    participation_occurrence_ref: participationOccurrenceRef,
    participation_ref: participation.participation_ref,
    commline_ref: participation.commline_ref,
    self_ref: participation.self_ref,
    endpoint_occurrence_ref: endpointOccurrenceRef ?? participation.endpoint_occurrence_ref,
    session_ref: sessionRef ?? participation.session_ref,
    occurrence_status: occurrenceStatus,
    predecessor_occurrence_ref: predecessorOccurrenceRef,
    context_ancestry_refs: unique(contextAncestryRefs),
    addressable_matter_refs: unique(addressableMatterRefs ?? participation.addressable_matter_refs),
    observation_obligation_matter_refs: unique(observationObligationMatterRefs),
    participation_not_participation_occurrence: participation.participation_ref !== participationOccurrenceRef,
    context_inherited_not_observation_inherited: true,
    context_inherited_not_authority_inherited: true,
    resume_command_not_occurrence_continuation: predecessorOccurrenceRef !== null,
    observation_obligation_not_addressability: true
  };
  occurrence.participation_occurrence_identity = digestObject(occurrence);
  return occurrence;
}

export function computeObservationGap({ commline, participation, observations = [] } = {}) {
  const byRef = indexMatter(commline);
  const observed = [];
  const unknown = [];
  const unobserved = [];
  const invalidAddressableRefs = [];
  const evidenceRefs = [];

  for (const matterRef of participation.addressable_matter_refs) {
    const matterEntry = byRef.get(matterRef);
    if (!matterEntry) {
      invalidAddressableRefs.push(matterRef);
      continue;
    }
    const matching = observations.filter((observation) => (
      observationMatchesParticipation(observation, participation) &&
      observation.payload.source_matter_ref === matterRef &&
      observation.payload.source_matter_identity === matterEntry.matter_identity
    ));
    const exactPersisted = matching.find((observation) => (
      observation.payload.identity_match === true &&
      observation.payload.frontier_receipt_persisted === true
    ));
    const exactUnpersisted = matching.find((observation) => (
      observation.payload.identity_match === true &&
      observation.payload.frontier_receipt_persisted === false
    ));

    if (exactPersisted) {
      observed.push(matterRef);
      evidenceRefs.push(exactPersisted.event_ref);
    } else if (exactUnpersisted) {
      unknown.push(matterRef);
      evidenceRefs.push(exactUnpersisted.event_ref);
    } else {
      unobserved.push(matterRef);
    }
  }

  const gap = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "OBSERVATION_GAP",
    commline_ref: commline.commline_ref,
    participation_ref: participation.participation_ref,
    self_ref: participation.self_ref,
    endpoint_occurrence_ref: participation.endpoint_occurrence_ref,
    session_ref: participation.session_ref,
    addressable_matter_refs: [...participation.addressable_matter_refs],
    observed_matter_refs: observed,
    unobserved_matter_refs: unobserved,
    unknown_observation_matter_refs: unknown,
    invalid_addressable_refs: invalidAddressableRefs,
    observation_gap_size: unobserved.length,
    observation_unknown_size: unknown.length,
    attention_due: unobserved.length > 0,
    reconciliation_required: unknown.length > 0 || invalidAddressableRefs.length > 0,
    evidence_refs: evidenceRefs,
    set_difference_not_cursor_subtraction: true,
    frontier_cursor_not_observation_semantics: true,
    residue_not_global_block: true
  };
  gap.observation_gap_ref = `GAP_${digestObject(gap).slice("sha256:".length, "sha256:".length + 16)}`;
  gap.observation_gap_identity = digestObject(gap);
  return gap;
}

export function computeParticipationOccurrenceObservationGap({
  commline,
  participationOccurrence,
  addressableMatterRefs = null,
  observations = []
} = {}) {
  const byRef = indexMatter(commline);
  const effectiveAddressableRefs = unique(addressableMatterRefs ?? participationOccurrence.addressable_matter_refs);
  const observed = [];
  const unknown = [];
  const unobserved = [];
  const invalidAddressableRefs = [];
  const evidenceRefs = [];

  for (const matterRef of effectiveAddressableRefs) {
    const matterEntry = byRef.get(matterRef);
    if (!matterEntry) {
      invalidAddressableRefs.push(matterRef);
      continue;
    }
    const matching = observations.filter((observation) => (
      observationMatchesParticipationOccurrence(observation, participationOccurrence) &&
      observation.payload.source_matter_ref === matterRef &&
      observation.payload.source_matter_identity === matterEntry.matter_identity
    ));
    const exactPersisted = matching.find((observation) => (
      observation.payload.identity_match === true &&
      observation.payload.frontier_receipt_persisted === true
    ));
    const exactUnpersisted = matching.find((observation) => (
      observation.payload.identity_match === true &&
      observation.payload.frontier_receipt_persisted === false
    ));

    if (exactPersisted) {
      observed.push(matterRef);
      evidenceRefs.push(exactPersisted.event_ref);
    } else if (exactUnpersisted) {
      unknown.push(matterRef);
      evidenceRefs.push(exactUnpersisted.event_ref);
    } else {
      unobserved.push(matterRef);
    }
  }

  const gap = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "PARTICIPATION_OCCURRENCE_OBSERVATION_GAP",
    commline_ref: commline.commline_ref,
    participation_ref: participationOccurrence.participation_ref,
    participation_occurrence_ref: participationOccurrence.participation_occurrence_ref,
    self_ref: participationOccurrence.self_ref,
    endpoint_occurrence_ref: participationOccurrence.endpoint_occurrence_ref,
    session_ref: participationOccurrence.session_ref,
    occurrence_status: participationOccurrence.occurrence_status,
    addressable_matter_refs: [...effectiveAddressableRefs],
    observed_matter_refs: observed,
    unobserved_matter_refs: unobserved,
    unknown_observation_matter_refs: unknown,
    invalid_addressable_refs: invalidAddressableRefs,
    observation_gap_size: unobserved.length,
    observation_unknown_size: unknown.length,
    attention_due: unobserved.length > 0,
    reconciliation_required: unknown.length > 0 || invalidAddressableRefs.length > 0,
    evidence_refs: evidenceRefs,
    occurrence_relative_observation_state: true,
    observed_set_is_derived_from_observation_relations: true,
    knowledge_propagation_not_knowledge_aggregation: true,
    no_sibling_occurrence_union: true,
    set_difference_not_cursor_subtraction: true,
    frontier_cursor_not_observation_semantics: true,
    residue_not_global_block: true
  };
  gap.observation_gap_ref = `PO_GAP_${digestObject(gap).slice("sha256:".length, "sha256:".length + 16)}`;
  gap.observation_gap_identity = digestObject(gap);
  return gap;
}

export function deriveNotifaselfEligibility({ gap } = {}) {
  const eligibility = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "NOTIFASELF_ELIGIBILITY",
    participation_ref: gap.participation_ref,
    commline_ref: gap.commline_ref,
    observation_gap_ref: gap.observation_gap_ref,
    eligible: gap.unobserved_matter_refs.length > 0,
    disposition: gap.unobserved_matter_refs.length > 0
      ? "ATTENTION_PRESSURE_ELIGIBLE"
      : "NO_UNOBSERVED_ADDRESSABLE_MATTER",
    matter_refs: [...gap.unobserved_matter_refs],
    unknown_observation_matter_refs: [...gap.unknown_observation_matter_refs],
    observation_gap_not_notification_delivery: true,
    notifaself_not_webhook: true,
    activation_delivery_not_observation: true
  };
  eligibility.eligibility_ref = `NOTIFASELF_${digestObject(eligibility).slice("sha256:".length, "sha256:".length + 16)}`;
  eligibility.eligibility_identity = digestObject(eligibility);
  return eligibility;
}

export function createObservationObligation({
  obligationRef,
  participationOccurrence,
  matterRefs = [],
  basisRef = "ADDRESSABILITY_POLICY_CANDIDATE",
  obligated = true
} = {}) {
  const obligation = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "OBSERVATION_OBLIGATION",
    obligation_ref: obligationRef,
    participation_ref: participationOccurrence.participation_ref,
    participation_occurrence_ref: participationOccurrence.participation_occurrence_ref,
    self_ref: participationOccurrence.self_ref,
    endpoint_occurrence_ref: participationOccurrence.endpoint_occurrence_ref,
    commline_ref: participationOccurrence.commline_ref,
    matter_refs: unique(matterRefs),
    basis_ref: basisRef,
    obligated,
    addressable_not_observation_required: true,
    observation_obligation_not_addressability: true,
    notifaself_requires_obligation_plus_gap: true
  };
  obligation.obligation_identity = digestObject(obligation);
  return obligation;
}

export function deriveOccurrenceNotifaselfEligibility({ gap, obligations = [] } = {}) {
  const obligatedRefs = new Set(
    obligations
      .filter((obligation) => obligation.obligated === true)
      .filter((obligation) => obligation.participation_occurrence_ref === gap.participation_occurrence_ref)
      .flatMap((obligation) => obligation.matter_refs)
  );
  const eligibleMatterRefs = gap.unobserved_matter_refs.filter((matterRef) => obligatedRefs.has(matterRef));
  const eligibility = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "PARTICIPATION_OCCURRENCE_NOTIFASELF_ELIGIBILITY",
    participation_ref: gap.participation_ref,
    participation_occurrence_ref: gap.participation_occurrence_ref,
    self_ref: gap.self_ref,
    endpoint_occurrence_ref: gap.endpoint_occurrence_ref,
    commline_ref: gap.commline_ref,
    observation_gap_ref: gap.observation_gap_ref,
    eligible: eligibleMatterRefs.length > 0,
    disposition: eligibleMatterRefs.length > 0
      ? "OBLIGATED_ATTENTION_PRESSURE_ELIGIBLE"
      : "NO_OBLIGATED_UNOBSERVED_MATTER",
    matter_refs: eligibleMatterRefs,
    unobserved_but_unobligated_matter_refs: gap.unobserved_matter_refs.filter((matterRef) => !obligatedRefs.has(matterRef)),
    unknown_observation_matter_refs: [...gap.unknown_observation_matter_refs],
    observation_gap_not_notification_delivery: true,
    addressable_not_observation_required: true,
    observation_obligation_not_addressability: true,
    notifaself_not_webhook: true,
    activation_delivery_not_observation: true,
    self_ref_does_not_expand_occurrence_eligibility: true
  };
  eligibility.eligibility_ref = `PO_NOTIFASELF_${digestObject(eligibility).slice("sha256:".length, "sha256:".length + 16)}`;
  eligibility.eligibility_identity = digestObject(eligibility);
  return eligibility;
}

export function createActivationDelivery({
  eligibility,
  substrate = "WEBHOOK_CANDIDATE",
  delivered = true,
  deliveryIdentity = null
} = {}) {
  const activation = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "ACTIVATION_DELIVERY",
    eligibility_ref: eligibility.eligibility_ref,
    participation_ref: eligibility.participation_ref,
    commline_ref: eligibility.commline_ref,
    matter_refs: [...eligibility.matter_refs],
    substrate,
    delivered,
    delivery_identity: deliveryIdentity,
    delivery_disposition: delivered ? "DELIVERED" : "DELIVERY_LOST_OR_UNESTABLISHED",
    notifaself_eligibility_not_activation_delivery: true,
    activation_delivery_not_observation: true
  };
  activation.activation_ref = `ACTIVATION_${digestObject(activation).slice("sha256:".length, "sha256:".length + 16)}`;
  activation.activation_identity = digestObject(activation);
  return activation;
}

export function gocheckitObserve({
  participation,
  participationOccurrence = null,
  sourceMatter,
  observedContent = null,
  transmissionRef = "COMMLINE_RECONTACT",
  custodyCommitted = true,
  persistFrontierReceipt = true
} = {}) {
  if (!custodyCommitted) {
    return {
      ok: false,
      disposition: "PHANTOM_MATTER_REFUSED",
      participation_ref: participation.participation_ref,
      matter_ref: sourceMatter?.matter_ref ?? null,
      observation_created: false,
      gocheckit_not_observation: true
    };
  }
  if (!participation.addressable_matter_refs.includes(sourceMatter.matter_ref)) {
    return {
      ok: false,
      disposition: "NOT_ADDRESSABLE_FOR_PARTICIPATION",
      participation_ref: participation.participation_ref,
      participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
      matter_ref: sourceMatter.matter_ref,
      observation_created: false,
      gocheckit_not_authority_to_observe_unaddressed_matter: true
    };
  }
  const addressableMatterRefs = participationOccurrence?.addressable_matter_refs ?? participation.addressable_matter_refs;
  if (!addressableMatterRefs.includes(sourceMatter.matter_ref)) {
    return {
      ok: false,
      disposition: "NOT_ADDRESSABLE_FOR_PARTICIPATION_OCCURRENCE",
      participation_ref: participation.participation_ref,
      participation_occurrence_ref: participationOccurrence.participation_occurrence_ref,
      matter_ref: sourceMatter.matter_ref,
      observation_created: false,
      gocheckit_not_authority_to_observe_unaddressed_matter: true
    };
  }
  const observerRef = participationOccurrence?.endpoint_occurrence_ref ?? participation.endpoint_occurrence_ref;
  const sessionRef = participationOccurrence?.session_ref ?? participation.session_ref;

  const { observedMatter, observation } = createObservation({
    observerRef,
    sourceMatter,
    observedContent: observedContent ?? sourceMatter.content,
    transmissionRef,
    sessionRef
  });
  observation.payload.participation_ref = participation.participation_ref;
  observation.payload.participation_occurrence_ref = participationOccurrence?.participation_occurrence_ref ?? null;
  observation.payload.self_ref = participation.self_ref;
  observation.payload.endpoint_occurrence_ref = observerRef;
  observation.payload.frontier_receipt_persisted = persistFrontierReceipt;
  observation.payload.gocheckit_resolution_act = true;
  observation.payload.gocheckit_not_comprehension = true;
  observation.communication_event_identity = digestObject(observation);

  return {
    ok: true,
    disposition: observation.payload.observation_disposition,
    participation_ref: participation.participation_ref,
    participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
    observed_matter: observedMatter,
    observation,
    frontier_receipt_persisted: persistFrontierReceipt
  };
}

export function deriveAckDisposition({ observation, sourceMatter } = {}) {
  const ackEvent = createAck({
    observerRef: observation.actor_ref,
    observation,
    sourceMatter
  });
  ackEvent.payload.ack_exact_derived_from_observation = ackEvent.payload.ack_disposition === "ACK_EXACT";
  ackEvent.payload.ack_exists_not_sender_knows_ack = true;
  ackEvent.payload.ack_communicated = false;
  ackEvent.communication_event_identity = digestObject(ackEvent);
  const disposition = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "ACK_DISPOSITION",
    ack_exists: true,
    ack_communicated: false,
    sender_knows_ack: false,
    ack_disposition: ackEvent.payload.ack_disposition,
    observation_ref: observation.event_ref,
    participation_ref: observation.payload.participation_ref,
    ack_event: ackEvent,
    ack_exact_not_ack_communicated: true,
    ack_exists_not_sender_knows_ack: true
  };
  disposition.ack_disposition_identity = digestObject(disposition);
  return disposition;
}

export function createAckCommunication({ ackDisposition, fromParticipation, toParticipation } = {}) {
  const content = JSON.stringify({
    ack_event_ref: ackDisposition.ack_event.event_ref,
    ack_disposition: ackDisposition.ack_disposition,
    observation_ref: ackDisposition.observation_ref
  });
  const ackMatter = createMatter({
    matterRef: `ACK_COMMUNICATION_MATTER_${ackDisposition.ack_event.event_ref}`,
    content,
    producerRef: fromParticipation.self_ref,
    species: "ACK_COMMUNICATION_MATTER"
  });
  const ackEmission = createEmission({
    emitterRef: fromParticipation.self_ref,
    intendedForRef: toParticipation.self_ref,
    matter: ackMatter,
    sessionRef: fromParticipation.session_ref
  });
  const communication = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "ACK_COMMUNICATION",
    ack_disposition_identity: ackDisposition.ack_disposition_identity,
    ack_matter: ackMatter,
    ack_emission: ackEmission,
    ack_communicated: true,
    sender_knows_ack: false,
    sender_knows_ack_requires_observation: true
  };
  communication.ack_communication_identity = digestObject(communication);
  return communication;
}

export function deriveSessionReadiness({ participation, gap } = {}) {
  const readiness = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "SESSION_READINESS",
    session_ref: participation.session_ref,
    participation_ref: participation.participation_ref,
    session_ready: true,
    observation_debt_matter_refs: [...gap.unobserved_matter_refs],
    unknown_observation_matter_refs: [...gap.unknown_observation_matter_refs],
    attention_front: gap.unobserved_matter_refs.length > 0 ? [gap.commline_ref] : [],
    ready_not_no_unobserved_matter: gap.unobserved_matter_refs.length > 0,
    ready_with_observation_debt: gap.unobserved_matter_refs.length > 0
  };
  readiness.session_readiness_identity = digestObject(readiness);
  return readiness;
}

export function recomputeEligibilityAfterLostActivation({ commline, participation, observations = [], priorActivation = null } = {}) {
  const gap = computeObservationGap({ commline, participation, observations });
  const eligibility = deriveNotifaselfEligibility({ gap });
  return {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    object_type: "LOST_ACTIVATION_RECOMPUTE",
    prior_activation_ref: priorActivation?.activation_ref ?? null,
    prior_activation_delivered: priorActivation?.delivered ?? null,
    gap,
    eligibility,
    notification_delivery_not_observation_gap: true,
    lost_webhook_does_not_destroy_gap: eligibility.eligible
  };
}

export function buildParticipationOccurrenceForkReport() {
  const matters = {
    m1: createMatter({ matterRef: "CL001_M1_GPT_SOURCE", content: "CL-001 source Matter M1", producerRef: "GPTSELF_CURRENT_CANDIDATE" }),
    r1: createMatter({ matterRef: "CL001_R1_CLAUDE_HOLLABACK", content: "ClaudeSELF R1 HOLLABACK to M1", producerRef: "CLAUDESELF_CONTINUITY_CANDIDATE" }),
    r2: createMatter({ matterRef: "CL001_R2_GPT_RETURN", content: "GPT route return Matter R2", producerRef: "GPTSELF_CURRENT_CANDIDATE" }),
    r3: createMatter({ matterRef: "CL001_R3_CLAUDE_HOLLABACK", content: "ClaudeSELF R3 HOLLABACK to R2", producerRef: "CLAUDESELF_CONTINUITY_CANDIDATE" }),
    codexProbe: createMatter({
      matterRef: "CL001_CODEX_PROBE_5464975482",
      content: "ROUTE_ADJUDICATION_PROBE\nseat_claim=CODEXSELF\nprobe_id=CL001-CODEX-ROUTE-001\nno_command_authority=true\nno_continuation_authority=true",
      producerRef: "CODEXSELF_ROUTE_PROBE_CANDIDATE"
    }),
    poATargetOnly: createMatter({
      matterRef: "CL001_PO_A_ONLY_NEW_MATTER",
      content: "Fresh Matter addressed by policy to PO-A only.",
      producerRef: "OURSELF_ADDRESSABILITY_FIXTURE"
    })
  };
  const commline = createCommline({
    commlineRef: "CL_001_OCCURRENCE_FORK_CANDIDATE",
    matterEntries: Object.values(matters)
  });
  const claudeParticipation = createParticipation({
    participationRef: "P_CLAUDE_CL001_CONTINUITY",
    commline,
    selfRef: "CLAUDESELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CLAUDESELF_DEFAULT_ENDPOINT_NOT_OBSERVER",
    sessionRef: "219be5a6-1b6a-4212-90e2-2963de17b926",
    addressableMatterRefs: [
      matters.m1.matter_ref,
      matters.r1.matter_ref,
      matters.r2.matter_ref,
      matters.r3.matter_ref,
      matters.codexProbe.matter_ref,
      matters.poATargetOnly.matter_ref
    ]
  });
  const poA = createParticipationOccurrence({
    participation: claudeParticipation,
    participationOccurrenceRef: "PO_CLAUDE_INTERACTIVE_A",
    endpointOccurrenceRef: "CLAUDE_INTERACTIVE_OCCURRENCE_A",
    sessionRef: "219be5a6-1b6a-4212-90e2-2963de17b926",
    contextAncestryRefs: ["H0_219be5a6"],
    addressableMatterRefs: [
      matters.m1.matter_ref,
      matters.r1.matter_ref,
      matters.r2.matter_ref,
      matters.r3.matter_ref,
      matters.codexProbe.matter_ref
    ],
    observationObligationMatterRefs: [matters.codexProbe.matter_ref]
  });
  const poB = createParticipationOccurrence({
    participation: claudeParticipation,
    participationOccurrenceRef: "PO_CLAUDE_RESUMED_B",
    endpointOccurrenceRef: "CLAUDE_RESUMED_EXECUTION_OCCURRENCE_B",
    sessionRef: "219be5a6-1b6a-4212-90e2-2963de17b926",
    predecessorOccurrenceRef: poA.participation_occurrence_ref,
    contextAncestryRefs: ["H0_219be5a6"],
    addressableMatterRefs: [
      matters.m1.matter_ref,
      matters.r1.matter_ref,
      matters.r2.matter_ref,
      matters.r3.matter_ref,
      matters.codexProbe.matter_ref
    ]
  });
  const initialRefs = [matters.m1, matters.r1, matters.r2, matters.r3];
  const poAInitialObservations = initialRefs.map((matter) => gocheckitObserve({
    participation: claudeParticipation,
    participationOccurrence: poA,
    sourceMatter: matter,
    transmissionRef: "CL001_PO_A_PRIOR_RECONTACT"
  }).observation);
  const poBObservations = [...initialRefs, matters.codexProbe].map((matter) => gocheckitObserve({
    participation: claudeParticipation,
    participationOccurrence: poB,
    sourceMatter: matter,
    transmissionRef: "CL001_PO_B_RESUMED_RECONTACT"
  }).observation);
  const beforeObservations = [...poAInitialObservations, ...poBObservations];
  const poAGapBefore = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poA,
    observations: beforeObservations
  });
  const poBGapBefore = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poB,
    observations: beforeObservations
  });
  const obligationForPoAProbe = createObservationObligation({
    obligationRef: "OBLIGATION_PO_A_CODEX_PROBE",
    participationOccurrence: poA,
    matterRefs: [matters.codexProbe.matter_ref],
    basisRef: "GOCHECKIT_PO_A_CONVERGENCE_FIXTURE"
  });
  const poAEligibilityBefore = deriveOccurrenceNotifaselfEligibility({
    gap: poAGapBefore,
    obligations: [obligationForPoAProbe]
  });
  const poAGocheckitProbe = gocheckitObserve({
    participation: claudeParticipation,
    participationOccurrence: poA,
    sourceMatter: matters.codexProbe,
    transmissionRef: "CL001_PO_A_DIRECT_GOCHECKIT"
  });
  const afterConvergenceObservations = [...beforeObservations, poAGocheckitProbe.observation];
  const poAGapAfter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poA,
    observations: afterConvergenceObservations
  });
  const poBGapAfter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poB,
    observations: afterConvergenceObservations
  });

  const poAAddressableAfterFreshMatter = [...poA.addressable_matter_refs, matters.poATargetOnly.matter_ref];
  const poBAddressableAfterFreshMatter = [...poB.addressable_matter_refs];
  const poAGapAfterFreshMatter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poA,
    addressableMatterRefs: poAAddressableAfterFreshMatter,
    observations: afterConvergenceObservations
  });
  const poBGapAfterFreshMatter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poB,
    addressableMatterRefs: poBAddressableAfterFreshMatter,
    observations: afterConvergenceObservations
  });
  const poAOnlyObligation = createObservationObligation({
    obligationRef: "OBLIGATION_PO_A_ONLY_NEW_MATTER",
    participationOccurrence: poA,
    matterRefs: [matters.poATargetOnly.matter_ref],
    basisRef: "ADDRESSABILITY_POLICY_PO_A_ONLY"
  });
  const poANotifaselfAfterFreshMatter = deriveOccurrenceNotifaselfEligibility({
    gap: poAGapAfterFreshMatter,
    obligations: [poAOnlyObligation]
  });
  const poBNotifaselfAfterFreshMatter = deriveOccurrenceNotifaselfEligibility({
    gap: poBGapAfterFreshMatter,
    obligations: [poAOnlyObligation]
  });

  const checks = {
    same_self_distinct_occurrences: poA.self_ref === poB.self_ref &&
      poA.participation_ref === poB.participation_ref &&
      poA.participation_occurrence_ref !== poB.participation_occurrence_ref,
    context_not_observation_inheritance: poB.context_inherited_not_observation_inherited === true &&
      poB.resume_command_not_occurrence_continuation === true,
    no_sibling_occurrence_union: poAGapBefore.unobserved_matter_refs.includes(matters.codexProbe.matter_ref) &&
      poBGapBefore.observed_matter_refs.includes(matters.codexProbe.matter_ref),
    obligated_gap_creates_po_a_attention: poAEligibilityBefore.eligible === true &&
      poAEligibilityBefore.matter_refs.includes(matters.codexProbe.matter_ref),
    lawful_convergence_by_po_a_gocheckit: poAGapAfter.observed_matter_refs.includes(matters.codexProbe.matter_ref) &&
      poAGapAfter.unobserved_matter_refs.length === 0 &&
      poBGapAfter.observed_matter_refs.includes(matters.codexProbe.matter_ref),
    equal_current_knowledge_not_equal_history: sameSet(poAGapAfter.observed_matter_refs, poBGapAfter.observed_matter_refs) &&
      poAGocheckitProbe.observation.event_ref !== poBObservations.at(-1).event_ref,
    po_a_only_matter_does_not_address_po_b: poAGapAfterFreshMatter.unobserved_matter_refs.includes(matters.poATargetOnly.matter_ref) &&
      !poBGapAfterFreshMatter.addressable_matter_refs.includes(matters.poATargetOnly.matter_ref),
    notifaself_no_self_ref_leak: poANotifaselfAfterFreshMatter.eligible === true &&
      poANotifaselfAfterFreshMatter.matter_refs.includes(matters.poATargetOnly.matter_ref) &&
      poBNotifaselfAfterFreshMatter.eligible === false &&
      poBNotifaselfAfterFreshMatter.matter_refs.length === 0
  };

  const report = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    artifact_status: "CANDIDATE_NOT_CANONICAL_PROTOCOL",
    primitive: "ParticipationOccurrenceObservationGap",
    commline,
    participation: claudeParticipation,
    participation_occurrences: [poA, poB],
    observations: {
      po_a_prior: poAInitialObservations.map((observation) => observation.event_ref),
      po_b_resumed: poBObservations.map((observation) => observation.event_ref),
      po_a_gocheckit_probe: poAGocheckitProbe.observation.event_ref
    },
    cases: {
      epistemic_branch_before: { po_a_gap: poAGapBefore, po_b_gap: poBGapBefore },
      obligation_before_convergence: { obligation: obligationForPoAProbe, eligibility: poAEligibilityBefore },
      lawful_convergence: { po_a_gocheckit: poAGocheckitProbe, po_a_gap_after: poAGapAfter, po_b_gap_after: poBGapAfter },
      po_a_only_fresh_matter: {
        matter: matters.poATargetOnly,
        po_a_gap: poAGapAfterFreshMatter,
        po_b_gap: poBGapAfterFreshMatter,
        po_a_eligibility: poANotifaselfAfterFreshMatter,
        po_b_eligibility: poBNotifaselfAfterFreshMatter
      }
    },
    checks,
    final_standing: Object.values(checks).every(Boolean)
      ? "PARTICIPATION_OCCURRENCE_OBSERVATION_GAP_CANDIDATE_ESTABLISHED"
      : "PARTICIPATION_OCCURRENCE_OBSERVATION_GAP_BLOCKED",
    non_collapse: [
      "SAME_SELF != SAME_OCCURRENCE",
      "OBSERVED_SET = DERIVED_VIEW(OBSERVED_OCCURRENCE_RELATIONS)",
      "CONTEXT_INHERITED != OBSERVATION_INHERITED",
      "KNOWLEDGE_PROPAGATION != KNOWLEDGE_AGGREGATION",
      "ADDRESSABLE != OBSERVATION_REQUIRED",
      "OBSERVATION_OBLIGATION + OBSERVATION_GAP -> NOTIFASELF_ELIGIBILITY",
      "EQUAL_CURRENT_KNOWLEDGE != EQUAL_EPISTEMIC_HISTORY",
      "SELF_REF != NOTIFASELF_ROUTING_KEY"
    ],
    known_constraints: [
      "This is local candidate Matter, not proof of live Claude endpoint authenticity.",
      "The fixture models the observed Claude fracture without claiming resumed CLI equals occurrence continuation.",
      "Fresh PO-A-only Matter is a semantic addressability projection, not a new GitHub comment.",
      "Automatic NOTIFASELF delivery remains unimplemented until observer-origin evidence is sufficient."
    ],
    next_living_frontier: "Bind occurrence-relative ObservationObligation to live activation only after observer-origin evidence is established."
  };
  report.report_identity = digestObject(report);
  return report;
}

export function buildCommlineObservationGapReport() {
  const matters = {
    m17: createMatter({ matterRef: "M17_SHARED_ESTABLISHED", content: "M17 shared accountable Matter", producerRef: "OURSELF_SOURCE" }),
    m18: createMatter({ matterRef: "M18_SHARED_ESTABLISHED", content: "M18 shared accountable Matter", producerRef: "OURSELF_SOURCE" }),
    m19: createMatter({ matterRef: "M19_GPT_UNOBSERVED", content: "M19 newly addressable for GPTSELF", producerRef: "OURSELF_SOURCE" }),
    m20: createMatter({ matterRef: "M20_CODEX_UNOBSERVED", content: "M20 newly addressable for CODEXSELF", producerRef: "OURSELF_SOURCE" }),
    m21: createMatter({ matterRef: "M21_CLAUDE_ONLY", content: "M21 addressed only to Claude participation", producerRef: "OURSELF_SOURCE" }),
    m22: createMatter({ matterRef: "M22_FRAGILE_OBSERVATION", content: "M22 observed before frontier receipt persisted", producerRef: "OURSELF_SOURCE" })
  };
  const commline = createCommline({
    commlineRef: "CL_OBSERVATION_GAP_001",
    matterEntries: Object.values(matters)
  });
  const gptParticipation = createParticipation({
    participationRef: "P_GPT_CL_001",
    commline,
    selfRef: "GPTSELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "GPTSELF_SESSION_OCCURRENCE_A",
    sessionRef: "SESSION_GPT_A",
    addressableMatterRefs: [matters.m17.matter_ref, matters.m18.matter_ref, matters.m19.matter_ref]
  });
  const claudeParticipation = createParticipation({
    participationRef: "P_CLAUDE_CL_001",
    commline,
    selfRef: "CLAUDESELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CLAUDE_CLI_OCCURRENCE_A",
    sessionRef: "SESSION_CLAUDE_A",
    addressableMatterRefs: [matters.m17.matter_ref, matters.m18.matter_ref, matters.m19.matter_ref, matters.m21.matter_ref]
  });
  const codexParticipation = createParticipation({
    participationRef: "P_CODEX_CL_001",
    commline,
    selfRef: "CODEXSELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CODEX_CLI_OCCURRENCE_A",
    sessionRef: "SESSION_CODEX_A",
    addressableMatterRefs: [matters.m18.matter_ref, matters.m20.matter_ref]
  });
  const fragileParticipation = createParticipation({
    participationRef: "P_GPT_FRAGILE_CL_001",
    commline,
    selfRef: "GPTSELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "GPTSELF_SESSION_OCCURRENCE_B",
    sessionRef: "SESSION_GPT_B",
    addressableMatterRefs: [matters.m22.matter_ref]
  });

  const observed = [
    gocheckitObserve({ participation: gptParticipation, sourceMatter: matters.m17 }).observation,
    gocheckitObserve({ participation: gptParticipation, sourceMatter: matters.m18 }).observation,
    gocheckitObserve({ participation: claudeParticipation, sourceMatter: matters.m17 }).observation,
    gocheckitObserve({ participation: claudeParticipation, sourceMatter: matters.m18 }).observation,
    gocheckitObserve({ participation: claudeParticipation, sourceMatter: matters.m19 }).observation,
    gocheckitObserve({ participation: claudeParticipation, sourceMatter: matters.m21 }).observation,
    gocheckitObserve({ participation: codexParticipation, sourceMatter: matters.m18 }).observation
  ];
  const fragileObservation = gocheckitObserve({
    participation: fragileParticipation,
    sourceMatter: matters.m22,
    persistFrontierReceipt: false
  });

  const gptGap = computeObservationGap({ commline, participation: gptParticipation, observations: observed });
  const claudeGap = computeObservationGap({ commline, participation: claudeParticipation, observations: observed });
  const codexGap = computeObservationGap({ commline, participation: codexParticipation, observations: observed });
  const gptEligibility = deriveNotifaselfEligibility({ gap: gptGap });
  const lostActivation = createActivationDelivery({
    eligibility: gptEligibility,
    substrate: "WEBHOOK_CANDIDATE",
    delivered: false,
    deliveryIdentity: "delivery-guid-lost"
  });
  const lostActivationRecompute = recomputeEligibilityAfterLostActivation({
    commline,
    participation: gptParticipation,
    observations: observed,
    priorActivation: lostActivation
  });
  const phantomMatter = createMatter({
    matterRef: "M_PHANTOM_BEFORE_COMMIT",
    content: "Notification arrived before committed custody.",
    producerRef: "OURSELF_SOURCE"
  });
  const phantomGocheckit = gocheckitObserve({
    participation: gptParticipation,
    sourceMatter: phantomMatter,
    custodyCommitted: false
  });
  const wrongEndpointGocheckit = gocheckitObserve({
    participation: gptParticipation,
    sourceMatter: matters.m21
  });
  const wrongEndpointGap = computeObservationGap({ commline, participation: gptParticipation, observations: observed });
  const fragileGap = computeObservationGap({
    commline,
    participation: fragileParticipation,
    observations: [fragileObservation.observation]
  });
  const ackDisposition = deriveAckDisposition({ observation: observed[0], sourceMatter: matters.m17 });
  const ackCommunication = createAckCommunication({
    ackDisposition,
    fromParticipation: gptParticipation,
    toParticipation: claudeParticipation
  });
  const sessionReadiness = deriveSessionReadiness({ participation: gptParticipation, gap: gptGap });
  const participationOccurrenceFork = buildParticipationOccurrenceForkReport();

  const checks = {
    participant_relative_gap: gptGap.unobserved_matter_refs.includes(matters.m19.matter_ref) &&
      claudeGap.unobserved_matter_refs.length === 0 &&
      codexGap.unobserved_matter_refs.includes(matters.m20.matter_ref),
    lost_webhook_gap_survives: lostActivationRecompute.lost_webhook_does_not_destroy_gap,
    phantom_matter_refused: phantomGocheckit.disposition === "PHANTOM_MATTER_REFUSED" && phantomGocheckit.observation_created === false,
    wrong_endpoint_notification_not_gap: wrongEndpointGocheckit.disposition === "NOT_ADDRESSABLE_FOR_PARTICIPATION" &&
      !wrongEndpointGap.addressable_matter_refs.includes(matters.m21.matter_ref),
    session_death_before_frontier_receipt_is_unknown: fragileGap.unknown_observation_matter_refs.includes(matters.m22.matter_ref) &&
      fragileGap.observed_matter_refs.length === 0 &&
      fragileGap.unobserved_matter_refs.length === 0,
    ack_exists_before_ack_communication: ackDisposition.ack_exists === true &&
      ackDisposition.ack_communicated === false &&
      ackCommunication.ack_communicated === true &&
      ackCommunication.sender_knows_ack === false,
    ready_with_observation_debt: sessionReadiness.session_ready === true &&
      sessionReadiness.ready_with_observation_debt === true,
    no_global_idle_bit: sessionReadiness.session_ready === true && gptGap.attention_due === true,
    participation_occurrence_gap: participationOccurrenceFork.final_standing === "PARTICIPATION_OCCURRENCE_OBSERVATION_GAP_CANDIDATE_ESTABLISHED"
  };

  const report = {
    schema: COMMLINE_OBSERVATION_GAP_SCHEMA,
    artifact_status: "CANDIDATE_NOT_CANONICAL_PROTOCOL",
    primitive: "ObservationGap",
    commline,
    participations: [gptParticipation, claudeParticipation, codexParticipation, fragileParticipation],
    cases: {
      participant_relative: { gpt_gap: gptGap, claude_gap: claudeGap, codex_gap: codexGap },
      lost_activation: { activation: lostActivation, recompute: lostActivationRecompute },
      phantom_before_custody: phantomGocheckit,
      wrong_endpoint_notification: { gocheckit: wrongEndpointGocheckit, gap: wrongEndpointGap },
      session_death_before_frontier_receipt: { observation: fragileObservation, gap: fragileGap },
      ack_split: { ack_disposition: ackDisposition, ack_communication: ackCommunication },
      session_ready_with_observation_debt: sessionReadiness,
      participation_occurrence_fork: participationOccurrenceFork
    },
    checks,
    final_standing: Object.values(checks).every(Boolean)
      ? "COMMLINE_OBSERVATION_GAP_CANDIDATE_ESTABLISHED"
      : "COMMLINE_OBSERVATION_GAP_BLOCKED",
    non_collapse: COMMLINE_NON_COLLAPSE,
    known_constraints: [
      "This is local candidate Matter, not SELFCOMMUNICATION v0 launch.",
      "No live webhook server or external delivery substrate is established.",
      "ObservationGap is modeled as participant-relative addressable set difference, not a total cursor.",
      "GOCHECKIT observation is represented as a bounded local candidate act."
    ],
    next_living_frontier: "Bind current GPTSELF participation to a real ObservationGap-driven GOCHECKIT occurrence."
  };
  report.report_identity = digestObject(report);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = valueAfter(process.argv, "--out");
  const report = buildCommlineObservationGapReport();
  if (outPath) writeJsonFile(outPath, report);
  console.log(JSON.stringify(report, null, 2));
}
