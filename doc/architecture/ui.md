# UI

Burton Bun + React 19: `Bun.serve`, HTML imports, Tailwind 4, shadcn. No Vite, no Zola-generated per-request sites.

Related: [0004](./decisions/0004-burton-bun-react-not-zola-pages.md). Tokens live in `styles/globals.css`.

## Routes

| Path | Page |
| --- | --- |
| `/login` | Password sign-in (`?next=` returns to a relative path) |
| `/login/device` | Approve an `rgit login` device code (SSH public key handshake) |
| `/signup` | Invite-gated account create (no email; `?next=` same as login) |
| `/` | Repository list; create when signed in |
| `/:owner/:name` | Tree at HEAD |
| `/:owner/:name/tree/:ref/*` | Directory |
| `/:owner/:name/blob/:ref/*` | File (markdown rendered; otherwise `<pre>`) |
| `/:owner/:name/blame/:ref/*` | Per-line blame |
| `/:owner/:name/commits[/:ref]` | Log |
| `/:owner/:name/commit/:sha` | One commit + diff |
| `/:owner/:name/requests` | Merge request list / open |
| `/:owner/:name/requests/:id` | Show, diff, review, merge |

Unknown paths fall back to `/`. Clone URL is copied from `repo show`; git traffic is still SSH.

## Theming

`rgit view` and [rgit.rs](https://rgit.rs) use the Zola **DevLab** theme (cream `#faf3d8`, pine `#1f4a38`, gold `#c4a04a`). rgit-web copies those colors onto shadcn CSS variables so the GitHub-style chrome matches the docs site without compiling Markdown through Zola on each request.

README and request bodies use a small escaped markdown subset (`src/lib/markdown.ts`), not a full CommonMark engine.

## Client data

`src/lib/api.ts` fetches `/api` with cookies. `src/lib/auth.tsx` holds the signed-in user from `GET /api/auth/me`. There is no client-side store for git objects: each page loads what it displays.

## Merge requests

Same model as SSH: refs `refs/rabun/requests/<id>/{head,base,meta}`. Merge is **fast-forward only**. The website does not invent a second request store.
