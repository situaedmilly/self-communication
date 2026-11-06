# INSELFACTION · PIPEPORTAL MAC ↔ SELFPI TRANSPORT

**Occurrence:** 2026-11-06  
**Transmission class:** Operational state update / evidence handoff  
**Standing:** TRANSPORT VERIFIED · AUTHORITY UNCONFIGURED

## Matter

Restore the PipePortal Mac-to-SELFPI cognition path and preserve the exact distinction between transport and PORTAL admission.

## Observations

1. Mac `ourselfmac.local` observed at `10.0.0.230`; PipePortal live on `127.0.0.1:49320`.
2. SELFPI `ourselfpimac.local` observed at `10.0.0.108`; Ollama listens on Pi loopback `127.0.0.1:11434`.
3. Pi-originated SSH reverse forward exposes the Ollama API at Mac loopback `127.0.0.1:11435`.
4. Mac requests to `/api/tags` and `/v1/models` returned HTTP 200. Model inventory included `ourmodelselfgenesis:latest` and `hf.co/ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF:IQ2_S`.
5. A Pi-side reconnect watchdog is registered in the Pi user's crontab for boot-time start.

## Explicit constraints and standing

- Independent PORTAL trust root: NOT CONFIGURED.
- Trust bundle: NOT VERIFIED.
- Host-admin pipe: NOT CONFIGURED.
- Direct Mac-to-Pi SSH TCP 22: FILTERED.
- Firewall changes: NONE.
- New keys or root identities generated: NONE.
- Raw SSH shell tunnel exposed as a PORTAL substitute: NO.

The SSH transport provides only the loopback-bound Ollama API path. It is not a host-admin command path, an independent trust assertion, or a PORTAL admission receipt.

## Result

MAC↔SELFPI cognition transport is restored and has a boot reconnect watchdog. PipePortal remains live. Independent trust and host administration remain unconfigured and unadmitted.

## Next authority

Independent root custodian / root public key / root key ID and independently verifiable signer evidence remain required before trust-bundle verification and host-admin preflight can proceed.

This INSELFACTION is an append-only evidence handoff. It does not claim canonical custody, external effect, or an authority transition.
