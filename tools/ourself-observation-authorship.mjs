#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCommline,
  createParticipation,
  computeObservationGap,
  deriveNotifaselfEligibility,
  createActivationDelivery,
  gocheckitObserve
} from "./ourself-commline-observation-gap.mjs";
import {
  classifyCommunicationTrajectory,
  createAck,
  createHollaback,
  createMatter,
  digestObject
} from "./ourself-communication-matter.mjs";

export const OBSERVATION_AUTHORSHIP_SCHEMA = "ourself.observation-authorship.v0.1-candidate";

export const OBSERVATION_AUTHORSHIP_NON_COLLAPSE = [
  "REPRESENTATIONAL_ASYMMETRY != EVIDENTIARY_ASYMMETRY",
  "CUSTODIED != ADDRESSABLE",
  "ADDRESSABLE != NOTIFIED",
  "NOTIFIED != OBSERVED",
  "OBSERVED != ACKNOWLEDGED",
  "ACKNOWLEDGED != ACK_KNOWN",
  "ACTIVATION_DELIVERED != PARTICIPANT_ACTIVATED",
  "OBSERVATION_CAPABILITY != OBSERVATION_GRANT",
  "OBSERVATION_GRANT != GOCHECKIT_ACT",
  "GOCHECKIT_ACT != OBSERVATION_OCCURRENCE",
  "CHAIN_CONTINUITY != ENDPOINT_AUTHENTICITY",
  "SHARED_PRINCIPAL != ENDPOINT_AUTHENTICITY",
  "FOUNDER_PARTICIPANT != FOUNDER_TRANSPORT",
  "HOLLABACK_FORMED != HOLLABACK_TRANSMITTED"
];

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(value, null, 2)}\n`);
}

function publicKeyIdentity(publicKeyPem) {
  return `sha256:${crypto.createHash("sha256").update(String(publicKeyPem), "utf8").digest("hex")}`;
}

function signStable(value, privateKeyPem) {
  return crypto.sign(null, Buffer.from(stableJson(value), "utf8"), privateKeyPem).toString("base64");
}

function verifyStable(value, signature, publicKeyPem) {
  try {
    return crypto.verify(
      null,
      Buffer.from(stableJson(value), "utf8"),
      publicKeyPem,
      Buffer.from(String(signature), "base64")
    );
  } catch {
    return false;
  }
}

export function createEndpointSigningFixture({ participation, matterRefs = [] } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const capability = createObservationCapability({
    participation,
    matterRefs,
    evidenceSpecies: "ENDPOINT_SIGNATURE_CANDIDATE",
    publicKeyPem
  });
  return { capability, privateKeyPem };
}

export function createObservationCapability({
  capabilityRef,
  participation,
  matterRefs = [],
  evidenceSpecies = "ENDPOINT_SIGNATURE_CANDIDATE",
  publicKeyPem = null,
  controlledByRef = null
} = {}) {
  const capability = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_CAPABILITY",
    capability_ref: capabilityRef ?? `OBS_CAP_${digestObject({
      participation_ref: participation.participation_ref,
      evidenceSpecies,
      matterRefs,
      publicKeyPem
    }).slice("sha256:".length, "sha256:".length + 16)}`,
    participation_ref: participation.participation_ref,
    self_ref: participation.self_ref,
    endpoint_occurrence_ref: participation.endpoint_occurrence_ref,
    session_ref: participation.session_ref,
    controlled_by_ref: controlledByRef ?? participation.endpoint_occurrence_ref,
    evidence_species: evidenceSpecies,
    observable_matter_refs: [...matterRefs],
    public_key_identity: publicKeyPem ? publicKeyIdentity(publicKeyPem) : null,
    public_key_pem: publicKeyPem,
    capability_not_grant: true,
    capability_not_observation: true
  };
  capability.capability_identity = digestObject({
    ...capability,
    public_key_pem: capability.public_key_pem ? capability.public_key_identity : null
  });
  return capability;
}

export function createObservationGrant({
  grantRef,
  participation,
  capability,
  matterRef,
  issuedByRef = "CONTROL_CANDIDATE",
  authorityBasisRef = "FOUNDER_BOUNDED_TEST_AUTHORITY",
  current = true
} = {}) {
  const errors = [];
  if (!participation) errors.push("participation missing");
  if (!capability) errors.push("observation capability missing");
  if (capability?.participation_ref !== participation?.participation_ref) errors.push("capability is not bound to participation");
  if (!capability?.observable_matter_refs?.includes(matterRef)) errors.push("capability does not cover Matter");
  if (!participation?.addressable_matter_refs?.includes(matterRef)) errors.push("Matter is not addressable to participation");
  if (!current) errors.push("grant is not current");

  const grant = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_GRANT",
    grant_ref: grantRef ?? `OBS_GRANT_${digestObject({
      participation_ref: participation?.participation_ref,
      capability_ref: capability?.capability_ref,
      matterRef,
      current
    }).slice("sha256:".length, "sha256:".length + 16)}`,
    participation_ref: participation?.participation_ref ?? null,
    capability_ref: capability?.capability_ref ?? null,
    matter_ref: matterRef,
    issued_by_ref: issuedByRef,
    authority_basis_ref: authorityBasisRef,
    current,
    errors,
    grant_disposition: errors.length === 0 ? "OBSERVATION_GRANT_ADMITTED" : "OBSERVATION_GRANT_BLOCKED",
    grant_not_capability: true,
    grant_not_gocheckit_act: true,
    grant_not_observation: true
  };
  grant.grant_identity = digestObject(grant);
  return grant;
}

function observationSignedPayload({ observation, participation, capability }) {
  return {
    observation_ref: observation.event_ref,
    observation_identity: observation.communication_event_identity,
    matter_ref: observation.payload.source_matter_ref,
    source_matter_identity: observation.payload.source_matter_identity,
    observed_matter_identity: observation.payload.observed_matter_identity,
    participation_ref: participation.participation_ref,
    endpoint_occurrence_ref: participation.endpoint_occurrence_ref,
    self_ref: participation.self_ref,
    capability_ref: capability.capability_ref,
    capability_identity: capability.capability_identity
  };
}

export function createEndpointSignatureEvidence({ observation, participation, capability, privateKeyPem } = {}) {
  const signedPayload = observationSignedPayload({ observation, participation, capability });
  const signature = signStable(signedPayload, privateKeyPem);
  const evidence = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_AUTHORSHIP_EVIDENCE",
    evidence_species: "ENDPOINT_SIGNATURE_CANDIDATE",
    observation_ref: observation.event_ref,
    participation_ref: participation.participation_ref,
    claimed_observer_ref: participation.endpoint_occurrence_ref,
    signer_endpoint_occurrence_ref: participation.endpoint_occurrence_ref,
    capability_ref: capability.capability_ref,
    public_key_identity: capability.public_key_identity,
    signed_payload: signedPayload,
    signed_payload_identity: digestObject(signedPayload),
    signature,
    evidence_asymmetry_claimed: true,
    endpoint_authorship_claimed: true
  };
  evidence.evidence_identity = digestObject(evidence);
  return evidence;
}

export function createSharedPrincipalReceipt({
  observation,
  participation,
  principalRef = "SHARED_GITHUB_PRINCIPAL_CANDIDATE"
} = {}) {
  const receipt = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_AUTHORSHIP_EVIDENCE",
    evidence_species: "SHARED_PRINCIPAL_RECEIPT",
    observation_ref: observation.event_ref,
    participation_ref: participation.participation_ref,
    claimed_observer_ref: participation.endpoint_occurrence_ref,
    principal_ref: principalRef,
    exact_observed_values_present: observation.payload.identity_match === true,
    representational_asymmetry_present: true,
    evidentiary_asymmetry_present: false,
    endpoint_authenticity_established: false
  };
  receipt.evidence_identity = digestObject(receipt);
  return receipt;
}

export function createDigestChainReceipt({
  observation,
  participation,
  previousDigest = "sha256:GENESIS"
} = {}) {
  const frame = {
    previous_digest: previousDigest,
    observation_ref: observation.event_ref,
    observation_identity: observation.communication_event_identity,
    participation_ref: participation.participation_ref,
    claimed_observer_ref: participation.endpoint_occurrence_ref
  };
  const receipt = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_AUTHORSHIP_EVIDENCE",
    evidence_species: "DIGEST_CHAIN_RECEIPT",
    observation_ref: observation.event_ref,
    participation_ref: participation.participation_ref,
    claimed_observer_ref: participation.endpoint_occurrence_ref,
    previous_digest: previousDigest,
    chain_frame_identity: digestObject(frame),
    chain_continuity_established: true,
    endpoint_authenticity_established: false,
    integrity_not_authorship: true
  };
  receipt.evidence_identity = digestObject(receipt);
  return receipt;
}

export function adjudicateObservationAuthorship({
  observation,
  sourceMatter,
  participation,
  capability = null,
  grant = null,
  evidence = null
} = {}) {
  const errors = [];
  const notes = [];

  if (!observation) errors.push("observation missing");
  if (observation?.event_type !== "OBSERVATION") errors.push("event is not OBSERVATION");
  if (observation?.actor_ref !== participation?.endpoint_occurrence_ref) errors.push("observation actor does not match endpoint occurrence");
  if (observation?.payload?.participation_ref !== participation?.participation_ref) errors.push("observation participation_ref does not match participation");
  if (observation?.payload?.self_ref !== participation?.self_ref) errors.push("observation self_ref does not match participation");
  if (observation?.payload?.source_matter_ref !== sourceMatter?.matter_ref) errors.push("observation source Matter ref does not match source Matter");
  if (observation?.payload?.source_matter_identity !== sourceMatter?.content_identity) errors.push("observation source identity does not match source Matter");
  if (observation?.payload?.identity_match !== true) errors.push("observation is not exact");
  if (observation?.payload?.frontier_receipt_persisted !== true) errors.push("frontier receipt is not persisted");

  if (!capability) errors.push("observation capability missing");
  if (capability?.participation_ref !== participation?.participation_ref) errors.push("capability is not bound to participation");
  if (!capability?.observable_matter_refs?.includes(sourceMatter?.matter_ref)) errors.push("capability does not cover source Matter");

  if (!grant) errors.push("observation grant missing");
  if (grant?.grant_disposition !== "OBSERVATION_GRANT_ADMITTED") errors.push("observation grant is not admitted");
  if (grant?.participation_ref !== participation?.participation_ref) errors.push("grant is not bound to participation");
  if (grant?.capability_ref !== capability?.capability_ref) errors.push("grant is not bound to capability");
  if (grant?.matter_ref !== sourceMatter?.matter_ref) errors.push("grant does not cover source Matter");
  if (grant?.current !== true) errors.push("grant is not current");

  if (!evidence) {
    errors.push("observer-origin evidence missing");
  } else if (evidence.evidence_species === "ENDPOINT_SIGNATURE_CANDIDATE") {
    if (evidence.participation_ref !== participation.participation_ref) errors.push("signature evidence participation mismatch");
    if (evidence.signer_endpoint_occurrence_ref !== participation.endpoint_occurrence_ref) errors.push("signature evidence signer endpoint mismatch");
    if (evidence.capability_ref !== capability?.capability_ref) errors.push("signature evidence capability mismatch");
    if (evidence.public_key_identity !== capability?.public_key_identity) errors.push("signature evidence public key mismatch");
    const expectedPayload = capability ? observationSignedPayload({ observation, participation, capability }) : null;
    if (expectedPayload && digestObject(expectedPayload) !== evidence.signed_payload_identity) errors.push("signature evidence payload identity mismatch");
    if (expectedPayload && !verifyStable(expectedPayload, evidence.signature, capability.public_key_pem)) {
      errors.push("endpoint signature verification failed");
    }
  } else if (evidence.evidence_species === "SHARED_PRINCIPAL_RECEIPT") {
    errors.push("shared principal receipt cannot establish endpoint authorship");
    notes.push("REPRESENTATIONAL_ASYMMETRY_WITHOUT_EVIDENTIARY_ASYMMETRY");
  } else if (evidence.evidence_species === "DIGEST_CHAIN_RECEIPT") {
    errors.push("digest chain establishes continuity/integrity but not endpoint authorship");
    notes.push("CHAIN_CONTINUITY_NOT_ENDPOINT_AUTHENTICITY");
  } else {
    errors.push(`unsupported observer-origin evidence species: ${evidence.evidence_species}`);
  }

  const adjudication = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "OBSERVATION_AUTHORSHIP_ADJUDICATION",
    observation_ref: observation?.event_ref ?? null,
    matter_ref: sourceMatter?.matter_ref ?? null,
    participation_ref: participation?.participation_ref ?? null,
    capability_ref: capability?.capability_ref ?? null,
    grant_ref: grant?.grant_ref ?? null,
    evidence_identity: evidence?.evidence_identity ?? null,
    evidence_species: evidence?.evidence_species ?? null,
    representational_asymmetry_present: Boolean(observation?.payload?.participation_ref && observation?.actor_ref),
    evidentiary_asymmetry_established: errors.length === 0,
    observer_origin_established: errors.length === 0,
    may_advance_observed_set: errors.length === 0,
    errors,
    notes,
    final_standing: errors.length === 0
      ? "OBSERVATION_AUTHORSHIP_ESTABLISHED_CANDIDATE"
      : "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED"
  };
  adjudication.adjudication_identity = digestObject(adjudication);
  return adjudication;
}

export function computeObservationGapWithAuthorship({
  commline,
  participation,
  observationBundles = []
} = {}) {
  const adjudications = observationBundles.map((bundle) => adjudicateObservationAuthorship({
    observation: bundle.observation,
    sourceMatter: bundle.sourceMatter,
    participation,
    capability: bundle.capability,
    grant: bundle.grant,
    evidence: bundle.evidence
  }));
  const admittedObservations = observationBundles
    .filter((bundle, index) => adjudications[index].may_advance_observed_set)
    .map((bundle) => bundle.observation);
  const gap = computeObservationGap({ commline, participation, observations: admittedObservations });
  const projection = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "AUTHORED_OBSERVATION_GAP_PROJECTION",
    participation_ref: participation.participation_ref,
    commline_ref: commline.commline_ref,
    gap,
    adjudications,
    admitted_observation_refs: admittedObservations.map((observation) => observation.event_ref),
    rejected_observation_refs: adjudications
      .filter((entry) => !entry.may_advance_observed_set)
      .map((entry) => entry.observation_ref),
    observed_set_advances_only_after_observer_origin_evidence: true
  };
  projection.projection_identity = digestObject(projection);
  return projection;
}

export function createParticipantActivation({
  eligibility,
  activationDelivery,
  participantActivated = false,
  activationEvidenceRef = null
} = {}) {
  const activation = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "PARTICIPANT_ACTIVATION",
    eligibility_ref: eligibility.eligibility_ref,
    activation_ref: activationDelivery.activation_ref,
    participation_ref: eligibility.participation_ref,
    activation_delivery_disposition: activationDelivery.delivery_disposition,
    participant_activated: participantActivated,
    activation_evidence_ref: activationEvidenceRef,
    activation_delivered_not_participant_activated: activationDelivery.delivered && !participantActivated
  };
  activation.participant_activation_identity = digestObject(activation);
  return activation;
}

export function gocheckitWithAuthorship({
  participation,
  sourceMatter,
  capability,
  grant,
  privateKeyPem,
  custodyCommitted = true
} = {}) {
  if (grant?.grant_disposition !== "OBSERVATION_GRANT_ADMITTED") {
    return {
      schema: OBSERVATION_AUTHORSHIP_SCHEMA,
      object_type: "GOCHECKIT_ACT",
      ok: false,
      disposition: "GOCHECKIT_GRANT_REQUIRED",
      participation_ref: participation?.participation_ref ?? null,
      matter_ref: sourceMatter?.matter_ref ?? null,
      capability_ref: capability?.capability_ref ?? null,
      grant_ref: grant?.grant_ref ?? null,
      capability_not_grant: true,
      grant_not_act: true,
      act_not_observation: true
    };
  }
  const result = gocheckitObserve({ participation, sourceMatter, custodyCommitted });
  const gocheckitAct = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "GOCHECKIT_ACT",
    ok: result.ok,
    disposition: result.disposition,
    participation_ref: participation.participation_ref,
    matter_ref: sourceMatter.matter_ref,
    capability_ref: capability.capability_ref,
    grant_ref: grant.grant_ref,
    observation_ref: result.observation?.event_ref ?? null,
    capability_not_grant: capability.capability_ref !== grant.grant_ref,
    grant_not_act: true,
    act_not_observation: result.observation ? true : null
  };
  gocheckitAct.gocheckit_act_ref = `GOCHECKIT_${digestObject(gocheckitAct).slice("sha256:".length, "sha256:".length + 16)}`;
  gocheckitAct.gocheckit_act_identity = digestObject(gocheckitAct);

  const evidence = result.ok
    ? createEndpointSignatureEvidence({
      observation: result.observation,
      participation,
      capability,
      privateKeyPem
    })
    : null;
  const adjudication = result.ok
    ? adjudicateObservationAuthorship({
      observation: result.observation,
      sourceMatter,
      participation,
      capability,
      grant,
      evidence
    })
    : null;
  return {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    object_type: "GOCHECKIT_WITH_AUTHORSHIP",
    ok: result.ok && adjudication?.may_advance_observed_set === true,
    gocheckit_act: gocheckitAct,
    observed_matter: result.observed_matter ?? null,
    observation: result.observation ?? null,
    evidence,
    adjudication,
    observation_capability_not_grant_not_act_not_occurrence: Boolean(
      capability.capability_ref !== grant.grant_ref &&
      gocheckitAct.gocheckit_act_ref !== result.observation?.event_ref
    )
  };
}

export function buildObservationAuthorshipReport() {
  const sourceMatter = createMatter({
    matterRef: "M_CL001_OBSERVER_ORIGIN_PRESSURE",
    content: "CL-001 observation authorship pressure: exact values do not prove observer origin.",
    producerRef: "FOUNDERSELF_PARTICIPANT_CANDIDATE"
  });
  const commline = createCommline({
    commlineRef: "CL_001_OBSERVATION_AUTHORSHIP",
    matterEntries: [sourceMatter]
  });
  const founderParticipation = createParticipation({
    participationRef: "P_FOUNDER_CL_001",
    commline,
    selfRef: "FOUNDERSELF_CANDIDATE",
    endpointOccurrenceRef: "FOUNDER_UI_OCCURRENCE_CANDIDATE",
    sessionRef: "SESSION_FOUNDER_A",
    addressableMatterRefs: [sourceMatter.matter_ref]
  });
  const claudeParticipation = createParticipation({
    participationRef: "P_CLAUDE_CL_001",
    commline,
    selfRef: "CLAUDESELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CLAUDE_CLI_OCCURRENCE_A",
    sessionRef: "SESSION_CLAUDE_A",
    addressableMatterRefs: [sourceMatter.matter_ref]
  });

  const { capability, privateKeyPem } = createEndpointSigningFixture({
    participation: claudeParticipation,
    matterRefs: [sourceMatter.matter_ref]
  });
  const grant = createObservationGrant({
    participation: claudeParticipation,
    capability,
    matterRef: sourceMatter.matter_ref
  });
  const observationRepresentation = gocheckitObserve({
    participation: claudeParticipation,
    sourceMatter
  });
  const sharedPrincipalReceipt = createSharedPrincipalReceipt({
    observation: observationRepresentation.observation,
    participation: claudeParticipation
  });
  const digestChainReceipt = createDigestChainReceipt({
    observation: observationRepresentation.observation,
    participation: claudeParticipation
  });
  const endpointSignatureEvidence = createEndpointSignatureEvidence({
    observation: observationRepresentation.observation,
    participation: claudeParticipation,
    capability,
    privateKeyPem
  });

  const sharedPrincipalAdjudication = adjudicateObservationAuthorship({
    observation: observationRepresentation.observation,
    sourceMatter,
    participation: claudeParticipation,
    capability,
    grant,
    evidence: sharedPrincipalReceipt
  });
  const digestChainAdjudication = adjudicateObservationAuthorship({
    observation: observationRepresentation.observation,
    sourceMatter,
    participation: claudeParticipation,
    capability,
    grant,
    evidence: digestChainReceipt
  });
  const endpointSignatureAdjudication = adjudicateObservationAuthorship({
    observation: observationRepresentation.observation,
    sourceMatter,
    participation: claudeParticipation,
    capability,
    grant,
    evidence: endpointSignatureEvidence
  });
  const authoredGap = computeObservationGapWithAuthorship({
    commline,
    participation: claudeParticipation,
    observationBundles: [
      { observation: observationRepresentation.observation, sourceMatter, capability, grant, evidence: sharedPrincipalReceipt },
      { observation: observationRepresentation.observation, sourceMatter, capability, grant, evidence: digestChainReceipt },
      { observation: observationRepresentation.observation, sourceMatter, capability, grant, evidence: endpointSignatureEvidence }
    ]
  });

  const bareGap = computeObservationGap({
    commline,
    participation: claudeParticipation,
    observations: [observationRepresentation.observation]
  });
  const eligibility = deriveNotifaselfEligibility({
    gap: computeObservationGap({ commline, participation: claudeParticipation, observations: [] })
  });
  const activationDelivery = createActivationDelivery({
    eligibility,
    substrate: "WEBHOOK_CANDIDATE",
    delivered: true,
    deliveryIdentity: "delivery-guid-not-activation-proof"
  });
  const participantActivation = createParticipantActivation({
    eligibility,
    activationDelivery,
    participantActivated: false
  });
  const unauthenticatedGrant = createObservationGrant({
    participation: claudeParticipation,
    capability,
    matterRef: sourceMatter.matter_ref,
    current: false
  });
  const blockedGocheckit = gocheckitWithAuthorship({
    participation: claudeParticipation,
    sourceMatter,
    capability,
    grant: unauthenticatedGrant,
    privateKeyPem
  });
  const admittedGocheckit = gocheckitWithAuthorship({
    participation: claudeParticipation,
    sourceMatter,
    capability,
    grant,
    privateKeyPem
  });
  const ack = createAck({
    observerRef: claudeParticipation.endpoint_occurrence_ref,
    observation: admittedGocheckit.observation,
    sourceMatter
  });
  const { returnMatter, hollaback } = createHollaback({
    responderRef: claudeParticipation.self_ref,
    sourceMatter,
    observation: admittedGocheckit.observation,
    content: `HOLLABACK formed for ${sourceMatter.content_identity} but not transmitted.`
  });
  const formedNotTransmittedTrajectory = classifyCommunicationTrajectory({
    sourceMatter,
    returnMatter,
    events: [admittedGocheckit.observation, ack, hollaback]
  });
  const formedNotTransmitted = {
    hollaback_emission_ref: hollaback.event_ref,
    return_matter_identity: returnMatter.content_identity,
    return_transmission_ref: null,
    hollaback_formed: hollaback.event_type === "HOLLABACK_EMISSION",
    hollaback_transmitted: false,
    hollaback_formed_not_transmitted: true,
    trajectory_ceiling: formedNotTransmittedTrajectory.terminal_disposition
  };

  const checks = {
    representation_only_gap_is_vulnerable: bareGap.observed_matter_refs.includes(sourceMatter.matter_ref),
    shared_principal_receipt_refused: sharedPrincipalAdjudication.may_advance_observed_set === false &&
      sharedPrincipalAdjudication.errors.some((error) => error.includes("shared principal")),
    digest_chain_refused_as_authorship: digestChainAdjudication.may_advance_observed_set === false &&
      digestChainAdjudication.errors.some((error) => error.includes("digest chain")),
    endpoint_signature_can_establish_candidate_origin: endpointSignatureAdjudication.may_advance_observed_set === true,
    authored_gap_advances_only_signed_observation: authoredGap.gap.observed_matter_refs.includes(sourceMatter.matter_ref) &&
      authoredGap.admitted_observation_refs.length === 1 &&
      authoredGap.rejected_observation_refs.length === 2,
    activation_delivery_not_participant_activation: participantActivation.activation_delivered_not_participant_activated === true,
    stale_or_absent_grant_blocks_gocheckit: blockedGocheckit.disposition === "GOCHECKIT_GRANT_REQUIRED",
    capability_grant_act_observation_distinct: admittedGocheckit.observation_capability_not_grant_not_act_not_occurrence === true,
    founder_is_participant_not_transport: founderParticipation.self_ref === "FOUNDERSELF_CANDIDATE" &&
      founderParticipation.participation_ref !== founderParticipation.endpoint_occurrence_ref,
    hollaback_formed_not_transmitted_preserved: formedNotTransmitted.hollaback_formed_not_transmitted === true
  };

  const report = {
    schema: OBSERVATION_AUTHORSHIP_SCHEMA,
    artifact_status: "CANDIDATE_NOT_CANONICAL_PROTOCOL",
    primitive_pressure: "ObserverOriginEvidence",
    commline,
    participations: {
      founder: founderParticipation,
      claude: claudeParticipation
    },
    six_rung_ladder: [
      "CUSTODIED",
      "ADDRESSABLE",
      "NOTIFIED",
      "OBSERVED",
      "ACKNOWLEDGED",
      "ACK_KNOWN"
    ],
    capability,
    grant,
    cases: {
      representational_asymmetry_without_evidence: {
        bare_gap: bareGap,
        shared_principal_receipt: sharedPrincipalReceipt,
        adjudication: sharedPrincipalAdjudication
      },
      digest_chain_integrity_without_authorship: {
        digest_chain_receipt: digestChainReceipt,
        adjudication: digestChainAdjudication
      },
      endpoint_signature_candidate_origin: {
        evidence: endpointSignatureEvidence,
        adjudication: endpointSignatureAdjudication
      },
      authored_gap: authoredGap,
      activation_not_observation: {
        eligibility,
        activation_delivery: activationDelivery,
        participant_activation: participantActivation
      },
      gocheckit_gate: {
        blocked: blockedGocheckit,
        admitted: admittedGocheckit
      },
      hollaback_formed_not_transmitted: {
        return_matter: returnMatter,
        hollaback,
        standing: formedNotTransmitted
      }
    },
    checks,
    final_standing: Object.values(checks).every(Boolean)
      ? "OBSERVATION_AUTHORSHIP_ASYMMETRY_CANDIDATE_ESTABLISHED"
      : "OBSERVATION_AUTHORSHIP_ASYMMETRY_BLOCKED",
    non_collapse: OBSERVATION_AUTHORSHIP_NON_COLLAPSE,
    known_constraints: [
      "This is local candidate evidence-asymmetry pressure, not live endpoint authenticity.",
      "Endpoint signature evidence is a candidate sufficient species in this fixture only.",
      "Shared GitHub-style principal and digest-chain continuity remain insufficient for endpoint authorship.",
      "Automatic observation advancement remains blocked until a real observation-authorship evidence species is established for the endpoint."
    ],
    next_living_frontier: "Bind a real endpoint-specific observation capability or distinct-principal attestation before automating ObservationGap resolution."
  };
  report.report_identity = digestObject({
    ...report,
    capability: {
      ...capability,
      public_key_pem: capability.public_key_identity
    }
  });
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = valueAfter(process.argv, "--out");
  const report = buildObservationAuthorshipReport();
  if (outPath) writeJsonFile(outPath, report);
  console.log(JSON.stringify(report, null, 2));
}
