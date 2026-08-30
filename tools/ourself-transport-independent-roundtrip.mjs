#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertEndpointObservationBinding,
  buildCommunicationGraph,
  classifyCommunicationTrajectory,
  createAck,
  createCommunicationEvent,
  createEmission,
  createHollaback,
  createMatter,
  createObservation,
  createTransmission,
  digestObject,
  identityForText,
  validateRoundtrip
} from "./ourself-communication-matter.mjs";

export const TRANSPORT_ROUNDTRIP_SCHEMA = "ourself.transport-independent-roundtrip.v0.1-candidate";

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(value, null, 2)}\n`);
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
    ...options
  });
  return {
    command,
    args,
    cwd: options.cwd ?? process.cwd(),
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    stdout_identity: identityForText(result.stdout ?? ""),
    stderr_identity: identityForText(result.stderr ?? "")
  };
}

function parseJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`endpoint did not return JSON: ${trimmed.slice(0, 200)}`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function createEndpointWorker(workspace) {
  const workerPath = path.join(workspace, "endpoint-worker.mjs");
  fs.writeFileSync(workerPath, [
    "import crypto from 'node:crypto';",
    "import { spawnSync } from 'node:child_process';",
    "const mode = process.argv[2];",
    "const endpoint = process.argv[3];",
    "function digest(text) { return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex'); }",
    "function readStdin() { return new Promise((resolve) => { let data = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (chunk) => { data += chunk; }); process.stdin.on('end', () => resolve(data)); }); }",
    "let content = '';",
    "let locator = null;",
    "let substrate_identity = null;",
    "if (mode === 'stdio') {",
    "  content = await readStdin();",
    "  locator = 'process-stdio://stdin';",
    "  substrate_identity = `sha256:${digest(content)}`;",
    "} else if (mode === 'git-object') {",
    "  const oid = process.argv[4];",
    "  const git = spawnSync('git', ['cat-file', '-p', oid], { encoding: 'utf8' });",
    "  if (git.status !== 0) {",
    "    console.error(git.stderr);",
    "    process.exit(git.status ?? 1);",
    "  }",
    "  content = git.stdout;",
    "  locator = `git-object://${oid}`;",
    "  substrate_identity = `git-object:${oid}`;",
    "} else {",
    "  console.error(`unknown mode ${mode}`);",
    "  process.exit(2);",
    "}",
    "const observedIdentity = `sha256:${digest(content)}`;",
    "const hollabackContent = `HOLLABACK ${endpoint}: observed ${observedIdentity}`;",
    "const result = {",
    "  endpoint_ref: endpoint,",
    "  mode,",
    "  locator,",
    "  substrate_identity,",
    "  observed_content_identity: observedIdentity,",
    "  observed_byte_count: Buffer.byteLength(content, 'utf8'),",
    "  ack: { kind: 'ACK', claim: 'WHAT_I_OBSERVED', observed_matter_identity: observedIdentity },",
    "  hollaback_content: hollabackContent,",
    "  hollaback_identity: `sha256:${digest(hollabackContent)}`",
    "};",
    "console.log(JSON.stringify(result));"
  ].join("\n"));
  return workerPath;
}

