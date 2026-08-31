import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSuccessorOracleCustodyManifest,
  buildSuccessorOracleCustodyReport,
  exactSuccessorOracleCustodyPathSet
} from "../tools/ourself-selfcommunication-successor-oracle-custody.mjs";

test("successor oracle custody compiles the exact proof-carrying path set", () => {
  const { paths } = exactSuccessorOracleCustodyPathSet({ rootDir: process.cwd() });

  for (const requiredPath of [
    "tools/ourself-selfcommunication-successor-oracle-custody.mjs",
    "tools/ourself-selfcommunication-hostile-oracle-identity.mjs",
    "tools/ourself-selfcommunication-proof-closure-custody.mjs",
    "test/ourself-selfcommunication-successor-oracle-custody.test.mjs",
    "test/ourself-selfcommunication-hostile-oracle-identity.test.mjs",
    "test/ourself-selfcommunication-abc-repair-acceptance.test.mjs",
    "test/ourself-selfcommunication-proof-closure-custody.test.mjs",
    "specimens/selfcommunication-hostile-oracle-identity-v0-001/successor-hostile-oracle-manifest.json",
    "specimens/selfcommunication-hostile-oracle-identity-v0-001/successor-hostile-oracle-report.json",
    "specimens/selfcommunication-successor-oracle-custody-v0-001/successor-oracle-proof-carrying-custody-manifest.json"
  ]) {
    assert.ok(paths.includes(requiredPath), requiredPath);
  }
  assert.equal(paths.includes("package.json"), false);
});

test("successor oracle custody manifest binds compiler identity as load-bearing Matter", () => {
  const manifest = buildSuccessorOracleCustodyManifest({ rootDir: process.cwd() });
  const compiler = manifest.minimum_durable_custody_set.find((entry) => (
    entry.PATH === "tools/ourself-selfcommunication-hostile-oracle-identity.mjs"
  ));
  const custodyCompiler = manifest.minimum_durable_custody_set.find((entry) => (
    entry.PATH === "tools/ourself-selfcommunication-successor-oracle-custody.mjs"
  ));

  assert.equal(compiler.PROOF_ROLE, "IDENTITY_PARTICIPATION_COMPILER");
  assert.equal(compiler.DEPENDENCY_CLASSIFICATION, "LOAD_BEARING");
  assert.match(compiler.CONTENT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  assert.ok(compiler.DEPENDENTS.includes("Q5:CLASSIFICATION_COMPILER_DRIFT"));
  assert.equal(custodyCompiler.PROOF_ROLE, "PROOF_CARRYING_CUSTODY_COMPILER");
  assert.match(manifest.SUCCESSOR_ORACLE_CUSTODY_MANIFEST_IDENTITY, /^sha256:[a-f0-9]{64}$/);
});

test("successor oracle custody report preserves recomputable standing without package drift", () => {
  const report = buildSuccessorOracleCustodyReport({
    rootDir: process.cwd(),
    writeArtifacts: false
  });

  assert.equal(report.PATH_CONTENT_CHECKS_PASS, true);
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.SUCCESSOR_ORACLE_STANDING, "SUCCESSOR_ORACLE_ESTABLISHED_AND_A+B+C_PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_A, "PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_B, "PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_C, "NOT_APPLICABLE_CURRENT_CORPUS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.CALIBRATOR_D, "PASS");
  assert.equal(report.PRE_COMMIT_RECOMPUTATION.A_B_C_ACCEPTANCE, "PASS");
  assert.equal(report.EXACT_PATH_SET.includes("package.json"), false);
  assert.equal(report.BLOCKERS.includes("UNRELATED_STAGED_PATHS_PRESENT"), false);
  assert.equal(report.CURRENT_LAUNCH_STANDING, "NO_LAUNCH");
});
