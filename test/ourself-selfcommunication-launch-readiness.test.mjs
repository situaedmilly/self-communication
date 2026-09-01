import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  adjudicateOccurrenceBirthRecords,
  adjudicateG5IndependentHostileReceipt,
  adjudicateLaunchDecision,
  adjudicateT2Predecessor,
  buildClass1SiblingResult,
  buildBlockerSemanticsResult,
  buildF1F6ProofCompilation,
  buildG7HomonymMap,
  buildIndependentAttackBattery,
  buildLaunchGateIdentityMap,
  buildLaunchReadinessAlgebraReport,
  buildAckCompositionResult,
  buildOccurrenceKeyRegistry,
  buildSelfcommunicationLaunchReadinessReport,
  buildStandingPathCensus,
  buildT0CounterfeitMatrix,
  createActivationAdmission,
  createLaunchObservedStandingCandidate,
  createOccurrenceBirthRecord,
  createOccurrenceSigningRegistrationFixture,
  createSyntheticGateVector,
  createSyntheticR4Receipt,
  createSyntheticT2Receipt,
  deriveObservationDuty,
  executeSiblingCounterfeitStrategyCoverage,
  executeT0CounterfeitExclusions,
  inspectContextInheritance,
  inspectClaudeSessionUnion,
  LAUNCH_CONTROL_DISPOSITIONS,
  LAUNCH_INVARIANTS,
  REQUIRED_R4_ATTACK_COVERAGE,
  recomputeG6CurrentStanding
} from "../tools/ourself-selfcommunication-launch-readiness.mjs";
import {
  createCommline,
  createParticipation,
  createParticipationOccurrence,
  deriveOccurrenceNotifaselfEligibility,
  computeParticipationOccurrenceObservationGap,
  gocheckitObserve
} from "../tools/ourself-commline-observation-gap.mjs";
import { createMatter } from "../tools/ourself-communication-matter.mjs";

function sourceChain({ sourceSpecies, authorityStanding = "AUTHORIZED", readsetAuthority = null } = {}) {
  return {
    source_chain_ref: `SRC_${sourceSpecies}`,
    source_species: sourceSpecies,
    authority_standing: authorityStanding,
    matter_source_ref: "MATTER_SOURCE",
    obligation_source_ref: sourceSpecies === "MATTER_SENDER_DECLARATION" ? "MATTER_SOURCE" : "AUTHORIZED_SOURCE",
    readset_authority: readsetAuthority
  };
}

function fixture() {
  const matter = createMatter({ matterRef: "M_LR", content: "launch readiness matter", producerRef: "FOUNDER" });
  const commline = createCommline({ commlineRef: "CL_LR_TEST", matterEntries: [matter] });
  const participation = createParticipation({
    participationRef: "P_LR",
    commline,
    selfRef: "CLAUDESELF",
    endpointOccurrenceRef: "CLAUDE_DEFAULT",
    sessionRef: "SESSION_LR",
    addressableMatterRefs: [matter.matter_ref]
  });
  const occurrence = createParticipationOccurrence({
    participation,
    participationOccurrenceRef: "PO_LR",
    endpointOccurrenceRef: "CLAUDE_OCCURRENCE",
    sessionRef: "SESSION_LR",
    contextAncestryRefs: ["H0"],
    addressableMatterRefs: [matter.matter_ref]
  });
  const birth = createOccurrenceBirthRecord({
    occurrence,
    invokerRef: "FOUNDER",
    invocationRef: "INV_LR",
    ancestryRefs: ["H0"],
    birthRelation: "CONTINUATION"
  });
  return { matter, commline, participation, occurrence, birth };
}

test("launch invariants preserve attention and knowledge non-collapse", () => {
  assert.ok(LAUNCH_INVARIANTS.includes("ADDRESSABLE != OBLIGATED"));
  assert.ok(LAUNCH_INVARIANTS.includes("NOTIFIED != ACTIVATED"));
  assert.ok(LAUNCH_INVARIANTS.includes("CONTEXT_PRESENT != CURRENT_OCCURRENCE_OBSERVED"));
  assert.ok(LAUNCH_INVARIANTS.includes("KNOWLEDGE_DOES_NOT_UNION_BY_CONTINUITY"));
});

