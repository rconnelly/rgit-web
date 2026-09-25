# Develop

Run rgit-web on this machine against a local or already-serving forge root. There is no database to migrate.

## Needs

- [Bun](https://bun.sh)
- `rgit` / `rabun-git` on `PATH`, or `RGIT_BIN` pointing at `../rabun-git/target/debug/rabun-git`
- A forge data root (`RABUN_GIT_ROOT`, default `data/git` next to `rabun-git.toml`)
- At least one forge user with a **web password** (SSH keys still clone; they do not sign in here)

```bash
export RABUN_GIT_ROOT=/path/to/data/git
export RABUN_GIT_CONFIG=/path/to/rabun-git.toml
rgit user add ada --admin --password 'correct-horse'
```

`rgit user passwd ada --password '…'` sets a password on an existing user.

## Run

```bash
bun install
bun test
bun run dev
```

Open http://127.0.0.1:3010. Bind override: `RGIT_WEB_PORT`, `RGIT_WEB_HOSTNAME`.

Public repositories list and browse without a session (`rgit --anonymous`). Sign in to create repos, review, and merge.

## Tests

`bun test` covers:

- Markdown escaping (`src/lib/markdown.test.ts`)
- CLI runner injection and missing-binary 503 (`src/server/rgit.test.ts`)
- Health, anonymous `repo list`, login cookie (`src/server/app.test.ts`)
- Ubuntu script syntax (`deploy/ubuntu/scripts.test.ts`)

Forge-side browse and tokens: `cargo test --locked` in the rgit checkout.

## Binary resolution

`src/server/rgit.ts` looks up the CLI in this order: `RGIT_BIN` / `RABUN_GIT_BIN` → `PATH` (`rgit`, then `rabun-git`) → `../rabun-git/target/{release,debug}/rabun-git` → `/usr/local/bin/`. Missing binary is HTTP 503.
