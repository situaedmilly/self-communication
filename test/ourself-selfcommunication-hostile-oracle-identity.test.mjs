import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ATK_F_INDEX_PATH,
  DEFAULT_HOSTILE_CORPUS_ROOT,
  deriveSuccessorOracleManifest,
  runSuccessorOracleCalibrators,
  verifySuccessorOracleIdentity
} from "../tools/ourself-selfcommunication-hostile-oracle-identity.mjs";

const HOSTILE_CORPUS_ROOT = DEFAULT_HOSTILE_CORPUS_ROOT;
const corpusAvailable =
  fs.existsSync(path.join(HOSTILE_CORPUS_ROOT, "WITNESS-MANIFEST.json")) &&
  fs.existsSync(path.join(HOSTILE_CORPUS_ROOT, "corpus", "atk-F"));

test("successor hostile oracle separates content identity from Git administrative workspace state", {
  skip: corpusAvailable ? false : "G7 hostile corpus not present on this machine"
}, () => {
  const manifest = deriveSuccessorOracleManifest({ corpusRoot: HOSTILE_CORPUS_ROOT });
  const verification = verifySuccessorOracleIdentity({
    corpusRoot: HOSTILE_CORPUS_ROOT,
    manifest
  });
  const atkFIndex = manifest.entries.find((entry) => entry.PATH === ATK_F_INDEX_PATH);

  assert.equal(verification.SUCCESSOR_ORACLE, "ESTABLISHED");
  assert.match(manifest.ORACLE_CONTENT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  assert.match(manifest.ORACLE_ENVIRONMENT_PREIMAGE_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  assert.equal(atkFIndex.SPECIES, "VCS_ADMINISTRATIVE_STATE");
  assert.deepEqual(atkFIndex.CONTENT_IDENTITY_FOR_ATTACK_IDS, []);
  assert.deepEqual(atkFIndex.STATE_PRECONDITION_FOR_ATTACK_IDS, []);
  assert.deepEqual(atkFIndex.ENVIRONMENT_PREIMAGE_FOR_ATTACK_IDS, ["F"]);
});

test("successor hostile oracle calibrators discriminate observer noise, semantic change, and laundering", {
  skip: corpusAvailable ? false : "G7 hostile corpus not present on this machine"
}, () => {
  const calibrators = runSuccessorOracleCalibrators({
    rootDir: process.cwd(),
    corpusRoot: HOSTILE_CORPUS_ROOT
  });

  assert.equal(calibrators.CALIBRATOR_A_RESULT.RESULT, "PASS");
  assert.equal(calibrators.CALIBRATOR_A_RESULT.SEMANTIC_MATTER_UNCHANGED, true);
  assert.equal(calibrators.CALIBRATOR_A_RESULT.INCIDENTAL_VCS_ADMINISTRATIVE_STATE_CHANGED, true);
  assert.equal(calibrators.CALIBRATOR_A_RESULT.ATTACK_SEMANTIC_RESULT_EQUIVALENT, true);
  assert.equal(calibrators.CALIBRATOR_B_RESULT.RESULT, "PASS");
  assert.equal(
    calibrators.CALIBRATOR_C_RESULT.RESULT,
    "NO_CURRENT_STATE_PRECONDITION_CALIBRATOR"
  );
  assert.equal(calibrators.CALIBRATOR_D_RESULT.RESULT, "PASS");
  assert.equal(calibrators.CALIBRATOR_D_RESULT.classification_laundering_detected, true);
  assert.equal(calibrators.CALIBRATOR_D_RESULT.semantic_content_mismatch_detected, true);
  assert.equal(calibrators.CALIBRATORS_PASS, true);
});
