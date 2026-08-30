# SELFCOMMUNICATION

Transmission channel for SELF-ecosystem operations.

```
interactions/latest.json   mutable pointer to the most recent transmission
inselfactions/             immutable archives, append-only
```

An INSELFACTION is the handoff. It carries the full operational result,
deltas, proof, findings, constraints, source references, standing, unresolved
items, and next authority. A chat receipt is only routing.

Archives are never edited. A correction appends a successor INSELFACTION that
supersedes its predecessor by id; the predecessor's bytes stay attributable.

## Bootstrap orientation

This repository exposes endpoint boot pointers for CodingSELF arrivals:

```
AGENTS.md      CodexSELF boot orientation
CLAUDE.md      ClaudeSELF boot orientation
```

Both files intentionally stay small. Their shared source is
`doctrine/OURSELF-BOOTSTRAP-SELFCOMMUNICATION-CONTRACT-v0.1-CANDIDATE.md`.
They point into canonical doctrine and local witness files instead of copying
the full doctrine into every endpoint surface.

Run the projection check:

```bash
npm run verify:bootstrap
```

## Local communication witness

This repository now includes a local, candidate-only witness for the first
OURSELF communication ecosystem slice:

```
doctrine/OURSELF-COMMUNICATION-ECOSYSTEM-v0.1-CANDIDATE.md
schemas/selfcommunication.event.v0.1-candidate.schema.json
specimens/heartbeat-v0.selfcommunication.json
tools/ourself-communicate.mjs
test/ourself-communicate.test.mjs
```

The witness validates that one SELF can express Matter toward OURSELF or
ANOTHERSELF while preserving DARKMATTERBOX possibility, observed identity, ACK,
HOLLABACK, reality dispositions, authority ceilings, and non-collapse laws. It
does not establish a canonical schema, network transport, multi-node exchange,
SELFgraph write, autonomous reconciliation, or runtime mutation.

Run locally:

```bash
npm test
npm run validate:heartbeat
node tools/ourself-communicate.mjs create --matter "MORPH HTMLSELF UNTIL LAUNCH." --source SELF:MILASOPHAHR --observer SELF:CODEXSELF --recipient SELF:OURSELF
```

## Governed communication model

SELFCOMMUNICATION distinguishes human communication, agent communication, and
structural communication. The existing Git-backed INSELFACTION channel remains
an operational handoff mechanism; it is not thereby authorized to transport
SELFSTRUCT output as structural communication.

The sealed
[SS-02 structural reality reconciliation](doctrine/SELFCOMMUNICATION-STRUCTURAL-REALITY-RECONCILIATION-v0.1.md)
governs the semantics and boundaries of any future provenance-bound structural
exchange above transport. It does not ratify a schema or protocol class,
implement network transport, authorize multi-node exchange, promote
StructuralIR, write SELFgraph, build ÆTHERNET, reconcile autonomously, or mutate
runtime state.