test("observation duty derives only from authorized source chains", () => {
  const { matter, occurrence, commline } = fixture();
  const sender = deriveObservationDuty({
    sourceChain: sourceChain({ sourceSpecies: "MATTER_SENDER_DECLARATION" }),
    participationOccurrence: occurrence,
    matterRef: matter.matter_ref,
    commlineRef: commline.commline_ref
  });
  const founder = deriveObservationDuty({
    sourceChain: sourceChain({ sourceSpecies: "FOUNDER_INSTRUCTION" }),
    participationOccurrence: occurrence,
    matterRef: matter.matter_ref,
    commlineRef: commline.commline_ref
  });
  const readset = deriveObservationDuty({
    sourceChain: sourceChain({ sourceSpecies: "AUTHORIZED_ACT_READSET", readsetAuthority: "EXPLICIT" }),
    participationOccurrence: occurrence,
    matterRef: matter.matter_ref,
    commlineRef: commline.commline_ref
  });

  assert.equal(sender.final_standing, "OBSERVATION_DUTY_NOT_DERIVED");
  assert.equal(founder.final_standing, "OBSERVATION_DUTY_DERIVED");
  assert.equal(readset.final_standing, "OBSERVATION_DUTY_DERIVED");
  assert.equal(founder.duty_is_derivation_not_writable_object, true);
});

test("occurrence birth records detect duplicate occurrence claims", () => {
  const { occurrence } = fixture();
  const first = createOccurrenceBirthRecord({
    occurrence,
    invokerRef: "A",
    invocationRef: "INV_A",
    ancestryRefs: ["H0"],
    birthRelation: "FORK"
  });
  const second = createOccurrenceBirthRecord({
    occurrence,
    invokerRef: "B",
    invocationRef: "INV_B",
    ancestryRefs: ["H0"],
    birthRelation: "FORK"
  });
  const adjudication = adjudicateOccurrenceBirthRecords({ birthRecords: [first, second] });

  assert.equal(adjudication.final_standing, "OCCURRENCE_BIRTH_COLLISION_DETECTED");
  assert.equal(adjudication.collisions.length, 1);
  assert.equal(first.context_ancestry_not_observation, true);
  assert.equal(first.context_ancestry_not_authority, true);
});

test("ActivationAdmission gates NOTIFASELF eligibility before activation", () => {
  const { matter, commline, participation, occurrence, birth } = fixture();
  const gap = computeParticipationOccurrenceObservationGap({ commline, participationOccurrence: occurrence, observations: [] });
  const duty = deriveObservationDuty({
    sourceChain: sourceChain({ sourceSpecies: "FOUNDER_INSTRUCTION" }),
    participationOccurrence: occurrence,
    matterRef: matter.matter_ref,
    commlineRef: commline.commline_ref
  });
  const eligibility = deriveOccurrenceNotifaselfEligibility({
    gap,
    obligations: [{
      ...duty,
      object_type: "OBSERVATION_OBLIGATION_COMPAT",
      obligated: true,
      matter_refs: [matter.matter_ref]
    }]
  });
  const admitted = createActivationAdmission({ eligibility, duty, birthRecord: birth, activationBudget: 1 });
  const duplicate = createActivationAdmission({
    eligibility,
    duty,
    birthRecord: birth,
    activationBudget: 1,
    alreadyAdmittedMatterRefs: [matter.matter_ref]
  });
  const exhausted = createActivationAdmission({ eligibility, duty, birthRecord: birth, activationBudget: 0 });

  assert.equal(eligibility.eligible, true);
  assert.equal(admitted.final_standing, "ACTIVATION_ADMITTED");
  assert.equal(duplicate.final_standing, "ACTIVATION_NOT_ADMITTED");
  assert.equal(exhausted.final_standing, "ACTIVATION_NOT_ADMITTED");
  assert.equal(admitted.activation_admission_not_observation, true);
});

test("context possession does not establish current occurrence observation", () => {
  const { matter, occurrence } = fixture();
  const inspection = inspectContextInheritance({
    receivingOccurrence: occurrence,
    sourceMatter: matter,
    contextText: `${matter.content}\n${matter.content_identity}`
  });

  assert.equal(inspection.context_grade, "CONTENT_POSSESSED");
  assert.equal(inspection.may_establish_observed_relation, false);
  assert.equal(inspection.context_present_not_current_occurrence_observed, true);
});

