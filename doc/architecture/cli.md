# CLI

The server is a thin JSON proxy over the rgit binary. Contract: `rgit --json [--config PATH] (--token TOKEN | --anonymous) <subcommand>`.

Related: [0002](./decisions/0002-backend-is-rgit-cli.md), [0003](./decisions/0003-git-extensions-live-in-rgit.md). Command list in the forge: [commands](https://github.com/rconnelly/rgit/blob/master/doc/commands.md).

## Spawn

`src/server/rgit.ts`:

1. Resolve binary: `RGIT_BIN` / `RABUN_GIT_BIN` → `PATH` (`rgit`, then `rabun-git`) → sibling `../rabun-git/target/{release,debug}/rabun-git` → `/usr/local/bin/`.
2. Always `--json`. Add `--config` when `RABUN_GIT_CONFIG` or `RGIT_CONFIG` is set.
3. Exactly one of `--token` or `--anonymous`.
4. Parse stdout as JSON. Non-zero exit: use `{"error":…}` or the first stderr line; map to HTTP status (401 invalid token/password, 403 no access, 404 not found, 400 usage, else 502). Missing binary is 503.

Tests inject `setRgitRunner` so `bun test` does not need a forge.

## Commands the UI calls

| HTTP | CLI |
| --- | --- |
| `POST /api/auth/login` | `auth login --user --password` (anonymous) |
| `GET /api/auth/signup` | `{ enabled }` from whether `RGIT_WEB_INVITE_CODE` is set |
| `POST /api/auth/signup` | invite check in-process, then `auth register --user --password` (anonymous) |
| `GET /api/auth/me` | `auth whoami` |
| `POST /api/auth/logout` | `auth logout` |
| `GET/POST /api/repos` | `repo list` / `repo create [--public]` |
| `GET /api/repos/:owner/:name` | `repo show` |
| `POST …/visibility` | `repo visibility --public\|--private` |
| `GET …/tree\|blob\|blame\|log\|refs` | `repo tree\|blob\|blame\|log\|refs` |
| `GET …/commit/:sha` | `repo commit` |
| `GET …/diff?base&head` | `repo diff --base --head` |
| `GET/POST …/requests` | `request list` / `request create` |
| `GET …/requests/:id` | `request show` |
| `GET …/requests/:id/diff` | `request diff` |
| `POST …/requests/:id/review` | `request review [--approve\|--reject] [--comment]` |
| `POST …/requests/:id/merge` | `request merge` |

Browse payloads are defined in rgit `src/browse.rs` (`Tree`, `Blob`, `Blame`, …). Blobs omit content when binary or over the forge size cap (`truncated: true`).

## What the CLI must not be

rgit-web does not import rabun-git as a library, does not speak russh, and does not run `git` itself. Extending git (new object types, request refs) stays in the forge so SSH and the website share one ACL.
