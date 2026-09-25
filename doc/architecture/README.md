# Architecture

Design records for rgit-web: how the browser talks to the forge, and the forks we took. Operator steps stay at the `doc/` root.

GitHub and most Markdown previews render [Mermaid](https://mermaid.js.org/) in these files.

## Catalog

| Page | What it covers |
| --- | --- |
| [Overview](./overview.md) | Process split, request path, what lives where |
| [Auth](./auth.md) | Web passwords, bearer tokens, cookie, anonymous read |
| [CLI](./cli.md) | `rgit --json` contract the server spawns |
| [UI](./ui.md) | Routes, code viewer, DevLab tokens vs `rgit view` |
| [Decisions](./decisions/README.md) | Numbered architecture decision records |

## Adding a page

1. Add `doc/architecture/<topic>.md` with the current design.
2. Link it from this catalog.
3. If a choice was a real fork (ownership, storage, trust boundary), add `doc/architecture/decisions/NNNN-short-title.md` using the template in [decisions](./decisions/README.md).