test("standing path census fences raw OBSERVED and ACK bypasses from launch standing", () => {
  const census = buildStandingPathCensus();
  const rawObserved = census.find((entry) => entry.path_ref === "PATH_RAW_GOCHECKIT_OBSERVE");
  const rawAck = census.find((entry) => entry.path_ref === "PATH_DIRECT_ACK_DISPOSITION");
  const launchGate = census.find((entry) => entry.path_ref === "PATH_LAUNCH_OBSERVATION_STANDING_GATE");

  assert.equal(rawObserved.classification, "RAW_BYPASS");
  assert.equal(rawObserved.launch_standing_capable_after_repair, false);
  assert.equal(rawAck.classification, "RAW_BYPASS");
  assert.equal(rawAck.launch_standing_capable_after_repair, false);
  assert.equal(launchGate.classification, "GATED");
  assert.equal(launchGate.launch_standing_capable_after_repair, true);
});

test("launch gate rejects unauthored raw observation values that raw gap logic would accept", () => {
  const { matter, commline, participation, occurrence, birth } = fixture();
  const raw = gocheckitObserve({
    participation,
    participationOccurrence: occurrence,
    sourceMatter: matter,
    transmissionRef: "RAW_BYPASS_TEST"
  }).observation;
  const rawGap = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: occurrence,
    observations: [raw]
  });
  const rejected = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: occurrence,
    birthRecord: birth,
    commline,
    sourceMatter: matter,
    rawObservation: raw,
    evidenceSpecies: "SHARED_PRINCIPAL_RECEIPT",
    transmissionRef: "RAW_BYPASS_TEST"
  });
  const gatedGap = computeParticipationOccurrenceObservationGap({
    commline,
    participationOccurrence: occurrence,
    observations: rejected.launch_observed_standing.may_advance_observed_standing ? [raw] : []
  });

  assert.deepEqual(rawGap.observed_matter_refs, [matter.matter_ref]);
  assert.equal(rejected.binding_preimage.final_standing, "BINDING_PREIMAGE_ESTABLISHED");
  assert.equal(rejected.authorship_adjudication.final_standing, "OBSERVATION_AUTHORSHIP_NOT_ESTABLISHED");
  assert.equal(rejected.launch_observed_standing.final_standing, "LAUNCH_OBSERVED_STANDING_REJECTED");
  assert.deepEqual(gatedGap.observed_matter_refs, []);
  assert.deepEqual(gatedGap.unobserved_matter_refs, [matter.matter_ref]);
});

test("ACK_EXACT composes only from valid observation preimage and deterministic content equivalence", () => {
  const { matter, commline, participation, occurrence, birth } = fixture();
  const valid = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: occurrence,
    birthRecord: birth,
    commline,
    sourceMatter: matter,
    transmissionRef: "ACK_VALID_PREIMAGE"
  });
  const raw = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: occurrence,
    birthRecord: birth,
    commline,
    sourceMatter: matter,
    evidenceSpecies: "DIGEST_CHAIN_RECEIPT",
    transmissionRef: "ACK_DIGEST_ONLY_COUNTERFEIT"
  });
  const result = buildAckCompositionResult({
    validObservationCandidate: valid,
    rawObservationCandidate: raw,
    sourceMatter: matter
  });

  assert.equal(result.final_standing, "ACK_COMPOSITION_ESTABLISHED");
  assert.equal(result.cases[0].composition.ack_exact_established, true);
  assert.equal(result.cases.slice(1).every((entry) => entry.composition.ack_exact_established === false), true);
  assert.equal(raw.launch_observed_standing.final_standing, "LAUNCH_OBSERVED_STANDING_REJECTED");
});

test("occurrence-key registry makes key substitution fail while genuine registered key passes", () => {
  const { matter, commline, participation, occurrence, birth } = fixture();
  const signing = createOccurrenceSigningRegistrationFixture({
    participation,
    participationOccurrence: occurrence,
    birthRecord: birth,
    matterRefs: [matter.matter_ref]
  });
  const keyRegistry = buildOccurrenceKeyRegistry({ registrations: [signing.registration] });
  const genuine = createLaunchObservedStandingCandidate({
    participation,
    participationOccurrence: occurrence,
    birthRecord: birth,
    commline,
    sourceMatter: matter,
    keyRegistry,
    registeredSigningPrivateKeyPem: signing.privateKeyPem,
    transmissionRef: "REGISTERED_KEY_POSITIVE_CONTROL"
  });

  assert.equal(keyRegistry.final_standing, "OCCURRENCE_KEY_REGISTRY_ESTABLISHED");
  assert.equal(keyRegistry.private_key_material_exported, false);
  assert.equal(genuine.occurrence_key_resolution.final_standing, "OCCURRENCE_KEY_BINDING_RESOLVED");
  assert.equal(genuine.binding_preimage.claimed_key_equals_registered_key, true);
  assert.equal(genuine.launch_observed_standing.final_standing, "LAUNCH_OBSERVED_STANDING_ACCEPTED");
});

