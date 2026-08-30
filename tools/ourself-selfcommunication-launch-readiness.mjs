#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCommlineObservationGapReport,
  computeParticipationOccurrenceObservationGap,
  createCommline,
  createParticipation,
  createParticipationOccurrence,
  deriveOccurrenceNotifaselfEligibility,
  deriveAckDisposition,
  gocheckitObserve
} from "./ourself-commline-observation-gap.mjs";
import {
  adjudicateObservationAuthorship,
  buildObservationAuthorshipReport,
  createDigestChainReceipt,
  createEndpointSignatureEvidence,
  createEndpointSigningFixture,
  createObservationGrant,
  createSharedPrincipalReceipt
} from "./ourself-observation-authorship.mjs";
import { runTransportIndependentRoundtrip } from "./ourself-transport-independent-roundtrip.mjs";
import { createMatter, digestObject } from "./ourself-communication-matter.mjs";

export const SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA = "ourself.selfcommunication-launch-readiness.v0.1";

export const LAUNCH_INVARIANTS = [
  "ADDRESSABLE != OBLIGATED",
  "OBLIGATED != NOTIFIED",
  "NOTIFIED != ACTIVATED",
  "ACTIVATED != OBSERVED",
  "CONTEXT_PRESENT != CURRENT_OCCURRENCE_OBSERVED",
  "ONE_SELF != ONE_PRESENT",
  "KNOWLEDGE_DOES_NOT_UNION_BY_CONTINUITY",
  "AUTHORITY_DOES_NOT_INHERIT_BY_CONTEXT",
  "OCCURRENCE_TERMINATED != OBSERVATION_ERASED",
  "MAY_ADDRESS_ME != MAY_INTERRUPT_ME"
];

const VALID_OBLIGATION_SOURCE_SPECIES = new Set([
  "FOUNDER_INSTRUCTION",
  "RATIFIED_COMMLINE_ROLE_CHARTER",
  "AUTHORIZED_ACT_READSET"
]);

export const PROOF_GENERA = [
  "DETERMINATION",
  "BINDING",
  "ATTRIBUTION",
  "OBSERVATION",
  "AUTHORITY",
  "EFFECT",
  "COMPOSITION"
];

export const T0_ATTRIBUTION_CONTRACT = {
  ref: "T0_BOUNDED_SELFCOMMUNICATION_OCCURRENCE_ATTRIBUTION",
  standing: "FOUNDER_RATIFIED_COUNTERFEIT_POPULATION_CONTRACT",
  maximum_standing: "ATTRIBUTION_ESTABLISHED_UNDER_T0",
  does_not_exclude: [
    "PRIVILEGED_SAME_HOST_COMPROMISE",
    "OUT_OF_SCOPE_PROVIDER_INTERNAL_REWRITE",
    "OS_LEVEL_TRANSCRIPT_OR_PROCESS_TAMPERING"
  ],
  proof_law: "EvidenceFitness(E,Q,T0) not EvidenceStrength(E)"
};

export const T0_COUNTERFEIT_CLASSES = [
  {
    class_ref: "T0_C1_SIBLING_RESUMED_OCCURRENCE",
    class_label: "sibling/resumed occurrence",
    admitted_basis: "provider resume/fork can inherit persisted session context",
    indistinguishable_pre_repair_artifacts: ["persisted context", "session file bytes", "public digests", "expected refs"]
  },
  {
    class_ref: "T0_C2_ORCHESTRATION_HARNESS",
    class_label: "orchestration harness",
    admitted_basis: "invoker or harness can produce invocation and birth metadata",
    indistinguishable_pre_repair_artifacts: ["invokerRef", "birth records", "execution wrapper receipts"]
  },
  {
    class_ref: "T0_C3_SAME_LINE_OCCURRENCE_LACKING_ACT",
    class_label: "same-line occurrence lacking the act",
    admitted_basis: "another occurrence on the same communication line can hold context without performing observation",
    indistinguishable_pre_repair_artifacts: ["correct value", "same self ref", "same commline ref"]
  },
  {
    class_ref: "T0_C4_PUBLIC_COMMLINE_HOLDER",
    class_label: "public commline holder",
    admitted_basis: "publicly addressable Matter can be replayed by a holder that never performed the claimed act",
    indistinguishable_pre_repair_artifacts: ["public content", "public route", "public transcript excerpt"]
  },
  {
    class_ref: "T0_C5_EXPECTED_DIGEST_NONCE_REF_HOLDER",
    class_label: "expected digest/nonce/refs holder",
    admitted_basis: "digest, nonce, and reference knowledge can be recomputable or supplied",
    indistinguishable_pre_repair_artifacts: ["digest", "nonce", "selector", "reference chain"]
  },
  {
    class_ref: "T0_C6_INHERITED_SHARED_CONTEXT_HOLDER",
    class_label: "inherited/shared context holder",
    admitted_basis: "context may contain exact Matter without current occurrence observation or authority",
    indistinguishable_pre_repair_artifacts: ["full prompt context", "shared SELF_REF", "session-file union"]
  }
];

export const FROZEN_F1_F6_FINDINGS = [
  {
    finding_ref: "F1_SIBLING_RESUMED_OCCURRENCE",
    failed_proposition: "Persisted, inherited, public, or recomputable state is enough to attribute the acting occurrence.",
    question_genus: "ATTRIBUTION",
    current_evidence: ["session context", "persisted transcript", "public digest/ref material"],
    current_evidence_fit: "INSUFFICIENT_FOR_ATTRIBUTION_UNDER_T0",
    t0_counterfeit_classes: ["T0_C1_SIBLING_RESUMED_OCCURRENCE"],
    minimum_repair_property: "Reject attribution from any artifact a resumed sibling can inherit or recompute; require a live non-persisted occurrence-bound artifact before positive attribution.",
    maximum_standing: "NO_ATTRIBUTION_STANDING_FROM_INHERITED_STATE"
  },
  {
    finding_ref: "F2_ORCHESTRATION_HARNESS",
    failed_proposition: "Harness invocation metadata proves the subject occurrence performed the attributed act.",
    question_genus: "COMPOSITION",
    current_evidence: ["invokerRef", "birth record", "wrapper execution receipt"],
    current_evidence_fit: "FITS_EXECUTION_ADMISSIBILITY_NOT_ATTRIBUTION",
    t0_counterfeit_classes: ["T0_C2_ORCHESTRATION_HARNESS"],
    minimum_repair_property: "Bind harness evidence to execution admissibility only; require separate act evidence for occurrence attribution.",
    maximum_standing: "DETERMINATION_OR_AUTHORITY_ONLY"
  },
  {
    finding_ref: "F3_SAME_LINE_OCCURRENCE_LACKING_ACT",
    failed_proposition: "Correct observation values supplied by another same-line occurrence establish observation for the claimed participant.",
    question_genus: "OBSERVATION",
    current_evidence: ["same commline", "same SELF_REF", "correct value"],
    current_evidence_fit: "INSUFFICIENT_FOR_OBSERVED_RELATION",
    t0_counterfeit_classes: ["T0_C3_SAME_LINE_OCCURRENCE_LACKING_ACT"],
    minimum_repair_property: "Accept observation only when the event actor, participation occurrence, and source Matter bind to the same occurrence.",
    maximum_standing: "CONTEXT_OR_VALUE_POSSESSION_ONLY"
  },
  {
    finding_ref: "F4_PUBLIC_COMMLINE_HOLDER",
    failed_proposition: "Publicly reproducible commline Matter attributes the producer or observer.",
    question_genus: "BINDING",
    current_evidence: ["public content", "public route", "public excerpt"],
    current_evidence_fit: "FITS_CONTENT_DETERMINATION_NOT_CAUSAL_ATTRIBUTION",
    t0_counterfeit_classes: ["T0_C4_PUBLIC_COMMLINE_HOLDER"],
    minimum_repair_property: "Keep public content proof separate from causal author/observer attribution.",
    maximum_standing: "DETERMINED_PUBLIC_CONTENT"
  },
  {
    finding_ref: "F5_EXPECTED_DIGEST_NONCE_REF_HOLDER",
    failed_proposition: "Expected digest, nonce, or reference knowledge proves causal authorship or observation.",
    question_genus: "COMPOSITION",
    current_evidence: ["digest", "nonce", "selector", "reference chain"],
    current_evidence_fit: "FITS_DETERMINATION_OR_BINDING_ONLY",
    t0_counterfeit_classes: ["T0_C5_EXPECTED_DIGEST_NONCE_REF_HOLDER"],
    minimum_repair_property: "Require digest/ref evidence to stay within determination or structural binding unless paired with genus-appropriate causal attribution evidence.",
    maximum_standing: "DIGEST_OR_REF_KNOWLEDGE_ONLY"
  },
  {
    finding_ref: "F6_INHERITED_SHARED_CONTEXT_HOLDER",
    failed_proposition: "Inherited or shared context establishes current observation, authority, or standing.",
    question_genus: "COMPOSITION",
    current_evidence: ["full context", "shared SELF_REF", "session-file union"],
    current_evidence_fit: "INSUFFICIENT_FOR_OBSERVATION_AUTHORITY_OR_STANDING",
    t0_counterfeit_classes: ["T0_C6_INHERITED_SHARED_CONTEXT_HOLDER"],
    minimum_repair_property: "Represent context possession as context only; never uplift it into observation, authority, or standing.",
    maximum_standing: "CONTEXT_PRESENT_ONLY"
  }
];

export const REPORT_IDENTITY_SCOPE = {
  included: [
    "launch target",
    "standing path census classifications",
    "authorship dominance result",
    "ACK composition dispositions",
    "executed counterfeit exclusion dispositions",
    "BIND repair standing",
    "occurrence-key registry standing",
    "sibling counterfeit strategy coverage",
    "F1-F6 proof compilation and replay standings",
    "T1/T1.5 executed standings",
    "gate standings",
    "launch decision and required next seat"
  ],
  excluded: [
    "wall-clock occurrence timestamps",
    "generation time",
    "fresh cryptographic fixture key material",
    "fresh signatures",
    "transport/custody receipt identities outside the launch claim"
  ],
  report_identity_not_generation_time: true
};

export const LAUNCH_CONTROL_DISPOSITIONS = Object.freeze({
  SATISFIED: "SATISFIED",
  BLOCKED: "BLOCKED",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
  MISSING: "MISSING"
});

const CLOSED_LAUNCH_CONTROL_DISPOSITIONS = new Set(Object.values(LAUNCH_CONTROL_DISPOSITIONS));
const SATISFYING_LAUNCH_CONTROL_DISPOSITIONS = new Set([LAUNCH_CONTROL_DISPOSITIONS.SATISFIED]);

export const REQUIRED_R4_ATTACK_COVERAGE = [
  "unauthorized obligation source",
  "cross-occurrence obligation injection",
  "two simultaneous forks claiming one occurrence ref",
  "context inherited substituted for observed",
  "shared SELF_REF causing observation union",
  "shared SELF_REF causing notification leakage",
  "authority inherited through context ancestry"
];

export const REQUIRED_LAUNCH_GATE_REFS = [
  "g1_derivation_only_obligation",
  "g2_occurrence_birth",
  "g3_occurrence_addressing",
  "g4_activation_admission",
  "g5_independent_hostile_pass",
  "g6_claude_gap_disposition",
  "g7_session_file_union_attack",
  "t1_patient_zero_false",
  "t1_5_activation_denied",
  "t2_causal_matter_predecessor",
  "g8_authorship_dominance",
  "g9_ack_composition",
  "g10_bind_repair"
];

export const LAUNCH_GATE_METADATA = {
  g1_derivation_only_obligation: {
    gate_id: "G1_DERIVATION_ONLY_OBLIGATION",
    source: "buildLaunchReadinessAlgebraReport.checks.obligation_derivation_only",
    semantic_question: "Can launch observation duties derive only from authorized source chains?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PREDECESSOR",
    historical_aliases: ["G1"]
  },
  g2_occurrence_birth: {
    gate_id: "G2_OCCURRENCE_BIRTH",
    source: "buildLaunchReadinessAlgebraReport.birth.adjudication",
    semantic_question: "Is each launch occurrence birth registered without duplicate occurrence claims?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PREDECESSOR",
    historical_aliases: ["G2"]
  },
  g3_occurrence_addressing: {
    gate_id: "G3_OCCURRENCE_ADDRESSING",
    source: "buildLaunchReadinessAlgebraReport.checks.occurrence_scoped_addressability_no_po_b_leak",
    semantic_question: "Does occurrence-scoped addressability avoid sibling leakage?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PREDECESSOR",
    historical_aliases: ["G3"]
  },
  g4_activation_admission: {
    gate_id: "G4_ACTIVATION_ADMISSION",
    source: "buildLaunchReadinessAlgebraReport.activation_admission",
    semantic_question: "Is activation admitted only through derived duty, live birth, and available budget?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PREDECESSOR",
    historical_aliases: ["G4"]
  },
  g5_independent_hostile_pass: {
    gate_id: "G5_INDEPENDENT_HOSTILE_REVIEW_RECEIPT",
    source: "adjudicateG5IndependentHostileReceipt",
    semantic_question: "Does a valid independent hostile R4 receipt bind to the exact launch subject with required coverage?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_INDEPENDENT_REVIEW_GATE",
    historical_aliases: ["G5", "INDEPENDENT_HOSTILE"]
  },
  g6_claude_gap_disposition: {
    gate_id: "G6_HELD_UNOBSERVED_HOSTILE_MATTER",
    source: "held hostile Matter disposition",
    semantic_question: "Has held unobserved hostile Matter been typed as non-blocking by evidence rather than display label?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_BLOCKER_DISPOSITION",
    historical_aliases: ["G6"]
  },
  g7_session_file_union_attack: {
    gate_id: "g7_SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK",
    source: "inspectClaudeSessionUnion",
    semantic_question: "Does session-file/context possession remain blocked from observation or authority standing?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_CONTEXT_LAUNDERING_ATTACK",
    homonyms: ["G7_CONTEXT_PROVENANCE_CLOSURE"],
    collisions: ["G7 label also names a future closure/adjudication gate outside this implementation g7"],
    historical_aliases: ["g7_", "SESSION_FILE_UNION", "CONTEXT_INHERITANCE"]
  },
  t1_patient_zero_false: {
    gate_id: "T1_PATIENT_ZERO_FALSE",
    source: "buildT1BoundaryResult",
    semantic_question: "Does Patient Zero remain false for current Claude participation without waking Claude?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PATIENT_ZERO_BOUNDARY",
    historical_aliases: ["T1"]
  },
  t1_5_activation_denied: {
    gate_id: "T1_5_ACTIVATION_DENIED",
    source: "buildT15ActivationDeniedResult",
    semantic_question: "Is activation denied without GOCheckIt, ACK laundering, or HOLLABACK fabrication?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_PATIENT_ZERO_BOUNDARY",
    historical_aliases: ["T1.5"]
  },
  t2_causal_matter_predecessor: {
    gate_id: "T2_CAUSAL_MATTER_PREDECESSOR",
    source: "adjudicateT2Predecessor",
    semantic_question: "Does T2 provide a load-bearing causal Matter predecessor without widening into truth, authority, effect, or launch readiness?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_TYPED_PREDECESSOR",
    historical_aliases: ["T2"]
  },
  g8_authorship_dominance: {
    gate_id: "G8_AUTHORSHIP_DOMINANCE",
    source: "buildAuthorshipDominanceResult",
    semantic_question: "Do all launch-observed paths transit the authorship gate or a lawful gated preimage?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_AUTHORSHIP_GATE",
    historical_aliases: ["G8"]
  },
  g9_ack_composition: {
    gate_id: "G9_ACK_COMPOSITION",
    source: "buildAckCompositionResult",
    semantic_question: "Is ACK_EXACT composed only from valid observation preimage and deterministic equivalence?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_ACK_GATE",
    historical_aliases: ["G9"]
  },
  g10_bind_repair: {
    gate_id: "G10_BIND_REPAIR",
    source: "buildBindRepairResult",
    semantic_question: "Are BIND questions repaired without collapsing binding into attribution or authority?",
    consumed_by: ["adjudicateLaunchDecision"],
    launch_relevance: "REQUIRED_BIND_GATE",
    historical_aliases: ["G10"]
  },
  G7_CONTEXT_PROVENANCE_CLOSURE: {
    gate_id: "G7_CONTEXT_PROVENANCE_CLOSURE",
    source: "Founder signal: DO NOT RESUME G7",
    semantic_question: "Has the newly frozen subject survived the actual G7 closure pass?",
    consumed_by: ["post-freeze frontier only"],
    launch_relevance: "NEXT_FRONTIER_NOT_CURRENT_LAUNCH_GATE",
    homonyms: ["g7_session_file_union_attack"],
    collisions: ["Same label G7 is used for distinct closure and session-union questions"],
    historical_aliases: ["G7"]
  }
};

