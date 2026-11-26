import test from "node:test";
import assert from "node:assert/strict";
import { bootProtocolSelfRegistry, loadProtocolSelfRegistry, validateProtocolSelfRegistry } from "../tools/protocolself-registry.mjs";
test("registry contains exactly 18 distinct protocol selves",()=>{const r=loadProtocolSelfRegistry();const v=validateProtocolSelfRegistry(r);assert.equal(v.valid,true,v.errors.join(", "));assert.equal(v.count,18);assert.equal(new Set(r.protocols.map(p=>p.id)).size,18);});
test("boot loads all 18 definitions without opening listeners",()=>{const r=bootProtocolSelfRegistry();assert.equal(r.status,"REGISTRY_BOOTED_LISTENERS_DISABLED");assert.equal(r.protocol_count,18);assert.equal(r.network_listeners_started,0);assert.equal(r.external_bindings_created,0);});
test("registry boot cannot grant network transport authority",()=>{const r=loadProtocolSelfRegistry();r.boot_policy.network_transport_authority="GRANTED";assert.equal(validateProtocolSelfRegistry(r).valid,false);});
test("Telnet and TFTP remain prohibited",()=>{const r=loadProtocolSelfRegistry();for(const id of ["TELNET","TFTP"]){const p=r.protocols.find(x=>x.id===id);assert.equal(p.activation,"PROHIBITED");assert.equal(p.listener_enabled,false);}});
