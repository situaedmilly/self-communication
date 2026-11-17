# Communication Versus Storage Custody Boundary v0.1

SELFCOMM and communication transports carry requests, payloads, receipts, and recontact messages. Transport is not canonical storage.

A delivered message proves delivery only to the scope evidenced by the transport. It does not prove that payload bytes were durably stored, that a DATASELF envelope resolved, that a journal append was complete, or that an independent custodian received the object.

## Required flow

1. Authenticate sender, receiver, reality, instance, and jurisdiction.
2. Bind the message to an immutable content key and envelope reference.
3. Transfer exact bytes or a bounded content reference.
4. Have the receiver persist through its own admitted adapter.
5. Read back and verify exact digest and byte count.
6. Return a receiver-side receipt.
7. Recontact later through an independently controlled route when the policy requires it.

A network retry is not permission to overwrite. Duplicate content is idempotent; mismatched bytes under one content key cause quarantine. Communication success must never be relabeled as storage success.
