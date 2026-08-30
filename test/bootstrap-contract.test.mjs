import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_PROJECTION_PHRASES,
  verifyBootstrapContract,
  verifyText
} from "../tools/verify-bootstrap-contract.mjs";

test("bootstrap projections carry the required invariant set", () => {
  const result = verifyBootstrapContract(new URL("..", import.meta.url).pathname);

  assert.equal(result.verdict, "PASS");
  assert.deepEqual(
    result.checks.flatMap((check) => check.missing),
    []
  );
});

test("projection verification fails when ACK/HOLLABACK law is absent", () => {
  const text = REQUIRED_PROJECTION_PHRASES
    .filter((phrase) => phrase !== "ACK != HOLLABACK")
    .join("\n");
  const result = verifyText("synthetic", text, REQUIRED_PROJECTION_PHRASES);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["ACK != HOLLABACK"]);
});