test("sibling strategy coverage rejects key substitution, forged birth, replacement, and inherited capability", () => {
  const coverage = executeSiblingCounterfeitStrategyCoverage();
  const byStrategy = new Map(coverage.strategies_tested.map((entry) => [entry.strategy_ref, entry]));

  assert.equal(coverage.final_standing, "SIBLING_STRATEGY_COVERAGE_ESTABLISHED");
  assert.equal(coverage.counterfeiter_class_not_single_attack_strategy, true);
  assert.equal(coverage.established_exclusion_subclass_not_established_exclusion_class, true);
  assert.equal(byStrategy.get("SIBLING_C1_REPLAY_VICTIM_OBSERVATION").accepted_by_launch_path, false);
  assert.equal(byStrategy.get("SIBLING_C2_FRESH_ATTACKER_KEY_VICTIM_REFS").accepted_by_launch_path, false);
  assert.equal(byStrategy.get("SIBLING_C2_FRESH_ATTACKER_KEY_VICTIM_REFS").rejection_reasons.some((reason) => reason.includes("claimed key is not the registered occurrence key")), true);
  assert.equal(byStrategy.get("SIBLING_C3_FRESH_ATTACKER_KEY_FORGED_CONTINUATION_BIRTH").accepted_by_launch_path, false);
  assert.equal(byStrategy.get("SIBLING_C3_FRESH_ATTACKER_KEY_FORGED_CONTINUATION_BIRTH").rejection_reasons.some((reason) => reason.includes("continuity evidence is not established")), true);
  assert.equal(byStrategy.get("SIBLING_C4_REPLACE_VICTIM_REGISTERED_KEY").actual_disposition, "OCCURRENCE_KEY_REGISTRATION_REJECTED");
  assert.equal(byStrategy.get("SIBLING_C5_RESUME_ATTEMPTS_VICTIM_SIGNING_CAPABILITY").accepted_by_launch_path, false);
  assert.equal(byStrategy.get("SIBLING_C6_GENUINE_OCCURRENCE_REGISTERED_KEY").accepted_by_launch_path, true);
});

test("launch readiness algebra establishes reachable gates and preserves launch ceiling", () => {
  const report = buildLaunchReadinessAlgebraReport();

  assert.equal(report.final_standing, "LAUNCH_READINESS_ALGEBRA_ESTABLISHED");
  assert.equal(report.checks.obligation_derivation_only, true);
  assert.equal(report.checks.occurrence_birth_registered, true);
  assert.equal(report.checks.twin_fork_collision_detected, true);
  assert.equal(report.checks.activation_admission_required, true);
  assert.equal(report.checks.context_laundering_blocked, true);
  assert.equal(report.checks.successor_context_does_not_inherit_observed_set, true);
  assert.equal(report.checks.launch_observed_standing_requires_authorship_gate, true);
  assert.equal(report.occurrence_key_registry.final_standing, "OCCURRENCE_KEY_REGISTRY_ESTABLISHED");
  assert.equal(report.ack_composition_result.final_standing, "ACK_COMPOSITION_ESTABLISHED");
  assert.equal(report.bind_repair_result.final_standing, "BIND_REPAIR_ESTABLISHED");
});

test("independent attack battery is designed but not self-certified", () => {
  const battery = buildIndependentAttackBattery();

  assert.equal(battery.status, "DESIGNED_NOT_INDEPENDENTLY_EXECUTED");
  assert.equal(battery.independent_author_required, true);
  assert.ok(battery.attacks.includes("authority inherited through context ancestry"));
  assert.ok(battery.minimum_highest_power_subset.includes("shared SELF_REF causing notification leakage"));
});

