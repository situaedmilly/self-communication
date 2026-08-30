import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceDependencyMap,
  buildHeadPinFindings,
  buildIdentitySpeciesMap,
  buildSuccessorDelta,
  classifyCustodyDurability,
  KNOWN_IDENTIFIERS
} from "../tools/ourself-selfcommunication-proof-carrying-succession.mjs";

test("a20e is adjudicated as assigned reference when no derivation reproduces it", () => {
  const identities = buildIdentitySpeciesMap({
    rootDir: process.cwd(),
    previousFreeze: { launch_subject_identity: KNOWN_IDENTIFIERS.A20E },
    t2Report: {
      launch_subject_recontact: {
        identity_recomputation_candidates: {
          manifest_identity_plus_minimal_closure: "sha256:065fd97f4c2e4cb3119594a1feb7ed171e4854fc6e722fc94d88ad192206300b",
          manifest_identity_plus_commit_recontact: "sha256:b48e9d5ce4177a1c05db58faeebf85575b346d6625c44b23f3b2587ec6e154cc"
        }
      }
    },
    g7Report: {},
    matterEntries: [{
      path: "tools/ourself-selfcommunication-launch-readiness.mjs",
      content_identity: KNOWN_IDENTIFIERS.SEVEN34,
      durability_species: ["WORKTREE_ONLY"]
    }]
  });
  const a20e = identities.find((entry) => entry.identifier === KNOWN_IDENTIFIERS.A20E);

  assert.equal(a20e.primary_species, "ASSIGNED_REFERENCE");
  assert.equal(a20e.recomputed_value_matches_identifier, false);
  assert.ok(a20e.does_not_establish.includes("STRUCTURAL_IDENTITY"));
  assert.ok(a20e.does_not_establish.includes("CONTENT_IDENTITY"));
});

test("custody durability separates loose object database entries from reachability", () => {
  const looseOnly = classifyCustodyDurability({
    exists: true,
    objectExistsLocal: true,
    localReachabilityRoots: [],
    remoteReplicated: false,
    independentRecontact: "FAIL"
  });
  const reachable = classifyCustodyDurability({
    exists: true,
    objectExistsLocal: true,
    localReachabilityRoots: ["HEAD"],
    remoteReplicated: false,
    independentRecontact: "PASS"
  });

  assert.deepEqual(looseOnly.durability_species, ["WORKTREE_ONLY", "GIT_OBJECT_DB_LOCAL"]);
  assert.equal(looseOnly.object_exists_not_object_reachable, true);
  assert.equal(looseOnly.sufficient_for_local_launch_custody, false);
  assert.ok(reachable.durability_species.includes("GIT_REACHABLE_LOCAL"));
  assert.equal(reachable.sufficient_for_local_launch_custody, true);
});

test("T2 carry is delta-sensitive and does not inherit predecessor PASS labels", () => {
  const delta = buildSuccessorDelta();
  const evidence = buildEvidenceDependencyMap({ deltaIdentity: delta.DELTA_IDENTITY });
  const t2 = evidence.find((entry) => entry.evidence_id === "T2_PREDECESSOR_BINDING");

  assert.equal(t2.AffectedByDelta, "TRUE");
  assert.equal(t2.disposition, "UNDERDETERMINED");
  assert.equal(t2.no_manual_pass_injection, true);
  assert.ok(t2.delta_intersection.includes("a20e63ee species adjudication"));
});

test("HEAD-pin findings distinguish repository position from semantic preimage evidence", () => {
  const findings = buildHeadPinFindings();
  const t2HeadPin = findings.find((entry) => entry.rule_ref === "T2_LAUNCH_SUBJECT_RECONTACT_HEAD_EQUALS_4357F7AC");

  assert.equal(t2HeadPin.asks_same_repository_position, true);
  assert.equal(t2HeadPin.asks_same_required_preimage, false);
  assert.equal(t2HeadPin.repaired_by_successor_model, true);
});
