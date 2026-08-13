# self-communication

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