test("T0 repair compiles F1-F6 and rejects counterfeit artifacts by genus", () => {
  const compilation = buildF1F6ProofCompilation();
  const executed = executeT0CounterfeitExclusions();
  const matrix = buildT0CounterfeitMatrix({ proofCompilation: compilation, executedExclusionResults: executed });
  const class1 = buildClass1SiblingResult({ t0CounterfeitMatrix: matrix });

  assert.equal(compilation.length, 6);
  assert.deepEqual(
    compilation.map((entry) => entry.question_genus),
    ["ATTRIBUTION", "COMPOSITION", "OBSERVATION", "BINDING", "COMPOSITION", "COMPOSITION"]
  );
  assert.equal(executed.length, 6);
  assert.equal(executed.every((entry) => entry.actual_verifier.includes("LAUNCH_OBSERVED_STANDING_GATE")), true);
  assert.equal(executed.every((entry) => entry.observed_rejection_not_expected_rejection === true), true);
  assert.equal(executed.every((entry) => entry.accepted_by_launch_path === false), true);
  assert.ok(executed[0].strategies_tested.some((entry) => entry.strategy_ref === "SIBLING_C2_FRESH_ATTACKER_KEY_VICTIM_REFS"));
  assert.equal(matrix.counterfeit_classes.length, 6);
  assert.equal(
    matrix.counterfeit_classes.every((entry) => entry.accepted_after_repair === false),
    true
  );
  assert.equal(
    matrix.counterfeit_classes.every((entry) => entry.established_exclusion === "ESTABLISHED_BY_EXECUTED_LAUNCH_GATE"),
    true
  );
  assert.equal(matrix.claimed_exclusion_not_established_exclusion, true);
  assert.equal(matrix.expected_rejection_not_observed_rejection, true);
  assert.equal(class1.sibling_can_reproduce_pre_repair_artifact, true);
  assert.equal(class1.sibling_artifact_accepted_after_repair, false);
  assert.equal(class1.actual_verifier, "LAUNCH_OBSERVED_STANDING_GATE_WITH_OCCURRENCE_KEY_REGISTRY_STRATEGY_COVERAGE");
  assert.equal(class1.observed_rejection_not_expected_rejection, true);
  assert.equal(class1.strategies_tested.length, 6);
  assert.equal(class1.coverage_ceiling, "EXCLUDES_TESTED_ADMITTED_SIBLING_STRATEGIES_UNDER_T0_NOT_UNIVERSAL");
  assert.equal(class1.sibling_excluded_for_universal_attribution, false);
  assert.equal(class1.final_standing, "CLASS1_REPAIR_PASS_WITH_BOUNDED_ATTRIBUTION_CEILING");
});

test("SELFCOMMUNICATION launch readiness run returns NO_LAUNCH without independent hostile pass", () => {
  const report = buildSelfcommunicationLaunchReadinessReport({ executeTransport: false });

  assert.equal(report.artifact_status, "SELFCOMMUNICATION_LIVE_V0_LAUNCH_READINESS_RUN");
  assert.equal(report.gates.g1_derivation_only_obligation.standing, "PASS");
  assert.equal(report.gates.g1_derivation_only_obligation.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(report.gates.g2_occurrence_birth.standing, "PASS");
  assert.equal(report.gates.g3_occurrence_addressing.standing, "PASS_WITH_REGISTERED_OCCURRENCE_SCOPE");
  assert.equal(report.gates.g4_activation_admission.standing, "PASS");
  assert.equal(report.gates.g5_independent_hostile_pass.standing, "G5_BLOCKED");
  assert.equal(report.gates.g5_independent_hostile_pass.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.equal(report.gates.g6_claude_gap_disposition.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.equal(report.gates.g7_session_file_union_attack.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.equal(report.gates.t2_causal_matter_predecessor.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.equal(report.gates.g8_authorship_dominance.standing, "PASS");
  assert.equal(report.gates.g9_ack_composition.standing, "PASS");
  assert.equal(report.gates.g10_bind_repair.standing, "PASS");
  assert.equal(report.authorship_dominance_result.final_standing, "AUTHORSHIP_GATE_DOMINATES_LAUNCH_ALGEBRA");
  assert.equal(report.launch_decision_adjudication.consumed_control_field, "control_disposition");
  assert.equal(report.launch_decision_adjudication.display_projection_not_control_input, true);
  assert.equal(report.launch_decision, "NO_LAUNCH");
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "g5_independent_hostile_pass"));
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "g6_claude_gap_disposition"));
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "g7_session_file_union_attack"));
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "t2_causal_matter_predecessor"));
});

