# 0005. Web auth is passwords and tokens; SSH stays keys

**Date:** 2026-09-24
**Status:** accepted
**Related:** [Auth](../auth.md)

## Context

SSH identity is an OpenSSH public key mapped to a forge user (`keys/<user>.pub`). Browsers cannot usefully present that key for a session cookie. Putting the private key in the browser (or a browser extension) would mix clone credentials with a website login.

HTTP Basic against the SSH daemon was also a poor fit: `serve` is russh on 2222, not an HTTP authenticator.

## Decision

- **SSH:** keys only. Clone/push unchanged.
- **Web:** optional argon2id password on the user record; `rgit auth login` issues a bearer token (`rgit_…`); rgit-web stores that token in the HttpOnly `rgit_session` cookie.
- Token hashes live in `tokens.yaml`. The website does not persist sessions.

## Consequences

Users who only clone never need a password. Web users need `rgit user passwd` (or `--password` at add). Losing the cookie means signing in again; revoke with `rgit auth logout` or deleting the token hash. Password reset is an operator CLI task until a later command exists.
