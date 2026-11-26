import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const REGISTRY_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../protocols/protocolself-18.v0.1.json");
export const EXPECTED_PROTOCOL_COUNT = 18;
export function loadProtocolSelfRegistry(registryPath = REGISTRY_PATH) { return JSON.parse(fs.readFileSync(registryPath, "utf8")); }
export function validateProtocolSelfRegistry(registry) {
  const errors = [];
  if (registry?.schema !== "ourself.protocolself-registry.v0.1") errors.push("SCHEMA_MISMATCH");
  if (registry?.registry_id !== "OURSELFCOMM-PROTOCOLSELF-18") errors.push("REGISTRY_ID_MISMATCH");
  if (!Array.isArray(registry?.protocols) || registry.protocols.length !== EXPECTED_PROTOCOL_COUNT) errors.push("PROTOCOL_COUNT_MUST_EQUAL_18");
  const ids = (registry?.protocols ?? []).map(p => p.id);
  if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_PROTOCOL_ID");
  for (const p of registry?.protocols ?? []) {
    if (!p.id || !Array.isArray(p.ports) || !p.ports.length) errors.push("INVALID_PROTOCOL_ENTRY");
    if (p.listener_enabled !== false) errors.push("LISTENER_MUST_REMAIN_DISABLED:" + p.id);
    if (p.external_exposure !== false) errors.push("EXTERNAL_EXPOSURE_MUST_REMAIN_FALSE:" + p.id);
    if (p.admission_required !== true) errors.push("ADMISSION_REQUIRED:" + p.id);
    for (const port of p.ports ?? []) if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("INVALID_PORT:" + p.id);
  }
  const policy = registry?.boot_policy ?? {};
  if (policy.mode !== "REGISTRY_ONLY") errors.push("BOOT_MODE_MUST_BE_REGISTRY_ONLY");
  if (policy.default_listener !== "DISABLED") errors.push("DEFAULT_LISTENER_MUST_BE_DISABLED");
  if (policy.external_bind !== "PROHIBITED") errors.push("EXTERNAL_BIND_MUST_BE_PROHIBITED");
  if (policy.network_transport_authority !== "NOT_GRANTED_BY_REGISTRY_BOOT") errors.push("REGISTRY_BOOT_MUST_NOT_GRANT_NETWORK_AUTHORITY");
  return { valid: errors.length === 0, count: registry?.protocols?.length ?? 0, errors };
}
export function bootProtocolSelfRegistry(registry = loadProtocolSelfRegistry()) {
  const validation = validateProtocolSelfRegistry(registry);
  if (!validation.valid) { const error = new Error("PROTOCOLSELF_REGISTRY_REJECTED"); error.details = validation; throw error; }
  return { runtime:"OURSELFCOMM",registry_id:registry.registry_id,status:"REGISTRY_BOOTED_LISTENERS_DISABLED",protocol_count:validation.count,protocol_ids:registry.protocols.map(p=>p.id),network_listeners_started:0,external_bindings_created:0,network_transport_authority:"NOT_GRANTED" };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "verify";
  if (mode === "verify") { const result=validateProtocolSelfRegistry(loadProtocolSelfRegistry()); console.log(JSON.stringify(result,null,2)); if(!result.valid) process.exitCode=1; }
  else if (mode === "boot") console.log(JSON.stringify(bootProtocolSelfRegistry(),null,2));
  else { console.error("Usage: node tools/protocolself-registry.mjs [verify|boot]"); process.exitCode=2; }
}