test("session-file union risk is launch evidence when context law blocks observation laundering", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-launch-"));
  const sessionFile = path.join(dir, "claude-session.jsonl");
  fs.writeFileSync(sessionFile, "{\"message\":\"ROUTE_ADJUDICATION_PROBE 5464975482\"}\n");

  const report = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionFilePath: sessionFile
  });

  assert.equal(report.gates.g7_session_file_union_attack.raw_standing, "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK");
  assert.equal(report.gates.g7_session_file_union_attack.standing, "PASS_WITH_CONTEXT_LAW_BLOCK");
  assert.equal(report.gates.g7_session_file_union_attack.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(
    report.launch_blockers.some((entry) => entry.gate_ref === "g7_session_file_union_attack"),
    false
  );
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "g5_independent_hostile_pass"));
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "g6_claude_gap_disposition"));
  assert.ok(report.launch_blockers.some((entry) => entry.gate_ref === "t2_causal_matter_predecessor"));
});

test("bounded external session evidence can replace raw session file for session-union claim", () => {
  const sessionEvidence = {
    evidence_identity: "sha256:TEST_EVIDENCE",
    source_locator: "/external/claude-session.jsonl",
    source_identity: "sha256:SOURCE",
    source_byte_count: 44,
    source_range_or_exact_extraction_rule: {
      extraction_species: "MARKER_PRESENCE_CENSUS"
    },
    marker_findings: [
      { marker: "5464975482", present: true, count: 1, first_index: 12 },
      { marker: "ROUTE_ADJUDICATION_PROBE", present: true, count: 1, first_index: 0 }
    ]
  };
  const inspection = inspectClaudeSessionUnion({ sessionEvidence });
  const report = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionEvidence
  });

  assert.equal(inspection.evidence_source, "CONTENT_ADDRESSED_EXTERNAL_SESSION_CONTEXT_EVIDENCE");
  assert.equal(inspection.raw_provider_session_file_required_for_this_claim, false);
  assert.equal(inspection.bounded_external_evidence_sufficient_for_session_union_claim, true);
  assert.equal(inspection.final_standing, "SESSION_FILE_UNION_RISK_ESTABLISHED_WITH_CONTEXT_LAW_BLOCK");
  assert.equal(report.gates.g7_session_file_union_attack.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
});

test("report identity is stable across different wall-clock execution instants", async () => {
  const first = buildSelfcommunicationLaunchReadinessReport({ executeTransport: false });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = buildSelfcommunicationLaunchReadinessReport({ executeTransport: false });

  assert.equal(first.report_identity, second.report_identity);
  assert.equal(first.report_identity_scope.report_identity_not_generation_time, true);
  assert.ok(first.report_identity_scope.excluded.includes("wall-clock occurrence timestamps"));
});

test("T1 and T1.5 hold Patient Zero false without waking Claude", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-launch-"));
  const sessionFile = path.join(dir, "claude-session.jsonl");
  fs.writeFileSync(sessionFile, "{\"message\":\"public reference 5464975482 without observation\"}\n");

  const report = buildSelfcommunicationLaunchReadinessReport({
    executeTransport: false,
    sessionFilePath: sessionFile
  });

  assert.equal(report.f1_f6_replay.length, 6);
  assert.equal(report.f1_f6_replay.every((entry) => entry.replay_standing === "PASS"), true);
  assert.equal(report.t1_result.final_standing, "T1_ESTABLISHED");
  assert.equal(report.t1_result.without_claude_gocheckit, true);
  assert.equal(report.t1_result.executed_launch_path_ref, "LAUNCH_OBSERVED_STANDING_GATE_ACCEPTED_EVENTS");
  assert.equal(report.t1_result.available_matter_exposed.patient_zero_context_present, true);
  assert.equal(report.t1_result.patient_zero_observation_event_count, 0);
  assert.equal(report.t1_result.observed_current_claude_interactive_participation_patient_zero, false);
  assert.equal(report.t1_5_result.final_standing, "T1_5_ESTABLISHED");
  assert.equal(report.t1_5_result.activation_admission, "DENIED");
  assert.equal(report.t1_5_result.checks.observation_gap_derived, true);
  assert.equal(report.t1_5_result.checks.activation_admission_denied, true);
  assert.equal(report.t1_5_result.checks.no_gocheckit, true);
  assert.equal(report.current_launch_standing, "NO_LAUNCH");
  assert.equal(report.next_required_seat, "FROZEN_SUBJECT_THEN_INDEPENDENT_R4_RECEIPT_SEAT");
  assert.equal(report.execution_boundary, "STOP_BEFORE_G7_R4_LAUNCH");
  assert.deepEqual(report.new_counterexamples, ["T0_REPAIR_REPLAY_OR_T_BOUNDARY_BLOCKED"]);
});

