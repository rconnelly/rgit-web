# 0007. Same-host group access to the forge root

**Date:** 2026-09-24
**Status:** accepted
**Related:** [Overview](../overview.md), [Ubuntu deploy](../../deploy-ubuntu.md)

## Context

rgit-web must run `rgit --json --token` as a **non-operator** Unix user, but the CLI still reads and writes `/var/lib/rabun-git` (tokens, request refs, `git merge`). A Unix socket API or a privileged helper would be a new daemon. Running the website as `User=rabun-git` would mix the SSH server uid with a public HTTP worker.

Burton/rgit Ubuntu units already use dedicated users and `ProtectSystem=strict`.

## Decision

On the host:

- System user `rgit-web` runs the Bun unit.
- That user is in group `rabun-git`.
- Forge root is group-writable where the CLI needs it.
- `SupplementaryGroups=rabun-git` and `ReadWritePaths=… /var/lib/rabun-git` on `rgit-web.service`.
- Bind `127.0.0.1:3010`; Caddy is the only public HTTP.

rgit-web still passes `--token` / `--anonymous` so **forge ACL** applies even though Unix permits the files.

## Consequences

Website and `serve` share one disk without sharing a uid. Hardening must keep the group tight (only `rabun-git` and `rgit-web`). A remote website talking to rgit over the network would need a different ADR (and must still not use Operator).
