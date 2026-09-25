# Auth

Web sign-in is a **password → bearer token → HttpOnly cookie**. SSH clone identity stays **public keys**. The two are independent on purpose: a browser session must not be an SSH key, and a deploy key must not log into the website.

Related: [0005](./decisions/0005-web-auth-is-tokens-ssh-stays-keys.md), [0006](./decisions/0006-public-repos-anonymous-read.md), [0009](./decisions/0009-cli-web-sign-on-attaches-ssh-key.md). Forge file layout: rgit [architecture](https://github.com/rconnelly/rgit/blob/master/doc/architecture.md).

## Actors

rgit maps every CLI invocation to `Actor::{Operator, User, Anonymous}`.

| Actor | How | What rgit-web uses |
| --- | --- | --- |
| Operator | Local CLI with no `--token` / `--anonymous` | **Never.** Would list every repo and skip ACL. |
| User | `--token rgit_…` | Signed-in session |
| Anonymous | `--anonymous` | Public browse, login, invite-gated sign-up, device start/poll |

If the binary is missing a flag, rgit treats the spawn as Operator. That is why `actorOpts` always passes one of `--token` or `--anonymous`.

## Passwords and tokens

- Web passwords are argon2id hashes on the user record in `users.yaml`. Set with `rgit user add … --password`, `rgit user passwd`, or invite-gated `rgit auth register` from `/signup`.
- `rgit auth login --user … --password …` (run as `--anonymous`) verifies the hash and writes a bearer token.
- `rgit --anonymous auth register --user … --password …` creates a non-admin user and issues a token. rgit-web only calls it after `RGIT_WEB_INVITE_CODE` matches. Unset invite keeps sign-up closed.
- Tokens are `rgit_` plus two UUID hex strings. Only a **SHA-256 hash** is stored in `tokens.yaml`.
- `rgit auth whoami` / `rgit auth logout` require `--token`.
- CLI web sign-on (`rgit login`) is a **device grant**: anonymous `auth device start` stores the laptop public key; a signed-in `auth device approve` appends it to `keys/<user>.pub`. Pending rows (device-code hashes only) live in `devices.yaml`.

rgit-web never hashes passwords or tokens. It forwards the password once on login and then only the cookie value.

## Cookie

Cookie name: `rgit_session`. Flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 14 days. `Secure` when `NODE_ENV=production` or `RGIT_WEB_SECURE_COOKIES` / `X_FORWARDED_PROTO` says HTTPS.

The cookie value **is** the CLI token. The Bun server does not keep a session table. Logout calls `rgit auth logout` then clears the cookie.

## Public read

Repositories listed in `visibility.yaml` as public are readable by `Actor::Anonymous`. Private repos return not found / no access to anonymous callers. Create, visibility change, review, and merge still need a User token and the usual rgit roles (`write` / repo or forge `admin`).

## Trust boundary

The browser never talks to rgit. It talks to `/api`. The token never goes to JavaScript (`HttpOnly`). Caddy is TLS; Bun binds loopback in production (`RGIT_WEB_HOSTNAME=127.0.0.1`). The laptop CLI talks HTTPS to `/api/auth/device/*` without a cookie; approve/deny use the same session cookie as the rest of the site.
