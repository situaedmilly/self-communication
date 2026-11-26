# OURSELFCOMM ProtocolSELF Registry v0.1

This additive registry materializes the 18 entries in the supplied Networking
Protocols and Ports reference. FTP data and control are separate entries.
DHCP server/client roles are one entry with ports 67 and 68.

## Boot boundary

- `npm run protocolself:verify` validates all 18 entries.
- `npm run protocolself:boot` loads the registry and emits a boot receipt.

Boot is **REGISTRY_ONLY**. It does not bind TCP/UDP sockets, enable daemons,
open firewall rules, create Cloudflare routes, or authorize multi-node exchange.
Every listener remains disabled and externally unexposed. The candidate
doctrine's `network_transport: NOT_AUTHORIZED` remains intact. This scoped
Founder directive realizes registry/configuration and local registry boot only.

Telnet and TFTP are prohibited-insecure. All other services remain disabled
until separately admitted with service identity, jurisdiction, credentials,
transport security, and runtime preflight.
