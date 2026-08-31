import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildProofClosureCustodyReport,
  buildSuccessorFreeze,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_PREIMAGE_PATH
} from "../tools/ourself-selfcommunication-proof-closure-custody.mjs";
import {
  verifySuccessorOracleIdentity
} from "../tools/ourself-selfcommunication-hostile-oracle-identity.mjs";

const REPO_ROOT = process.cwd();
const SUBJECT_COMMIT = "7567a7577f51cc5089b9c6feb0323306976b4c0b";
const HOSTILE_CORPUS_ROOT = process.env.SELFCOMMUNICATION_G7_HOSTILE_CORPUS ??
  "/Users/millysituated/Desktop/G7-REMOTE-DERIVATION-CLOSURE-WITNESSES-001";

const corpusAvailable =
  fs.existsSync(path.join(HOSTILE_CORPUS_ROOT, "WITNESS-MANIFEST.json")) &&
  fs.existsSync(path.join(HOSTILE_CORPUS_ROOT, "corpus", "atk-D3"));

const baseReport = buildProofClosureCustodyReport({
  sourceMode: "custody-only",
  writeArtifacts: false,
  preimagePath: DEFAULT_PREIMAGE_PATH,
  manifestPath: DEFAULT_MANIFEST_PATH
});

function gitIn(rootDir, args) {
  return execFileSync("git", ["-C", rootDir, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

function verifySuccessorOracleForAcceptance(corpusRoot) {
  const oracle = verifySuccessorOracleIdentity({ corpusRoot });
  assert.equal(oracle.SUCCESSOR_ORACLE, "ESTABLISHED");
  assert.match(oracle.ORACLE_CONTENT_IDENTITY, /^sha256:[a-f0-9]{64}$/);
  return oracle;
}

function createHostileExecutionCopy() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-hostile-execution-"));
  const executionRoot = path.join(tempDir, "hostile-corpus");
  fs.cpSync(HOSTILE_CORPUS_ROOT, executionRoot, {
    recursive: true,
    dereference: false,
    preserveTimestamps: true
  });
  return {
    executionRoot,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function createCleanBareRemote() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-clean-remote-"));
  const bareDir = path.join(tempDir, "remote.git");
  execFileSync("git", ["clone", "--quiet", "--bare", REPO_ROOT, bareDir], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    bareDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function createFullHistoryFixture({ omitPath = null, mutatePath = null } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "selfcommunication-abc-fixture-"));
  const workDir = path.join(tempDir, "work");
  const bareDir = path.join(tempDir, "remote.git");
  execFileSync("git", ["clone", "--quiet", REPO_ROOT, workDir], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  gitIn(workDir, ["config", "user.name", "SELFCOMMUNICATION Test"]);
  gitIn(workDir, ["config", "user.email", "selfcommunication@example.test"]);

  for (const relativePath of baseReport.EXACT_PATH_SET) {
    const target = path.join(workDir, relativePath);
    if (relativePath === omitPath) {
      fs.rmSync(target, { force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, relativePath), target);
    if (relativePath === mutatePath) {
      fs.appendFileSync(target, "\nNOVEL_COUNTERFEIT_MUTATION\n");
    }
  }

  gitIn(workDir, ["add", "-A", ...baseReport.EXACT_PATH_SET]);
  gitIn(workDir, ["commit", "--quiet", "--allow-empty", "-m", "abc acceptance fixture"]);
  gitIn(workDir, ["init", "--bare", "--quiet", bareDir]);
  gitIn(workDir, ["remote", "set-url", "origin", bareDir]);
  gitIn(workDir, ["push", "--quiet", "origin", "HEAD:refs/heads/main"]);

  return {
    tempDir,
    workDir,
    bareDir,
    commit: gitIn(workDir, ["rev-parse", "HEAD"]),
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

function withEnv(updates, fn) {
  const previous = new Map(Object.keys(updates).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function reportForRoot(rootDir, overrides = {}) {
  return buildProofClosureCustodyReport({
    rootDir,
    sourceMode: "custody-only",
    writeArtifacts: false,
    durableCustodyCommit: SUBJECT_COMMIT,
    ...overrides
  });
}

function assertFailClosed(report, attackId) {
  assert.equal(report.SUCCESSOR_FREEZE, "NOT_MINTED", attackId);
  assert.equal(report.SUCCESSOR_FREEZE_ELIGIBLE, false, attackId);
  assert.equal(report.CURRENT_LAUNCH_STANDING, "NO_LAUNCH", attackId);
}

test("A+B+C repair acceptance replays the immutable hostile corpus fail-closed", {
  skip: corpusAvailable ? false : "G7 hostile corpus not present on this machine"
}, () => {
  const sourceOracleBefore = verifySuccessorOracleForAcceptance(HOSTILE_CORPUS_ROOT);
  const cleanRemote = createCleanBareRemote();
  const executionCopy = createHostileExecutionCopy();
  try {
    const fakeSsh = path.join(executionCopy.executionRoot, "_derived", "fake-ssh.relocatable.sh");
    const knownResults = [
      withEnv({ GIT_SSH: fakeSsh }, () => ({
        ATTACK_ID: "D",
        report: reportForRoot(path.join(executionCopy.executionRoot, "corpus", "atk-D"))
      })),
      withEnv({ GIT_SSH: fakeSsh }, () => ({
        ATTACK_ID: "D3",
        report: reportForRoot(REPO_ROOT)
      })),
      {
        ATTACK_ID: "F",
        report: reportForRoot(path.join(executionCopy.executionRoot, "corpus", "atk-F"), {
          remoteUrl: cleanRemote.bareDir
        })
      },
      {
        ATTACK_ID: "F2",
        report: reportForRoot(path.join(executionCopy.executionRoot, "corpus", "atk-F2"), {
          remoteUrl: cleanRemote.bareDir
        })
      },
      {
        ATTACK_ID: "P2b",
        report: reportForRoot(path.join(executionCopy.executionRoot, "corpus", "pr-2"), {
          remoteUrl: cleanRemote.bareDir
        })
      }
    ];

    for (const { ATTACK_ID, report } of knownResults) {
      assertFailClosed(report, ATTACK_ID);
    }
    assert.equal(
      knownResults.find((entry) => entry.ATTACK_ID === "D3").report
        .REMOTE_RECONTACT_RECEIPT.LOCAL_OBJECT_DATABASE_USED_FOR_REMOTE_EVIDENCE,
      false
    );
    assert.equal(
      knownResults.find((entry) => entry.ATTACK_ID === "F").report
        .MANIFEST_CONTENT_IDENTITY_ADJUDICATION.all_load_bearing_content_identities_match,
      false
    );
  } finally {
    executionCopy.cleanup();
    cleanRemote.cleanup();
  }
  const sourceOracleAfter = verifySuccessorOracleForAcceptance(HOSTILE_CORPUS_ROOT);
  assert.equal(
    sourceOracleAfter.ORACLE_CONTENT_IDENTITY,
    sourceOracleBefore.ORACLE_CONTENT_IDENTITY
  );
});

test("A+B+C repair acceptance adds novel counterfeit pressure beyond the known corpus", () => {
  const validFixture = createFullHistoryFixture();
  try {
    const validFreeze = buildSuccessorFreeze({
      rootDir: validFixture.workDir,
      manifest: baseReport.PROOF_CARRYING_MANIFEST,
      preimage: readJson(DEFAULT_PREIMAGE_PATH),
      recomputation: baseReport.DURABLE_CUSTODY_RECOMPUTATION,
      durableCustodyCommit: validFixture.commit,
      remoteUrl: validFixture.bareDir,
      remoteCustodyRef: "refs/heads/main"
    });
    assert.equal(validFreeze.SUCCESSOR_FREEZE, "MINTED");
  } finally {
    validFixture.cleanup();
  }

  const partialRemote = createFullHistoryFixture({
    omitPath: "tools/ourself-selfcommunication-launch-readiness.mjs"
  });
  try {
    const result = buildSuccessorFreeze({
      rootDir: partialRemote.workDir,
      manifest: baseReport.PROOF_CARRYING_MANIFEST,
      preimage: readJson(DEFAULT_PREIMAGE_PATH),
      recomputation: baseReport.DURABLE_CUSTODY_RECOMPUTATION,
      durableCustodyCommit: partialRemote.commit,
      remoteUrl: partialRemote.bareDir
    });
    assert.equal(result.SUCCESSOR_FREEZE, "NOT_MINTED");
    assert.equal(
      result.REMOTE_CUSTODY_DERIVATION.REMOTE_RECONTACT_RECEIPT.REMOTE_REQUIRED_OBJECTS_RECONTACTABLE,
      false
    );
  } finally {
    partialRemote.cleanup();
  }

  const mutatedLocal = createFullHistoryFixture({
    mutatePath: "tools/ourself-selfcommunication-launch-readiness.mjs"
  });
  try {
    const result = buildSuccessorFreeze({
      rootDir: mutatedLocal.workDir,
      manifest: baseReport.PROOF_CARRYING_MANIFEST,
      preimage: readJson(DEFAULT_PREIMAGE_PATH),
      recomputation: baseReport.DURABLE_CUSTODY_RECOMPUTATION,
      durableCustodyCommit: mutatedLocal.commit,
      remoteUrl: mutatedLocal.bareDir
    });
    assert.equal(result.SUCCESSOR_FREEZE, "NOT_MINTED");
    assert.equal(
      result.PROOF_CLOSURE_DERIVATION.CALLER_SUPPLIED_RECOMPUTATION_ADMITTED,
      false
    );
  } finally {
    mutatedLocal.cleanup();
  }

  const forgedProof = createFullHistoryFixture();
  try {
    const forgedPreimage = {
      ...readJson(DEFAULT_PREIMAGE_PATH),
      delta_identity: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
    };
    const result = buildSuccessorFreeze({
      rootDir: forgedProof.workDir,
      manifest: baseReport.PROOF_CARRYING_MANIFEST,
      preimage: forgedPreimage,
      recomputation: {
        proposition_results: {
          "P1:T2_SUCCESSOR_PASS": "PASS",
          "P2:G6_SUCCESSOR_STANDING": "PASS",
          "P3:SUCCESSOR_STRUCTURAL_IDENTITY": "PASS"
        },
        recomputation_identity: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      },
      durableCustodyCommit: forgedProof.commit,
      remoteUrl: forgedProof.bareDir
    });
    assert.equal(result.SUCCESSOR_FREEZE, "NOT_MINTED");
    assert.equal(result.PROOF_CLOSURE_DERIVATION.CALLER_SUPPLIED_RECOMPUTATION_ADMITTED, false);
  } finally {
    forgedProof.cleanup();
  }

  if (corpusAvailable) {
    const executionCopy = createHostileExecutionCopy();
    try {
      const objectStarvedRemote = path.join(executionCopy.executionRoot, "corpus", "attacker.git");
      const result = buildSuccessorFreeze({
        rootDir: REPO_ROOT,
        manifest: baseReport.PROOF_CARRYING_MANIFEST,
        preimage: readJson(DEFAULT_PREIMAGE_PATH),
        recomputation: baseReport.DURABLE_CUSTODY_RECOMPUTATION,
        durableCustodyCommit: SUBJECT_COMMIT,
        remoteUrl: objectStarvedRemote
      });
      assert.equal(result.SUCCESSOR_FREEZE, "NOT_MINTED");
      assert.equal(
        result.REMOTE_CUSTODY_DERIVATION.REMOTE_RECONTACT_RECEIPT.LOCAL_OBJECT_DATABASE_USED_FOR_REMOTE_EVIDENCE,
        false
      );
    } finally {
      executionCopy.cleanup();
    }
  }
});
