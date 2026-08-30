#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COMMUNICATION_MATTER_SCHEMA = "ourself.communication-matter.v0.1-candidate";
export const COMMUNICATION_EVENT_SCHEMA = "ourself.communication-event.v0.1-candidate";
export const COMMUNICATION_REPORT_SCHEMA = "ourself.communication-foundation-report.v0.1-candidate";

export const COMMUNICATION_NON_COLLAPSE = [
  "SEMANTIC_MATTER != COMMUNICATION_MATTER",
  "MATTER_IDENTITY != COMMUNICATION_EVENT_IDENTITY",
  "GitObjectIdentity != SELFCommunicationIdentity",
  "EMISSION != TRANSMISSION != OBSERVATION",
  "ACK != HOLLABACK",
  "CAPTURE_ALL != ADMIT_ALL",
  "SESSION_VIEW != COMMUNICATION_CUSTODY_CONTAINER",
  "PROJECTION_REQUIRES_OBSERVATION_BINDING",
  "PARTIAL_TRAJECTORY != FAILED_HISTORY",
  "COMMUNICATION_EVIDENCE != COMMUNICATION_OCCURRENCE"
];

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256Text(text) {
  return sha256Buffer(Buffer.from(String(text), "utf8"));
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestObject(value) {
  return `sha256:${sha256Text(stableJson(value))}`;
}

export function identityForText(text) {
  return `sha256:${sha256Text(text)}`;
}

function makeRef(prefix, seed) {
  return `${prefix}_${sha256Text(seed).slice(0, 16)}`;
}

export function createMatter({ matterRef, content, producerRef, species = "TEXT_MATTER", custody = "LOCAL_CANDIDATE" } = {}) {
  const text = String(content ?? "");
  const matter = {
    schema: COMMUNICATION_MATTER_SCHEMA,
    matter_ref: matterRef ?? makeRef("MATTER", text),
    species,
    producer_ref: producerRef,
    content: text,
    encoding: "utf8",
    byte_count: Buffer.byteLength(text, "utf8"),
    content_identity: identityForText(text),
    custody,
    standing: "CAPTURED_MATTER_NOT_ADMITTED_MEANING"
  };
  matter.matter_record_identity = digestObject(matter);
  return matter;
}

export function createCommunicationEvent({ eventType, matter, actorRef, counterpartyRef = null, sessionRef = null, payload = {} } = {}) {
  const event = {
    schema: COMMUNICATION_EVENT_SCHEMA,
    event_type: eventType,
    actor_ref: actorRef,
    counterparty_ref: counterpartyRef,
    session_ref: sessionRef,
    matter_ref: matter?.matter_ref ?? payload.matter_ref ?? null,
    matter_identity: matter?.content_identity ?? payload.matter_identity ?? null,
    payload,
    capture_status: "CAPTURED_NOT_ADMITTED",
    occurred_at: new Date().toISOString()
  };
  event.event_ref = makeRef(eventType, stableJson({ eventType, actorRef, counterpartyRef, sessionRef, payload, matter_identity: event.matter_identity }));
  event.communication_event_identity = digestObject(event);
  return event;
}

export function createEmission({ emitterRef, intendedForRef, matter, sessionRef = null } = {}) {
  return createCommunicationEvent({
    eventType: "EMISSION",
    matter,
    actorRef: emitterRef,
    counterpartyRef: intendedForRef,
    sessionRef,
    payload: {
      emitted_by: emitterRef,
      intended_for: intendedForRef,
      emission_not_transmission: true,
      content_identity: matter.content_identity,
      byte_count: matter.byte_count
    }
  });
}

export function createTransmission({ fromRef, toRef, matter, emissionRef, substrate = "LOCAL_CORRIDOR", locator = null, substrateIdentity = null } = {}) {
  return createCommunicationEvent({
    eventType: "TRANSMISSION",
    matter,
    actorRef: fromRef,
    counterpartyRef: toRef,
    payload: {
      transmission_of: emissionRef,
      transport_substrate: substrate,
      locator,
      substrate_identity: substrateIdentity,
      substrate_identity_not_communication_identity: substrateIdentity ? substrateIdentity !== emissionRef : true,
      transmitted_as_matter_identity: matter.content_identity,
      transmission_not_observation: true
    }
  });
}

export function createObservation({ observerRef, sourceMatter, observedContent, transmissionRef, sessionRef = null } = {}) {
  const observedMatter = createMatter({
    matterRef: makeRef("OBSERVED_MATTER", `${observerRef}:${transmissionRef}:${observedContent}`),
    content: observedContent,
    producerRef: observerRef,
    species: "OBSERVED_REPRESENTATION"
  });
  const exact = observedMatter.content_identity === sourceMatter.content_identity;
  const event = createCommunicationEvent({
    eventType: "OBSERVATION",
    matter: observedMatter,
    actorRef: observerRef,
    sessionRef,
    payload: {
      transmission_ref: transmissionRef,
      observed_by: observerRef,
      source_matter_ref: sourceMatter.matter_ref,
      source_matter_identity: sourceMatter.content_identity,
      observed_matter_identity: observedMatter.content_identity,
      observed_byte_count: observedMatter.byte_count,
      observation_disposition: exact ? "OBSERVED_EXACT" : "OBSERVED_DIVERGED",
      identity_match: exact,
      observation_not_ack: true
    }
  });
  return { observedMatter, observation: event };
}

export function createAck({ observerRef, observation, sourceMatter } = {}) {
  return createCommunicationEvent({
    eventType: "ACK",
    actorRef: observerRef,
    matter: sourceMatter,
    payload: {
      acknowledges_observation_ref: observation.event_ref,
      claim: "WHAT_I_OBSERVED",
      observed_matter_identity: observation.payload.observed_matter_identity,
      source_matter_identity: sourceMatter.content_identity,
      ack_disposition: observation.payload.identity_match ? "ACK_EXACT" : "ACK_DIVERGED",
      ack_not_authority: true,
      ack_not_hollaback: true
    }
  });
}

export function createHollaback({ responderRef, sourceMatter, observation, content, sessionRef = null } = {}) {
  const returnMatter = createMatter({
    matterRef: makeRef("HOLLABACK_MATTER", `${responderRef}:${sourceMatter.content_identity}:${content}`),
    content,
    producerRef: responderRef,
    species: "HOLLABACK_MATTER"
  });
  const event = createCommunicationEvent({
    eventType: "HOLLABACK_EMISSION",
    actorRef: responderRef,
    counterpartyRef: sourceMatter.producer_ref,
    sessionRef,
    matter: returnMatter,
    payload: {
      hollaback_to_matter_ref: sourceMatter.matter_ref,
      hollaback_to_matter_identity: sourceMatter.content_identity,
      derived_from_observation_ref: observation.event_ref,
      return_matter_identity: returnMatter.content_identity,
      hollaback_not_ack: true
    }
  });
  return { returnMatter, hollaback: event };
}

export function classifyCommunicationTrajectory({ sourceMatter, returnMatter = null, events = [] } = {}) {
  const sourceIdentity = sourceMatter?.content_identity;
  const emission = events.find((event) => event.event_type === "EMISSION" && event.matter_identity === sourceIdentity);
  const transmission = emission
    ? events.find((event) => event.event_type === "TRANSMISSION" && event.payload.transmission_of === emission.event_ref)
    : null;
  const sourceObservation = transmission
    ? events.find((event) => event.event_type === "OBSERVATION" && event.payload.transmission_ref === transmission.event_ref)
    : null;
  const ack = sourceObservation
    ? events.find((event) => event.event_type === "ACK" && event.payload.acknowledges_observation_ref === sourceObservation.event_ref)
    : null;
  const hollaback = sourceObservation
    ? events.find((event) => event.event_type === "HOLLABACK_EMISSION" && event.payload.derived_from_observation_ref === sourceObservation.event_ref)
    : null;
  const returnTransmission = hollaback
    ? events.find((event) => event.event_type === "TRANSMISSION" && event.payload.transmission_of === hollaback.event_ref)
    : null;
  const expectedReturnIdentity = returnMatter?.content_identity ?? hollaback?.matter_identity ?? null;
  const returnObservation = returnTransmission && expectedReturnIdentity
    ? events.find((event) => event.event_type === "OBSERVATION" && event.payload.transmission_ref === returnTransmission.event_ref && event.matter_identity === expectedReturnIdentity)
    : null;

  let terminalDisposition = "NO_EMISSION";
  if (emission && !transmission) terminalDisposition = "EMITTED_NOT_TRANSMITTED";
  if (transmission && !sourceObservation) terminalDisposition = "TRANSMITTED_NOT_OBSERVED";
  if (sourceObservation && !sourceObservation.payload.identity_match) terminalDisposition = "OBSERVED_DIVERGED";
  if (sourceObservation?.payload.identity_match && !ack) terminalDisposition = "OBSERVED_EXACT_NO_ACK";
  if (ack && !hollaback) terminalDisposition = "ACKED_NO_HOLLABACK";
  if (hollaback && !returnTransmission) terminalDisposition = "HOLLABACK_NOT_TRANSMITTED";
  if (returnTransmission && !returnObservation) terminalDisposition = "HOLLABACK_TRANSMITTED_NOT_OBSERVED";
  if (returnObservation?.payload.identity_match) terminalDisposition = "CLOSED_ROUNDTRIP";

  const trajectory = {
    source_matter_ref: sourceMatter?.matter_ref ?? null,
    source_matter_identity: sourceIdentity ?? null,
    stage_presence: {
      emission: Boolean(emission),
      transmission: Boolean(transmission),
      source_observation: Boolean(sourceObservation),
      ack: Boolean(ack),
      hollaback: Boolean(hollaback),
      return_transmission: Boolean(returnTransmission),
      return_observation: Boolean(returnObservation)
    },
    event_refs: {
      emission: emission?.event_ref ?? null,
      transmission: transmission?.event_ref ?? null,
      source_observation: sourceObservation?.event_ref ?? null,
      ack: ack?.event_ref ?? null,
      hollaback: hollaback?.event_ref ?? null,
      return_transmission: returnTransmission?.event_ref ?? null,
      return_observation: returnObservation?.event_ref ?? null
    },
    observation_disposition: sourceObservation?.payload.observation_disposition ?? null,
    ack_disposition: ack?.payload.ack_disposition ?? null,
    terminal_disposition: terminalDisposition,
    partial_trajectory_is_accountable_matter: terminalDisposition !== "CLOSED_ROUNDTRIP",
    historical_validity_not_current_success: terminalDisposition !== "CLOSED_ROUNDTRIP"
  };
  trajectory.trajectory_identity = digestObject(trajectory);
  return trajectory;
}

export function assertEndpointObservationBinding({ sourceMatter, observation, expectedObserverRef } = {}) {
  const errors = [];
  if (!sourceMatter) errors.push("source Matter missing");
  if (!observation) errors.push("observation missing");
  if (observation?.event_type !== "OBSERVATION") errors.push("event is not an observation");
  if (observation?.actor_ref !== expectedObserverRef) errors.push("observation actor does not match expected endpoint");
  if (observation?.payload?.observed_by !== expectedObserverRef) errors.push("observed_by does not match expected endpoint");
  if (observation?.payload?.source_matter_identity !== sourceMatter?.content_identity) errors.push("observation source identity does not match source Matter");
  return {
    ok: errors.length === 0,
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    errors
  };
}

export function buildRoundtripCommunication({
  sourceContent,
  initiatorRef = "GPTSELF",
  participantRef = "CLAUDESELF",
  initiatorSessionRef = "SESSION_A",
  participantSessionRef = "SESSION_B",
  substrate = "GITHUB_CORRIDOR_CANDIDATE",
  sourceLocator = null,
  sourceSubstrateIdentity = null,
  returnSubstrateIdentity = null,
  deliveredContent = null,
  returnContent = null
} = {}) {
  const sourceMatter = createMatter({
    matterRef: "M0_SOURCE",
    content: sourceContent,
    producerRef: initiatorRef
  });
  const emission = createEmission({
    emitterRef: initiatorRef,
    intendedForRef: participantRef,
    matter: sourceMatter,
    sessionRef: initiatorSessionRef
  });
  const transmission = createTransmission({
    fromRef: initiatorRef,
    toRef: participantRef,
    matter: sourceMatter,
    emissionRef: emission.event_ref,
    substrate,
    locator: sourceLocator,
    substrateIdentity: sourceSubstrateIdentity
  });
  const { observedMatter, observation } = createObservation({
    observerRef: participantRef,
    sourceMatter,
    observedContent: deliveredContent ?? sourceContent,
    transmissionRef: transmission.event_ref,
    sessionRef: participantSessionRef
  });
  const ack = createAck({ observerRef: participantRef, observation, sourceMatter });
  const { returnMatter, hollaback } = createHollaback({
    responderRef: participantRef,
    sourceMatter,
    observation,
    sessionRef: participantSessionRef,
    content: returnContent ?? `HOLLABACK from ${participantRef}: observed ${observation.payload.observation_disposition} for ${sourceMatter.content_identity}`
  });
  const returnTransmission = createTransmission({
    fromRef: participantRef,
    toRef: initiatorRef,
    matter: returnMatter,
    emissionRef: hollaback.event_ref,
    substrate,
    substrateIdentity: returnSubstrateIdentity
  });
  const { observedMatter: returnObservedMatter, observation: returnObservation } = createObservation({
    observerRef: initiatorRef,
    sourceMatter: returnMatter,
    observedContent: returnMatter.content,
    transmissionRef: returnTransmission.event_ref,
    sessionRef: initiatorSessionRef
  });
  const events = [emission, transmission, observation, ack, hollaback, returnTransmission, returnObservation];
  const trajectory = classifyCommunicationTrajectory({ sourceMatter, returnMatter, events });
  return {
    source_matter: sourceMatter,
    participant_observed_matter: observedMatter,
    return_matter: returnMatter,
    initiator_observed_return_matter: returnObservedMatter,
    events,
    trajectory,
    communication_graph: buildCommunicationGraph({ matter: [sourceMatter, observedMatter, returnMatter, returnObservedMatter], events }),
    validation: validateRoundtrip({ sourceMatter, returnMatter, events }),
    non_collapse: COMMUNICATION_NON_COLLAPSE,
    standing: "COMMUNICATION_MATTER_FOUNDATION_CANDIDATE"
  };
}

export function buildPartialTrajectoryPressureReport() {
  const sourceMatter = createMatter({
    matterRef: "PARTIAL_M0_SOURCE",
    content: "Partial communication trajectories remain accountable Matter.",
    producerRef: "GPTSELF_CANDIDATE"
  });
  const emission = createEmission({ emitterRef: "GPTSELF_CANDIDATE", intendedForRef: "CLAUDESELF_CANDIDATE", matter: sourceMatter });
  const transmission = createTransmission({
    fromRef: "GPTSELF_CANDIDATE",
    toRef: "CLAUDESELF_CANDIDATE",
    matter: sourceMatter,
    emissionRef: emission.event_ref,
    substrate: "PARTIAL_TRAJECTORY_FIXTURE"
  });
  const exactObservation = createObservation({
    observerRef: "CLAUDESELF_CANDIDATE",
    sourceMatter,
    observedContent: sourceMatter.content,
    transmissionRef: transmission.event_ref
  }).observation;
  const divergentObservation = createObservation({
    observerRef: "CLAUDESELF_CANDIDATE",
    sourceMatter,
    observedContent: `${sourceMatter.content}\nDIVERGED`,
    transmissionRef: transmission.event_ref
  }).observation;
  const ack = createAck({ observerRef: "CLAUDESELF_CANDIDATE", observation: exactObservation, sourceMatter });
  const { returnMatter, hollaback } = createHollaback({
    responderRef: "CLAUDESELF_CANDIDATE",
    sourceMatter,
    observation: exactObservation,
    content: "Partial pressure HOLLABACK created but not necessarily returned."
  });
  const returnTransmission = createTransmission({
    fromRef: "CLAUDESELF_CANDIDATE",
    toRef: "GPTSELF_CANDIDATE",
    matter: returnMatter,
    emissionRef: hollaback.event_ref,
    substrate: "PARTIAL_TRAJECTORY_FIXTURE"
  });

  const scenarios = {
    emitted_not_transmitted: classifyCommunicationTrajectory({ sourceMatter, events: [emission] }),
    transmitted_not_observed: classifyCommunicationTrajectory({ sourceMatter, events: [emission, transmission] }),
    observed_diverged: classifyCommunicationTrajectory({ sourceMatter, events: [emission, transmission, divergentObservation] }),
    observed_exact_no_ack: classifyCommunicationTrajectory({ sourceMatter, events: [emission, transmission, exactObservation] }),
    acked_no_hollaback: classifyCommunicationTrajectory({ sourceMatter, events: [emission, transmission, exactObservation, ack] }),
    hollaback_not_transmitted: classifyCommunicationTrajectory({ sourceMatter, returnMatter, events: [emission, transmission, exactObservation, ack, hollaback] }),
    hollaback_transmitted_not_observed: classifyCommunicationTrajectory({ sourceMatter, returnMatter, events: [emission, transmission, exactObservation, ack, hollaback, returnTransmission] })
  };
  const report = {
    schema: "ourself.partial-communication-trajectory-pressure.v0.1-candidate",
    source_matter: sourceMatter,
    scenarios,
    partial_trajectories_preserved: Object.values(scenarios).every((entry) => entry.partial_trajectory_is_accountable_matter),
    communication_evidence_not_occurrence: true
  };
  report.report_identity = digestObject(report);
  return report;
}

export function buildFanoutCommunication({ sourceContent, sourceRef = "M0_SOURCE", endpoints = ["GPTSELF", "CLAUDESELF", "CODEXSELF"], divergentEndpoints = [] } = {}) {
  const sourceMatter = createMatter({ matterRef: sourceRef, content: sourceContent, producerRef: "OURSELF_SOURCE" });
  const results = endpoints.map((endpoint) => {
    const emission = createEmission({ emitterRef: "OURSELF_SOURCE", intendedForRef: endpoint, matter: sourceMatter });
    const transmission = createTransmission({
      fromRef: "OURSELF_SOURCE",
      toRef: endpoint,
      matter: sourceMatter,
      emissionRef: emission.event_ref,
      substrate: "FANOUT_CORRIDOR_CANDIDATE"
    });
    const delivered = divergentEndpoints.includes(endpoint) ? `${sourceContent}\nDIVERGED:${endpoint}` : sourceContent;
    const { observedMatter, observation } = createObservation({
      observerRef: endpoint,
      sourceMatter,
      observedContent: delivered,
      transmissionRef: transmission.event_ref
    });
    const ack = createAck({ observerRef: endpoint, observation, sourceMatter });
    return { endpoint_ref: endpoint, emission, transmission, observed_matter: observedMatter, observation, ack };
  });
  const events = results.flatMap((entry) => [entry.emission, entry.transmission, entry.observation, entry.ack]);
  return {
    source_matter: sourceMatter,
    endpoint_results: results,
    events,
    exact_observation_endpoints: results.filter((entry) => entry.observation.payload.identity_match).map((entry) => entry.endpoint_ref),
    diverged_observation_endpoints: results.filter((entry) => !entry.observation.payload.identity_match).map((entry) => entry.endpoint_ref),
    all_observed_same_source: results.every((entry) => entry.observation.payload.source_matter_identity === sourceMatter.content_identity),
    all_exact: results.every((entry) => entry.observation.payload.identity_match)
  };
}

export function assertProjectionHasObservationBinding({ projection, sourceMatter, observation } = {}) {
  const errors = [];
  if (!projection) errors.push("projection missing");
  if (!observation) errors.push("observation missing");
  if (projection?.source_matter_identity !== sourceMatter.content_identity) errors.push("projection source identity does not match source Matter");
  if (projection?.observation_ref !== observation.event_ref) errors.push("projection is not bound to observation event");
  if (observation?.payload?.observed_matter_identity !== sourceMatter.content_identity) errors.push("projection cannot claim exact source pressure from diverged observation");
  return {
    ok: errors.length === 0,
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    errors
  };
}

export function buildCommunicationGraph({ matter, events }) {
  const edges = [];
  for (const event of events) {
    if (event.event_type === "EMISSION") {
      edges.push({ from: event.matter_ref, relation: "EMITTED_BY", to: event.actor_ref, event_ref: event.event_ref });
      edges.push({ from: event.matter_ref, relation: "INTENDED_FOR", to: event.counterparty_ref, event_ref: event.event_ref });
    }
    if (event.event_type === "TRANSMISSION") {
      edges.push({ from: event.payload.transmission_of, relation: "TRANSMITTED_AS", to: event.event_ref, event_ref: event.event_ref });
    }
    if (event.event_type === "OBSERVATION") {
      edges.push({ from: event.payload.source_matter_ref, relation: "OBSERVED_BY", to: event.actor_ref, event_ref: event.event_ref });
    }
    if (event.event_type === "ACK") {
      edges.push({ from: event.event_ref, relation: "ACKNOWLEDGES", to: event.payload.acknowledges_observation_ref, event_ref: event.event_ref });
    }
    if (event.event_type === "HOLLABACK_EMISSION") {
      edges.push({ from: event.matter_ref, relation: "HOLLABACK_TO", to: event.payload.hollaback_to_matter_ref, event_ref: event.event_ref });
      edges.push({ from: event.matter_ref, relation: "DERIVED_FROM", to: event.payload.derived_from_observation_ref, event_ref: event.event_ref });
    }
  }
  const graph = {
    graph_kind: "COMMUNICATION_EVENT_TOPOLOGY",
    matter_refs: matter.map((entry) => entry.matter_ref),
    event_refs: events.map((entry) => entry.event_ref),
    edges,
    communication_graph_not_semantic_establishment: true
  };
  graph.graph_identity = digestObject(graph);
  return graph;
}

export function validateRoundtrip({ sourceMatter, returnMatter, events }) {
  const errors = [];
  const types = events.map((event) => event.event_type);
  for (const required of ["EMISSION", "TRANSMISSION", "OBSERVATION", "ACK", "HOLLABACK_EMISSION"]) {
    if (!types.includes(required)) errors.push(`missing ${required}`);
  }
  const sourceObservation = events.find((event) => event.event_type === "OBSERVATION" && event.payload.source_matter_identity === sourceMatter.content_identity);
  const ack = events.find((event) => event.event_type === "ACK");
  const hollaback = events.find((event) => event.event_type === "HOLLABACK_EMISSION");
  const returnObservation = events.filter((event) => event.event_type === "OBSERVATION").find((event) => event.payload.source_matter_identity === returnMatter.content_identity);

  if (!sourceObservation) errors.push("source Matter observation missing");
  if (sourceObservation && sourceObservation.payload.observed_matter_identity !== sourceMatter.content_identity) errors.push("source Matter observation diverged");
  if (!ack) errors.push("ACK missing");
  if (ack && ack.payload.acknowledges_observation_ref !== sourceObservation?.event_ref) errors.push("ACK does not bind observation");
  if (!hollaback) errors.push("HOLLABACK missing");
  if (hollaback && hollaback.matter_identity === sourceMatter.content_identity) errors.push("HOLLABACK did not produce distinct return Matter");
  if (!returnObservation) errors.push("return Matter observation missing");
  if (ack && hollaback && ack.event_ref === hollaback.event_ref) errors.push("ACK collapsed with HOLLABACK");

  return {
    ok: errors.length === 0,
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    errors
  };
}

export function buildFoundationReport() {
  const sourceContent = "MILASOPHAHR SOURCE MATTER: communication event custody before semantic comparison.";
  const roundtrip = buildRoundtripCommunication({
    sourceContent,
    initiatorRef: "GPTSELF_CANDIDATE",
    participantRef: "CLAUDESELF_CANDIDATE",
    sourceSubstrateIdentity: "git-object:example-source-identity-not-selfcommunication-id",
    returnSubstrateIdentity: "git-object:example-return-identity-not-selfcommunication-id"
  });
  const fanout = buildFanoutCommunication({
    sourceContent,
    endpoints: ["GPTSELF_CANDIDATE", "CLAUDESELF_CANDIDATE", "CODEXSELF_CANDIDATE"]
  });
  const divergedFanout = buildFanoutCommunication({
    sourceContent,
    endpoints: ["GPTSELF_CANDIDATE", "CLAUDESELF_CANDIDATE", "CODEXSELF_CANDIDATE"],
    divergentEndpoints: ["CLAUDESELF_CANDIDATE"]
  });
  const projectionBinding = assertProjectionHasObservationBinding({
    projection: {
      projection_ref: "P_CODEX_001",
      source_matter_identity: fanout.source_matter.content_identity,
      observation_ref: fanout.endpoint_results.find((entry) => entry.endpoint_ref === "CODEXSELF_CANDIDATE").observation.event_ref
    },
    sourceMatter: fanout.source_matter,
    observation: fanout.endpoint_results.find((entry) => entry.endpoint_ref === "CODEXSELF_CANDIDATE").observation
  });
  const report = {
    schema: COMMUNICATION_REPORT_SCHEMA,
    artifact_status: "CANDIDATE_NOT_CANONICAL_PROTOCOL",
    primitive: "SELFCommunicationEvent",
    source_matter_identity: roundtrip.source_matter.content_identity,
    roundtrip,
    fanout,
    diverged_fanout: divergedFanout,
    partial_trajectory_pressure: buildPartialTrajectoryPressureReport(),
    projection_binding: projectionBinding,
    final_standing: roundtrip.validation.ok && fanout.all_exact && !divergedFanout.all_exact && projectionBinding.ok
      ? "COMMUNICATION_MATTER_FOUNDATION_CANDIDATE_ESTABLISHED"
      : "COMMUNICATION_MATTER_FOUNDATION_BLOCKED",
    non_collapse: COMMUNICATION_NON_COLLAPSE,
    next_living_frontier: "Route real endpoint outputs through SELFCommunicationEvent custody before multi-SELF semantic reconciliation."
  };
  report.report_identity = digestObject(report);
  return report;
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(value, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = valueAfter(process.argv, "--out");
  const report = buildFoundationReport();
  if (outPath) writeJsonFile(outPath, report);
  console.log(JSON.stringify(report, null, 2));
}
