import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createEvent,
  identityForText,
  validateEvent
} from "../tools/ourself-communicate.mjs";

const fixture = JSON.parse(readFileSync(new URL("../specimens/heartbeat-v0.selfcommunication.json", import.meta.url), "utf8"));

test("heartbeat v0 specimen preserves the communication trajectory", () => {
  const result = validateEvent(fixture);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(fixture.ack.observed_matter_identity, fixture.matter_ref.identity);
  assert.equal(fixture.hollaback.proof_disposition, "NOT_PROOF_OF_ACK");
});

test("matter identity is recomputed from bytes", () => {
  assert.equal(identityForText("MORPH HTMLSELF UNTIL LAUNCH."), fixture.matter_ref.identity);

  const mutated = structuredClone(fixture);
  mutated.matter_ref.content = "MORPH HTMLSELF UNTIL LAUNCH";
  const result = validateEvent(mutated);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /matter_ref\.identity/);
});

test("ACK cannot carry authority", () => {
  const mutated = structuredClone(fixture);
  mutated.ack.authority_disposition = "AUTHORIZED";
  const result = validateEvent(mutated);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /ack\.authority_disposition/);
});

test("HOLLABACK cannot become proof of ACK", () => {
  const mutated = structuredClone(fixture);
  mutated.hollaback.proof_disposition = "PROOF_OF_ACK";
  const result = validateEvent(mutated);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /hollaback\.proof_disposition/);
});

test("create command model emits a valid non-admitted communication event", () => {
  const event = createEvent({
    matter: "HELLO OURSELF.",
    source: "SELF:ONE",
    observer: "SELF:CODEXSELF",
    recipient: "SELF:ANOTHERSELF",
    createdAt: "2026-08-29T08:00:26Z"
  });
  const result = validateEvent(event);

  assert.equal(result.ok, true);
  assert.equal(event.ack.claim, "WHAT_I_RECEIVED");
  assert.equal(event.hollaback.effect_disposition, "NOT_APPLICABLE");
  assert.equal(event.authority_identity.disposition, "NOT_APPLICABLE");
});
