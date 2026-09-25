# 0004. Burton Bun+React for the UI; Zola is visual tokens only

**Date:** 2026-09-24
**Status:** accepted
**Related:** [UI](../ui.md)

## Context

The brief named the **Zola engine and theme** and the **Burton Bun + React** stack. `rgit view` already generates a Zola site on loopback for a local tree. Using Zola as the GitHub UI would mean templates per route, no interactive review form, and a different deploy than Burton’s `bun build` + packed `bin/bun`.

Generating a Zola site **per HTTP request** would also fight “no database / spawn CLI”: every tree walk would be a full static build.

## Decision

- **App shell:** Burton conventions — `Bun.serve`, HTML imports, React 19, Tailwind 4, shadcn, Ubuntu pack/push/install.
- **Look:** copy DevLab / Rabun colors into `styles/globals.css` (cream, pine, gold) so rgit-web matches `rgit view` and rgit.rs.
- **`rgit view`:** unchanged; still Zola on loopback for a working copy, not this SPA.

## Consequences

Operators get one visual language and two renderers. Markdown in the code viewer is a small escaped subset, not Zola’s full pipeline. Changing the docs theme means updating CSS tokens here by hand.
