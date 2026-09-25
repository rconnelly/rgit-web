# rgit-web

GitHub-style browser for [rgit](https://github.com/rconnelly/rgit) (rabun-git) repositories. Presentation only: no database. The Bun server shells out to the `rgit` CLI (`--json`) for auth, trees, blame, commits, and merge requests.

The look matches the Zola **DevLab** theme used by `rgit view` and [rgit.rs](https://rgit.rs) (Rabun cream / pine / gold).

## Stack

- [Burton](https://github.com/Burton-Workspaces/burton) Bun + React 19 (`Bun.serve`, HTML imports, Tailwind 4, shadcn)
- `rgit` CLI for all forge data (users, tokens, git browse, merge requests)
- Ubuntu pack → push → install, same as Burton and rabun-git

## Develop

Needs `rgit` / `rabun-git` on `PATH` (or `RGIT_BIN`), a forge root (`RABUN_GIT_ROOT`), and a user with a web password (`rgit user passwd NAME --password …`).

```bash
bun install
bun test
bun run dev
```

Open http://127.0.0.1:3010. Sign in with the forge user and password.

```bash
export RABUN_GIT_ROOT=/path/to/data/git
export RABUN_GIT_CONFIG=/path/to/rabun-git.toml
rgit user add ada --admin --password 'correct-horse'
```

## Deploy (Ubuntu)

Same air-gapped flow as Burton: pack on Linux, scp, install. The droplet never talks to GitHub.

```bash
./deploy/ubuntu/push.sh --pack --bootstrap --domain git.example.com user@HOST
./deploy/ubuntu/push.sh --pack user@HOST
```

`rgit` must already be installed on the host (`rabun-git` unit). The web unit runs as `rgit-web` in group `rabun-git` so it can read and write the forge root.

## Layout

| Path | Role |
| --- | --- |
| `src/server/rgit.ts` | Spawn `rgit --json` |
| `src/pages/` | Repo list, tree, blob, blame, commits, merge requests |
| `styles/globals.css` | DevLab / Rabun tokens on shadcn |
| `deploy/ubuntu/` | pack, push, bootstrap, install, Caddy |