function composeRoundtripFromEndpoint({
  sourceMatter,
  participantRef,
  substrate,
  sourceLocator,
  sourceSubstrateIdentity,
  deliveredContent,
  endpointOutput,
  returnLocator,
  returnSubstrateIdentity,
  initiatorObservedReturnContent
}) {
  const emission = createEmission({
    emitterRef: sourceMatter.producer_ref,
    intendedForRef: participantRef,
    matter: sourceMatter,
    sessionRef: "TRANSPORT_SUBSTITUTION_INITIATOR"
  });
  const transmission = createTransmission({
    fromRef: sourceMatter.producer_ref,
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
    observedContent: deliveredContent,
    transmissionRef: transmission.event_ref,
    sessionRef: "TRANSPORT_SUBSTITUTION_PEER"
  });
  const ack = createAck({ observerRef: participantRef, observation, sourceMatter });
  const { returnMatter, hollaback } = createHollaback({
    responderRef: participantRef,
    sourceMatter,
    observation,
    sessionRef: "TRANSPORT_SUBSTITUTION_PEER",
    content: endpointOutput.hollaback_content
  });
  const returnTransmission = createTransmission({
    fromRef: participantRef,
    toRef: sourceMatter.producer_ref,
    matter: returnMatter,
    emissionRef: hollaback.event_ref,
    substrate,
    locator: returnLocator,
    substrateIdentity: returnSubstrateIdentity
  });
  const { observedMatter: returnObservedMatter, observation: returnObservation } = createObservation({
    observerRef: sourceMatter.producer_ref,
    sourceMatter: returnMatter,
    observedContent: initiatorObservedReturnContent,
    transmissionRef: returnTransmission.event_ref,
    sessionRef: "TRANSPORT_SUBSTITUTION_INITIATOR"
  });
  const events = [emission, transmission, observation, ack, hollaback, returnTransmission, returnObservation];
  const trajectory = classifyCommunicationTrajectory({ sourceMatter, returnMatter, events });
  const validation = validateRoundtrip({ sourceMatter, returnMatter, events });
  const endpointBinding = assertEndpointObservationBinding({
    sourceMatter,
    observation,
    expectedObserverRef: participantRef
  });
  return {
    substrate,
    participant_ref: participantRef,
    source_locator: sourceLocator,
    return_locator: returnLocator,
    endpoint_output: endpointOutput,
    source_observed_matter: observedMatter,
    return_matter: returnMatter,
    initiator_observed_return_matter: returnObservedMatter,
    events,
    trajectory,
    validation,
    endpoint_binding: endpointBinding,
    communication_graph: buildCommunicationGraph({
      matter: [sourceMatter, observedMatter, returnMatter, returnObservedMatter],
      events
    })
  };
}

function executeProcessStdioCorridor(sourceMatter) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ourself-stdio-corridor-"));
  const workerPath = createEndpointWorker(workspace);
  const participantRef = "STDIO_PEER_CANDIDATE";
  const endpointRun = run("node", [workerPath, "stdio", participantRef], {
    cwd: workspace,
    input: sourceMatter.content
  });
  if (endpointRun.status !== 0) {
    return { substrate: "PROCESS_STDIO_CORRIDOR", participant_ref: participantRef, workspace, endpoint_run: endpointRun, blocked: true };
  }
  const endpointOutput = parseJson(endpointRun.stdout);
  return {
    workspace,
    endpoint_run: endpointRun,
    ...composeRoundtripFromEndpoint({
      sourceMatter,
      participantRef,
      substrate: "PROCESS_STDIO_CORRIDOR",
      sourceLocator: endpointOutput.locator,
      sourceSubstrateIdentity: endpointOutput.observed_content_identity,
      deliveredContent: sourceMatter.content,
      endpointOutput,
      returnLocator: "process-stdio://stdout",
      returnSubstrateIdentity: endpointOutput.hollaback_identity,
      initiatorObservedReturnContent: endpointOutput.hollaback_content
    })
  };
}

