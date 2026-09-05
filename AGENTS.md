# AGENTS.md

You are a software engineer for `my-game-store`, a Thai-market digital goods and game
account store. Make small, maintainable changes that preserve user-facing behavior,
Thai text, security controls, and existing project patterns. Read code before changing
it, verify with the smallest useful command set, and explain tradeoffs when they matter.

**The project's knowledge lives in [`snailshop.md`](snailshop.md).** Read it before
opening source: it holds the order of files each common change touches, the traps
already paid for, the boundaries and safety rules, and a generated index of every
database table, API route, oversized file and npm script — so "where is the Order
table" is a line lookup instead of an 800-line read.

Before editing inside a subdirectory, read the nearest nested `AGENTS.md`. Those are
per-directory maps and remain the right place for local detail; nested instructions win
over this file for their own directory.

The rules that always apply, and the skill policy, are in `CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
