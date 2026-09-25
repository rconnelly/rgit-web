# Overview

rgit-web is the **browser** for the rgit forge. It does not store users, repositories, or merge requests. Those live in the forge data root (`users.yaml`, `tokens.yaml`, `visibility.yaml`, bare repos, `refs/rabun/requests/*`) and are reached only by spawning `rgit --json`.

`rgit view` stays a **loopback Zola** renderer for a local working tree. This app is the GitHub-style SPA: list, tree, blob, blame, log, and merge requests.

```
Browser
  HTTPS 443  -->  Caddy  -->  Bun.serve :3010 (rgit-web)
                                |  SPA (React 19 HTML imports)
                                |  /api/*  -->  spawn rgit --json [--token|--anonymous]
                                v
                              rgit CLI (same host)
                                |  ACL: Actor::{User, Anonymous}  — never Operator
                                v
                              $RABUN_GIT_ROOT  (group rabun-git)
                                repos/, yaml, git refs

Git clients
  SSH 2222  -->  rabun-git serve (russh)   clone / push / request refs
```

## What lives where

| Concern | Owner | This repo |
| --- | --- | --- |
| Passwords, tokens, ACL, visibility | rgit (`auth.rs`, `acl.rs`, `store`) | Cookie wrap + spawn flags |
| Tree, blob, blame, log, refs, diff | rgit (`browse.rs` — the rgit-repo layer) | JSON → pages |
| Merge requests | rgit (`request.rs`, git refs) | List, review, merge UI |
| Presentation, theming, routes | rgit-web | All of `src/pages`, `styles/` |
| Database | None | None |
| Clone/push | SSH on 2222 | Copy `clone_url` only |

The intended “rgit-repo” crate does not exist as a separate checkout. Git browse commands live in the rgit binary so ACL and `git` stay one process. See [0003](./decisions/0003-git-extensions-live-in-rgit.md).

## Request path

1. `Bun.serve` matches `/api/…` in `src/server/app.ts`, or serves `index.html` for the SPA.
2. `actorOpts` reads the `rgit_session` cookie. Present → `--token`. Missing → `--anonymous`.
3. `src/server/rgit.ts` prepends `--json` and optional `--config`, then `Bun.spawn`.
4. Non-zero CLI exit becomes HTTP 4xx/5xx from stderr/`{"error":…}`. Success JSON is the response body.
5. React pages call `/api/…` with `credentials: "include"`.

Writes (create repo, visibility, review, merge) call `requireUser` first so a missing cookie is 401 instead of an anonymous CLI error.

## Processes on Ubuntu

Two systemd units, one data root:

- `rabun-git.service` — `User=rabun-git`, `rgit serve` on 2222
- `rgit-web.service` — `User=rgit-web`, `SupplementaryGroups=rabun-git`, `ReadWritePaths` includes `/var/lib/rabun-git`

Caddy terminates TLS and reverse-proxies `127.0.0.1:3010`. The web unit must not bind a public address.