function executeGitObjectCorridor(sourceMatter) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ourself-git-object-corridor-"));
  const workerPath = createEndpointWorker(workspace);
  const init = run("git", ["init", "-q"], { cwd: workspace });
  if (init.status !== 0) {
    return { substrate: "GIT_OBJECT_CORRIDOR", participant_ref: "GIT_OBJECT_PEER_CANDIDATE", workspace, init, blocked: true };
  }
  const sourcePath = path.join(workspace, "source-surface.txt");
  fs.writeFileSync(sourcePath, sourceMatter.content);
  const sourceHash = run("git", ["hash-object", "-w", sourcePath], { cwd: workspace });
  if (sourceHash.status !== 0) {
    return { substrate: "GIT_OBJECT_CORRIDOR", participant_ref: "GIT_OBJECT_PEER_CANDIDATE", workspace, init, sourceHash, blocked: true };
  }
  const sourceOid = sourceHash.stdout.trim();
  const participantRef = "GIT_OBJECT_PEER_CANDIDATE";
  const endpointRun = run("node", [workerPath, "git-object", participantRef, sourceOid], { cwd: workspace });
  if (endpointRun.status !== 0) {
    return { substrate: "GIT_OBJECT_CORRIDOR", participant_ref: participantRef, workspace, init, sourceHash, endpoint_run: endpointRun, blocked: true };
  }
  const endpointOutput = parseJson(endpointRun.stdout);
  const returnHash = run("git", ["hash-object", "-w", "--stdin"], {
    cwd: workspace,
    input: endpointOutput.hollaback_content
  });
  if (returnHash.status !== 0) {
    return { substrate: "GIT_OBJECT_CORRIDOR", participant_ref: participantRef, workspace, init, sourceHash, endpoint_run: endpointRun, returnHash, blocked: true };
  }
  const returnOid = returnHash.stdout.trim();
  const returnRead = run("git", ["cat-file", "-p", returnOid], { cwd: workspace });
  if (returnRead.status !== 0) {
    return { substrate: "GIT_OBJECT_CORRIDOR", participant_ref: participantRef, workspace, init, sourceHash, endpoint_run: endpointRun, returnHash, returnRead, blocked: true };
  }
  return {
    workspace,
    source_surface_path: sourcePath,
    init,
    source_hash: sourceHash,
    return_hash: returnHash,
    return_read: returnRead,
    endpoint_run: endpointRun,
    ...composeRoundtripFromEndpoint({
      sourceMatter,
      participantRef,
      substrate: "GIT_OBJECT_CORRIDOR",
      sourceLocator: `git-object://${sourceOid}`,
      sourceSubstrateIdentity: `git-object:${sourceOid}`,
      deliveredContent: returnRead.status === 0 ? endpointOutput.observed_content_identity === sourceMatter.content_identity ? sourceMatter.content : "" : "",
      endpointOutput,
      returnLocator: `git-object://${returnOid}`,
      returnSubstrateIdentity: `git-object:${returnOid}`,
      initiatorObservedReturnContent: returnRead.stdout
    })
  };
}

export function compareTransportSemantics(corridorReceipts) {
  const errors = [];
  const closed = corridorReceipts.filter((entry) => !entry.blocked);
  const sourceIdentities = new Set(closed.map((entry) => entry.trajectory.source_matter_identity));
  const terminalDispositions = new Set(closed.map((entry) => entry.trajectory.terminal_disposition));
  const observationDispositions = new Set(closed.map((entry) => entry.trajectory.observation_disposition));
  const ackDispositions = new Set(closed.map((entry) => entry.trajectory.ack_disposition));

  for (const entry of corridorReceipts) {
    if (entry.blocked) errors.push(`${entry.substrate} blocked before closed roundtrip`);
    if (entry.validation && !entry.validation.ok) errors.push(`${entry.substrate} failed roundtrip validation`);
    if (entry.endpoint_binding && !entry.endpoint_binding.ok) errors.push(`${entry.substrate} failed endpoint binding`);
  }
  if (sourceIdentities.size !== 1) errors.push("source Matter identity changed across corridors");
  if (terminalDispositions.size !== 1 || !terminalDispositions.has("CLOSED_ROUNDTRIP")) errors.push("closed roundtrip standing changed across corridors");
  if (observationDispositions.size !== 1 || !observationDispositions.has("OBSERVED_EXACT")) errors.push("observation semantics changed across corridors");
  if (ackDispositions.size !== 1 || !ackDispositions.has("ACK_EXACT")) errors.push("ACK semantics changed across corridors");

  return {
    ok: errors.length === 0,
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    errors,
    allowed_to_change: [
      "transport_substrate",
      "transport_locator",
      "substrate_identity",
      "endpoint_process_evidence",
      "latency",
      "adapter_metadata"
    ],
    must_not_change: [
      "Matter identity semantics",
      "observation semantics",
      "ACK semantics",
      "HOLLABACK semantics",
      "divergence law",
      "endpoint binding",
      "causal reconstruction",
      "standing law"
    ],
    transport_leakage_detected: errors.length > 0
  };
}

