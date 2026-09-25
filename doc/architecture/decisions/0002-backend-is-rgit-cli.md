# 0002. Backend is the rgit CLI

**Date:** 2026-09-24
**Status:** accepted
**Related:** [CLI](../cli.md)

## Context

Authentication and forge operations could have been a REST daemon inside rabun-git, a shared Rust library linked into Bun via FFI, or HTTP git (Smart HTTP). The SSH server is already the network surface for clone/push. Adding a second protocol for the same ACL would split bugs.

Burton workers already treat sibling CLIs as the backend (`--json`, env config). That pattern fits a presentation-only app.

## Decision

rgit-web **spawns** `rgit --json` with `--token` or `--anonymous`. It does not import the crate, does not call russh, and does not run `git` itself. New HTTP routes map to existing or new clap subcommands.

## Consequences

Each page load pays process startup; that is acceptable at forge scale. CLI stdout must stay JSON-stable (`--json`). Operators debug with the same commands the website runs. A future in-process API would be a new ADR.
