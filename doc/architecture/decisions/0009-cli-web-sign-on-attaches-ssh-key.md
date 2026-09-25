# 0009. CLI web sign-on attaches an SSH key

**Date:** 2026-09-25
**Status:** accepted
**Related:** [Auth](../auth.md), [0001](./0001-presentation-only-no-database.md), [0002](./0002-backend-is-rgit-cli.md), [0005](./0005-web-auth-is-tokens-ssh-stays-keys.md)

## Context

Invite-gated `/signup` creates a web password but no SSH key, so a new user cannot `git clone` or `rgit origin …`. GitHub `gh auth login` solves the same laptop bootstrap with an OAuth token because GitHub’s API is HTTPS. rgit’s git and named-remote commands are SSH. Storing a second bearer token on the laptop would invent a transport the forge does not speak. A pending-device table in rgit-web would violate [0001](./0001-presentation-only-no-database.md).

## Decision

- `rgit login` (this machine) generates an Ed25519 key, posts the **public** key to rgit-web, prints a short user code, and opens `/login/device`.
- Pending grants live in forge `devices.yaml` (hash of the device secret only). rgit-web is a thin JSON proxy over `rgit auth device start|poll|show|approve|deny`.
- After the signed-in browser user approves, rgit adds that public key to **their** `keys/<user>.pub`. The CLI polls until authorized and writes `identity` + `web` on `~/.config/rabun-git/remotes.toml`.
- Browser sessions stay the HttpOnly token cookie. The laptop does not keep a web bearer token.
- `key copy` over host SSH remains the air-gapped first-admin path.

## Consequences

A web user can bootstrap git and `rgit origin` without sudo on the forge host. Losing the cookie still means signing into the website again; the SSH key stays until an admin removes it. `rgit logout` only forgets the local identity pointer.