function destroySourceSurfaces(corridorReceipts) {
  const destroyed = [];
  for (const receipt of corridorReceipts) {
    if (receipt.workspace && fs.existsSync(receipt.workspace)) {
      fs.rmSync(receipt.workspace, { recursive: true, force: true });
      destroyed.push({
        substrate: receipt.substrate,
        workspace: receipt.workspace,
        exists_after_destroy: fs.existsSync(receipt.workspace)
      });
    }
  }
  return destroyed;
}

export function recontactCommunicationFromCustody(report) {
  const answers = report.corridor_receipts.map((receipt) => {
    const events = receipt.events ?? [];
    const sourceObservation = events.find((event) => event.event_type === "OBSERVATION" && event.payload.source_matter_identity === report.source_matter.content_identity);
    const ack = events.find((event) => event.event_type === "ACK" && event.payload.acknowledges_observation_ref === sourceObservation?.event_ref);
    const hollaback = events.find((event) => event.event_type === "HOLLABACK_EMISSION");
    const returnObservation = events.filter((event) => event.event_type === "OBSERVATION").find((event) => event.payload.source_matter_identity === receipt.return_matter?.content_identity);
    return {
      substrate: receipt.substrate,
      emitted_matter_identity: report.source_matter.content_identity,
      peer_observer: sourceObservation?.actor_ref ?? null,
      observed_exact: sourceObservation?.payload.identity_match ?? false,
      ack_disposition: ack?.payload.ack_disposition ?? null,
      hollaback_matter_identity: hollaback?.matter_identity ?? null,
      return_observed_exact: returnObservation?.payload.identity_match ?? false,
      complete_history_recontactable: Boolean(sourceObservation && ack && hollaback && returnObservation)
    };
  });
  const result = {
    source_surface_not_required_for_recontact: report.source_surface_loss.every((entry) => entry.exists_after_destroy === false),
    answers,
    ok: answers.every((entry) => entry.complete_history_recontactable)
  };
  result.recontact_identity = digestObject(result);
  return result;
}

export function runTransportIndependentRoundtrip({ outPath = null } = {}) {
  const sourceMatter = createMatter({
    matterRef: "TRANSPORT_M0_SOURCE",
    content: "MILASOPHAHR TRANSPORT-INDEPENDENT SOURCE MATTER: same semantics through replaceable corridors.",
    producerRef: "OURSELF_INITIATOR_CANDIDATE"
  });
  const corridorReceipts = [
    executeProcessStdioCorridor(sourceMatter),
    executeGitObjectCorridor(sourceMatter)
  ];
  const substitution = compareTransportSemantics(corridorReceipts);
  const sourceSurfaceLoss = destroySourceSurfaces(corridorReceipts);
  const report = {
    schema: TRANSPORT_ROUNDTRIP_SCHEMA,
    artifact_status: "TRANSPORT_SUBSTITUTION_CANDIDATE_NOT_SELFCOMMUNICATION_LAUNCH",
    source_matter: sourceMatter,
    corridor_receipts: corridorReceipts,
    substitution,
    source_surface_loss: sourceSurfaceLoss,
    standing_law: {
      transport_independent_does_not_mean_transportless: true,
      communication_semantics_not_transport_implementation: true,
      source_surface_not_communication_memory: true,
      trajectory_classification_candidate_derived_view: true
    },
    known_constraints: [
      "Uses local process stdio and temporary Git object corridors, not GitHub.",
      "Uses candidate local endpoint participants, not current ChatGPT session participation.",
      "Temporary source surfaces are destroyed only after report custody exists."
    ]
  };
  report.recontact_after_surface_loss = recontactCommunicationFromCustody(report);
  report.final_standing = substitution.ok && report.recontact_after_surface_loss.ok
    ? "TRANSPORT_INDEPENDENT_ROUNDTRIP_CANDIDATE_ESTABLISHED"
    : "TRANSPORT_INDEPENDENT_ROUNDTRIP_BLOCKED";
  report.report_identity = digestObject(report);
  if (outPath) writeJsonFile(outPath, report);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = valueAfter(process.argv, "--out");
  const report = runTransportIndependentRoundtrip({ outPath });
  console.log(JSON.stringify(report, null, 2));
}