test("G5 is receipt-derived and can pass only with valid R4 receipt bindings", () => {
  const subjectIdentity = "sha256:SYNTHETIC_LAUNCH_SUBJECT";
  const noReceipt = adjudicateG5IndependentHostileReceipt({ launchSubjectIdentity: subjectIdentity });
  const validReceipt = createSyntheticR4Receipt({ launchSubjectIdentity: subjectIdentity });
  const valid = adjudicateG5IndependentHostileReceipt({
    r4Receipt: validReceipt,
    launchSubjectIdentity: subjectIdentity
  });
  const mismatch = adjudicateG5IndependentHostileReceipt({
    r4Receipt: createSyntheticR4Receipt({
      launchSubjectIdentity: subjectIdentity,
      subjectIdentity: "sha256:DIFFERENT_SUBJECT"
    }),
    launchSubjectIdentity: subjectIdentity
  });

  assert.equal(noReceipt.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.deepEqual(noReceipt.errors, ["NO_VALID_R4_RECEIPT"]);
  assert.equal(valid.receipt_derived, true);
  assert.equal(valid.r4_executed_in_this_seat, false);
  assert.equal(valid.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(valid.final_standing, "G5_MAY_PASS_FROM_VALID_R4_RECEIPT");
  assert.equal(mismatch.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.ok(mismatch.errors.includes("R4_SUBJECT_IDENTITY_MISMATCH"));
});

test("T2 is consumed as a typed predecessor without becoming launch readiness", () => {
  const local = adjudicateT2Predecessor();
  const synthetic = adjudicateT2Predecessor({ t2Receipt: createSyntheticT2Receipt() });
  const missing = adjudicateT2Predecessor({ t2Receipt: null });

  assert.equal(local.t2_receipt_exists, true);
  assert.equal(local.final_standing, "T2_PREDECESSOR_BLOCKED_BY_BINDING_GAP");
  assert.equal(local.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.equal(local.t2_not_truth_authority_effect_or_launch_readiness, true);
  assert.equal(synthetic.final_standing, "T2_LOAD_BEARING_PREDECESSOR_ESTABLISHED");
  assert.equal(synthetic.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(missing.final_standing, "T2_PREDECESSOR_MISSING");
  assert.equal(missing.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.MISSING);
});

test("G6 current standing is recomputed from T2 instead of controlled by display label", () => {
  const blockedT2 = adjudicateT2Predecessor();
  const validT2 = adjudicateT2Predecessor({ t2Receipt: createSyntheticT2Receipt() });
  const blockedG6 = recomputeG6CurrentStanding({ t2GateResult: blockedT2 });
  const liftedG6 = recomputeG6CurrentStanding({ t2GateResult: validT2 });

  assert.equal(blockedG6.historical_standing, "HELD_UNOBSERVED_HOSTILE_MATTER");
  assert.equal(blockedG6.historical_g6_not_current_g6, true);
  assert.equal(blockedG6.latest_event_not_current_standing, true);
  assert.equal(blockedG6.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.ok(blockedG6.missing_relations.includes("t2_subject_binding"));
  assert.equal(liftedG6.current_standing, "CURRENT_G6_LATER_OBSERVATION_ESTABLISHED");
  assert.equal(liftedG6.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
});

test("blocker semantics consume typed dispositions and reject display-label control", () => {
  const result = buildBlockerSemanticsResult();
  const byFixture = new Map(result.hostile_fixture_results.map((entry) => [entry.fixture_ref, entry]));

  assert.equal(result.final_standing, "BLOCKER_SEMANTICS_TYPED_CONTROL_ESTABLISHED");
  assert.equal(result.presentation_strings_carry_control_authority, false);
  assert.equal(byFixture.get("B1_ESTABLISHED_RISK_DISPLAY_PASS").actual_decision, "NO_LAUNCH");
  assert.equal(byFixture.get("B3_HELD_UNOBSERVED_HOSTILE_MATTER").actual_decision, "NO_LAUNCH");
  assert.equal(byFixture.get("B5_UNRECOGNIZED_STANDING_SPECIES").blockers[0].control_disposition, LAUNCH_CONTROL_DISPOSITIONS.UNKNOWN);
  assert.equal(byFixture.get("B6_VALID_PASS").actual_decision, "LAUNCH_READY_BOUNDED");
  assert.equal(byFixture.get("B8_MISSING_REQUIRED_GATE").blockers[0].blocker_reason, "MISSING_REQUIRED_GATE");
});

test("launch decision is input-sensitive across required gate vectors", () => {
  const report = buildSelfcommunicationLaunchReadinessReport({ executeTransport: false });

  assert.equal(report.launch_decision_sensitivity_tests.every((entry) => entry.discriminated), true);
  assert.equal(
    report.launch_decision_sensitivity_tests.find((entry) => entry.case_ref === "ALL_REQUIRED_PASS").actual_decision,
    "LAUNCH_READY_BOUNDED"
  );
  assert.equal(
    report.launch_decision_sensitivity_tests.find((entry) => entry.case_ref === "VALID_G5_ABSENT").actual_decision,
    "NO_LAUNCH"
  );
  assert.equal(
    report.launch_decision_sensitivity_tests.find((entry) => entry.case_ref === "T2_ABSENT").actual_decision,
    "NO_LAUNCH"
  );
});

test("valid synthetic G5 and T2 inputs make LAUNCH_READY_BOUNDED reachable", () => {
  const subjectIdentity = "sha256:SYNTHETIC_LAUNCH_SUBJECT";
  const g5 = adjudicateG5IndependentHostileReceipt({
    r4Receipt: createSyntheticR4Receipt({ launchSubjectIdentity: subjectIdentity }),
    launchSubjectIdentity: subjectIdentity
  });
  const t2 = adjudicateT2Predecessor({ t2Receipt: createSyntheticT2Receipt() });
  const gates = createSyntheticGateVector({
    overrides: {
      g5_independent_hostile_pass: {
        standing: "PASS_VALID_R4_RECEIPT",
        control_disposition: g5.control_disposition
      },
      t2_causal_matter_predecessor: {
        standing: "PASS_LOAD_BEARING_PREDECESSOR",
        control_disposition: t2.control_disposition
      }
    }
  });
  const decision = adjudicateLaunchDecision({ gates });

  assert.equal(g5.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(t2.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.SATISFIED);
  assert.equal(decision.launch_decision, "LAUNCH_READY_BOUNDED");
});

test("R4 coverage includes operative proof closure families before G5 may pass", () => {
  const subjectIdentity = "sha256:SYNTHETIC_LAUNCH_SUBJECT";
  const priorCoverageOnly = [
    "unauthorized obligation source",
    "cross-occurrence obligation injection",
    "two simultaneous forks claiming one occurrence ref",
    "context inherited substituted for observed",
    "shared SELF_REF causing observation union",
    "shared SELF_REF causing notification leakage",
    "authority inherited through context ancestry"
  ];

  for (const required of [
    "family A remote evidence derivation closure",
    "family B verification closure completeness",
    "family C execution-derived acceptance",
    "family D current standing projection custody",
    "D3 starved remote fail-closed replay",
    "N1 worktree self-binding mismatch detectability",
    "N2 acceptance counterfeit rejection",
    "N3 closure compiler self-inclusion",
    "N4 verification logic fixed-point membership"
  ]) {
    assert.ok(REQUIRED_R4_ATTACK_COVERAGE.includes(required), required);
  }

  const partial = adjudicateG5IndependentHostileReceipt({
    r4Receipt: createSyntheticR4Receipt({
      launchSubjectIdentity: subjectIdentity,
      attackCoverageRefs: priorCoverageOnly
    }),
    launchSubjectIdentity: subjectIdentity
  });

  assert.equal(partial.control_disposition, LAUNCH_CONTROL_DISPOSITIONS.BLOCKED);
  assert.ok(partial.missing_attack_coverage.includes("family C execution-derived acceptance"));
});

test("gate identity map preserves G7 homonym instead of silently renaming it", () => {
  const report = buildSelfcommunicationLaunchReadinessReport({ executeTransport: false });
  const map = buildLaunchGateIdentityMap({ gates: report.gates });
  const g7 = map.find((entry) => entry.current_symbol === "g7_session_file_union_attack");
  const conceptual = map.find((entry) => entry.current_symbol === "G7");
  const homonym = buildG7HomonymMap();

  assert.ok(g7.homonyms.includes("G7_CONTEXT_PROVENANCE_CLOSURE"));
  assert.equal(conceptual.gate_id, "G7_CONTEXT_PROVENANCE_CLOSURE");
  assert.equal(homonym.final_standing, "G7_ROUTING_AMBIGUITY_CLOSED_BY_FOUNDER");
  assert.equal(homonym.same_label_not_same_gate, true);
  assert.equal(homonym.same_gate_not_same_question, true);
});
