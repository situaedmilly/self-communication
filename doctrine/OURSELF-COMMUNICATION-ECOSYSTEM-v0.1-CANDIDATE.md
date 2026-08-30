# OURSELF Communication Ecosystem v0.1 Candidate

```text
artifact_status: CANDIDATE_DOCTRINE_AND_LOCAL_WITNESS
created_at: 2026-08-29T08:00:26Z
source_signal: MILASOPHAHR
session_goal: one SELF can communicate with OURSELF / ANOTHERSELF
canonical_schema: NOT_RATIFIED
network_transport: NOT_AUTHORIZED
multi_node_exchange: NOT_AUTHORIZED
SELFgraph_promotion: NOT_AUTHORIZED
autonomous_reconciliation: FORBIDDEN
autonomous_mutation: FORBIDDEN
```

## 1. Purpose

This candidate connects DARKMATTERBOX directly to SELFCOMMUNICATION and realizes
the first local witness slice for one SELF communicating with OURSELF or
ANOTHERSELF.

The realized slice is deliberately bounded:

```text
SELF expression
-> DARKMATTERBOX possibility preservation
-> explicit observation identity
-> ACK
-> admission / authority discrimination
-> bounded effect disposition
-> HOLLABACK
-> local validation witness
```

It does not claim that the candidate event schema is canonical. It does not
open structural transport, network routing, SELFgraph promotion, or autonomous
mutation. It makes the communication distinction executable enough to be
validated locally.

## 2. Core Mutation

The prior shallow model is rejected:

```text
COMMUNICATION = MATTER MOVING BETWEEN SELVES
```

The candidate replacement is:

```text
SELFCOMMUNICATION =
OURSELF maintaining causal coherence while Matter crosses possible
interpretations, substrates, observers, sessions, and realities.
```

DARKMATTERBOX is not the channel. It is the bounded possibility chamber through
which communicated Matter passes before a possible meaning may be distinguished
from established reality.

The first non-collapse laws are:

```text
COMMUNICATED_MATTER != ADMITTED_MEANING
ADMITTED_MEANING != AUTHORIZED_EFFECT
ACK != HOLLABACK
HOLLABACK != PROOF_OF_ACK
ACK != AUTHORITY
AUTHORITY != SUCCESSFUL_EFFECT
```

## 3. SELFCOMMUNICATION Scope

Candidate definition:

```text
SELFCOMMUNICATION is the ecosystem-wide capacity by which OURSELF expresses,
transports, receives, distinguishes, relates, establishes, acknowledges,
transforms, witnesses, and reconstructs accountable Matter without collapsing
transmission, interpretation, authority, or effect into one another.
```

SELFTALK is transport. SELFCOMMUNICATION is coherence:

```text
SELFTALK subset SELFCOMMUNICATION
```

Communication is therefore:

```text
COMMUNICATION = CAUSALLY_MEANINGFUL_STATE_EXPOSURE
```

Language is one species. Git status, test failure, filesystem diff, refusal,
stdout, commit, ACK, HOLLABACK, and witnessed absence may all become
communicative Matter when properly observed and bounded.

## 4. Six Planes

DARKMATTERBOX adds the missing plane:

```text
POSSIBILITY
COMMUNICATION
CUSTODY
OBSERVATION
GOVERNANCE
TRANSFORMATION
```

Plane responsibilities:

```text
POSSIBILITY:
  candidate interpretations, candidate trajectories, unresolved alternatives,
  reachability, contradiction branches, unentered realities

COMMUNICATION:
  expression, transmission, receipt, ACK, HOLLABACK, relation to Matter

CUSTODY:
  identity, lineage, source references, immutable archives, recontactability

OBSERVATION:
  observer identity, observed bytes, observed state, witness limitations

GOVERNANCE:
  admission, authority, forbidden transitions, standing ceilings

TRANSFORMATION:
  proposed effect, authorized execution, actual effect, residue
```

Possibility may generate candidates. Possibility cannot establish reality.

## 5. Reality Dispositions

