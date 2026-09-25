# 0006. Public repos are anonymous-readable

**Date:** 2026-09-24
**Status:** accepted
**Related:** [Auth](../auth.md)

## Context

A GitHub replacement must list and browse public code without an account. rgit’s default actor on a local binary is **Operator**, which sees every repository. Spawning that from Bun would leak private repos to the internet.

SSH already has read/write/admin on `access.yaml`. Public clone needs a third path that is not “signed-in user” and not “operator”.

## Decision

- `visibility.yaml` marks `owner/name` as public (absent = private).
- `rgit --anonymous` is `Actor::Anonymous`: only public repos, no writes.
- rgit-web uses `--anonymous` whenever the session cookie is missing (including login).
- `repo create --public` and `repo visibility` remain authenticated.

## Consequences

The marketing/docs story (browse without sign-in) works. Forgetting `--anonymous` in a new route is a security bug. Anonymous merge or push stays out of scope; git write is still SSH + ACL.
