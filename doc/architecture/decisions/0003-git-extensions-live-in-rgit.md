# 0003. Git extensions live in rgit, not a separate rgit-repo crate

**Date:** 2026-09-24
**Status:** accepted
**Related:** [CLI](../cli.md), [Overview](../overview.md)

## Context

The brief asked that features which “extend git” (tree, blob, blame, log, refs, diff, visibility) live in **rgit-repo**, with presentation here and auth/CLI in rgit. There is no `rgit-repo` checkout. Splitting a crate would mean a second binary, duplicated `Store`/`Actor` access, and two deploy artifacts for one forge root.

`browse.rs` already belongs next to `acl.rs` and `git.rs`: listing a tree is an ACL check plus `git ls-tree`.

## Decision

The rgit-repo **layer** is `rabun-git/src/browse.rs` and the `rgit repo tree|blob|blame|log|commit|refs|diff|visibility` subcommands. Merge request refs stay in the existing request code. This repository does not vendor git libraries.

If rgit-repo becomes its own crate later, it should be extracted from that module with the same JSON shapes.

## Consequences

One `rgit` binary serves SSH management commands and the website. Web and `git clone` share visibility and ACL. Contributors look in rabun-git for browse bugs, not here.