const STANDING_PATH_CENSUS = [
  {
    path_ref: "PATH_RAW_GOCHECKIT_OBSERVE",
    source_surface: "tools/ourself-commline-observation-gap.mjs:gocheckitObserve",
    capable_standing: ["OBSERVED", "OBSERVED_EXACT", "Observed(P,M)=TRUE"],
    classification: "RAW_BYPASS",
    launch_path_status: "FENCED_BY_LAUNCH_OBSERVATION_STANDING_GATE",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_LEGACY_COMPUTE_OBSERVATION_GAP",
    source_surface: "tools/ourself-commline-observation-gap.mjs:computeObservationGap",
    capable_standing: ["Observed(P,M)=TRUE", "observation-duty satisfaction"],
    classification: "LEGACY_BYPASS",
    launch_path_status: "ACCEPTS_ONLY_EVENTS_ADMITTED_BY_LAUNCH_OBSERVATION_STANDING_GATE",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_LEGACY_COMPUTE_OCCURRENCE_GAP",
    source_surface: "tools/ourself-commline-observation-gap.mjs:computeParticipationOccurrenceObservationGap",
    capable_standing: ["Observed(P,M)=TRUE", "observation-duty satisfaction"],
    classification: "LEGACY_BYPASS",
    launch_path_status: "ACCEPTS_ONLY_EVENTS_ADMITTED_BY_LAUNCH_OBSERVATION_STANDING_GATE",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_AUTHORSHIP_ADJUDICATION",
    source_surface: "tools/ourself-observation-authorship.mjs:adjudicateObservationAuthorship",
    capable_standing: ["valid attribution preimage", "observer-origin evidence"],
    classification: "GATED",
    launch_path_status: "PRIMARY_ATTRIBUTION_PREIMAGE_GATE",
    launch_standing_capable_after_repair: true
  },
  {
    path_ref: "PATH_CLAIMED_OBSERVATION_KEY",
    source_surface: "observation/capability artifact supplied with observation claim",
    capable_standing: ["claimed key possession"],
    classification: "RAW_BYPASS",
    launch_path_status: "FENCED_BY_OCCURRENCE_KEY_REGISTRY",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_OCCURRENCE_KEY_REGISTRY",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:buildOccurrenceKeyRegistry",
    capable_standing: ["KeyKBelongsToOccurrenceO", "birth-derived signing capability binding"],
    classification: "GATED",
    launch_path_status: "PRIMARY_KEY_OCCURRENCE_BINDING_GATE",
    launch_standing_capable_after_repair: true
  },
  {
    path_ref: "PATH_LAUNCH_OBSERVATION_STANDING_GATE",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:adjudicateLaunchObservedStanding",
    capable_standing: ["OBSERVED", "OBSERVED_EXACT", "Observed(P,M)=TRUE"],
    classification: "GATED",
    launch_path_status: "PRIMARY_LAUNCH_GATE",
    launch_standing_capable_after_repair: true
  },
  {
    path_ref: "PATH_LAUNCH_GATED_GAP_DERIVATION",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:acceptedLaunchObservations",
    capable_standing: ["Observed(P,M)=TRUE", "observation-duty satisfaction"],
    classification: "DERIVED_FROM_GATED_PREIMAGE",
    launch_path_status: "DERIVES_ONLY_FROM_LAUNCH_OBSERVATION_STANDING_GATE",
    launch_standing_capable_after_repair: true
  },
  {
    path_ref: "PATH_DIRECT_ACK_DISPOSITION",
    source_surface: "tools/ourself-commline-observation-gap.mjs:deriveAckDisposition",
    capable_standing: ["ACK_EXACT"],
    classification: "RAW_BYPASS",
    launch_path_status: "FENCED_BY_ACK_EXACT_COMPOSITION_GATE",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_ACK_EXACT_COMPOSITION_GATE",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:adjudicateAckExactComposition",
    capable_standing: ["ACK_EXACT"],
    classification: "DERIVED_FROM_GATED_PREIMAGE",
    launch_path_status: "PRIMARY_ACK_GATE",
    launch_standing_capable_after_repair: true
  },
  {
    path_ref: "PATH_CONTEXT_INHERITANCE_INSPECTION",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:inspectContextInheritance",
    capable_standing: ["context possession only"],
    classification: "LEGACY_BYPASS",
    launch_path_status: "BLOCKED_FROM_OBSERVED_STANDING",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_SESSION_FILE_UNION_INSPECTION",
    source_surface: "tools/ourself-selfcommunication-launch-readiness.mjs:inspectClaudeSessionUnion",
    capable_standing: ["context/session-file risk only"],
    classification: "AGGREGATION_BYPASS",
    launch_path_status: "BLOCKED_FROM_OBSERVED_STANDING",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_TRANSPORT_ROUNDTRIP_PREDECESSOR",
    source_surface: "tools/ourself-transport-independent-roundtrip.mjs:runTransportIndependentRoundtrip",
    capable_standing: ["OBSERVED_EXACT", "ACK_EXACT"],
    classification: "AGGREGATION_BYPASS",
    launch_path_status: "PREDECESSOR_STANDING_ONLY_NOT_LAUNCH_OBSERVED_STANDING",
    launch_standing_capable_after_repair: false
  },
  {
    path_ref: "PATH_TEST_ASSERTED_EXPECTED_REJECTION",
    source_surface: "test/ourself-selfcommunication-launch-readiness.test.mjs",
    capable_standing: ["claimed T0 exclusion"],
    classification: "TEST_ONLY",
    launch_path_status: "REPLACED_BY_EXECUTED_COUNTERFEIT_DISPOSITION",
    launch_standing_capable_after_repair: false
  }
];

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(sortDeep(value), null, 2)}\n`);
}

function first(values) {
  return values[0] ?? null;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map((entry) => sortDeep(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  }
  return value;
}

function normalizeLaunchControlDisposition(disposition) {
  return CLOSED_LAUNCH_CONTROL_DISPOSITIONS.has(disposition)
    ? disposition
    : LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN;
}

function controlDispositionFromBoolean(value) {
  return value === true ? LAUNCH_CONTROL_DISPOSITIONS.SATISFIED : LAUNCH_CONTROL_DISPOSITIONS.FAILED;
}

export function createLaunchGate({
  currentSymbol,
  standing,
  controlDisposition,
  evidenceRef = null,
  rawStanding = null,
  inputPreimage = [],
  outputStanding = null,
  source = null,
  semanticQuestion = null,
  consumedBy = null,
  launchRelevance = null,
  homonyms = null,
  collisions = null,
  historicalAliases = null,
  ...extra
} = {}) {
  const metadata = LAUNCH_GATE_METADATA[currentSymbol] ?? {};
  const normalizedControl = normalizeLaunchControlDisposition(controlDisposition);
  const gate = {
    gate_id: metadata.gate_id ?? currentSymbol ?? "UNKNOWN_GATE",
    current_symbol: currentSymbol ?? metadata.gate_id ?? "UNKNOWN_GATE",
    source: source ?? metadata.source ?? "UNKNOWN_SOURCE",
    semantic_question: semanticQuestion ?? metadata.semantic_question ?? "UNKNOWN_SEMANTIC_QUESTION",
    input_preimage: inputPreimage,
    output_standing: outputStanding ?? normalizedControl,
    consumed_by: consumedBy ?? metadata.consumed_by ?? ["adjudicateLaunchDecision"],
    launch_relevance: launchRelevance ?? metadata.launch_relevance ?? "REQUIRED",
    homonyms: homonyms ?? metadata.homonyms ?? [],
    collisions: collisions ?? metadata.collisions ?? [],
    historical_aliases: historicalAliases ?? metadata.historical_aliases ?? [],
    standing,
    control_disposition: normalizedControl,
    display_projection: standing,
    display_projection_not_control_input: true,
    evidence_ref: evidenceRef,
    raw_standing: rawStanding,
    ...extra
  };
  gate.gate_identity = digestObject(gate);
  return gate;
}

function projectSessionUnionGateControlDisposition(sessionUnionStanding) {
  if (sessionUnionStanding === "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK") {
    return LAUNCH_CONTROL_DISPOSITIONS.SATISFIED;
  }
  if (sessionUnionStanding === "SESSION_FILE_UNION_RISK_NOT_OBSERVED") {
    return LAUNCH_CONTROL_DISPOSITIONS.SATISFIED;
  }
  if (sessionUnionStanding === "SESSION_FILE_UNION_NOT_INSPECTED") {
    return LAUNCH_CONTROL_DISPOSITIONS.BLOCKED;
  }
  if (sessionUnionStanding === "SESSION_FILE_NOT_FOUND") {
    return LAUNCH_CONTROL_DISPOSITIONS.BLOCKED;
  }
  return LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN;
}

function projectSessionUnionGateStanding(sessionUnionStanding) {
  if (sessionUnionStanding === "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK") {
    return "PASS_WITH_CONTEXT_LAW_BLOCK";
  }
  if (sessionUnionStanding === "SESSION_FILE_UNION_RISK_NOT_OBSERVED") {
    return "PASS_SESSION_UNION_RISK_NOT_OBSERVED";
  }
  if (sessionUnionStanding === "SESSION_FILE_UNION_NOT_INSPECTED") {
    return "BLOCKED_NOT_INSPECTED";
  }
  if (sessionUnionStanding === "SESSION_FILE_NOT_FOUND") {
    return "BLOCKED_SESSION_FILE_NOT_FOUND";
  }
  return "BLOCKED_UNRESOLVED_SESSION_FILE_UNION_STANDING";
}

export function createOccurrenceBirthRecord({
  occurrence,
  invokerRef,
  invocationRef,
  ancestryRefs = [],
  birthRelation = "FORK",
  registered = true
} = {}) {
  const errors = [];
  if (!occurrence) errors.push("participation occurrence missing");
  if (!occurrence?.participation_occurrence_ref) errors.push("participation occurrence ref missing");
  if (!invokerRef) errors.push("invoker ref missing");
  if (!invocationRef) errors.push("invocation ref missing");
  if (!["CONTINUATION", "FORK"].includes(birthRelation)) errors.push("unsupported birth relation");
  if (birthRelation === "FORK" && ancestryRefs.length === 0) errors.push("fork requires context ancestry");

  const birth = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_BIRTH_RECORD",
    participation_occurrence_ref: occurrence?.participation_occurrence_ref ?? null,
    participation_ref: occurrence?.participation_ref ?? null,
    self_ref: occurrence?.self_ref ?? null,
    endpoint_occurrence_ref: occurrence?.endpoint_occurrence_ref ?? null,
    session_ref: occurrence?.session_ref ?? null,
    invoker_ref: invokerRef,
    invocation_ref: invocationRef,
    ancestry_refs: [...ancestryRefs],
    birth_relation: birthRelation,
    registered,
    context_ancestry_not_observation: true,
    context_ancestry_not_authority: true,
    provider_resume_semantics_not_ourself_occurrence_semantics: true,
    errors,
    final_standing: errors.length === 0 && registered
      ? "OCCURRENCE_BIRTH_REGISTERED"
      : "OCCURRENCE_BIRTH_NOT_ADMITTED"
  };
  birth.birth_record_identity = digestObject(birth);
  return birth;
}

export function adjudicateOccurrenceBirthRecords({ birthRecords = [] } = {}) {
  const byOccurrence = new Map();
  for (const birth of birthRecords) {
    const ref = birth.participation_occurrence_ref;
    byOccurrence.set(ref, [...(byOccurrence.get(ref) ?? []), birth]);
  }
  const collisions = [...byOccurrence.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([participationOccurrenceRef, entries]) => ({
      participation_occurrence_ref: participationOccurrenceRef,
      birth_record_identities: entries.map((entry) => entry.birth_record_identity),
      dispositions: entries.map((entry) => entry.final_standing)
    }));
  const continuationByAncestor = new Map();
  for (const birth of birthRecords.filter((entry) => entry.birth_relation === "CONTINUATION")) {
    const key = `${first(birth.ancestry_refs) ?? "NO_ANCESTRY"}:${birth.participation_ref}`;
    continuationByAncestor.set(key, [...(continuationByAncestor.get(key) ?? []), birth]);
  }
  const continuationCollisions = [...continuationByAncestor.values()]
    .filter((entries) => entries.length > 1)
    .flatMap((entries) => entries.map((entry) => entry.participation_occurrence_ref));

  const ok = collisions.length === 0 &&
    continuationCollisions.length === 0 &&
    birthRecords.every((entry) => entry.final_standing === "OCCURRENCE_BIRTH_REGISTERED");
  const adjudication = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_BIRTH_ADJUDICATION",
    ok,
    collisions,
    continuation_collisions: continuationCollisions,
    registered_occurrence_refs: birthRecords
      .filter((entry) => entry.final_standing === "OCCURRENCE_BIRTH_REGISTERED")
      .map((entry) => entry.participation_occurrence_ref),
    occurrence_birth_required_for_launch: true,
    resume_defaults_to_fork_unless_continuity_proven: true,
    final_standing: ok ? "OCCURRENCE_BIRTH_LAW_ESTABLISHED" : "OCCURRENCE_BIRTH_COLLISION_DETECTED"
  };
  adjudication.adjudication_identity = digestObject(adjudication);
  return adjudication;
}

export function deriveObservationDuty({
  dutyRef,
  sourceChain,
  participationOccurrence,
  matterRef,
  commlineRef,
  satisfactionScope = "OCCURRENCE_SCOPED"
} = {}) {
  const errors = [];
  if (!sourceChain) errors.push("source chain missing");
  if (!VALID_OBLIGATION_SOURCE_SPECIES.has(sourceChain?.source_species)) {
    errors.push("source species cannot create observation duty");
  }
  if (sourceChain?.authority_standing !== "AUTHORIZED") errors.push("source chain is not authorized");
  if (sourceChain?.source_species === "AUTHORIZED_ACT_READSET" && sourceChain?.readset_authority !== "EXPLICIT") {
    errors.push("authorized act read-set is not explicit");
  }
  if (!participationOccurrence) errors.push("participation occurrence missing");
  if (participationOccurrence?.occurrence_status !== "ACTIVE") errors.push("participation occurrence is not live");
  if (!matterRef) errors.push("matter ref missing");
  if (!["PARTICIPATION_SCOPED", "OCCURRENCE_SCOPED"].includes(satisfactionScope)) {
    errors.push("unsupported satisfaction scope");
  }

  const duty = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "DERIVED_OBSERVATION_DUTY",
    duty_ref: dutyRef ?? `DUTY_${digestObject({
      sourceChain,
      po: participationOccurrence?.participation_occurrence_ref,
      matterRef,
      satisfactionScope
    }).slice("sha256:".length, "sha256:".length + 16)}`,
    source_chain_ref: sourceChain?.source_chain_ref ?? null,
    source_species: sourceChain?.source_species ?? null,
    matter_source_ref: sourceChain?.matter_source_ref ?? null,
    obligation_source_ref: sourceChain?.obligation_source_ref ?? null,
    participation_ref: participationOccurrence?.participation_ref ?? null,
    participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
    self_ref: participationOccurrence?.self_ref ?? null,
    commline_ref: commlineRef ?? participationOccurrence?.commline_ref ?? null,
    matter_ref: matterRef,
    satisfaction_scope: satisfactionScope,
    duty_is_derivation_not_writable_object: true,
    obligation_source_not_matter_source: sourceChain?.obligation_source_ref !== sourceChain?.matter_source_ref,
    addressable_not_obligated: true,
    errors,
    final_standing: errors.length === 0
      ? "OBSERVATION_DUTY_DERIVED"
      : "OBSERVATION_DUTY_NOT_DERIVED"
  };
  duty.duty_identity = digestObject(duty);
  return duty;
}

export function createActivationAdmission({
  eligibility,
  duty,
  birthRecord,
  activationBudget = 1,
  alreadyAdmittedMatterRefs = []
} = {}) {
  const errors = [];
  if (!eligibility?.eligible) errors.push("notifaself eligibility is absent");
  if (duty?.final_standing !== "OBSERVATION_DUTY_DERIVED") errors.push("derived duty is absent");
  if (birthRecord?.final_standing !== "OCCURRENCE_BIRTH_REGISTERED") errors.push("live registered occurrence birth is absent");
  if (birthRecord?.participation_occurrence_ref !== eligibility?.participation_occurrence_ref) {
    errors.push("eligibility occurrence is not the registered birth occurrence");
  }
  if (duty?.participation_occurrence_ref !== eligibility?.participation_occurrence_ref) {
    errors.push("duty occurrence does not match eligibility occurrence");
  }
  if (activationBudget <= 0) errors.push("activation budget exhausted");
  const duplicateRefs = eligibility?.matter_refs?.filter((matterRef) => alreadyAdmittedMatterRefs.includes(matterRef)) ?? [];
  if (duplicateRefs.length > 0) errors.push("activation duplicate suppressed");

  const admission = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "ACTIVATION_ADMISSION",
    participation_ref: eligibility?.participation_ref ?? null,
    participation_occurrence_ref: eligibility?.participation_occurrence_ref ?? null,
    eligibility_ref: eligibility?.eligibility_ref ?? null,
    duty_ref: duty?.duty_ref ?? null,
    birth_record_identity: birthRecord?.birth_record_identity ?? null,
    matter_refs: eligibility?.matter_refs ?? [],
    activation_budget: activationBudget,
    already_admitted_matter_refs: [...alreadyAdmittedMatterRefs],
    duplicate_refs: duplicateRefs,
    may_address_me_not_may_interrupt_me: true,
    activation_admission_not_observation: true,
    notified_not_activated: true,
    errors,
    final_standing: errors.length === 0 ? "ACTIVATION_ADMITTED" : "ACTIVATION_NOT_ADMITTED"
  };
  admission.activation_admission_identity = digestObject(admission);
  return admission;
}

export function inspectContextInheritance({
  receivingOccurrence,
  sourceMatter,
  contextText = ""
} = {}) {
  const containsBytes = contextText.includes(sourceMatter.content);
  const containsIdentity = contextText.includes(sourceMatter.content_identity);
  const grade = containsBytes && containsIdentity
    ? "CONTENT_POSSESSED"
    : containsBytes || containsIdentity
      ? "DESCRIBED"
      : "NOT_PRESENT";
  const inspection = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "CONTEXT_INHERITANCE_INSPECTION",
    participation_occurrence_ref: receivingOccurrence?.participation_occurrence_ref ?? null,
    source_matter_ref: sourceMatter?.matter_ref ?? null,
    context_contains_exact_bytes: containsBytes,
    context_contains_identity: containsIdentity,
    context_grade: grade,
    context_present_not_current_occurrence_observed: true,
    context_present_not_authority: true,
    may_establish_observed_relation: false
  };
  inspection.inspection_identity = digestObject(inspection);
  return inspection;
}

export function inspectClaudeSessionUnion({
  sessionFilePath = null,
  sessionEvidence = null,
  markers = ["5464975482", "ROUTE_ADJUDICATION_PROBE"]
} = {}) {
  if (sessionEvidence) {
    const markerFindings = Array.isArray(sessionEvidence.marker_findings)
      ? sessionEvidence.marker_findings
      : [];
    const requiredMarkersPresent = markers.every((marker) =>
      markerFindings.some((entry) => entry.marker === marker && entry.present === true)
    );
    const riskEstablished = markerFindings.some((entry) => entry.present === true);
    const evidenceComplete = markers.every((marker) =>
      markerFindings.some((entry) => entry.marker === marker && typeof entry.present === "boolean")
    );
    const inspection = {
      schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
      object_type: "SESSION_FILE_UNION_INSPECTION",
      evidence_source: "CONTENT_ADDRESSED_EXTERNAL_SESSION_CONTEXT_EVIDENCE",
      evidence_identity: sessionEvidence.evidence_identity ?? null,
      source_locator: sessionEvidence.source_locator ?? null,
      source_identity: sessionEvidence.source_identity ?? null,
      source_byte_count: sessionEvidence.source_byte_count ?? null,
      extraction_rule: sessionEvidence.source_range_or_exact_extraction_rule ?? null,
      marker_findings: markerFindings,
      required_markers: [...markers],
      required_markers_present: requiredMarkersPresent,
      bounded_external_evidence_sufficient_for_session_union_claim: evidenceComplete,
      external_session_context_not_ourself_observation: true,
      extraction_not_promotion: true,
      summary_not_source_preimage: true,
      raw_provider_session_file_required_for_this_claim: false,
      context_presence_not_observation_standing: true,
      context_presence_not_authority_standing: true,
      final_standing: evidenceComplete
        ? riskEstablished
          ? "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK"
          : "SESSION_FILE_UNION_RISK_NOT_OBSERVED"
        : "SESSION_FILE_UNION_EVIDENCE_INCOMPLETE"
    };
    inspection.inspection_identity = digestObject(inspection);
    return inspection;
  }

  if (!sessionFilePath) {
    return {
      schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
      object_type: "SESSION_FILE_UNION_INSPECTION",
      final_standing: "SESSION_FILE_UNION_NOT_INSPECTED",
      reason: "session file path not supplied",
      context_presence_not_observation_standing: true
    };
  }
  const resolved = path.resolve(sessionFilePath);
  if (!fs.existsSync(resolved)) {
    return {
      schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
      object_type: "SESSION_FILE_UNION_INSPECTION",
      session_file_path: resolved,
      final_standing: "SESSION_FILE_NOT_FOUND",
      context_presence_not_observation_standing: true
    };
  }
  const content = fs.readFileSync(resolved, "utf8");
  const marker_findings = markers.map((marker) => ({
    marker,
    present: content.includes(marker)
  }));
  const riskEstablished = marker_findings.some((entry) => entry.present);
  const inspection = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "SESSION_FILE_UNION_INSPECTION",
    session_file_path: resolved,
    marker_findings,
    byte_count: Buffer.byteLength(content, "utf8"),
    context_presence_not_observation_standing: true,
    context_presence_not_authority_standing: true,
    final_standing: riskEstablished
      ? "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK"
      : "SESSION_FILE_UNION_RISK_NOT_OBSERVED"
  };
  inspection.inspection_identity = digestObject(inspection);
  return inspection;
}

function objectContainsString(value, needle) {
  if (typeof value === "string") return value.includes(needle);
  if (Array.isArray(value)) return value.some((entry) => objectContainsString(entry, needle));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => objectContainsString(entry, needle));
  }
  return false;
}

function collectObservationEvents(value, events = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectObservationEvents(entry, events);
    return events;
  }
  if (!value || typeof value !== "object") return events;
  if (value.event_type === "OBSERVATION") events.push(value);
  for (const entry of Object.values(value)) collectObservationEvents(entry, events);
  return events;
}

function participationForOccurrence({ participation, participationOccurrence } = {}) {
  const occurrenceParticipation = {
    ...participation,
    endpoint_occurrence_ref: participationOccurrence.endpoint_occurrence_ref,
    session_ref: participationOccurrence.session_ref,
    addressable_matter_refs: [...participationOccurrence.addressable_matter_refs]
  };
  occurrenceParticipation.participation_identity = digestObject({
    ...occurrenceParticipation,
    participation_identity: null
  });
  return occurrenceParticipation;
}

function findMatterEntry(commline, matterRef) {
  return commline?.matter_entries?.find((entry) => entry.matter_ref === matterRef) ?? null;
}

function publicCapabilityRecord(capability) {
  if (!capability) return null;
  return {
    schema: capability.schema,
    object_type: capability.object_type,
    capability_ref: capability.capability_ref,
    participation_ref: capability.participation_ref,
    self_ref: capability.self_ref,
    endpoint_occurrence_ref: capability.endpoint_occurrence_ref,
    session_ref: capability.session_ref,
    controlled_by_ref: capability.controlled_by_ref,
    evidence_species: capability.evidence_species,
    observable_matter_refs: [...(capability.observable_matter_refs ?? [])],
    public_key_identity: capability.public_key_identity,
    public_key_pem: capability.public_key_pem,
    capability_not_grant: capability.capability_not_grant,
    capability_not_observation: capability.capability_not_observation,
    capability_identity: capability.capability_identity
  };
}

export function createOccurrenceKeyRegistration({
  registrationRef,
  occurrence,
  birthRecord,
  capability,
  registeredByRef = "OURSELF_RUNTIME",
  registrationSource = "OCCURRENCE_BIRTH",
  current = true
} = {}) {
  const errors = [];
  if (!occurrence) errors.push("occurrence missing");
  if (!birthRecord) errors.push("birth record missing");
  if (birthRecord?.final_standing !== "OCCURRENCE_BIRTH_REGISTERED") {
    errors.push("birth record is not registered");
  }
  if (birthRecord?.participation_occurrence_ref !== occurrence?.participation_occurrence_ref) {
    errors.push("birth record does not bind to occurrence");
  }
  if (!capability) errors.push("capability missing");
  if (capability?.participation_ref !== occurrence?.participation_ref) {
    errors.push("capability participation does not bind to occurrence");
  }
  if (capability?.endpoint_occurrence_ref !== occurrence?.endpoint_occurrence_ref) {
    errors.push("capability endpoint does not bind to occurrence");
  }
  if (capability?.session_ref !== occurrence?.session_ref) {
    errors.push("capability session does not bind to occurrence");
  }
  if (!capability?.public_key_identity || !capability?.public_key_pem) {
    errors.push("capability public key binding missing");
  }
  if (registrationSource !== "OCCURRENCE_BIRTH") {
    errors.push("initial occurrence key registration must derive from occurrence birth");
  }
  if (!current) errors.push("occurrence key registration is not current");

  const registration = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_KEY_REGISTRATION",
    registration_ref: registrationRef ?? `OKR_${digestObject({
      occurrence_ref: occurrence?.participation_occurrence_ref,
      birth_record_identity: birthRecord?.birth_record_identity,
      capability_identity: capability?.capability_identity,
      public_key_identity: capability?.public_key_identity
    }).slice("sha256:".length, "sha256:".length + 16)}`,
    participation_ref: occurrence?.participation_ref ?? null,
    participation_occurrence_ref: occurrence?.participation_occurrence_ref ?? null,
    endpoint_occurrence_ref: occurrence?.endpoint_occurrence_ref ?? null,
    session_ref: occurrence?.session_ref ?? null,
    self_ref: occurrence?.self_ref ?? null,
    birth_record_identity: birthRecord?.birth_record_identity ?? null,
    capability: publicCapabilityRecord(capability),
    capability_ref: capability?.capability_ref ?? null,
    capability_identity: capability?.capability_identity ?? null,
    public_key_identity: capability?.public_key_identity ?? null,
    observable_matter_refs: [...(capability?.observable_matter_refs ?? [])],
    registered_by_ref: registeredByRef,
    registration_source: registrationSource,
    register_once: true,
    claimed_key_not_registered_key: true,
    registration_not_observation_claim: true,
    private_key_material_exported: false,
    current,
    errors,
    final_standing: errors.length === 0
      ? "OCCURRENCE_KEY_REGISTERED"
      : "OCCURRENCE_KEY_NOT_REGISTERED"
  };
  registration.registration_identity = digestObject({
    ...registration,
    capability: registration.capability
      ? {
        ...registration.capability,
        public_key_pem: registration.capability.public_key_identity
      }
      : null
  });
  return registration;
}

export function createOccurrenceSigningRegistrationFixture({
  participation,
  participationOccurrence,
  birthRecord,
  matterRefs = []
} = {}) {
  const occurrenceParticipation = participationForOccurrence({ participation, participationOccurrence });
  const signing = createEndpointSigningFixture({
    participation: occurrenceParticipation,
    matterRefs
  });
  const registration = createOccurrenceKeyRegistration({
    occurrence: participationOccurrence,
    birthRecord,
    capability: signing.capability
  });
  return {
    occurrence_participation: occurrenceParticipation,
    capability: signing.capability,
    registration,
    privateKeyPem: signing.privateKeyPem
  };
}

export function buildOccurrenceKeyRegistry({ registrations = [] } = {}) {
  const acceptedRegistrations = registrations.filter((entry) => entry.final_standing === "OCCURRENCE_KEY_REGISTERED");
  const byOccurrence = new Map();
  for (const registration of acceptedRegistrations) {
    const ref = registration.participation_occurrence_ref;
    byOccurrence.set(ref, [...(byOccurrence.get(ref) ?? []), registration]);
  }
  const duplicate_occurrence_key_claims = [...byOccurrence.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([participationOccurrenceRef, entries]) => ({
      participation_occurrence_ref: participationOccurrenceRef,
      registration_identities: entries.map((entry) => entry.registration_identity),
      public_key_identities: entries.map((entry) => entry.public_key_identity)
    }));
  const registry = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_KEY_REGISTRY",
    registrations: registrations.map((registration) => ({
      registration_ref: registration.registration_ref,
      participation_occurrence_ref: registration.participation_occurrence_ref,
      endpoint_occurrence_ref: registration.endpoint_occurrence_ref,
      session_ref: registration.session_ref,
      birth_record_identity: registration.birth_record_identity,
      capability_ref: registration.capability_ref,
      capability_identity: registration.capability_identity,
      public_key_identity: registration.public_key_identity,
      observable_matter_refs: [...(registration.observable_matter_refs ?? [])],
      current: registration.current,
      final_standing: registration.final_standing,
      registration_identity: registration.registration_identity
    })),
    registration_records: registrations,
    duplicate_occurrence_key_claims,
    immutable_initial_binding: true,
    register_once: true,
    resume_mints_distinct_occurrence_key_binding: true,
    private_key_material_exported: false,
    final_standing: duplicate_occurrence_key_claims.length === 0 &&
      registrations.length > 0 &&
      registrations.every((entry) => entry.final_standing === "OCCURRENCE_KEY_REGISTERED")
      ? "OCCURRENCE_KEY_REGISTRY_ESTABLISHED"
      : "OCCURRENCE_KEY_REGISTRY_BLOCKED"
  };
  registry.registry_identity = digestObject({
    ...registry,
    registration_records: registry.registration_records.map((registration) => ({
      ...registration,
      capability: registration.capability
        ? {
          ...registration.capability,
          public_key_pem: registration.capability.public_key_identity
        }
        : null
    }))
  });
  return registry;
}

export function resolveOccurrenceKeyBinding({ keyRegistry, participationOccurrence, matterRef = null } = {}) {
  const registration = keyRegistry?.registration_records?.find((entry) => (
    entry.final_standing === "OCCURRENCE_KEY_REGISTERED" &&
    entry.participation_occurrence_ref === participationOccurrence?.participation_occurrence_ref
  )) ?? null;
  const errors = [];
  if (keyRegistry?.final_standing !== "OCCURRENCE_KEY_REGISTRY_ESTABLISHED") {
    errors.push("occurrence key registry is not established");
  }
  if (!registration) errors.push("registered occurrence key not found");
  if (registration && registration.endpoint_occurrence_ref !== participationOccurrence?.endpoint_occurrence_ref) {
    errors.push("registered key endpoint does not bind to occurrence");
  }
  if (registration && registration.session_ref !== participationOccurrence?.session_ref) {
    errors.push("registered key session does not bind to occurrence");
  }
  if (matterRef && registration && !registration.observable_matter_refs.includes(matterRef)) {
    errors.push("registered capability does not cover source Matter");
  }
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_KEY_BINDING_RESOLUTION",
    participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
    endpoint_occurrence_ref: participationOccurrence?.endpoint_occurrence_ref ?? null,
    matter_ref: matterRef,
    registry_identity: keyRegistry?.registry_identity ?? null,
    registration_ref: registration?.registration_ref ?? null,
    registration_identity: registration?.registration_identity ?? null,
    public_key_identity: registration?.public_key_identity ?? null,
    capability_ref: registration?.capability_ref ?? null,
    capability_identity: registration?.capability_identity ?? null,
    errors,
    final_standing: errors.length === 0
      ? "OCCURRENCE_KEY_BINDING_RESOLVED"
      : "OCCURRENCE_KEY_BINDING_NOT_RESOLVED"
  };
  result.resolution_identity = digestObject(result);
  return result;
}

export function attemptOccurrenceKeyRegistration({ keyRegistry, attemptedRegistration } = {}) {
  const existing = keyRegistry?.registration_records?.find((entry) => (
    entry.participation_occurrence_ref === attemptedRegistration?.participation_occurrence_ref &&
    entry.final_standing === "OCCURRENCE_KEY_REGISTERED"
  ));
  const errors = [];
  if (keyRegistry?.final_standing !== "OCCURRENCE_KEY_REGISTRY_ESTABLISHED") {
    errors.push("occurrence key registry is not established");
  }
  if (existing) errors.push("register-once violation: occurrence already has a registered key");
  if (attemptedRegistration?.registration_source !== "OCCURRENCE_BIRTH") {
    errors.push("registration source is not occurrence birth");
  }
  if (attemptedRegistration?.birth_record_identity !== existing?.birth_record_identity) {
    errors.push("attempted registration birth does not match established occurrence birth");
  }
  const attempt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "OCCURRENCE_KEY_REGISTRATION_ATTEMPT",
    target_occurrence_ref: attemptedRegistration?.participation_occurrence_ref ?? null,
    attempted_public_key_identity: attemptedRegistration?.public_key_identity ?? null,
    existing_public_key_identity: existing?.public_key_identity ?? null,
    register_once: true,
    replacement_attempt: Boolean(existing),
    errors,
    final_standing: errors.length === 0
      ? "OCCURRENCE_KEY_REGISTRATION_ACCEPTED"
      : "OCCURRENCE_KEY_REGISTRATION_REJECTED"
  };
  attempt.attempt_identity = digestObject(attempt);
  return attempt;
}

export function buildStandingPathCensus() {
  return STANDING_PATH_CENSUS.map((entry) => {
    const row = {
      ...entry,
      secure_primitive_exists_not_secure_primitive_dominates: true,
      observed_standing_requires_valid_attribution_preimage: entry.launch_standing_capable_after_repair === true
    };
    row.path_identity = digestObject(row);
    return row;
  });
}

export function adjudicateLaunchObservationBindingPreimage({
  observation,
  sourceMatter,
  participation,
  participationOccurrence,
  birthRecord,
  commline,
  keyRegistry,
  capability,
  grant,
  evidence
} = {}) {
  const errors = [];
  const matterEntry = findMatterEntry(commline, sourceMatter?.matter_ref);
  const keyResolution = resolveOccurrenceKeyBinding({
    keyRegistry,
    participationOccurrence,
    matterRef: sourceMatter?.matter_ref
  });
  const continuityEvidence = birthRecord?.final_standing === "OCCURRENCE_BIRTH_REGISTERED" &&
    birthRecord?.participation_occurrence_ref === participationOccurrence?.participation_occurrence_ref &&
    Array.isArray(birthRecord?.ancestry_refs) &&
    birthRecord?.birth_record_identity === keyRegistry?.registration_records?.find((entry) => (
      entry.participation_occurrence_ref === participationOccurrence?.participation_occurrence_ref
    ))?.birth_record_identity;
  const sourceObjectBinding = Boolean(matterEntry) &&
    matterEntry.matter_identity === sourceMatter?.content_identity &&
    participationOccurrence?.addressable_matter_refs?.includes(sourceMatter?.matter_ref);
  const currentLiveness = participationOccurrence?.occurrence_status === "ACTIVE";
  const registeredCapability = keyRegistry?.registration_records?.find((entry) => (
    entry.participation_occurrence_ref === participationOccurrence?.participation_occurrence_ref
  ))?.capability ?? null;
  const claimedKeyEqualsRegisteredKey = Boolean(registeredCapability) &&
    capability?.capability_ref === registeredCapability.capability_ref &&
    capability?.capability_identity === registeredCapability.capability_identity &&
    capability?.public_key_identity === registeredCapability.public_key_identity;
  const grantBindsRegisteredKey = Boolean(registeredCapability) &&
    grant?.capability_ref === registeredCapability.capability_ref &&
    grant?.capability_ref === capability?.capability_ref &&
    grant?.grant_disposition === "OBSERVATION_GRANT_ADMITTED";
  const evidenceCarriesKeyClaim = Boolean(evidence?.public_key_identity);
  const evidenceBindsRegisteredKey = Boolean(registeredCapability) &&
    (!evidenceCarriesKeyClaim || evidence.public_key_identity === registeredCapability.public_key_identity);

  if (!observation) errors.push("observation event missing");
  if (observation?.event_type !== "OBSERVATION") errors.push("event is not OBSERVATION");
  if (!participation) errors.push("participation missing");
  if (!participationOccurrence) errors.push("participation occurrence missing");
  if (participation?.participation_ref !== participationOccurrence?.participation_ref) {
    errors.push("participation does not bind to occurrence");
  }
  if (observation?.payload?.participation_ref !== participationOccurrence?.participation_ref) {
    errors.push("observation participation_ref does not bind to occurrence");
  }
  if (observation?.payload?.participation_occurrence_ref !== participationOccurrence?.participation_occurrence_ref) {
    errors.push("observation participation_occurrence_ref does not bind to occurrence");
  }
  if (observation?.actor_ref !== participationOccurrence?.endpoint_occurrence_ref) {
    errors.push("observation actor does not bind to occurrence endpoint");
  }
  if (observation?.payload?.endpoint_occurrence_ref !== participationOccurrence?.endpoint_occurrence_ref) {
    errors.push("observation payload endpoint does not bind to occurrence endpoint");
  }
  if (observation?.payload?.source_matter_ref !== sourceMatter?.matter_ref) {
    errors.push("observation source Matter ref does not bind to source object");
  }
  if (observation?.payload?.source_matter_identity !== sourceMatter?.content_identity) {
    errors.push("observation source Matter identity does not bind to source object");
  }
  if (observation?.payload?.identity_match !== true) errors.push("observation content equivalence is not exact");
  if (observation?.payload?.frontier_receipt_persisted !== true) errors.push("frontier receipt is not persisted");
  if (!continuityEvidence) errors.push("continuity evidence is not established");
  if (!sourceObjectBinding) errors.push("source object binding is not established");
  if (!currentLiveness) errors.push("current liveness is not established");
  if (keyResolution.final_standing !== "OCCURRENCE_KEY_BINDING_RESOLVED") {
    errors.push("occurrence key binding is not resolved");
  }
  if (!claimedKeyEqualsRegisteredKey) errors.push("claimed key is not the registered occurrence key");
  if (!grantBindsRegisteredKey) errors.push("grant is not bound to the registered occurrence key");
  if (!evidenceBindsRegisteredKey) errors.push("evidence key is not the registered occurrence key");

  const adjudication = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "LAUNCH_OBSERVATION_BINDING_PREIMAGE",
    question_genus: "BINDING",
    observation_ref: observation?.event_ref ?? null,
    participation_ref: participationOccurrence?.participation_ref ?? null,
    participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
    matter_ref: sourceMatter?.matter_ref ?? null,
    continuity_evidence_established: continuityEvidence,
    source_object_binding_established: sourceObjectBinding,
    current_liveness_established: currentLiveness,
    occurrence_key_binding: keyResolution,
    claimed_key_equals_registered_key: claimedKeyEqualsRegisteredKey,
    grant_binds_registered_key: grantBindsRegisteredKey,
    evidence_binds_registered_key: evidenceBindsRegisteredKey,
    evidence_carries_key_claim: evidenceCarriesKeyClaim,
    birth_claim_not_birth_established: true,
    proof_of_possession_not_key_occurrence_binding: true,
    binding_not_attribution: true,
    binding_not_authority: true,
    errors,
    may_bind_observation_occurrence: errors.length === 0,
    final_standing: errors.length === 0
      ? "BINDING_PREIMAGE_ESTABLISHED"
      : "BINDING_PREIMAGE_NOT_ESTABLISHED"
  };
  adjudication.binding_preimage_identity = digestObject(adjudication);
  return adjudication;
}

export function adjudicateLaunchObservedStanding({
  observation,
  sourceMatter,
  authorshipAdjudication,
  bindingPreimage,
  proofGenus = "COMPOSITION"
} = {}) {
  const attributionOk = authorshipAdjudication?.may_advance_observed_set === true;
  const bindingOk = bindingPreimage?.may_bind_observation_occurrence === true;
  const exactOk = observation?.payload?.identity_match === true &&
    observation?.payload?.observed_matter_identity === sourceMatter?.content_identity;
  const accepted = attributionOk && bindingOk && exactOk;
  const rejectionReasons = [
    ...(bindingPreimage?.errors ?? []).map((error) => `BIND:${error}`),
    ...(authorshipAdjudication?.errors ?? []).map((error) => `ATTR:${error}`)
  ];
  if (!exactOk) rejectionReasons.push("DET:deterministic content equivalence is not exact");

  const gate = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "LAUNCH_OBSERVED_STANDING_GATE",
    proof_genus: proofGenus,
    observation_ref: observation?.event_ref ?? null,
    matter_ref: sourceMatter?.matter_ref ?? null,
    valid_attribution_preimage: attributionOk,
    valid_binding_preimage: bindingOk,
    deterministic_content_equivalence: exactOk,
    det_not_bind: true,
    bind_not_attr: true,
    attr_not_observation: true,
    attr_not_authority: true,
    authority_not_effect: true,
    may_advance_observed_standing: accepted,
    observed_standing: accepted ? "OBSERVED_EXACT" : "NO_OBSERVED_STANDING",
    maximum_standing: accepted
      ? T0_ATTRIBUTION_CONTRACT.maximum_standing
      : "NO_CROSS_GENUS_STANDING",
    rejection_reasons: accepted ? [] : rejectionReasons,
    final_standing: accepted
      ? "LAUNCH_OBSERVED_STANDING_ACCEPTED"
      : "LAUNCH_OBSERVED_STANDING_REJECTED"
  };
  gate.gate_identity = digestObject(gate);
  return gate;
}

export function createLaunchObservedStandingCandidate({
  participation,
  participationOccurrence,
  birthRecord,
  commline,
  sourceMatter,
  transmissionRef,
  evidenceSpecies = "ENDPOINT_SIGNATURE_CANDIDATE",
  rawObservation = null,
  rawEvidence = null,
  keyRegistry = null,
  registeredSigningPrivateKeyPem = null,
  suppliedCapability = null,
  suppliedPrivateKeyPem = null,
  suppliedGrant = null,
  currentGrant = true,
  custodyCommitted = true,
  observedContent = null,
  skipObservation = false
} = {}) {
  const occurrenceParticipation = participationForOccurrence({ participation, participationOccurrence });
  const defaultSigning = keyRegistry
    ? null
    : createOccurrenceSigningRegistrationFixture({
      participation,
      participationOccurrence,
      birthRecord,
      matterRefs: [sourceMatter?.matter_ref].filter(Boolean)
    });
  const effectiveKeyRegistry = keyRegistry ?? buildOccurrenceKeyRegistry({ registrations: [defaultSigning.registration] });
  const keyResolution = resolveOccurrenceKeyBinding({
    keyRegistry: effectiveKeyRegistry,
    participationOccurrence,
    matterRef: sourceMatter?.matter_ref
  });
  const registeredCapability = effectiveKeyRegistry.registration_records?.find((entry) => (
    entry.participation_occurrence_ref === participationOccurrence?.participation_occurrence_ref
  ))?.capability ?? null;
  const verifierCapability = registeredCapability ?? defaultSigning?.capability ?? null;
  const evidenceCapability = suppliedCapability ?? verifierCapability;
  const evidencePrivateKeyPem = suppliedPrivateKeyPem ?? registeredSigningPrivateKeyPem ?? defaultSigning?.privateKeyPem ?? null;
  const grant = suppliedGrant ?? createObservationGrant({
    participation: occurrenceParticipation,
    capability: verifierCapability,
    matterRef: sourceMatter?.matter_ref,
    current: currentGrant
  });
  const observedResult = skipObservation
    ? {
      ok: false,
      disposition: "NO_OBSERVATION_ARTIFACT_SUPPLIED",
      observation: null,
      observed_matter: null
    }
    : rawObservation
      ? {
        ok: true,
        disposition: rawObservation.payload?.observation_disposition ?? "OBSERVATION_ARTIFACT_SUPPLIED",
        observation: rawObservation,
        observed_matter: null
      }
      : gocheckitObserve({
        participation: occurrenceParticipation,
        participationOccurrence,
        sourceMatter,
        transmissionRef,
        custodyCommitted,
        observedContent: observedContent ?? sourceMatter?.content
      });

  let evidence = null;
  if (rawEvidence) {
    evidence = rawEvidence;
  } else if (observedResult.observation && evidenceSpecies === "ENDPOINT_SIGNATURE_CANDIDATE" && evidenceCapability && evidencePrivateKeyPem) {
    evidence = createEndpointSignatureEvidence({
      observation: observedResult.observation,
      participation: occurrenceParticipation,
      capability: evidenceCapability,
      privateKeyPem: evidencePrivateKeyPem
    });
  } else if (observedResult.observation && evidenceSpecies === "SHARED_PRINCIPAL_RECEIPT") {
    evidence = createSharedPrincipalReceipt({
      observation: observedResult.observation,
      participation: occurrenceParticipation
    });
  } else if (observedResult.observation && evidenceSpecies === "DIGEST_CHAIN_RECEIPT") {
    evidence = createDigestChainReceipt({
      observation: observedResult.observation,
      participation: occurrenceParticipation
    });
  }

  const authorshipAdjudication = observedResult.observation
    ? adjudicateObservationAuthorship({
      observation: observedResult.observation,
      sourceMatter,
      participation: occurrenceParticipation,
      capability: verifierCapability,
      grant,
      evidence
    })
    : null;
  const bindingPreimage = adjudicateLaunchObservationBindingPreimage({
    observation: observedResult.observation,
    sourceMatter,
    participation: occurrenceParticipation,
    participationOccurrence,
    birthRecord,
    commline,
    keyRegistry: effectiveKeyRegistry,
    capability: evidenceCapability,
    grant,
    evidence
  });
  const launchObservedStanding = adjudicateLaunchObservedStanding({
    observation: observedResult.observation,
    sourceMatter,
    authorshipAdjudication,
    bindingPreimage
  });
  const candidate = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "LAUNCH_OBSERVATION_STANDING_CANDIDATE",
    source: "EXISTING_AUTHORSHIP_PRIMITIVE_PLUS_LAUNCH_BINDING_PREIMAGE",
    source_matter_ref: sourceMatter?.matter_ref ?? null,
    participation_ref: participationOccurrence?.participation_ref ?? null,
    participation_occurrence_ref: participationOccurrence?.participation_occurrence_ref ?? null,
    observation: observedResult.observation,
    observed_matter: observedResult.observed_matter,
    supplied_capability: publicCapabilityRecord(evidenceCapability),
    registered_capability: publicCapabilityRecord(verifierCapability),
    occurrence_key_resolution: keyResolution,
    grant,
    evidence,
    authorship_adjudication: authorshipAdjudication,
    binding_preimage: bindingPreimage,
    launch_observed_standing: launchObservedStanding,
    secure_primitive_exists_not_secure_primitive_dominates: true
  };
  candidate.candidate_identity = digestObject({
    ...candidate,
    supplied_capability: candidate.supplied_capability
      ? {
        ...candidate.supplied_capability,
        public_key_pem: candidate.supplied_capability.public_key_identity
      }
      : null,
    registered_capability: candidate.registered_capability
      ? {
        ...candidate.registered_capability,
        public_key_pem: candidate.registered_capability.public_key_identity
      }
      : null,
    evidence: candidate.evidence
      ? {
        ...candidate.evidence,
        signature: "SIGNATURE_PRESENT",
        public_key_identity: "PUBLIC_KEY_IDENTITY_PRESENT"
      }
      : null
  });
  return candidate;
}

function acceptedLaunchObservations(candidates = []) {
  return candidates
    .filter((candidate) => candidate.launch_observed_standing.may_advance_observed_standing)
    .map((candidate) => candidate.observation);
}

function summarizeCandidate(candidate) {
  return {
    source_matter_ref: candidate.source_matter_ref,
    participation_occurrence_ref: candidate.participation_occurrence_ref,
    observation_ref: candidate.observation?.event_ref ?? null,
    evidence_species: candidate.evidence?.evidence_species ?? null,
    supplied_key_identity: candidate.supplied_capability?.public_key_identity ?? null,
    registered_key_identity: candidate.registered_capability?.public_key_identity ?? null,
    occurrence_key_binding_standing: candidate.occurrence_key_resolution?.final_standing ?? null,
    claimed_key_equals_registered_key: candidate.binding_preimage?.claimed_key_equals_registered_key ?? null,
    binding_standing: candidate.binding_preimage.final_standing,
    authorship_standing: candidate.authorship_adjudication?.final_standing ?? "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED",
    launch_standing: candidate.launch_observed_standing.final_standing,
    observed_standing: candidate.launch_observed_standing.observed_standing
  };
}

export function adjudicateAckExactComposition({ observationCandidate, sourceMatter } = {}) {
  const directAck = observationCandidate?.observation
    ? deriveAckDisposition({ observation: observationCandidate.observation, sourceMatter })
    : null;
  const validObservationPreimage = observationCandidate?.launch_observed_standing?.may_advance_observed_standing === true;
  const deterministicContentEquivalence = observationCandidate?.observation?.payload?.observed_matter_identity === sourceMatter?.content_identity &&
    observationCandidate?.observation?.payload?.identity_match === true;
  const ackExact = validObservationPreimage &&
    deterministicContentEquivalence &&
    directAck?.ack_disposition === "ACK_EXACT";
  const composition = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "ACK_EXACT_COMPOSITION_GATE",
    observation_ref: observationCandidate?.observation?.event_ref ?? null,
    matter_ref: sourceMatter?.matter_ref ?? null,
    direct_ack_disposition: directAck?.ack_disposition ?? null,
    valid_observation_preimage: validObservationPreimage,
    deterministic_content_equivalence: deterministicContentEquivalence,
    correct_digest_alone_sufficient: false,
    correct_nonce_alone_sufficient: false,
    raw_ref_equality_alone_sufficient: false,
    unauthored_observation_values_sufficient: false,
    ack_exact_established: ackExact,
    final_standing: ackExact ? "ACK_EXACT_COMPOSED" : "ACK_EXACT_NOT_ESTABLISHED"
  };
  composition.composition_identity = digestObject(composition);
  return composition;
}

export function buildAckCompositionResult({ validObservationCandidate, rawObservationCandidate, sourceMatter } = {}) {
  const cases = [
    {
      case_ref: "ACK_FROM_VALID_OBSERVATION_PREIMAGE_AND_CONTENT_EQUIVALENCE",
      composition: adjudicateAckExactComposition({ observationCandidate: validObservationCandidate, sourceMatter }),
      accepted_as_ack_exact: true
    },
    {
      case_ref: "ACK_FROM_CORRECT_DIGEST_ONLY",
      supplied_artifact: { source_matter_identity: sourceMatter?.content_identity ?? null },
      composition: adjudicateAckExactComposition({ observationCandidate: null, sourceMatter }),
      accepted_as_ack_exact: false
    },
    {
      case_ref: "ACK_FROM_CORRECT_NONCE_ONLY",
      supplied_artifact: { nonce_ref: "EXPECTED_NONCE_REFERENCE_ONLY" },
      composition: adjudicateAckExactComposition({ observationCandidate: null, sourceMatter }),
      accepted_as_ack_exact: false
    },
    {
      case_ref: "ACK_FROM_RAW_REF_EQUALITY_ONLY",
      supplied_artifact: { matter_ref: sourceMatter?.matter_ref ?? null },
      composition: adjudicateAckExactComposition({ observationCandidate: null, sourceMatter }),
      accepted_as_ack_exact: false
    },
    {
      case_ref: "ACK_FROM_UNAUTHORED_OBSERVATION_VALUES",
      composition: adjudicateAckExactComposition({ observationCandidate: rawObservationCandidate, sourceMatter }),
      accepted_as_ack_exact: false
    }
  ].map((entry) => ({
    ...entry,
    actual_disposition: entry.composition.final_standing,
    accepted_as_ack_exact: entry.composition.ack_exact_established
  }));
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "ACK_COMPOSITION_RESULT",
    rule: "ACK_EXACT = VALID_OBSERVATION_PREIMAGE + DETERMINISTIC_CONTENT_EQUIVALENCE",
    cases,
    final_standing: cases[0].composition.ack_exact_established === true &&
      cases.slice(1).every((entry) => entry.composition.ack_exact_established === false)
      ? "ACK_COMPOSITION_ESTABLISHED"
      : "ACK_COMPOSITION_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

function buildDefaultExclusionFixture() {
  const sourceMatter = createMatter({
    matterRef: "LR_T0_EXCLUSION_SOURCE",
    content: "T0 exclusion fixture Matter.",
    producerRef: "FOUNDERSELF"
  });
  const commline = createCommline({
    commlineRef: "CL_T0_EXCLUSION_FIXTURE",
    matterEntries: [sourceMatter]
  });
  const participation = createParticipation({
    participationRef: "P_T0_EXCLUSION_CLAUDE",
    commline,
    selfRef: "CLAUDESELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CLAUDE_DEFAULT_ENDPOINT",
    sessionRef: "SESSION_T0_EXCLUSION",
    addressableMatterRefs: [sourceMatter.matter_ref]
  });
  const poA = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_T0_EXCLUSION_A",
    endpointOccurrenceRef: "CLAUDE_OCCURRENCE_A",
    sessionRef: participation.session_ref,
    contextAncestryRefs: ["H0_T0"],
    addressableMatterRefs: [sourceMatter.matter_ref]
  });
  const poB = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_T0_EXCLUSION_B",
    endpointOccurrenceRef: "CLAUDE_OCCURRENCE_B",
    sessionRef: participation.session_ref,
    predecessorOccurrenceRef: poA.participation_occurrence_ref,
    contextAncestryRefs: ["H0_T0"],
    addressableMatterRefs: [sourceMatter.matter_ref]
  });
  const poABirth = createOccurrenceBirthRecord({
    occurrence: poA,
    invokerRef: "FOUNDERSELF",
    invocationRef: "INV_T0_A",
    ancestryRefs: ["H0_T0"],
    birthRelation: "CONTINUATION"
  });
  const poBBirth = createOccurrenceBirthRecord({
    occurrence: poB,
    invokerRef: "CODEX_ORCHESTRATOR",
    invocationRef: "INV_T0_B",
    ancestryRefs: ["H0_T0"],
    birthRelation: "FORK"
  });
  const poAKey = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: poA,
    birthRecord: poABirth,
    matterRefs: [sourceMatter.matter_ref]
  });
  const poBKey = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: poB,
    birthRecord: poBBirth,
    matterRefs: [sourceMatter.matter_ref]
  });
  const keyRegistry = buildOccurrenceKeyRegistry({
    registrations: [poAKey.registration, poBKey.registration]
  });
  return {
    sourceMatter,
    commline,
    participation,
    poA,
    poB,
    poABirth,
    poBBirth,
    keyRegistry,
    signing: {
      poA: poAKey,
      poB: poBKey
    }
  };
}

function strategyDisposition(entry) {
  if (entry.candidate) {
    return {
      actual_disposition: entry.candidate.launch_observed_standing.final_standing,
      accepted_by_launch_path: entry.candidate.launch_observed_standing.may_advance_observed_standing,
      binding_standing: entry.candidate.binding_preimage.final_standing,
      attribution_standing: entry.candidate.authorship_adjudication?.final_standing ?? "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED",
      rejection_reasons: entry.candidate.launch_observed_standing.rejection_reasons
    };
  }
  return {
    actual_disposition: entry.registration_attempt?.final_standing ?? "NOT_EXECUTED",
    accepted_by_launch_path: entry.registration_attempt?.final_standing === "OCCURRENCE_KEY_REGISTRATION_ACCEPTED",
    binding_standing: "OCCURRENCE_KEY_REGISTRATION_BRANCH",
    attribution_standing: "NOT_APPLICABLE",
    rejection_reasons: entry.registration_attempt?.errors ?? []
  };
}

function summarizeStrategy(entry) {
  const disposition = strategyDisposition(entry);
  const expectedRejected = entry.expected_disposition === "REJECT";
  const expectedAccepted = entry.expected_disposition === "ACCEPT";
  const expectedMet = expectedRejected
    ? disposition.accepted_by_launch_path === false
    : expectedAccepted && disposition.accepted_by_launch_path === true;
  const row = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "SIBLING_COUNTERFEIT_STRATEGY_RESULT",
    strategy_ref: entry.strategy_ref,
    strategy_label: entry.strategy_label,
    expected_disposition: entry.expected_disposition,
    actual_disposition: disposition.actual_disposition,
    accepted_by_launch_path: disposition.accepted_by_launch_path,
    binding_standing: disposition.binding_standing,
    attribution_standing: disposition.attribution_standing,
    expected_disposition_met: expectedMet,
    positive_control: entry.positive_control === true,
    rejection_reasons: disposition.rejection_reasons
  };
  row.strategy_identity = digestObject(row);
  return row;
}

export function executeSiblingCounterfeitStrategyCoverage({
  commline,
  participation,
  poA,
  poB,
  poABirth,
  poBBirth,
  sourceMatter,
  keyRegistry,
  signing = {},
  validPoAObservationCandidate = null,
  validPoBObservationCandidate = null
} = {}) {
  const fixture = commline
    ? { commline, participation, poA, poB, poABirth, poBBirth, sourceMatter, keyRegistry, signing }
    : buildDefaultExclusionFixture();
  const effectiveKeyRegistry = fixture.keyRegistry;
  const validA = validPoAObservationCandidate ?? createLaunchObservedStandingCandidate({
    participation: fixture.participation,
    participationOccurrence: fixture.poA,
    birthRecord: fixture.poABirth,
    commline: fixture.commline,
    sourceMatter: fixture.sourceMatter,
    keyRegistry: effectiveKeyRegistry,
    registeredSigningPrivateKeyPem: fixture.signing.poA.privateKeyPem,
    transmissionRef: "T0_SIBLING_POSITIVE_CONTROL_PO_A"
  });
  const validB = validPoBObservationCandidate ?? createLaunchObservedStandingCandidate({
    participation: fixture.participation,
    participationOccurrence: fixture.poB,
    birthRecord: fixture.poBBirth,
    commline: fixture.commline,
    sourceMatter: fixture.sourceMatter,
    keyRegistry: effectiveKeyRegistry,
    registeredSigningPrivateKeyPem: fixture.signing.poB.privateKeyPem,
    transmissionRef: "T0_SIBLING_POSITIVE_CONTROL_PO_B"
  });
  const attackerSigningForVictimClaim = createEndpointSigningFixture({
    participation: participationForOccurrence({
      participation: fixture.participation,
      participationOccurrence: fixture.poA
    }),
    matterRefs: [fixture.sourceMatter.matter_ref]
  });
  const forgedContinuationBirth = createOccurrenceBirthRecord({
    occurrence: fixture.poA,
    invokerRef: "SIBLING_ATTACKER",
    invocationRef: "INV_FORGED_CONTINUATION_PO_A",
    ancestryRefs: [fixture.poB.participation_occurrence_ref],
    birthRelation: "CONTINUATION"
  });
  const attackerReplacementRegistration = createOccurrenceKeyRegistration({
    occurrence: fixture.poA,
    birthRecord: forgedContinuationBirth,
    capability: attackerSigningForVictimClaim.capability,
    registeredByRef: "SIBLING_ATTACKER"
  });
  const replacementAttempt = attemptOccurrenceKeyRegistration({
    keyRegistry: effectiveKeyRegistry,
    attemptedRegistration: attackerReplacementRegistration
  });

  const strategies = [
    {
      strategy_ref: "SIBLING_C1_REPLAY_VICTIM_OBSERVATION",
      strategy_label: "replay victim observation as sibling observation",
      expected_disposition: "REJECT",
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poB,
        birthRecord: fixture.poBBirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        rawObservation: validA.observation,
        rawEvidence: validA.evidence,
        keyRegistry: effectiveKeyRegistry,
        suppliedCapability: validA.registered_capability,
        registeredSigningPrivateKeyPem: fixture.signing.poB.privateKeyPem,
        transmissionRef: "T0_SIBLING_C1_REPLAY"
      })
    },
    {
      strategy_ref: "SIBLING_C2_FRESH_ATTACKER_KEY_VICTIM_REFS",
      strategy_label: "fresh attacker key with victim occurrence refs",
      expected_disposition: "REJECT",
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        suppliedCapability: attackerSigningForVictimClaim.capability,
        suppliedPrivateKeyPem: attackerSigningForVictimClaim.privateKeyPem,
        transmissionRef: "T0_SIBLING_C2_KEY_SUBSTITUTION"
      })
    },
    {
      strategy_ref: "SIBLING_C3_FRESH_ATTACKER_KEY_FORGED_CONTINUATION_BIRTH",
      strategy_label: "fresh attacker key with forged continuation birth",
      expected_disposition: "REJECT",
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: forgedContinuationBirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        suppliedCapability: attackerSigningForVictimClaim.capability,
        suppliedPrivateKeyPem: attackerSigningForVictimClaim.privateKeyPem,
        transmissionRef: "T0_SIBLING_C3_BIRTH_SUBSTITUTION"
      })
    },
    {
      strategy_ref: "SIBLING_C4_REPLACE_VICTIM_REGISTERED_KEY",
      strategy_label: "replace victim registered key",
      expected_disposition: "REJECT",
      registration_attempt: replacementAttempt
    },
    {
      strategy_ref: "SIBLING_C5_RESUME_ATTEMPTS_VICTIM_SIGNING_CAPABILITY",
      strategy_label: "resume occurrence attempts victim signing capability without inherited private key",
      expected_disposition: "REJECT",
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        suppliedCapability: fixture.signing.poB.capability,
        suppliedPrivateKeyPem: fixture.signing.poB.privateKeyPem,
        transmissionRef: "T0_SIBLING_C5_INHERITED_CAPABILITY_ATTEMPT"
      })
    },
    {
      strategy_ref: "SIBLING_C6_GENUINE_OCCURRENCE_REGISTERED_KEY",
      strategy_label: "genuine occurrence with genuine registered key",
      expected_disposition: "ACCEPT",
      positive_control: true,
      candidate: validA
    }
  ].map(summarizeStrategy);

  const counterfeitStrategies = strategies.filter((entry) => entry.positive_control !== true);
  const positiveControls = strategies.filter((entry) => entry.positive_control === true);
  const coverage = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "SIBLING_COUNTERFEIT_STRATEGY_COVERAGE",
    counterfeit_class_ref: "T0_C1_SIBLING_RESUMED_OCCURRENCE",
    strategies_tested: strategies,
    strategy_count: strategies.length,
    counterfeit_strategy_count: counterfeitStrategies.length,
    positive_control_count: positiveControls.length,
    class_excluded_under_tested_strategies: counterfeitStrategies.every((entry) => entry.accepted_by_launch_path === false) &&
      positiveControls.every((entry) => entry.accepted_by_launch_path === true),
    coverage_ceiling: "EXCLUDES_TESTED_ADMITTED_SIBLING_STRATEGIES_UNDER_T0_NOT_UNIVERSAL",
    uncovered_strategies: T0_ATTRIBUTION_CONTRACT.does_not_exclude,
    counterfeiter_class_not_single_attack_strategy: true,
    established_exclusion_subclass_not_established_exclusion_class: true,
    final_standing: counterfeitStrategies.every((entry) => entry.accepted_by_launch_path === false) &&
      positiveControls.every((entry) => entry.accepted_by_launch_path === true)
      ? "SIBLING_STRATEGY_COVERAGE_ESTABLISHED"
      : "SIBLING_STRATEGY_COVERAGE_BLOCKED"
  };
  coverage.coverage_identity = digestObject(coverage);
  return coverage;
}

export function executeT0CounterfeitExclusions({
  commline,
  participation,
  poA,
  poB,
  poABirth,
  poBBirth,
  sourceMatter,
  keyRegistry = null,
  signing = {},
  validPoAObservationCandidate = null,
  validPoBObservationCandidate = null
} = {}) {
  const fixture = commline
    ? { commline, participation, poA, poB, poABirth, poBBirth, sourceMatter, keyRegistry, signing }
    : buildDefaultExclusionFixture();
  const effectiveKeyRegistry = fixture.keyRegistry;
  const validA = validPoAObservationCandidate ?? createLaunchObservedStandingCandidate({
    participation: fixture.participation,
    participationOccurrence: fixture.poA,
    birthRecord: fixture.poABirth,
    commline: fixture.commline,
    sourceMatter: fixture.sourceMatter,
    keyRegistry: effectiveKeyRegistry,
    registeredSigningPrivateKeyPem: fixture.signing.poA.privateKeyPem,
    transmissionRef: "T0_VALID_PO_A"
  });
  const validB = validPoBObservationCandidate ?? createLaunchObservedStandingCandidate({
    participation: fixture.participation,
    participationOccurrence: fixture.poB,
    birthRecord: fixture.poBBirth,
    commline: fixture.commline,
    sourceMatter: fixture.sourceMatter,
    keyRegistry: effectiveKeyRegistry,
    registeredSigningPrivateKeyPem: fixture.signing.poB.privateKeyPem,
    transmissionRef: "T0_VALID_PO_B"
  });
  const siblingStrategyCoverage = executeSiblingCounterfeitStrategyCoverage({
    commline: fixture.commline,
    participation: fixture.participation,
    poA: fixture.poA,
    poB: fixture.poB,
    poABirth: fixture.poABirth,
    poBBirth: fixture.poBBirth,
    sourceMatter: fixture.sourceMatter,
    keyRegistry: effectiveKeyRegistry,
    signing: fixture.signing,
    validPoAObservationCandidate: validA,
    validPoBObservationCandidate: validB
  });
  const publicParticipation = createParticipation({
    participationRef: "P_T0_PUBLIC_HOLDER",
    commline: fixture.commline,
    selfRef: "PUBLIC_COMMLINE_HOLDER",
    endpointOccurrenceRef: "PUBLIC_COMMLINE_HOLDER_ENDPOINT",
    sessionRef: "PUBLIC_SESSION",
    addressableMatterRefs: [fixture.sourceMatter.matter_ref]
  });
  const publicOccurrence = createParticipationOccurrence({
    participation: publicParticipation,
    participationOccurrenceRef: "PO_T0_PUBLIC_HOLDER",
    endpointOccurrenceRef: publicParticipation.endpoint_occurrence_ref,
    sessionRef: publicParticipation.session_ref,
    contextAncestryRefs: ["PUBLIC_CONTEXT"],
    addressableMatterRefs: [fixture.sourceMatter.matter_ref]
  });
  const publicRawObservation = gocheckitObserve({
    participation: publicParticipation,
    participationOccurrence: publicOccurrence,
    sourceMatter: fixture.sourceMatter,
    transmissionRef: "T0_PUBLIC_RECONTACT"
  }).observation;

  const cases = [
    {
      class_ref: "T0_C1_SIBLING_RESUMED_OCCURRENCE",
      finding_refs: ["F1_SIBLING_RESUMED_OCCURRENCE"],
      genus_pressure: ["BINDING", "ATTRIBUTION"],
      strategy_coverage: siblingStrategyCoverage,
      counterfeit_artifact: "sibling strategy coverage: replay, key substitution, birth substitution, registry replacement, inherited capability attempt"
    },
    {
      class_ref: "T0_C2_ORCHESTRATION_HARNESS",
      finding_refs: ["F2_ORCHESTRATION_HARNESS"],
      genus_pressure: ["AUTHORITY", "ATTRIBUTION"],
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        skipObservation: true,
        transmissionRef: "T0_C2_HARNESS_ONLY"
      }),
      counterfeit_artifact: "birth and invoker metadata without ObservationOccurrence"
    },
    {
      class_ref: "T0_C3_SAME_LINE_OCCURRENCE_LACKING_ACT",
      finding_refs: ["F3_SAME_LINE_OCCURRENCE_LACKING_ACT"],
      genus_pressure: ["BINDING", "OBSERVATION"],
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        rawObservation: validB.observation,
        rawEvidence: validB.evidence,
        suppliedCapability: validB.registered_capability,
        keyRegistry: effectiveKeyRegistry,
        transmissionRef: "T0_C3_SAME_LINE_REPLAY"
      }),
      counterfeit_artifact: "same-line sibling observation values asserted for target occurrence"
    },
    {
      class_ref: "T0_C4_PUBLIC_COMMLINE_HOLDER",
      finding_refs: ["F4_PUBLIC_COMMLINE_HOLDER"],
      genus_pressure: ["BINDING"],
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        rawObservation: publicRawObservation,
        keyRegistry: effectiveKeyRegistry,
        evidenceSpecies: "SHARED_PRINCIPAL_RECEIPT",
        transmissionRef: "T0_C4_PUBLIC_CONTENT_REPLAY"
      }),
      counterfeit_artifact: "public holder exact content and route without source occurrence binding"
    },
    {
      class_ref: "T0_C5_EXPECTED_DIGEST_NONCE_REF_HOLDER",
      finding_refs: ["F5_EXPECTED_DIGEST_NONCE_REF_HOLDER"],
      genus_pressure: ["DETERMINATION", "ATTRIBUTION"],
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poA,
        birthRecord: fixture.poABirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        skipObservation: true,
        transmissionRef: "T0_C5_DIGEST_NONCE_REF_ONLY"
      }),
      counterfeit_artifact: "correct digest nonce and refs without observation event"
    },
    {
      class_ref: "T0_C6_INHERITED_SHARED_CONTEXT_HOLDER",
      finding_refs: ["F6_INHERITED_SHARED_CONTEXT_HOLDER"],
      genus_pressure: ["BINDING", "ATTRIBUTION"],
      candidate: createLaunchObservedStandingCandidate({
        participation: fixture.participation,
        participationOccurrence: fixture.poB,
        birthRecord: fixture.poBBirth,
        commline: fixture.commline,
        sourceMatter: fixture.sourceMatter,
        keyRegistry: effectiveKeyRegistry,
        skipObservation: true,
        transmissionRef: "T0_C6_CONTEXT_ONLY"
      }),
      counterfeit_artifact: "inherited context and shared SELF_REF without current observed relation"
    }
  ];

  return cases.map((entry) => {
    const strategyStanding = entry.strategy_coverage?.final_standing ?? null;
    const strategyAccepted = entry.strategy_coverage
      ? !entry.strategy_coverage.class_excluded_under_tested_strategies
      : null;
    const candidateAccepted = entry.candidate?.launch_observed_standing.may_advance_observed_standing;
    const acceptedByLaunchPath = entry.strategy_coverage ? strategyAccepted : candidateAccepted;
    const result = {
      schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
      object_type: "EXECUTED_T0_COUNTERFEIT_EXCLUSION",
      class_ref: entry.class_ref,
      finding_refs: entry.finding_refs,
      genus_pressure: entry.genus_pressure,
      counterfeit_artifact: entry.counterfeit_artifact,
      actual_verifier: entry.strategy_coverage
        ? "LAUNCH_OBSERVED_STANDING_GATE_WITH_OCCURRENCE_KEY_REGISTRY_STRATEGY_COVERAGE"
        : "LAUNCH_OBSERVED_STANDING_GATE",
      actual_disposition: strategyStanding ?? entry.candidate.launch_observed_standing.final_standing,
      accepted_by_launch_path: acceptedByLaunchPath,
      observed_rejection_not_expected_rejection: acceptedByLaunchPath === false,
      claimed_exclusion_not_established_exclusion: true,
      established_exclusion: acceptedByLaunchPath === false
        ? "ESTABLISHED_BY_EXECUTED_LAUNCH_GATE"
        : "NOT_ESTABLISHED",
      binding_standing: entry.strategy_coverage
        ? "STRATEGY_BINDING_COVERAGE_ESTABLISHED"
        : entry.candidate.binding_preimage.final_standing,
      attribution_standing: entry.strategy_coverage
        ? "ATTRIBUTION_TO_KEY_NOT_ENOUGH_FOR_OCCURRENCE"
        : entry.candidate.authorship_adjudication?.final_standing ?? "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED",
      strategies_tested: entry.strategy_coverage?.strategies_tested ?? null,
      coverage_ceiling: entry.strategy_coverage?.coverage_ceiling ?? null,
      uncovered_strategies: entry.strategy_coverage?.uncovered_strategies ?? T0_ATTRIBUTION_CONTRACT.does_not_exclude,
      rejection_reasons: entry.strategy_coverage
        ? entry.strategy_coverage.strategies_tested.flatMap((strategy) => (
          strategy.positive_control ? [] : strategy.rejection_reasons.map((reason) => `${strategy.strategy_ref}:${reason}`)
        ))
        : entry.candidate.launch_observed_standing.rejection_reasons,
      maximum_standing: entry.strategy_coverage
        ? "BOUNDED_T0_SIBLING_STRATEGY_COVERAGE_ONLY"
        : entry.candidate.launch_observed_standing.maximum_standing
    };
    result.exclusion_identity = digestObject(result);
    return result;
  });
}

export function buildBindRepairResult({ executedExclusionResults = executeT0CounterfeitExclusions() } = {}) {
  const byClass = new Map(executedExclusionResults.map((entry) => [entry.class_ref, entry]));
  const sibling = byClass.get("T0_C1_SIBLING_RESUMED_OCCURRENCE");
  const f3 = byClass.get("T0_C3_SAME_LINE_OCCURRENCE_LACKING_ACT");
  const f4 = byClass.get("T0_C4_PUBLIC_COMMLINE_HOLDER");
  const f6 = byClass.get("T0_C6_INHERITED_SHARED_CONTEXT_HOLDER");
  const siblingStrategies = sibling?.strategies_tested ?? [];
  const strategyPassed = (strategyRef) => siblingStrategies.some((entry) => (
    entry.strategy_ref === strategyRef &&
    entry.expected_disposition_met === true
  ));
  const bindingQuestions = [
    {
      question_ref: "B1_OCCURRENCE_KEY_BINDING",
      proposition: "RegisteredKey(K) belongs to Occurrence(O), independent of observation-supplied key claims.",
      repaired: strategyPassed("SIBLING_C2_FRESH_ATTACKER_KEY_VICTIM_REFS") &&
        strategyPassed("SIBLING_C4_REPLACE_VICTIM_REGISTERED_KEY") &&
        strategyPassed("SIBLING_C5_RESUME_ATTEMPTS_VICTIM_SIGNING_CAPABILITY") &&
        strategyPassed("SIBLING_C6_GENUINE_OCCURRENCE_REGISTERED_KEY")
    },
    {
      question_ref: "B2_OCCURRENCE_BIRTH_CONTINUITY_BINDING",
      proposition: "BirthClaim does not become BirthEstablished unless it matches the registered occurrence birth preimage.",
      repaired: strategyPassed("SIBLING_C3_FRESH_ATTACKER_KEY_FORGED_CONTINUATION_BIRTH") &&
        strategyPassed("SIBLING_C6_GENUINE_OCCURRENCE_REGISTERED_KEY")
    }
  ];
  const bindCases = [
    {
      finding_ref: "F3_SAME_LINE_OCCURRENCE_LACKING_ACT",
      requirement: "event actor, participation occurrence, and source Matter bind to the same occurrence",
      actual_binding_standing: f3?.binding_standing ?? "NOT_EXECUTED",
      repaired: f3?.accepted_by_launch_path === false &&
        f3?.binding_standing === "BINDING_PREIMAGE_NOT_ESTABLISHED"
    },
    {
      finding_ref: "F4_PUBLIC_COMMLINE_HOLDER",
      requirement: "public content is not source-object/current-liveness binding for the claimed occurrence",
      actual_binding_standing: f4?.binding_standing ?? "NOT_EXECUTED",
      repaired: f4?.accepted_by_launch_path === false &&
        f4?.binding_standing === "BINDING_PREIMAGE_NOT_ESTABLISHED"
    },
    {
      finding_ref: "F6_INHERITED_SHARED_CONTEXT_HOLDER",
      requirement: "context holder requires BIND and ATTR before any observed standing",
      actual_binding_standing: f6?.binding_standing ?? "NOT_EXECUTED",
      actual_attribution_standing: f6?.attribution_standing ?? "NOT_EXECUTED",
      composition_required: "BIND_AND_ATTR",
      repaired: f6?.accepted_by_launch_path === false &&
        f6?.binding_standing === "BINDING_PREIMAGE_NOT_ESTABLISHED"
    }
  ];
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "BIND_REPAIR_RESULT",
    obligations: [
      "continuity evidence",
      "source-object binding",
      "current liveness",
      "occurrence-key registration",
      "register-once replacement refusal"
    ],
    binding_questions: bindingQuestions,
    bind_not_attribution: true,
    bind_not_authority: true,
    proof_of_possession_not_key_occurrence_binding: true,
    birth_claim_not_birth_established: true,
    cases: bindCases,
    final_standing: bindCases.every((entry) => entry.repaired) &&
      bindingQuestions.every((entry) => entry.repaired)
      ? "BIND_REPAIR_ESTABLISHED"
      : "BIND_REPAIR_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildAuthorshipDominanceResult({
  standingPathCensus = buildStandingPathCensus(),
  algebraReport,
  t0CounterfeitMatrix
} = {}) {
  const rawBypasses = standingPathCensus.filter((entry) => [
    "RAW_BYPASS",
    "LEGACY_BYPASS",
    "AGGREGATION_BYPASS"
  ].includes(entry.classification));
  const unfenced = rawBypasses.filter((entry) => entry.launch_standing_capable_after_repair);
  const validLaunchCandidates = algebraReport?.authorship_gated_observation?.candidates ?? [];
  const allLaunchCandidatesGated = validLaunchCandidates.length > 0 &&
    validLaunchCandidates.every((entry) => entry.launch_standing === "LAUNCH_OBSERVED_STANDING_ACCEPTED");
  const allCounterfeitsRejected = t0CounterfeitMatrix?.counterfeit_classes?.every((entry) => entry.accepted_after_repair === false);
  const occurrenceKeyRegistryEstablished = algebraReport?.occurrence_key_registry?.final_standing === "OCCURRENCE_KEY_REGISTRY_ESTABLISHED";
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "AUTHORSHIP_DOMINANCE_RESULT",
    rule: "Every launch path capable of OBSERVED standing transits the authorship gate or a lawful gated preimage.",
    raw_bypass_paths_seen: rawBypasses.map((entry) => entry.path_ref),
    unfenced_launch_bypasses_after_repair: unfenced.map((entry) => entry.path_ref),
    launch_observed_candidates_all_gated: allLaunchCandidatesGated,
    occurrence_key_registry_established: occurrenceKeyRegistryEstablished,
    all_t0_counterfeits_rejected_by_actual_launch_gate: allCounterfeitsRejected,
    signature_valid_not_signer_identity_bound: true,
    proof_of_possession_not_key_occurrence_binding: true,
    secure_primitive_exists_not_secure_primitive_dominates: true,
    final_standing: unfenced.length === 0 &&
      allLaunchCandidatesGated &&
      occurrenceKeyRegistryEstablished &&
      allCounterfeitsRejected
      ? "AUTHORSHIP_GATE_DOMINATES_LAUNCH_ALGEBRA"
      : "AUTHORSHIP_GATE_DOMINANCE_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

function summarizeExclusionForIdentity(entry) {
  return {
    class_ref: entry.class_ref,
    finding_refs: entry.finding_refs,
    genus_pressure: entry.genus_pressure,
    actual_verifier: entry.actual_verifier,
    actual_disposition: entry.actual_disposition,
    accepted_by_launch_path: entry.accepted_by_launch_path,
    binding_standing: entry.binding_standing,
    attribution_standing: entry.attribution_standing,
    established_exclusion: entry.established_exclusion,
    strategies_tested: entry.strategies_tested?.map((strategy) => ({
      strategy_ref: strategy.strategy_ref,
      expected_disposition: strategy.expected_disposition,
      actual_disposition: strategy.actual_disposition,
      accepted_by_launch_path: strategy.accepted_by_launch_path,
      expected_disposition_met: strategy.expected_disposition_met,
      positive_control: strategy.positive_control
    })) ?? null,
    coverage_ceiling: entry.coverage_ceiling ?? null,
    maximum_standing: entry.maximum_standing
  };
}

function launchGapSummary(gap) {
  return {
    participation_ref: gap?.participation_ref ?? null,
    participation_occurrence_ref: gap?.participation_occurrence_ref ?? null,
    observed_matter_refs: gap?.observed_matter_refs ?? [],
    unobserved_matter_refs: gap?.unobserved_matter_refs ?? [],
    unknown_observation_matter_refs: gap?.unknown_observation_matter_refs ?? [],
    invalid_addressable_refs: gap?.invalid_addressable_refs ?? [],
    final_attention_due: gap?.attention_due ?? null
  };
}

export function buildLaunchReadinessReportIdentityPayload(report) {
  return {
    schema: report.schema,
    artifact_status: report.artifact_status,
    launch_target: report.launch_target,
    launch_invariants: report.launch_invariants,
    report_identity_scope: report.report_identity_scope,
    predecessor_standings: Object.fromEntries(
      Object.entries(report.predecessor_reports ?? {}).map(([key, value]) => [key, value.final_standing])
    ),
    standing_path_census: report.standing_path_census?.map((entry) => ({
      path_ref: entry.path_ref,
      capable_standing: entry.capable_standing,
      classification: entry.classification,
      launch_path_status: entry.launch_path_status,
      launch_standing_capable_after_repair: entry.launch_standing_capable_after_repair
    })),
    authorship_dominance_result: {
      final_standing: report.authorship_dominance_result?.final_standing,
      unfenced_launch_bypasses_after_repair: report.authorship_dominance_result?.unfenced_launch_bypasses_after_repair ?? [],
      launch_observed_candidates_all_gated: report.authorship_dominance_result?.launch_observed_candidates_all_gated,
      occurrence_key_registry_established: report.authorship_dominance_result?.occurrence_key_registry_established,
      all_t0_counterfeits_rejected_by_actual_launch_gate: report.authorship_dominance_result?.all_t0_counterfeits_rejected_by_actual_launch_gate
    },
    ack_composition_result: {
      final_standing: report.ack_composition_result?.final_standing,
      cases: report.ack_composition_result?.cases?.map((entry) => ({
        case_ref: entry.case_ref,
        actual_disposition: entry.actual_disposition,
        ack_exact_established: entry.composition.ack_exact_established
      })) ?? []
    },
    executed_exclusion_results: report.executed_exclusion_results?.map(summarizeExclusionForIdentity) ?? [],
    bind_repair_result: {
      final_standing: report.bind_repair_result?.final_standing,
      binding_questions: report.bind_repair_result?.binding_questions?.map((entry) => ({
        question_ref: entry.question_ref,
        repaired: entry.repaired
      })) ?? [],
      cases: report.bind_repair_result?.cases?.map((entry) => ({
        finding_ref: entry.finding_ref,
        actual_binding_standing: entry.actual_binding_standing,
        actual_attribution_standing: entry.actual_attribution_standing ?? null,
        repaired: entry.repaired
      })) ?? []
    },
    algebra: {
      final_standing: report.algebra?.final_standing,
      checks: report.algebra?.checks,
      po_a_gap_before: launchGapSummary(report.algebra?.fork_observation?.po_a_gap_before),
      po_b_gap_before: launchGapSummary(report.algebra?.fork_observation?.po_b_gap_before),
      po_a_gap_after: launchGapSummary(report.algebra?.fork_observation?.po_a_gap_after),
      po_b_gap_after: launchGapSummary(report.algebra?.fork_observation?.po_b_gap_after),
      session_file_union: {
        final_standing: report.algebra?.session_file_union?.final_standing,
        marker_findings: report.algebra?.session_file_union?.marker_findings ?? []
      },
      occurrence_key_registry: {
        final_standing: report.algebra?.occurrence_key_registry?.final_standing,
        registration_count: report.algebra?.occurrence_key_registry?.registrations?.length ?? 0,
        occurrence_refs: report.algebra?.occurrence_key_registry?.registrations?.map((entry) => entry.participation_occurrence_ref) ?? [],
        register_once: report.algebra?.occurrence_key_registry?.register_once,
        resume_mints_distinct_occurrence_key_binding: report.algebra?.occurrence_key_registry?.resume_mints_distinct_occurrence_key_binding
      },
      launch_runtime_observation_set: {
        source: report.algebra?.launch_runtime_observation_set?.source,
        observed_relations: report.algebra?.launch_runtime_observation_set?.observed_relations?.map((entry) => ({
          participation_ref: entry.participation_ref,
          participation_occurrence_ref: entry.participation_occurrence_ref,
          matter_ref: entry.matter_ref,
          observed_standing: entry.observed_standing
        })) ?? [],
        rejected_relations: report.algebra?.launch_runtime_observation_set?.rejected_relations?.map((entry) => ({
          matter_ref: entry.matter_ref,
          observed_standing: entry.observed_standing
        })) ?? []
      }
    },
    f1_f6_proof_compilation: report.f1_f6_proof_compilation?.map((entry) => ({
      finding_ref: entry.finding_ref,
      question_genus: entry.question_genus,
      current_evidence_fit: entry.current_evidence_fit,
      t0_counterfeit_classes: entry.t0_counterfeit_classes,
      maximum_standing: entry.maximum_standing
    })),
    t0_counterfeit_matrix: report.t0_counterfeit_matrix?.counterfeit_classes?.map((entry) => ({
      class_ref: entry.class_ref,
      applicable_findings: entry.applicable_findings,
      actual_disposition: entry.actual_disposition,
      accepted_after_repair: entry.accepted_after_repair,
      established_exclusion: entry.established_exclusion,
      strategies_tested: entry.strategies_tested?.map((strategy) => ({
        strategy_ref: strategy.strategy_ref,
        actual_disposition: strategy.actual_disposition,
        accepted_by_launch_path: strategy.accepted_by_launch_path,
        expected_disposition_met: strategy.expected_disposition_met,
        positive_control: strategy.positive_control
      })) ?? null
    })),
    class1_sibling_result: {
      final_standing: report.class1_sibling_result?.final_standing,
      sibling_artifact_accepted_after_repair: report.class1_sibling_result?.sibling_artifact_accepted_after_repair,
      sibling_excluded_for_universal_attribution: report.class1_sibling_result?.sibling_excluded_for_universal_attribution
    },
    f1_f6_replay: report.f1_f6_replay?.map((entry) => ({
      finding_ref: entry.finding_ref,
      question_genus: entry.question_genus,
      replay_standing: entry.replay_standing,
      failure_if_any: entry.failure_if_any
    })),
    t1_result: {
      final_standing: report.t1_result?.final_standing,
      patient_zero_observation_event_count: report.t1_result?.patient_zero_observation_event_count,
      current_claude_patient_zero_observation_event_count: report.t1_result?.current_claude_patient_zero_observation_event_count,
      observed_current_claude_interactive_participation_patient_zero: report.t1_result?.observed_current_claude_interactive_participation_patient_zero
    },
    t1_5_result: {
      final_standing: report.t1_5_result?.final_standing,
      activation_admission: report.t1_5_result?.activation_admission,
      checks: report.t1_5_result?.checks
    },
    t2_gate_result: {
      final_standing: report.t2_gate_result?.final_standing,
      control_disposition: report.t2_gate_result?.control_disposition,
      t2_receipt_exists: report.t2_gate_result?.t2_receipt_exists,
      t2_subject_binding: report.t2_gate_result?.t2_subject_binding,
      t2_patient_zero_binding: report.t2_gate_result?.t2_patient_zero_binding,
      t2_participation_binding: report.t2_gate_result?.t2_participation_binding,
      t2_observation_occurrence: report.t2_gate_result?.t2_observation_occurrence,
      t2_standing_ceiling: report.t2_gate_result?.t2_standing_ceiling
    },
    g5_instrument_result: {
      final_standing: report.g5_instrument_result?.final_standing,
      control_disposition: report.g5_instrument_result?.control_disposition,
      receipt_derived: report.g5_instrument_result?.receipt_derived,
      checks: report.g5_instrument_result?.checks,
      missing_attack_coverage: report.g5_instrument_result?.missing_attack_coverage ?? []
    },
    blocker_semantics_result: {
      final_standing: report.blocker_semantics_result?.final_standing,
      presentation_strings_carry_control_authority: report.blocker_semantics_result?.presentation_strings_carry_control_authority,
      hostile_fixture_results: report.blocker_semantics_result?.hostile_fixture_results?.map((entry) => ({
        fixture_ref: entry.fixture_ref,
        expected_decision: entry.expected_decision,
        actual_decision: entry.actual_decision,
        passed: entry.passed
      })) ?? []
    },
    launch_decision_sensitivity_tests: report.launch_decision_sensitivity_tests?.map((entry) => ({
      case_ref: entry.case_ref,
      expected_decision: entry.expected_decision,
      actual_decision: entry.actual_decision,
      discriminated: entry.discriminated
    })) ?? [],
    launch_gate_identity_map: report.launch_gate_identity_map?.map((entry) => ({
      gate_id: entry.gate_id,
      current_symbol: entry.current_symbol,
      semantic_question: entry.semantic_question,
      output_standing: entry.output_standing,
      launch_relevance: entry.launch_relevance,
      homonyms: entry.homonyms,
      collisions: entry.collisions,
      historical_aliases: entry.historical_aliases
    })) ?? [],
    g7_homonym_map: {
      final_standing: report.g7_homonym_map?.final_standing,
      same_label_not_same_gate: report.g7_homonym_map?.same_label_not_same_gate,
      same_gate_not_same_question: report.g7_homonym_map?.same_gate_not_same_question,
      founder_naming_routing_election_required: report.g7_homonym_map?.founder_naming_routing_election_required ?? []
    },
    gates: Object.fromEntries(
      Object.entries(report.gates ?? {}).map(([key, value]) => [key, {
        standing: value.standing,
        control_disposition: value.control_disposition,
        gate_id: value.gate_id
      }])
    ),
    launch_decision: report.launch_decision,
    launch_blockers: report.launch_blockers,
    new_counterexamples: report.new_counterexamples,
    current_launch_standing: report.current_launch_standing,
    next_required_seat: report.next_required_seat,
    execution_boundary: report.execution_boundary
  };
}

export function buildF1F6ProofCompilation() {
  return FROZEN_F1_F6_FINDINGS.map((finding) => {
    const compiled = {
      ...finding,
      repair_frame: "DETERMINATION != BINDING != ATTRIBUTION",
      evidence_fitness_not_scalar_strength: true,
      det_not_bind: true,
      bind_not_attr: true,
      attr_not_observation: true,
      attr_not_authority: true,
      authority_not_effect: true
    };
    compiled.compilation_identity = digestObject(compiled);
    return compiled;
  });
}

export function buildT0CounterfeitMatrix({
  proofCompilation = buildF1F6ProofCompilation(),
  executedExclusionResults = executeT0CounterfeitExclusions()
} = {}) {
  const proofByClass = new Map();
  for (const proof of proofCompilation) {
    for (const classRef of proof.t0_counterfeit_classes) {
      proofByClass.set(classRef, [...(proofByClass.get(classRef) ?? []), proof.finding_ref]);
    }
  }
  const executedByClass = new Map(executedExclusionResults.map((entry) => [entry.class_ref, entry]));
  const rows = T0_COUNTERFEIT_CLASSES.map((counterfeitClass) => {
    const executed = executedByClass.get(counterfeitClass.class_ref);
    const row = {
      ...counterfeitClass,
      applicable_findings: proofByClass.get(counterfeitClass.class_ref) ?? [],
      claimed_exclusion: "REQUIRES_EXECUTED_LAUNCH_GATE_DISPOSITION",
      can_produce_indistinguishable_pre_repair_artifact: true,
      actual_verifier: executed?.actual_verifier ?? "NOT_EXECUTED",
      actual_disposition: executed?.actual_disposition ?? "NOT_EXECUTED",
      accepted_after_repair: executed?.accepted_by_launch_path ?? true,
      observed_rejection_not_expected_rejection: executed?.observed_rejection_not_expected_rejection ?? false,
      established_exclusion: executed?.established_exclusion ?? "NOT_ESTABLISHED",
      binding_standing: executed?.binding_standing ?? "NOT_EXECUTED",
      attribution_standing: executed?.attribution_standing ?? "NOT_EXECUTED",
      strategies_tested: executed?.strategies_tested ?? null,
      coverage_ceiling: executed?.coverage_ceiling ?? null,
      uncovered_strategies: executed?.uncovered_strategies ?? T0_ATTRIBUTION_CONTRACT.does_not_exclude,
      rejection_reasons: executed?.rejection_reasons ?? [],
      non_excluded_residue: T0_ATTRIBUTION_CONTRACT.does_not_exclude,
      repaired_acceptance_rule: "Reject pre-repair artifact basis as attribution; preserve only the genus it actually proves."
    };
    row.row_identity = digestObject(row);
    return row;
  });
  const matrix = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T0_COUNTERFEIT_MATRIX",
    t0: T0_ATTRIBUTION_CONTRACT,
    counterfeit_classes: rows,
    executed_exclusion_identities: executedExclusionResults.map((entry) => entry.exclusion_identity),
    claimed_exclusion_not_established_exclusion: true,
    expected_rejection_not_observed_rejection: true,
    branch_intersection_not_common_necessity: true,
    final_standing: rows.every((row) => row.accepted_after_repair === false &&
      row.established_exclusion === "ESTABLISHED_BY_EXECUTED_LAUNCH_GATE")
      ? "T0_REPAIR_MATRIX_ESTABLISHED_WITH_BOUNDED_CEILING"
      : "T0_REPAIR_MATRIX_BLOCKED"
  };
  matrix.matrix_identity = digestObject(matrix);
  return matrix;
}

export function buildClass1SiblingResult({ t0CounterfeitMatrix = buildT0CounterfeitMatrix() } = {}) {
  const class1 = t0CounterfeitMatrix.counterfeit_classes.find((entry) => entry.class_ref === "T0_C1_SIBLING_RESUMED_OCCURRENCE");
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "CLASS1_SIBLING_RESULT",
    counterfeit_class_ref: class1?.class_ref ?? "T0_C1_SIBLING_RESUMED_OCCURRENCE",
    pressure_rule: "A resumed sibling can inherit persisted/context state; inherited artifacts cannot establish occurrence attribution.",
    sibling_can_reproduce_pre_repair_artifact: class1?.can_produce_indistinguishable_pre_repair_artifact ?? true,
    sibling_artifact_accepted_after_repair: class1?.accepted_after_repair ?? true,
    actual_verifier: class1?.actual_verifier ?? "NOT_EXECUTED",
    actual_disposition: class1?.actual_disposition ?? "NOT_EXECUTED",
    observed_rejection_not_expected_rejection: class1?.observed_rejection_not_expected_rejection ?? false,
    strategies_tested: class1?.strategies_tested ?? [],
    coverage_ceiling: class1?.coverage_ceiling ?? null,
    uncovered_strategies: class1?.uncovered_strategies ?? T0_ATTRIBUTION_CONTRACT.does_not_exclude,
    sibling_excluded_for_persisted_inherited_public_recomputable_artifacts: class1?.accepted_after_repair === false,
    sibling_excluded_for_universal_attribution: false,
    fit_against_t0: class1?.accepted_after_repair === false
      ? "SUFFICIENT_TO_REJECT_GENERIC_ARTIFACT_INSUFFICIENT_TO_CLAIM_UNIVERSAL_IMPOSSIBILITY"
      : "INSUFFICIENT",
    maximum_standing: "BOUNDED_T0_ATTRIBUTION_CEILING_ONLY",
    final_standing: class1?.accepted_after_repair === false
      ? "CLASS1_REPAIR_PASS_WITH_BOUNDED_ATTRIBUTION_CEILING"
      : "CLASS1_REPAIR_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildT1BoundaryResult({ algebraReport, patientZeroMatterRef = "5464975482" } = {}) {
  const launchRelations = algebraReport?.launch_runtime_observation_set?.observed_relations ?? [];
  const patientZeroObservationEvents = launchRelations.filter((event) => objectContainsString(event, patientZeroMatterRef));
  const claudePatientZeroObservationEvents = patientZeroObservationEvents.filter((event) => (
    event.participation_occurrence_ref === "PO_LR_CLAUDE_A"
  ));
  const rawPatientZeroArtifacts = collectObservationEvents(algebraReport)
    .filter((event) => objectContainsString(event, patientZeroMatterRef));
  const sessionMarker = algebraReport?.session_file_union?.marker_findings?.find((entry) => entry.marker === patientZeroMatterRef);
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T1_BOUNDARY_RESULT",
    patient_zero_matter_ref: patientZeroMatterRef,
    current_claude_interactive_participation: "PO_LR_CLAUDE_A",
    without_claude_gocheckit: true,
    executed_launch_path_ref: "LAUNCH_OBSERVED_STANDING_GATE_ACCEPTED_EVENTS",
    available_matter_exposed: {
      session_file_union: algebraReport?.session_file_union?.final_standing ?? "SESSION_FILE_UNION_NOT_INSPECTED",
      patient_zero_context_present: sessionMarker?.present ?? false,
      sibling_occurrence_refs: ["PO_LR_CLAUDE_B", "PO_LR_CLAUDE_C"],
      public_reference_matter_visible_without_observation: true
    },
    raw_patient_zero_observation_artifacts_seen: rawPatientZeroArtifacts.length,
    patient_zero_observation_event_count: patientZeroObservationEvents.length,
    current_claude_patient_zero_observation_event_count: claudePatientZeroObservationEvents.length,
    observed_current_claude_interactive_participation_patient_zero: claudePatientZeroObservationEvents.length > 0,
    context_presence_not_observation: algebraReport?.session_file_union?.context_presence_not_observation_standing === true,
    required_false_holds: claudePatientZeroObservationEvents.length === 0,
    final_standing: claudePatientZeroObservationEvents.length === 0
      ? "T1_ESTABLISHED"
      : "STOP_REPAIR_T1_FAILED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildT15ActivationDeniedResult({ t1Result, algebraReport } = {}) {
  const deniedAdmission = algebraReport?.activation_admission?.founder_gate_denied ??
    algebraReport?.activation_admission?.budget_blocked;
  const derivedGap = algebraReport?.fork_observation?.po_a_gap_before ?? null;
  const checks = {
    observation_gap_derived: derivedGap?.attention_due === true,
    activation_admission_denied: deniedAdmission?.final_standing === "ACTIVATION_NOT_ADMITTED",
    no_activation: deniedAdmission?.final_standing === "ACTIVATION_NOT_ADMITTED",
    no_gocheckit: true,
    no_observation_occurrence: t1Result?.required_false_holds === true,
    no_ack_laundering: true,
    no_hollaback_fabrication: true,
    patient_zero_remains_false: t1Result?.required_false_holds === true
  };
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T1_5_ACTIVATION_DENIED_RESULT",
    activation_admission: "DENIED",
    executed_denial_path_ref: deniedAdmission?.activation_admission_identity ?? null,
    observation_gap_ref: derivedGap?.observation_gap_ref ?? null,
    notifaself_eligibility_ref: algebraReport?.activation_admission?.admitted?.eligibility_ref ?? null,
    denial_basis: [
      "CLAUDE_WAKE_AUTHORITY_NONE",
      "CLAUDE_GOCHECKIT_AUTHORITY_NONE",
      "STOP_BEFORE_T2"
    ],
    checks,
    final_standing: Object.values(checks).every(Boolean)
      ? "T1_5_ESTABLISHED"
      : "STOP_REPAIR_T1_5_FAILED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildF1F6Replay({
  proofCompilation = buildF1F6ProofCompilation(),
  t0CounterfeitMatrix = buildT0CounterfeitMatrix({ proofCompilation }),
  class1SiblingResult = buildClass1SiblingResult({ t0CounterfeitMatrix }),
  t1Result,
  t15Result
} = {}) {
  const tBoundariesHold = t1Result?.final_standing === "T1_ESTABLISHED" &&
    t15Result?.final_standing === "T1_5_ESTABLISHED";
  return proofCompilation.map((proof) => {
    const classRows = t0CounterfeitMatrix.counterfeit_classes.filter((row) => proof.t0_counterfeit_classes.includes(row.class_ref));
    const repaired = classRows.every((row) => row.accepted_after_repair === false) &&
      classRows.every((row) => row.established_exclusion === "ESTABLISHED_BY_EXECUTED_LAUNCH_GATE") &&
      (proof.finding_ref !== "F1_SIBLING_RESUMED_OCCURRENCE" ||
        class1SiblingResult.final_standing === "CLASS1_REPAIR_PASS_WITH_BOUNDED_ATTRIBUTION_CEILING") &&
      tBoundariesHold;
    const replay = {
      finding_ref: proof.finding_ref,
      question_genus: proof.question_genus,
      preimage_weakened: false,
      repair_property: proof.minimum_repair_property,
      maximum_standing: proof.maximum_standing,
      replay_standing: repaired ? "PASS" : "BLOCKED",
      replay_evidence_source: "EXECUTED_LAUNCH_GATE_COUNTERFEIT_DISPOSITION",
      failure_if_any: repaired ? null : "EXECUTED_T0_OR_T_BOUNDARY_NOT_ESTABLISHED"
    };
    replay.replay_identity = digestObject(replay);
    return replay;
  });
}

function sourceChain({
  sourceChainRef,
  sourceSpecies,
  authorityStanding = "AUTHORIZED",
  matterSourceRef = "MATTER_EMITTER",
  obligationSourceRef = "FOUNDER_OR_CHARTER",
  readsetAuthority = null
}) {
  return {
    source_chain_ref: sourceChainRef,
    source_species: sourceSpecies,
    authority_standing: authorityStanding,
    matter_source_ref: matterSourceRef,
    obligation_source_ref: obligationSourceRef,
    readset_authority: readsetAuthority
  };
}

export function buildLaunchReadinessAlgebraReport({ sessionFilePath = null, sessionEvidence = null } = {}) {
  const matters = {
    base: createMatter({ matterRef: "LR_M_BASE", content: "Launch readiness base Matter.", producerRef: "FOUNDERSELF" }),
    probe: createMatter({ matterRef: "LR_M_CODEX_PROBE", content: "Route adjudication probe Matter.", producerRef: "CODEXSELF" }),
    poAOnly: createMatter({ matterRef: "LR_M_PO_A_ONLY", content: "Occurrence scoped Matter for PO-A only.", producerRef: "FOUNDERSELF" }),
    optional: createMatter({ matterRef: "LR_M_OPTIONAL", content: "Informational optional Matter.", producerRef: "FOUNDERSELF" }),
    flood: createMatter({ matterRef: "LR_M_FLOOD", content: "Predicate matching flood candidate.", producerRef: "FOREIGN_MATTER" })
  };
  const commline = createCommline({
    commlineRef: "CL_LAUNCH_READINESS",
    matterEntries: Object.values(matters)
  });
  const participation = createParticipation({
    participationRef: "P_CLAUDE_LAUNCH_READINESS",
    commline,
    selfRef: "CLAUDESELF_CONTINUITY_CANDIDATE",
    endpointOccurrenceRef: "CLAUDE_DEFAULT_ENDPOINT",
    sessionRef: "219be5a6-1b6a-4212-90e2-2963de17b926",
    addressableMatterRefs: Object.values(matters).map((matter) => matter.matter_ref)
  });
  const poA = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_LR_CLAUDE_A",
    endpointOccurrenceRef: "CLAUDE_INTERACTIVE_OCCURRENCE_A",
    sessionRef: participation.session_ref,
    contextAncestryRefs: ["H0_219be5a6"],
    addressableMatterRefs: [matters.base.matter_ref, matters.probe.matter_ref, matters.poAOnly.matter_ref, matters.optional.matter_ref]
  });
  const poB = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_LR_CLAUDE_B",
    endpointOccurrenceRef: "CLAUDE_RESUMED_OCCURRENCE_B",
    sessionRef: participation.session_ref,
    predecessorOccurrenceRef: poA.participation_occurrence_ref,
    contextAncestryRefs: ["H0_219be5a6"],
    addressableMatterRefs: [matters.base.matter_ref, matters.probe.matter_ref, matters.optional.matter_ref]
  });
  const poBTerminated = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_LR_CLAUDE_B_TERMINATED",
    endpointOccurrenceRef: "CLAUDE_RESUMED_OCCURRENCE_B",
    sessionRef: participation.session_ref,
    predecessorOccurrenceRef: poA.participation_occurrence_ref,
    occurrenceStatus: "TERMINATED",
    contextAncestryRefs: ["H0_219be5a6"],
    addressableMatterRefs: [matters.base.matter_ref, matters.probe.matter_ref]
  });
  const poC = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_LR_CLAUDE_C",
    endpointOccurrenceRef: "CLAUDE_RESUMED_OCCURRENCE_C",
    sessionRef: participation.session_ref,
    predecessorOccurrenceRef: poBTerminated.participation_occurrence_ref,
    contextAncestryRefs: ["H0_219be5a6", poBTerminated.participation_occurrence_ref],
    addressableMatterRefs: [matters.base.matter_ref, matters.probe.matter_ref]
  });

  const poABirth = createOccurrenceBirthRecord({
    occurrence: poA,
    invokerRef: "FOUNDERSELF",
    invocationRef: "INVOCATION_LR_PO_A",
    ancestryRefs: ["H0_219be5a6"],
    birthRelation: "CONTINUATION"
  });
  const poBBirth = createOccurrenceBirthRecord({
    occurrence: poB,
    invokerRef: "CODEX_ORCHESTRATOR",
    invocationRef: "INVOCATION_LR_PO_B",
    ancestryRefs: ["H0_219be5a6"],
    birthRelation: "FORK"
  });
  const poCBirth = createOccurrenceBirthRecord({
    occurrence: poC,
    invokerRef: "CODEX_ORCHESTRATOR",
    invocationRef: "INVOCATION_LR_PO_C",
    ancestryRefs: ["H0_219be5a6", poBTerminated.participation_occurrence_ref],
    birthRelation: "FORK"
  });
  const collisionBirths = [
    createOccurrenceBirthRecord({
      occurrence: poB,
      invokerRef: "TEST_FORK_1",
      invocationRef: "INVOCATION_COLLISION_1",
      ancestryRefs: ["H0_219be5a6"],
      birthRelation: "FORK"
    }),
    createOccurrenceBirthRecord({
      occurrence: poB,
      invokerRef: "TEST_FORK_2",
      invocationRef: "INVOCATION_COLLISION_2",
      ancestryRefs: ["H0_219be5a6"],
      birthRelation: "FORK"
    })
  ];
  const birthAdjudication = adjudicateOccurrenceBirthRecords({ birthRecords: [poABirth, poBBirth, poCBirth] });
  const birthCollision = adjudicateOccurrenceBirthRecords({ birthRecords: collisionBirths });
  const poAKey = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: poA,
    birthRecord: poABirth,
    matterRefs: poA.addressable_matter_refs
  });
  const poBKey = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: poB,
    birthRecord: poBBirth,
    matterRefs: poB.addressable_matter_refs
  });
  const poCKey = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: poC,
    birthRecord: poCBirth,
    matterRefs: poC.addressable_matter_refs
  });
  const occurrenceKeyRegistry = buildOccurrenceKeyRegistry({
    registrations: [poAKey.registration, poBKey.registration, poCKey.registration]
  });

  const validFounder = sourceChain({
    sourceChainRef: "SRC_FOUNDER_OBSERVE_PO_A",
    sourceSpecies: "FOUNDER_INSTRUCTION",
    matterSourceRef: "FOUNDERSELF",
    obligationSourceRef: "FOUNDERSELF"
  });
  const validCharter = sourceChain({
    sourceChainRef: "SRC_CL_ROLE_CHARTER",
    sourceSpecies: "RATIFIED_COMMLINE_ROLE_CHARTER",
    matterSourceRef: "CL_LAUNCH_READINESS_CHARTER",
    obligationSourceRef: "CL_LAUNCH_READINESS_CHARTER"
  });
  const validReadset = sourceChain({
    sourceChainRef: "SRC_AUTHORIZED_ACT_READSET",
    sourceSpecies: "AUTHORIZED_ACT_READSET",
    matterSourceRef: "ACT_LR_READSET",
    obligationSourceRef: "ACT_LR_AUTHORITY",
    readsetAuthority: "EXPLICIT"
  });
  const invalidSources = {
    sender_declares: sourceChain({
      sourceChainRef: "SRC_SENDER_DECLARATION",
      sourceSpecies: "MATTER_SENDER_DECLARATION",
      matterSourceRef: "FOREIGN_MATTER",
      obligationSourceRef: "FOREIGN_MATTER"
    }),
    self_minted: sourceChain({
      sourceChainRef: "SRC_SELF_MINTED",
      sourceSpecies: "SELF_DECLARATION",
      matterSourceRef: poA.self_ref,
      obligationSourceRef: poA.self_ref
    }),
    cross_occurrence: sourceChain({
      sourceChainRef: "SRC_PO_B_FOR_PO_A",
      sourceSpecies: "SIBLING_OCCURRENCE_DECLARATION",
      matterSourceRef: poB.participation_occurrence_ref,
      obligationSourceRef: poB.participation_occurrence_ref
    }),
    shared_self: sourceChain({
      sourceChainRef: "SRC_SHARED_SELF_CONTINUITY",
      sourceSpecies: "SHARED_SELF_REF",
      matterSourceRef: poA.self_ref,
      obligationSourceRef: poA.self_ref
    }),
    terminated: sourceChain({
      sourceChainRef: "SRC_TERMINATED_OCCURRENCE",
      sourceSpecies: "TERMINATED_OCCURRENCE_DECLARATION",
      matterSourceRef: poBTerminated.participation_occurrence_ref,
      obligationSourceRef: poBTerminated.participation_occurrence_ref
    })
  };

  const dutyCases = {
    oo01_sender_declaration: deriveObservationDuty({
      sourceChain: invalidSources.sender_declares,
      participationOccurrence: poA,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo02_self_minted: deriveObservationDuty({
      sourceChain: invalidSources.self_minted,
      participationOccurrence: poA,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo03_cross_occurrence: deriveObservationDuty({
      sourceChain: invalidSources.cross_occurrence,
      participationOccurrence: poA,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo04_shared_self: deriveObservationDuty({
      sourceChain: invalidSources.shared_self,
      participationOccurrence: poB,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo05_terminated_source: deriveObservationDuty({
      sourceChain: invalidSources.terminated,
      participationOccurrence: poA,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo06_founder_instruction: deriveObservationDuty({
      sourceChain: validFounder,
      participationOccurrence: poA,
      matterRef: matters.poAOnly.matter_ref
    }),
    oo07_role_charter: deriveObservationDuty({
      sourceChain: validCharter,
      participationOccurrence: poA,
      matterRef: matters.probe.matter_ref,
      satisfactionScope: "PARTICIPATION_SCOPED"
    }),
    oo08_optional_addressable: deriveObservationDuty({
      sourceChain: sourceChain({
        sourceChainRef: "SRC_OPTIONAL_ADDRESSABLE",
        sourceSpecies: "MATTER_SENDER_DECLARATION",
        authorityStanding: "UNAUTHORIZED",
        matterSourceRef: "FOUNDERSELF",
        obligationSourceRef: "NONE"
      }),
      participationOccurrence: poA,
      matterRef: matters.optional.matter_ref
    }),
    oo09_authorized_readset: deriveObservationDuty({
      sourceChain: validReadset,
      participationOccurrence: poA,
      matterRef: matters.probe.matter_ref
    })
  };

  const poAObservedBase = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: poA,
    birthRecord: poABirth,
    commline,
    sourceMatter: matters.base,
    keyRegistry: occurrenceKeyRegistry,
    registeredSigningPrivateKeyPem: poAKey.privateKeyPem,
    transmissionRef: "LR_PO_A_BASE"
  });
  const poBObservedBase = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: poB,
    birthRecord: poBBirth,
    commline,
    sourceMatter: matters.base,
    keyRegistry: occurrenceKeyRegistry,
    registeredSigningPrivateKeyPem: poBKey.privateKeyPem,
    transmissionRef: "LR_PO_B_BASE"
  });
  const poBObservedProbe = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: poB,
    birthRecord: poBBirth,
    commline,
    sourceMatter: matters.probe,
    keyRegistry: occurrenceKeyRegistry,
    registeredSigningPrivateKeyPem: poBKey.privateKeyPem,
    transmissionRef: "LR_PO_B_PROBE"
  });
  const observationsBeforeConvergence = acceptedLaunchObservations([
    poAObservedBase,
    poBObservedBase,
    poBObservedProbe
  ]);
  const poAGapBefore = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poA,
    observations: observationsBeforeConvergence
  });
  const poBGapBefore = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poB,
    observations: observationsBeforeConvergence
  });
  const obligationCompatible = {
    ...dutyCases.oo06_founder_instruction,
    object_type: "OBSERVATION_OBLIGATION_COMPAT",
    obligated: dutyCases.oo06_founder_instruction.final_standing === "OBSERVATION_DUTY_DERIVED",
    matter_refs: [dutyCases.oo06_founder_instruction.matter_ref]
  };
  const poAEligibility = deriveOccurrenceNotifaselfEligibility({
    gap: poAGapBefore,
    obligations: [obligationCompatible]
  });
  const activationAdmitted = createActivationAdmission({
    eligibility: poAEligibility,
    duty: dutyCases.oo06_founder_instruction,
    birthRecord: poABirth,
    activationBudget: 1
  });
  const activationDuplicateSuppressed = createActivationAdmission({
    eligibility: poAEligibility,
    duty: dutyCases.oo06_founder_instruction,
    birthRecord: poABirth,
    activationBudget: 1,
    alreadyAdmittedMatterRefs: [matters.poAOnly.matter_ref]
  });
  const activationBudgetBlocked = createActivationAdmission({
    eligibility: poAEligibility,
    duty: dutyCases.oo06_founder_instruction,
    birthRecord: poABirth,
    activationBudget: 0
  });
  const activationFounderGateDenied = {
    ...activationBudgetBlocked,
    object_type: "ACTIVATION_ADMISSION_FOUNDER_GATE_DENIED",
    denial_authority_basis: "CLAUDE_WAKE_AUTHORITY_NONE",
    gocheckit_authority: "NONE",
    activation_admission: "DENIED"
  };
  activationFounderGateDenied.activation_admission_identity = digestObject(activationFounderGateDenied);

  const contextWithProbe = `${matters.probe.content}\n${matters.probe.content_identity}`;
  const contextInheritance = inspectContextInheritance({
    receivingOccurrence: poA,
    sourceMatter: matters.probe,
    contextText: contextWithProbe
  });
  const poAGocheckitProbe = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: poA,
    birthRecord: poABirth,
    commline,
    sourceMatter: matters.probe,
    keyRegistry: occurrenceKeyRegistry,
    registeredSigningPrivateKeyPem: poAKey.privateKeyPem,
    transmissionRef: "LR_PO_A_GOCHECKIT_PROBE"
  });
  const rawUnauthoredProbeObservation = gocheckitObserve({
    participation,
    participationOccurrence: poA,
    sourceMatter: matters.probe,
    transmissionRef: "LR_PO_A_RAW_UNAUTHORED_PROBE"
  }).observation;
  const rawUnauthoredProbeCandidate = {
    observation: rawUnauthoredProbeObservation,
    launch_observed_standing: {
      may_advance_observed_standing: false,
      final_standing: "LAUNCH_OBSERVED_STANDING_REJECTED",
      observed_standing: "NO_OBSERVED_STANDING"
    }
  };
  const observationsAfterConvergence = [
    ...observationsBeforeConvergence,
    ...acceptedLaunchObservations([poAGocheckitProbe])
  ];
  const poAGapAfter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poA,
    observations: observationsAfterConvergence
  });
  const poBGapAfter = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poB,
    observations: observationsAfterConvergence
  });

  const terminatedGap = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poBTerminated,
    observations: acceptedLaunchObservations([poBObservedBase, poBObservedProbe])
  });
  const poCGap = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: poC,
    observations: observationsAfterConvergence
  });
  const sessionUnion = inspectClaudeSessionUnion({ sessionFilePath, sessionEvidence });

  const checks = {
    obligation_derivation_only: [
      dutyCases.oo01_sender_declaration,
      dutyCases.oo02_self_minted,
      dutyCases.oo03_cross_occurrence,
      dutyCases.oo04_shared_self,
      dutyCases.oo05_terminated_source,
      dutyCases.oo08_optional_addressable
    ].every((duty) => duty.final_standing === "OBSERVATION_DUTY_NOT_DERIVED") &&
      dutyCases.oo06_founder_instruction.final_standing === "OBSERVATION_DUTY_DERIVED" &&
      dutyCases.oo07_role_charter.final_standing === "OBSERVATION_DUTY_DERIVED" &&
      dutyCases.oo09_authorized_readset.final_standing === "OBSERVATION_DUTY_DERIVED",
    occurrence_birth_registered: birthAdjudication.final_standing === "OCCURRENCE_BIRTH_LAW_ESTABLISHED",
    twin_fork_collision_detected: birthCollision.final_standing === "OCCURRENCE_BIRTH_COLLISION_DETECTED",
    occurrence_scoped_addressability_no_po_b_leak: poAGapBefore.unobserved_matter_refs.includes(matters.poAOnly.matter_ref) &&
      !poBGapBefore.addressable_matter_refs.includes(matters.poAOnly.matter_ref),
    activation_admission_required: activationAdmitted.final_standing === "ACTIVATION_ADMITTED" &&
      activationDuplicateSuppressed.final_standing === "ACTIVATION_NOT_ADMITTED" &&
      activationBudgetBlocked.final_standing === "ACTIVATION_NOT_ADMITTED",
    context_laundering_blocked: contextInheritance.context_grade === "CONTENT_POSSESSED" &&
      contextInheritance.may_establish_observed_relation === false &&
      poAGapBefore.unobserved_matter_refs.includes(matters.probe.matter_ref),
    lawful_convergence_by_observation_event: poAGapAfter.observed_matter_refs.includes(matters.probe.matter_ref) &&
      poAGocheckitProbe.observation.event_ref !== poBObservedProbe.observation.event_ref,
    terminated_receipts_do_not_make_live_observer: poBTerminated.occurrence_status === "TERMINATED" &&
      terminatedGap.occurrence_status === "TERMINATED",
    successor_context_does_not_inherit_observed_set: poCGap.observed_matter_refs.length === 0 &&
      poC.context_inherited_not_observation_inherited === true,
    equal_current_knowledge_not_equal_history: poAGapAfter.observed_matter_refs.length === poBGapAfter.observed_matter_refs.length &&
      poAGocheckitProbe.observation.event_ref !== poBObservedProbe.observation.event_ref,
    launch_observed_standing_requires_authorship_gate: [
      poAObservedBase,
      poBObservedBase,
      poBObservedProbe,
      poAGocheckitProbe
    ].every((candidate) => candidate.launch_observed_standing.final_standing === "LAUNCH_OBSERVED_STANDING_ACCEPTED"),
    session_union_inspected_or_explicitly_not_inspected: [
      "SESSION_FILE_UNION_NOT_INSPECTED",
      "SESSION_FILE_NOT_FOUND",
      "SESSION_FILE_UNION_EVIDENCE_INCOMPLETE",
      "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK",
      "SESSION_FILE_UNION_RISK_NOT_OBSERVED"
    ].includes(sessionUnion.final_standing)
  };
  const gatedObservationCandidates = [
    poAObservedBase,
    poBObservedBase,
    poBObservedProbe,
    poAGocheckitProbe
  ];
  const executedExclusionResults = executeT0CounterfeitExclusions({
    commline,
    participation,
    poA,
    poB,
    poABirth,
    poBBirth,
    sourceMatter: matters.probe,
    keyRegistry: occurrenceKeyRegistry,
    signing: {
      poA: poAKey,
      poB: poBKey
    },
    validPoAObservationCandidate: poAGocheckitProbe,
    validPoBObservationCandidate: poBObservedProbe
  });
  const ackCompositionResult = buildAckCompositionResult({
    validObservationCandidate: poAGocheckitProbe,
    rawObservationCandidate: rawUnauthoredProbeCandidate,
    sourceMatter: matters.probe
  });
  const bindRepairResult = buildBindRepairResult({ executedExclusionResults });
  const launchRuntimeObservationSet = {
    source: "LAUNCH_OBSERVED_STANDING_GATE_ACCEPTED_EVENTS",
    observed_relations: gatedObservationCandidates
      .filter((candidate) => candidate.launch_observed_standing.may_advance_observed_standing)
      .map((candidate) => ({
        participation_ref: candidate.participation_ref,
        participation_occurrence_ref: candidate.participation_occurrence_ref,
        matter_ref: candidate.source_matter_ref,
        observation_ref: candidate.observation.event_ref,
        attribution_preimage_ref: candidate.authorship_adjudication.adjudication_identity,
        binding_preimage_ref: candidate.binding_preimage.binding_preimage_identity,
        observed_standing: candidate.launch_observed_standing.observed_standing
      })),
    rejected_relations: [rawUnauthoredProbeCandidate]
      .filter((candidate) => candidate.launch_observed_standing.may_advance_observed_standing !== true)
      .map((candidate) => ({
        observation_ref: candidate.observation?.event_ref ?? null,
        matter_ref: candidate.observation?.payload?.source_matter_ref ?? null,
        observed_standing: "NO_OBSERVED_STANDING"
      }))
  };

  const report = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    artifact_status: "LAUNCH_READINESS_ALGEBRA_NOT_LAUNCH",
    commline,
    participation,
    participation_occurrences: [poA, poB, poBTerminated, poC],
    birth: {
      records: [poABirth, poBBirth, poCBirth],
      adjudication: birthAdjudication,
      collision_fixture: {
        records: collisionBirths,
        adjudication: birthCollision
      }
    },
    occurrence_key_registry: occurrenceKeyRegistry,
    duty_cases: dutyCases,
    activation_admission: {
      admitted: activationAdmitted,
      duplicate_suppressed: activationDuplicateSuppressed,
      budget_blocked: activationBudgetBlocked,
      founder_gate_denied: activationFounderGateDenied
    },
    context_laundering: contextInheritance,
    fork_observation: {
      po_a_gap_before: poAGapBefore,
      po_b_gap_before: poBGapBefore,
      po_a_gocheckit_probe: poAGocheckitProbe,
      po_a_gap_after: poAGapAfter,
      po_b_gap_after: poBGapAfter,
      terminated_gap: terminatedGap,
      successor_gap: poCGap
    },
    authorship_gated_observation: {
      candidates: gatedObservationCandidates.map(summarizeCandidate),
      accepted_observation_refs: acceptedLaunchObservations(gatedObservationCandidates).map((observation) => observation.event_ref),
      raw_bypass_fixture: summarizeCandidate({
        ...rawUnauthoredProbeCandidate,
        source_matter_ref: matters.probe.matter_ref,
        participation_occurrence_ref: poA.participation_occurrence_ref,
        binding_preimage: { final_standing: "NOT_ADJUDICATED_RAW_BYPASS" },
        authorship_adjudication: { final_standing: "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED" },
        launch_observed_standing: rawUnauthoredProbeCandidate.launch_observed_standing
      })
    },
    ack_composition_result: ackCompositionResult,
    executed_exclusion_results: executedExclusionResults,
    bind_repair_result: bindRepairResult,
    launch_runtime_observation_set: launchRuntimeObservationSet,
    session_file_union: sessionUnion,
    checks,
    final_standing: Object.values(checks).every(Boolean)
      ? "LAUNCH_READINESS_ALGEBRA_ESTABLISHED"
      : "LAUNCH_READINESS_ALGEBRA_BLOCKED",
    ontology_removed: [
      "WRITABLE_OBSERVATION_OBLIGATION",
      "STANDALONE_EPISTEMIC_FORK",
      "CURRENT_INSELFACTION_OBJECT",
      "READINESS_ENUM_OBJECTS",
      "EPISTEMIC_HISTORY_OBJECT",
      "TERMINATED_WITH_NONTRANSFERRED_OBSERVATIONS_STATE"
    ],
    surviving_laws: [
      "Observation duty is derivation-only from authorized source chain.",
      "Occurrence birth registration is required before attention activation.",
      "ActivationAdmission guards possible attention demand before entered attention.",
      "Context can describe or contain Matter without creating Observed standing.",
      "A terminated occurrence leaves historical evidence without remaining a live observer."
    ]
  };
  report.report_identity = digestObject(report);
  return report;
}

export function buildIndependentAttackBattery() {
  const attacks = [
    "unauthorized obligation source",
    "self-minted obligation",
    "cross-occurrence obligation injection",
    "ancestor-ref impersonation",
    "two simultaneous forks claiming one occurrence ref",
    "terminated occurrence receipt replayed as live observation",
    "RECEIPTED substituted for OBSERVED",
    "context inherited substituted for observed",
    "shared SELF_REF causing observation union",
    "shared SELF_REF causing notification leakage",
    "duplicate notification",
    "lost notification",
    "notification after observation",
    "notification before custody",
    "stale obligation after termination",
    "obligation satisfied by wrong occurrence",
    "equal current knowledge used to erase divergent history",
    "authority inherited through context ancestry"
  ];
  const battery = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "INDEPENDENT_ATTACK_BATTERY_DESIGN",
    status: "DESIGNED_NOT_INDEPENDENTLY_EXECUTED",
    attacks,
    minimum_highest_power_subset: REQUIRED_R4_ATTACK_COVERAGE,
    independent_author_required: true
  };
  battery.battery_identity = digestObject(battery);
  return battery;
}

export function createSyntheticR4Receipt({
  receiptRef = "R4_SYNTHETIC_VALID_RECEIPT",
  launchSubjectIdentity = "sha256:SYNTHETIC_LAUNCH_SUBJECT",
  subjectIdentity = launchSubjectIdentity,
  receiptStanding = "VALID_R4_RECEIPT",
  attackCoverageRefs = REQUIRED_R4_ATTACK_COVERAGE,
  independenceStanding = "INDEPENDENCE_ESTABLISHED",
  topLevelSeat = true,
  noContextInheritance = true,
  noBuilderReasoning = true,
  reviewerRole = "INDEPENDENT_HOSTILE"
} = {}) {
  const receipt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "R4_INDEPENDENT_HOSTILE_RECEIPT_SYNTHETIC_FIXTURE",
    receipt_ref: receiptRef,
    receipt_standing: receiptStanding,
    subject_identity: subjectIdentity,
    attack_coverage_refs: [...attackCoverageRefs],
    independence: {
      standing: independenceStanding,
      reviewer_role: reviewerRole,
      top_level_seat: topLevelSeat,
      no_context_inheritance: noContextInheritance,
      no_builder_reasoning: noBuilderReasoning
    },
    synthetic_fixture_not_r4_execution: true
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

export function adjudicateG5IndependentHostileReceipt({
  r4Receipt = null,
  launchSubjectIdentity = null,
  requiredAttackCoverage = REQUIRED_R4_ATTACK_COVERAGE
} = {}) {
  const coverage = r4Receipt?.attack_coverage_refs ?? [];
  const missingCoverage = requiredAttackCoverage.filter((attack) => !coverage.includes(attack));
  const checks = {
    valid_r4_receipt: r4Receipt?.receipt_standing === "VALID_R4_RECEIPT",
    exact_subject_identity_match: Boolean(launchSubjectIdentity) &&
      r4Receipt?.subject_identity === launchSubjectIdentity,
    required_attack_coverage: missingCoverage.length === 0 && requiredAttackCoverage.length > 0,
    required_independence: r4Receipt?.independence?.standing === "INDEPENDENCE_ESTABLISHED" &&
      r4Receipt?.independence?.reviewer_role === "INDEPENDENT_HOSTILE" &&
      r4Receipt?.independence?.top_level_seat === true &&
      r4Receipt?.independence?.no_context_inheritance === true &&
      r4Receipt?.independence?.no_builder_reasoning === true
  };
  const errors = [];
  if (!r4Receipt) errors.push("NO_VALID_R4_RECEIPT");
  if (!launchSubjectIdentity) errors.push("LAUNCH_SUBJECT_IDENTITY_MISSING");
  if (r4Receipt && !checks.valid_r4_receipt) errors.push("R4_RECEIPT_NOT_VALID");
  if (r4Receipt && !checks.exact_subject_identity_match) errors.push("R4_SUBJECT_IDENTITY_MISMATCH");
  if (r4Receipt && !checks.required_attack_coverage) errors.push("REQUIRED_ATTACK_COVERAGE_MISSING");
  if (r4Receipt && !checks.required_independence) errors.push("REQUIRED_INDEPENDENCE_NOT_ESTABLISHED");

  const mayPass = Object.values(checks).every(Boolean);
  const invalidReceipt = Boolean(r4Receipt) && r4Receipt.receipt_standing?.startsWith("INVALID");
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "G5_INDEPENDENT_HOSTILE_INSTRUMENT_RESULT",
    rule: "NO_VALID_R4_RECEIPT -> G5 BLOCKED; valid R4 receipt plus exact subject identity, coverage, and independence -> G5 MAY PASS.",
    r4_executed_in_this_seat: false,
    execution_derived: false,
    receipt_derived: Boolean(r4Receipt),
    launch_subject_identity: launchSubjectIdentity,
    required_attack_coverage: [...requiredAttackCoverage],
    supplied_receipt_identity: r4Receipt?.receipt_identity ?? null,
    checks,
    missing_attack_coverage: missingCoverage,
    errors,
    may_pass: mayPass,
    control_disposition: mayPass
      ? LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
      : invalidReceipt
        ? LAUNCH_CONTROL_DISPOSITIONS.FAILED
        : LAUNCH_CONTROL_DISPOSITIONS.BLOCKED,
    final_standing: mayPass
      ? "G5_MAY_PASS_FROM_VALID_R4_RECEIPT"
      : invalidReceipt
        ? "G5_FAILED_INVALID_R4_RECEIPT"
        : "G5_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildLocalT2PredecessorEvidence() {
  const receipt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T2_LOCAL_CANDIDATE_EVIDENCE_RECONTACT",
    receipt_exists: true,
    source_artifacts: [
      "doctrine/DMB-CAUSAL-MATTER-CONTINUITY-ATTACK-REPORT-v0.1-CANDIDATE.md",
      "inselfactions/ISA-20260829-DMB-CAUSAL-MATTER-CONTINUITY-ATTACK-REPORT-001.json"
    ],
    t_input_disposition: "REDUCED_TO_T2",
    theorem_disposition: "NOT_RATIFIED",
    subject_binding: "T_INPUT_REDUCTION_NOT_BOUND_TO_SELFCOMMUNICATION_LIVE_V0_LAUNCH_SUBJECT",
    patient_zero_binding: "NOT_BOUND",
    participation_binding: "NOT_BOUND",
    observation_occurrence: "NOT_ESTABLISHED",
    standing_ceiling: "CANDIDATE_REDUCTION_ONLY",
    implementation_authority_in_source_evidence: "NOT_AUTHORIZED"
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

export function recomputeG6CurrentStanding({
  historicalStanding = "HELD_UNOBSERVED_HOSTILE_MATTER",
  matterRef = "5464975482",
  t2GateResult = null
} = {}) {
  const laterObservationEstablished =
    t2GateResult?.final_standing === "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED" &&
    t2GateResult?.t2_observation_occurrence === "ESTABLISHED";
  const missingRelations = laterObservationEstablished
    ? []
    : Object.entries(t2GateResult?.checks ?? {})
      .filter(([, value]) => value !== true)
      .map(([key]) => key);
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "G6_CURRENT_STANDING_RECOMPUTATION",
    matter_ref: matterRef,
    historical_standing: historicalStanding,
    historical_g6_preserved: true,
    historical_g6_not_current_g6: true,
    latest_event_not_current_standing: true,
    latest_event: t2GateResult?.result_identity ?? "NO_T2_GATE_RESULT",
    t2_gate_result_identity: t2GateResult?.result_identity ?? null,
    lawful_later_observation_established: laterObservationEstablished,
    missing_relations: missingRelations,
    current_standing: laterObservationEstablished
      ? "CURRENT_G6_LATER_OBSERVATION_ESTABLISHED"
      : "CURRENT_G6_HELD_UNOBSERVED_HOSTILE_MATTER_NO_LATER_OBSERVATION",
    control_disposition: laterObservationEstablished
      ? LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
      : LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
  };
  result.result_identity = digestObject(result);
  return result;
}

export function createSyntheticT2Receipt({
  launchTarget = "SELFCOMMUNICATION_LIVE_V0",
  launchSubjectIdentity = null,
  patientZeroMatterRef = "5464975482",
  participationRef = "P_CLAUDE_LAUNCH_READINESS"
} = {}) {
  const receipt = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T2_PREDECESSOR_RECEIPT_SYNTHETIC_FIXTURE",
    receipt_exists: true,
    subject_binding: launchTarget,
    subject_identity_binding: launchSubjectIdentity,
    patient_zero_binding: patientZeroMatterRef,
    participation_binding: participationRef,
    observation_occurrence: "ESTABLISHED",
    standing_ceiling: "LOAD_BEARING_PREDECESSOR_ONLY",
    t2_not_truth_authority_effect_or_launch_readiness: true,
    synthetic_fixture_not_t2_execution: true
  };
  receipt.receipt_identity = digestObject(receipt);
  return receipt;
}

export function adjudicateT2Predecessor({
  t2Receipt = buildLocalT2PredecessorEvidence(),
  launchTarget = "SELFCOMMUNICATION_LIVE_V0",
  launchSubjectIdentity = null,
  patientZeroMatterRef = "5464975482",
  participationRef = "P_CLAUDE_LAUNCH_READINESS"
} = {}) {
  const requiredBindingStandings = t2Receipt?.required_binding_standings ?? null;
  const requiredBindingsEstablished = requiredBindingStandings
    ? [
      "T2_SUBJECT_BINDING",
      "T2_PATIENT_ZERO_BINDING",
      "T2_PARTICIPATION_BINDING",
      "T2_OBSERVATION_OCCURRENCE",
      "T2_STANDING_CEILING"
    ].every((bindingRef) => requiredBindingStandings[bindingRef] === "ESTABLISHED")
    : true;
  const subjectNameBinds = t2Receipt?.subject_binding === launchTarget;
  const subjectIdentityBinds = launchSubjectIdentity
    ? t2Receipt?.subject_identity_binding === launchSubjectIdentity
    : true;
  const checks = {
    t2_receipt_exists: t2Receipt?.receipt_exists === true,
    t2_subject_binding: subjectNameBinds && subjectIdentityBinds,
    t2_patient_zero_binding: t2Receipt?.patient_zero_binding === patientZeroMatterRef,
    t2_participation_binding: t2Receipt?.participation_binding === participationRef,
    t2_observation_occurrence: t2Receipt?.observation_occurrence === "ESTABLISHED",
    t2_standing_ceiling: t2Receipt?.standing_ceiling === "LOAD_BEARING_PREDECESSOR_ONLY",
    t2_required_bindings_established: requiredBindingsEstablished
  };
  const satisfied = Object.values(checks).every(Boolean);
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "T2_PREDECESSOR_GATE_RESULT",
    launch_target: launchTarget,
    launch_subject_identity: launchSubjectIdentity,
    patient_zero_matter_ref: patientZeroMatterRef,
    participation_ref: participationRef,
    receipt_identity: t2Receipt?.receipt_identity ?? null,
    t2_receipt_exists: checks.t2_receipt_exists,
    t2_subject_binding: t2Receipt?.subject_binding ?? "MISSING",
    t2_subject_identity_binding: t2Receipt?.subject_identity_binding ?? "MISSING",
    t2_patient_zero_binding: t2Receipt?.patient_zero_binding ?? "MISSING",
    t2_participation_binding: t2Receipt?.participation_binding ?? "MISSING",
    t2_observation_occurrence: t2Receipt?.observation_occurrence ?? "MISSING",
    t2_standing_ceiling: t2Receipt?.standing_ceiling ?? "MISSING",
    required_binding_standings: requiredBindingStandings,
    t2_evidence_exists_not_t2_gate_dominates_launch: true,
    t2_not_truth_authority_effect_or_launch_readiness: true,
    checks,
    control_disposition: satisfied
      ? LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
      : checks.t2_receipt_exists
        ? LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
        : LAUNCH_CONTROL_DISPOSITIONS.MISSING,
    final_standing: satisfied
      ? "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED"
      : checks.t2_receipt_exists
        ? "T2_PREDECESSOR_BLOCKED_BY_BINDING_GAP"
        : "T2_PREDECESSOR_MISSING"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildLaunchGateIdentityMap({ gates = {} } = {}) {
  const rows = Object.entries(gates).map(([symbol, gate]) => {
    const metadata = LAUNCH_GATE_METADATA[symbol] ?? {};
    const row = {
      gate_id: gate.gate_id ?? metadata.gate_id ?? symbol,
      current_symbol: symbol,
      source: gate.source ?? metadata.source ?? "UNKNOWN_SOURCE",
      semantic_question: gate.semantic_question ?? metadata.semantic_question ?? "UNKNOWN_SEMANTIC_QUESTION",
      input_preimage: gate.input_preimage ?? [],
      output_standing: gate.output_standing ?? gate.control_disposition ?? LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN,
      consumed_by: gate.consumed_by ?? metadata.consumed_by ?? ["adjudicateLaunchDecision"],
      launch_relevance: gate.launch_relevance ?? metadata.launch_relevance ?? "REQUIRED",
      homonyms: gate.homonyms ?? metadata.homonyms ?? [],
      collisions: gate.collisions ?? metadata.collisions ?? [],
      historical_aliases: gate.historical_aliases ?? metadata.historical_aliases ?? []
    };
    row.identity_map_row_identity = digestObject(row);
    return row;
  });
  const conceptualG7 = {
    ...LAUNCH_GATE_METADATA.G7_CONTEXT_PROVENANCE_CLOSURE,
    current_symbol: "G7",
    input_preimage: ["NEW_FREEZE_REQUIRED_BEFORE_G7"],
    output_standing: "NOT_EXECUTED",
    launch_relevance: "NEXT_FRONTIER_NOT_CURRENT_LAUNCH_GATE"
  };
  conceptualG7.identity_map_row_identity = digestObject(conceptualG7);
  return [...rows, conceptualG7];
}

export function buildG7HomonymMap() {
  const map = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "G7_HOMONYM_MAP",
    same_label_not_same_gate: true,
    same_gate_not_same_question: true,
    conceptual_g7: LAUNCH_GATE_METADATA.G7_CONTEXT_PROVENANCE_CLOSURE,
    implementation_g7: LAUNCH_GATE_METADATA.g7_session_file_union_attack,
    founder_naming_routing_election: {
      uppercase_g7: "G7_CONTEXT_PROVENANCE_CLOSURE",
      lowercase_g7: "g7_SESSION_FILE_UNION_CONTEXT_LAUNDERING_ATTACK",
      evidence_direction: "lowercase implementation attack may provide evidence to uppercase conceptual closure theorem"
    },
    founder_naming_routing_election_required: [],
    final_standing: "G7_ROUTING_AMBIGUITY_CLOSED_BY_FOUNDER"
  };
  map.map_identity = digestObject(map);
  return map;
}

export function adjudicateLaunchDecision({
  gates = {},
  requiredGateRefs = REQUIRED_LAUNCH_GATE_REFS
} = {}) {
  const launchBlockers = [];
  for (const gateRef of requiredGateRefs) {
    const gate = gates[gateRef];
    if (!gate) {
      launchBlockers.push({
        gate_ref: gateRef,
        control_disposition: LAUNCH_CONTROL_DISPOSITIONS.MISSING,
        standing: null,
        blocker_reason: "MISSING_REQUIRED_GATE"
      });
      continue;
    }
    const controlDisposition = normalizeLaunchControlDisposition(gate.control_disposition);
    if (!SATISFYING_LAUNCH_CONTROL_DISPOSITIONS.has(controlDisposition)) {
      launchBlockers.push({
        gate_ref: gateRef,
        control_disposition: controlDisposition,
        standing: gate.standing ?? null,
        blocker_reason: controlDisposition === LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN
          ? "UNKNOWN_OR_UNRECOGNIZED_CONTROL_DISPOSITION"
          : `CONTROL_DISPOSITION_${controlDisposition}`
      });
    }
  }
  const decision = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "LAUNCH_DECISION_ADJUDICATION",
    required_gate_refs: [...requiredGateRefs],
    consumed_control_field: "control_disposition",
    display_projection_not_control_input: true,
    presentation_strings_carry_control_authority: false,
    launch_decision: launchBlockers.length === 0 ? "LAUNCH_READY_BOUNDED" : "NO_LAUNCH",
    launch_blockers: launchBlockers,
    conservative_constant_not_adjudicator: true
  };
  decision.decision_identity = digestObject(decision);
  return decision;
}

export function createSyntheticGateVector({ overrides = {}, omit = [] } = {}) {
  const gates = Object.fromEntries(REQUIRED_LAUNCH_GATE_REFS.map((gateRef) => [
    gateRef,
    createLaunchGate({
      currentSymbol: gateRef,
      standing: "PASS",
      controlDisposition: LAUNCH_CONTROL_DISPOSITIONS.SATISFIED,
      evidenceRef: "SYNTHETIC_VECTOR"
    })
  ]));
  for (const gateRef of omit) delete gates[gateRef];
  for (const [gateRef, override] of Object.entries(overrides)) {
    gates[gateRef] = createLaunchGate({
      currentSymbol: gateRef,
      standing: override.standing ?? "PASS",
      controlDisposition: override.control_disposition ?? override.controlDisposition ?? LAUNCH_CONTROL_DISPOSITIONS.SATISFIED,
      evidenceRef: override.evidence_ref ?? "SYNTHETIC_VECTOR",
      rawStanding: override.raw_standing ?? null
    });
  }
  return gates;
}

export function runLaunchDecisionSensitivityTests() {
  const cases = [
    {
      case_ref: "ALL_REQUIRED_PASS",
      gates: createSyntheticGateVector(),
      expected_decision: "LAUNCH_READY_BOUNDED"
    },
    {
      case_ref: "ONE_BLOCKED",
      gates: createSyntheticGateVector({
        overrides: {
          g4_activation_admission: {
            standing: "PASS display text with blocked control",
            control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
          }
        }
      }),
      expected_decision: "NO_LAUNCH"
    },
    {
      case_ref: "ONE_FAIL",
      gates: createSyntheticGateVector({
        overrides: {
          g2_occurrence_birth: {
            standing: "FAIL",
            control_disposition: LAUNCH_CONTROL_DISPOSITIONS.FAILED
          }
        }
      }),
      expected_decision: "NO_LAUNCH"
    },
    {
      case_ref: "ONE_UNKNOWN",
      gates: createSyntheticGateVector({
        overrides: {
          g8_authorship_dominance: {
            standing: "UNKNOWN",
            control_disposition: LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN
          }
        }
      }),
      expected_decision: "NO_LAUNCH"
    },
    {
      case_ref: "MISSING_REQUIRED_GATE",
      gates: createSyntheticGateVector({ omit: ["g7_session_file_union_attack"] }),
      expected_decision: "NO_LAUNCH"
    },
    {
      case_ref: "VALID_G5_ABSENT",
      gates: createSyntheticGateVector({
        overrides: {
          g5_independent_hostile_pass: {
            standing: "BLOCKED_NOT_INDEPENDENTLY_EXECUTED",
            control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
          }
        }
      }),
      expected_decision: "NO_LAUNCH"
    },
    {
      case_ref: "T2_ABSENT",
      gates: createSyntheticGateVector({ omit: ["t2_causal_matter_predecessor"] }),
      expected_decision: "NO_LAUNCH"
    }
  ];
  return cases.map((entry) => {
    const adjudication = adjudicateLaunchDecision({ gates: entry.gates });
    const row = {
      case_ref: entry.case_ref,
      expected_decision: entry.expected_decision,
      actual_decision: adjudication.launch_decision,
      blockers: adjudication.launch_blockers,
      discriminated: adjudication.launch_decision === entry.expected_decision
    };
    row.case_identity = digestObject(row);
    return row;
  });
}

export function runBlockerSemanticHostileFixtures() {
  const fixtures = [
    {
      fixture_ref: "B1_ESTABLISHED_RISK_DISPLAY_PASS",
      overrides: {
        g1_derivation_only_obligation: {
          standing: "PASS ESTABLISHED_RISK",
          control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B2_BLOCKED_WITH_MITIGATION_LABEL",
      overrides: {
        g2_occurrence_birth: {
          standing: "BLOCKED mitigated in display label",
          control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B3_HELD_UNOBSERVED_HOSTILE_MATTER",
      overrides: {
        g6_claude_gap_disposition: {
          standing: "HELD_UNOBSERVED_AS_HOSTILE_MATTER",
          control_disposition: LAUNCH_CONTROL_DISPOSITIONS.BLOCKED
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B4_UNKNOWN_STANDING",
      overrides: {
        g8_authorship_dominance: {
          standing: "UNKNOWN",
          control_disposition: LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B5_UNRECOGNIZED_STANDING_SPECIES",
      overrides: {
        g9_ack_composition: {
          standing: "MAYBE_PASSISH",
          control_disposition: "UNRECOGNIZED_SPECIES"
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B6_VALID_PASS",
      overrides: {},
      expected_decision: "LAUNCH_READY_BOUNDED"
    },
    {
      fixture_ref: "B7_EXPLICIT_FAIL",
      overrides: {
        g10_bind_repair: {
          standing: "FAIL",
          control_disposition: LAUNCH_CONTROL_DISPOSITIONS.FAILED
        }
      },
      expected_decision: "NO_LAUNCH"
    },
    {
      fixture_ref: "B8_MISSING_REQUIRED_GATE",
      overrides: {},
      omit: ["g5_independent_hostile_pass"],
      expected_decision: "NO_LAUNCH"
    }
  ];
  return fixtures.map((fixture) => {
    const adjudication = adjudicateLaunchDecision({
      gates: createSyntheticGateVector({
        overrides: fixture.overrides,
        omit: fixture.omit ?? []
      })
    });
    const row = {
      fixture_ref: fixture.fixture_ref,
      expected_decision: fixture.expected_decision,
      actual_decision: adjudication.launch_decision,
      blockers: adjudication.launch_blockers,
      display_projection_not_control_input: adjudication.display_projection_not_control_input,
      passed: adjudication.launch_decision === fixture.expected_decision
    };
    row.fixture_identity = digestObject(row);
    return row;
  });
}

export function buildBlockerSemanticsResult() {
  const hostileFixtures = runBlockerSemanticHostileFixtures();
  const result = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    object_type: "BLOCKER_SEMANTICS_RESULT",
    required_architecture: "LAUNCH_DECISION_CONSUMES_TYPED_SEMANTIC_DISPOSITIONS",
    display_projection_not_control_input: true,
    presentation_strings_carry_control_authority: false,
    prohibited_logic: [
      "startsWith(\"PASS\")",
      "contains(\"PASS\")",
      "label whitelist",
      "display-text exemption"
    ],
    hostile_fixture_results: hostileFixtures,
    final_standing: hostileFixtures.every((entry) => entry.passed)
      ? "BLOCKER_SEMANTICS_TYPED_CONTROL_ESTABLISHED"
      : "BLOCKER_SEMANTICS_BLOCKED"
  };
  result.result_identity = digestObject(result);
  return result;
}

export function buildSelfcommunicationLaunchReadinessReport({
  executeTransport = true,
  sessionFilePath = null,
  sessionEvidence = null,
  launchSubjectIdentity = null,
  r4Receipt = null,
  t2Receipt = buildLocalT2PredecessorEvidence()
} = {}) {
  const commlineReport = buildCommlineObservationGapReport();
  const authorshipReport = buildObservationAuthorshipReport();
  const transportReport = executeTransport ? runTransportIndependentRoundtrip() : null;
  const algebraReport = buildLaunchReadinessAlgebraReport({ sessionFilePath, sessionEvidence });
  const attackBattery = buildIndependentAttackBattery();
  const f1F6ProofCompilation = buildF1F6ProofCompilation();
  const standingPathCensus = buildStandingPathCensus();
  const executedExclusionResults = algebraReport.executed_exclusion_results;
  const t0CounterfeitMatrix = buildT0CounterfeitMatrix({
    proofCompilation: f1F6ProofCompilation,
    executedExclusionResults
  });
  const class1SiblingResult = buildClass1SiblingResult({ t0CounterfeitMatrix });
  const t1Result = buildT1BoundaryResult({ algebraReport });
  const t15Result = buildT15ActivationDeniedResult({ t1Result, algebraReport });
  const f1F6Replay = buildF1F6Replay({
    proofCompilation: f1F6ProofCompilation,
    t0CounterfeitMatrix,
    class1SiblingResult,
    t1Result,
    t15Result
  });
  const ackCompositionResult = algebraReport.ack_composition_result;
  const bindRepairResult = algebraReport.bind_repair_result;
  const authorshipDominanceResult = buildAuthorshipDominanceResult({
    standingPathCensus,
    algebraReport,
    t0CounterfeitMatrix
  });
  const g5InstrumentResult = adjudicateG5IndependentHostileReceipt({
    r4Receipt,
    launchSubjectIdentity,
    requiredAttackCoverage: attackBattery.minimum_highest_power_subset
  });
  const t2GateResult = adjudicateT2Predecessor({ t2Receipt, launchSubjectIdentity });
  const g6CurrentStandingResult = recomputeG6CurrentStanding({ t2GateResult });
  const blockerSemanticsResult = buildBlockerSemanticsResult();
  const launchDecisionSensitivityTests = runLaunchDecisionSensitivityTests();

  const gates = {
    g1_derivation_only_obligation: createLaunchGate({
      currentSymbol: "g1_derivation_only_obligation",
      standing: algebraReport.checks.obligation_derivation_only ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(algebraReport.checks.obligation_derivation_only),
      evidenceRef: algebraReport.report_identity,
      inputPreimage: ["duty_cases"]
    }),
    g2_occurrence_birth: createLaunchGate({
      currentSymbol: "g2_occurrence_birth",
      standing: algebraReport.checks.occurrence_birth_registered && algebraReport.checks.twin_fork_collision_detected ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(
        algebraReport.checks.occurrence_birth_registered && algebraReport.checks.twin_fork_collision_detected
      ),
      evidenceRef: algebraReport.birth.adjudication.adjudication_identity,
      inputPreimage: ["birth.adjudication", "birth.collision_fixture"]
    }),
    g3_occurrence_addressing: createLaunchGate({
      currentSymbol: "g3_occurrence_addressing",
      standing: algebraReport.checks.occurrence_scoped_addressability_no_po_b_leak
        ? "PASS_WITH_REGISTERED_OCCURRENCE_SCOPE"
        : "FAIL",
      controlDisposition: controlDispositionFromBoolean(algebraReport.checks.occurrence_scoped_addressability_no_po_b_leak),
      evidenceRef: algebraReport.report_identity,
      inputPreimage: ["fork_observation.po_a_gap_before", "fork_observation.po_b_gap_before"]
    }),
    g4_activation_admission: createLaunchGate({
      currentSymbol: "g4_activation_admission",
      standing: algebraReport.checks.activation_admission_required ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(algebraReport.checks.activation_admission_required),
      evidenceRef: first([
        algebraReport.activation_admission.admitted.activation_admission_identity,
        algebraReport.activation_admission.duplicate_suppressed.activation_admission_identity
      ]),
      inputPreimage: ["activation_admission"]
    }),
    g5_independent_hostile_pass: createLaunchGate({
      currentSymbol: "g5_independent_hostile_pass",
      standing: g5InstrumentResult.may_pass ? "PASS_VALID_R4_RECEIPT" : g5InstrumentResult.final_standing,
      controlDisposition: g5InstrumentResult.control_disposition,
      evidenceRef: g5InstrumentResult.result_identity,
      inputPreimage: [
        launchSubjectIdentity ?? "LAUNCH_SUBJECT_IDENTITY_MISSING",
        r4Receipt?.receipt_identity ?? "NO_VALID_R4_RECEIPT"
      ],
      g5_instrument_result: g5InstrumentResult
    }),
    g6_claude_gap_disposition: createLaunchGate({
      currentSymbol: "g6_claude_gap_disposition",
      standing: g6CurrentStandingResult.current_standing,
      controlDisposition: g6CurrentStandingResult.control_disposition,
      evidenceRef: g6CurrentStandingResult.result_identity,
      matter_ref: "5464975482",
      inputPreimage: ["5464975482", t2GateResult.result_identity],
      historical_standing: g6CurrentStandingResult.historical_standing,
      g6_current_standing_result: g6CurrentStandingResult
    }),
    g7_session_file_union_attack: createLaunchGate({
      currentSymbol: "g7_session_file_union_attack",
      standing: projectSessionUnionGateStanding(algebraReport.session_file_union.final_standing),
      controlDisposition: projectSessionUnionGateControlDisposition(algebraReport.session_file_union.final_standing),
      raw_standing: algebraReport.session_file_union.final_standing,
      evidenceRef: algebraReport.session_file_union.inspection_identity ?? null,
      inputPreimage: [algebraReport.session_file_union.final_standing]
    }),
    t1_patient_zero_false: createLaunchGate({
      currentSymbol: "t1_patient_zero_false",
      standing: t1Result.final_standing === "T1_ESTABLISHED" ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(t1Result.final_standing === "T1_ESTABLISHED"),
      evidenceRef: t1Result.result_identity,
      inputPreimage: [t1Result.result_identity]
    }),
    t1_5_activation_denied: createLaunchGate({
      currentSymbol: "t1_5_activation_denied",
      standing: t15Result.final_standing === "T1_5_ESTABLISHED" ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(t15Result.final_standing === "T1_5_ESTABLISHED"),
      evidenceRef: t15Result.result_identity,
      inputPreimage: [t15Result.result_identity]
    }),
    t2_causal_matter_predecessor: createLaunchGate({
      currentSymbol: "t2_causal_matter_predecessor",
      standing: t2GateResult.control_disposition === LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
        ? "PASS_LOAD_BEARING_PREDECESSOR"
        : t2GateResult.final_standing,
      controlDisposition: t2GateResult.control_disposition,
      evidenceRef: t2GateResult.result_identity,
      inputPreimage: [t2Receipt?.receipt_identity ?? "NO_T2_RECEIPT"],
      t2_gate_result: t2GateResult
    }),
    g8_authorship_dominance: createLaunchGate({
      currentSymbol: "g8_authorship_dominance",
      standing: authorshipDominanceResult.final_standing === "AUTHORSHIP_GATE_DOMINATES_LAUNCH_ALGEBRA" ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(
        authorshipDominanceResult.final_standing === "AUTHORSHIP_GATE_DOMINATES_LAUNCH_ALGEBRA"
      ),
      evidenceRef: authorshipDominanceResult.result_identity,
      inputPreimage: [authorshipDominanceResult.result_identity]
    }),
    g9_ack_composition: createLaunchGate({
      currentSymbol: "g9_ack_composition",
      standing: ackCompositionResult.final_standing === "ACK_COMPOSITION_ESTABLISHED" ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(ackCompositionResult.final_standing === "ACK_COMPOSITION_ESTABLISHED"),
      evidenceRef: ackCompositionResult.result_identity,
      inputPreimage: [ackCompositionResult.result_identity]
    }),
    g10_bind_repair: createLaunchGate({
      currentSymbol: "g10_bind_repair",
      standing: bindRepairResult.final_standing === "BIND_REPAIR_ESTABLISHED" ? "PASS" : "FAIL",
      controlDisposition: controlDispositionFromBoolean(bindRepairResult.final_standing === "BIND_REPAIR_ESTABLISHED"),
      evidenceRef: bindRepairResult.result_identity,
      inputPreimage: [bindRepairResult.result_identity]
    })
  };

  const launchDecisionAdjudication = adjudicateLaunchDecision({ gates });
  const launchBlockers = launchDecisionAdjudication.launch_blockers;
  const launchGateIdentityMap = buildLaunchGateIdentityMap({ gates });
  const g7HomonymMap = buildG7HomonymMap();

  const report = {
    schema: SELFCOMMUNICATION_LAUNCH_READINESS_SCHEMA,
    artifact_status: "SELFCOMMUNICATION_LIVE_V0_LAUNCH_READINESS_RUN",
    launch_target: "SELFCOMMUNICATION_LIVE_V0",
    launch_invariants: LAUNCH_INVARIANTS,
    predecessor_reports: {
      commline: {
        final_standing: commlineReport.final_standing,
        report_identity: commlineReport.report_identity
      },
      observation_authorship: {
        final_standing: authorshipReport.final_standing,
        report_identity: authorshipReport.report_identity
      },
      transport_independence: transportReport
        ? {
          final_standing: transportReport.final_standing,
          report_identity: transportReport.report_identity
        }
        : {
          final_standing: "NOT_EXECUTED_IN_THIS_RUN",
          report_identity: null
        }
    },
    algebra: algebraReport,
    standing_path_census: standingPathCensus,
    authorship_dominance_result: authorshipDominanceResult,
    ack_composition_result: ackCompositionResult,
    executed_exclusion_results: executedExclusionResults,
    bind_repair_result: bindRepairResult,
    independent_attack_battery: attackBattery,
    f1_f6_proof_compilation: f1F6ProofCompilation,
    t0_counterfeit_matrix: t0CounterfeitMatrix,
    class1_sibling_result: class1SiblingResult,
    f1_f6_replay: f1F6Replay,
    t1_result: t1Result,
    t1_5_result: t15Result,
    t2_gate_result: t2GateResult,
    g6_historical_standing: "HELD_UNOBSERVED_HOSTILE_MATTER",
    g6_current_standing_result: g6CurrentStandingResult,
    g5_instrument_result: g5InstrumentResult,
    blocker_semantics_result: blockerSemanticsResult,
    launch_decision_sensitivity_tests: launchDecisionSensitivityTests,
    launch_decision_adjudication: launchDecisionAdjudication,
    launch_gate_identity_map: launchGateIdentityMap,
    g7_homonym_map: g7HomonymMap,
    gates,
    launch_decision: launchDecisionAdjudication.launch_decision,
    launch_blockers: launchBlockers,
    new_counterexamples: f1F6Replay.some((entry) => entry.replay_standing !== "PASS") ||
      t1Result.final_standing !== "T1_ESTABLISHED" ||
      t15Result.final_standing !== "T1_5_ESTABLISHED" ||
      t2GateResult.control_disposition !== LAUNCH_CONTROL_DISPOSITIONS.SATISFIED ||
      g5InstrumentResult.control_disposition !== LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
      ? ["T0_REPAIR_REPLAY_OR_T_BOUNDARY_BLOCKED"]
      : [],
    blockers: launchBlockers,
    current_launch_standing: "NO_LAUNCH",
    next_required_seat: g5InstrumentResult.control_disposition !== LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
      ? "FROZEN_SUBJECT_THEN_INDEPENDENT_R4_RECEIPT_SEAT"
      : t2GateResult.control_disposition !== LAUNCH_CONTROL_DISPOSITIONS.SATISFIED
        ? "CODEXSELF_T2_PREDECESSOR_BINDING_REPAIR"
        : "G7_ELIGIBILITY_RECOMPUTATION_SEAT",
    execution_boundary: "STOP_BEFORE_G7_R4_LAUNCH",
    evidence_ceiling: [
      "This is a launch-readiness run, not launch establishment.",
      "The hostile battery is designed and locally self-checked; G5 only passes from a supplied valid R4 receipt.",
      "Historical Claude gap disposition remains held hostile Matter; current G6 is recomputed from later T2 evidence and remains blocked unless a lawful later observation is established.",
      "T2 is consumed as one typed predecessor and does not widen into truth, authority, effect, or launch readiness.",
      "Current GPTSELF live participation remains separately bounded by the current-GPT observation-laundering ceiling."
    ],
    next_highest_leverage_action: "Establish launch-subject custody before any G7 or R4 seat."
  };
  report.report_identity_scope = REPORT_IDENTITY_SCOPE;
  report.report_identity = digestObject(buildLaunchReadinessReportIdentityPayload(report));
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = valueAfter(process.argv, "--out");
  const sessionFilePath = valueAfter(process.argv, "--claude-session-file");
  const sessionEvidencePath = valueAfter(process.argv, "--external-session-evidence");
  const sessionEvidence = sessionEvidencePath
    ? JSON.parse(fs.readFileSync(path.resolve(sessionEvidencePath), "utf8"))
    : null;
  const executeTransport = !hasFlag(process.argv, "--skip-transport");
  const report = buildSelfcommunicationLaunchReadinessReport({ executeTransport, sessionFilePath, sessionEvidence });
  if (outPath) writeJsonFile(outPath, report);
  console.log(JSON.stringify(report, null, 2));
}
