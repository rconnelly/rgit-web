# Architecture decisions

Each file is one accepted choice. Numbers increase; do not reuse a number. Status is `accepted`, `superseded`, or `deprecated`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-presentation-only-no-database.md) | Presentation only; no database | accepted |
| [0002](./0002-backend-is-rgit-cli.md) | Backend is the rgit CLI | accepted |
| [0003](./0003-git-extensions-live-in-rgit.md) | Git extensions live in rgit, not a separate rgit-repo crate | accepted |
| [0004](./0004-burton-bun-react-not-zola-pages.md) | Burton Bun+React for the UI; Zola is visual tokens only | accepted |
| [0005](./0005-web-auth-is-tokens-ssh-stays-keys.md) | Web auth is passwords and tokens; SSH stays keys | accepted |
| [0006](./0006-public-repos-anonymous-read.md) | Public repos are anonymous-readable | accepted |
| [0007](./0007-same-host-group-access.md) | Same-host group access to the forge root | accepted |
| [0008](./0008-invite-gated-signup.md) | Invite-gated web sign-up; no email | accepted |

## Template

```md
# NNNN. Title

**Date:** YYYY-MM-DD
**Status:** accepted
**Related:** [architecture page](../topic.md)

## Context

What forced a choice.

## Decision

What we chose.

## Consequences

What becomes easier, what we gave up, and what to revisit.
```