Matter moving through SELFCOMMUNICATION carries dispositions across a causal
trajectory:

```text
EXPRESSED
TRANSMITTED
OBSERVED
UNDERSTOOD
ADMITTED
AUTHORIZED
EFFECTED
```

Later disposition does not retroactively prove earlier disposition identity.
Execution occurring does not prove that Founder Matter was transmitted exactly.
That is why ACK is a first-class communication object.

## 6. ACK and HOLLABACK

ACK and HOLLABACK are separate axes:

```text
ACK = WHAT_I_RECEIVED
HOLLABACK = WHAT_HAPPENED_BECAUSE_OF_IT
```

ACK claims receipt/observation. It does not confer authority.

HOLLABACK reports consequence/effect. It does not prove that ACK was faithful.

The local witness therefore validates these fields independently and refuses a
communication event that lets ACK carry authority or lets HOLLABACK stand as
proof of ACK.

## 7. Candidate Event Surface

The local witness recognizes the candidate `SELFCommunicationEvent` surface:

```text
SELFCommunicationEvent
├── event_id
├── matter_ref
├── source_actor_ref
├── target_actor_ref
├── expression_identity
├── darkmatterbox
│   ├── possible_interpretations[]
│   ├── actual_observation_ref
│   ├── admitted_variant_ref
│   └── rejected_variant_refs[]
├── observation_identity
├── admission_identity
├── authority_identity
├── effect_identity
├── trajectory[]
├── reality_dispositions
├── ack
├── hollaback
├── witness_refs[]
├── relation_refs[]
├── reconciliation_status
└── residue_refs[]
```

No event self-certifies truth. The event preserves enough identity and lineage
for another mechanism to establish standing later.

## 8. Heartbeat v0 Acceptance

The included specimen `specimens/heartbeat-v0.selfcommunication.json` exercises:

```text
M1: "MORPH HTMLSELF UNTIL LAUNCH."
```

Acceptance for this first local heartbeat is:

```text
Identity(M1) = Identity(ACK.observed_matter)
Authority(E1) = AUTHORIZED for fixture effect only
Witness(E1) = RECONSTRUCTABLE by local validator
M1 -> O1 -> A1 -> E1 -> H1 is independently reconstructable
```

The effect is a fixture-local communication witness, not an HTMLSELF launch, not
an implementation authority expansion, and not a promotion of this candidate
schema into canon.

## 9. Realized Files

```text
schemas/selfcommunication.event.v0.1-candidate.schema.json
  Candidate field contract for the local witness.

specimens/heartbeat-v0.selfcommunication.json
  Concrete communication specimen with DARKMATTERBOX branches, ACK,
  authority disposition, fixture effect, and HOLLABACK.

tools/ourself-communicate.mjs
  Zero-dependency local CLI and validation module.

test/ourself-communicate.test.mjs
  Node test suite proving the valid specimen and selected negative controls.
```

The CLI can create a candidate event on stdout:

```bash
node tools/ourself-communicate.mjs create \
  --matter "MORPH HTMLSELF UNTIL LAUNCH." \
  --source SELF:MILASOPHAHR \
  --observer SELF:CODEXSELF \
  --recipient SELF:OURSELF
```

The CLI can validate the heartbeat specimen:

```bash
npm run validate:heartbeat
```

## 10. Authority Ceiling

```text
canonical_schema: NOT_RATIFIED
structural_transport: NOT_AUTHORIZED
network_transport: NOT_AUTHORIZED
multi_node_exchange: NOT_AUTHORIZED
ÆTHERNET_exchange: NOT_AUTHORIZED
SELFgraph_promotion: NOT_AUTHORIZED
runtime_mutation: NOT_AUTHORIZED
autonomous_reconciliation: FORBIDDEN
autonomous_mutation: FORBIDDEN
commit_authority: NOT_EXERCISED
push_authority: NOT_EXERCISED
```

This candidate realizes a local communicative event mechanism only. Future
gates must separately decide schema ratification, transport binding, custody
publication, multi-node exchange, and authority-bearing execution.
