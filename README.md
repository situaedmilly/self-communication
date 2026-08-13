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
