# 0008. Invite-gated web sign-up

**Date:** 2026-09-25
**Status:** accepted
**Related:** [Auth](../auth.md), [0001](./0001-presentation-only-no-database.md), [0005](./0005-web-auth-is-tokens-ssh-stays-keys.md), [0009](./0009-cli-web-sign-on-attaches-ssh-key.md)

## Context

The website needed a way to create forge users without email and without opening the forge to the public internet. A users table here would violate [0001](./0001-presentation-only-no-database.md). `rgit user add` is forge-admin/operator only, so the UI cannot spawn it as `--anonymous`.

## Decision

- Sign-up is `/signup` → `POST /api/auth/signup`.
- An invite code in `RGIT_WEB_INVITE_CODE` (process config, not a database) is required. Unset or empty keeps sign-up closed.
- After the invite matches, rgit-web calls `rgit --anonymous auth register --user --password`, which creates a **non-admin** user and issues the same bearer token as login.
- No email, no confirmation message, no password reset inbox.

## Consequences

Operators open sign-up by setting the env on the web unit and restarting. Anyone with the code can create a login; rotate the code to stop new accounts. The first SSH key is attached by `rgit login` (device grant) or by an admin `key add` / `key copy`. Admins continue to use `rgit user add --admin`.
