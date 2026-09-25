# 0001. Presentation only; no database

**Date:** 2026-09-24
**Status:** accepted
**Related:** [Overview](../overview.md)

## Context

The GitHub-style UI needs users, repo lists, trees, and merge requests. A local Postgres (or even SQLite) would duplicate the forge’s YAML and git refs, drift on merge, and become a second ACL.

The product constraint was explicit: rgit-web is presentation; the forge already is the source of truth.

## Decision

rgit-web has **no database** and no on-disk cache of git objects. Bun holds only process config and an HttpOnly cookie that wraps a forge token. All durable state stays under `$RABUN_GIT_ROOT`.

## Consequences

Deploys skip migrations. The website cannot outlive the CLI: if `rgit` is missing, `/api` is 503. Search, stars, and notifications would need new forge commands (or a later store), not tables in this repo.
