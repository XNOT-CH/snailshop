---
name: snailshop
description: Look up my-game-store facts in snailshop.md instead of re-reading source, and keep that file current. Use at the start of any task in this repo that needs to locate code, recall a database table, an API route, a project convention or a known trap — and again at the end of a task that changed the schema, the routes, or produced a durable lesson. Also use when a session is re-opening the same files, drifting in circles, or burning context on searches that a lookup would answer.
---

# snailshop

`snailshop.md` at the repo root is this project's index. It exists because the
measurement was bad: across 18 sessions and 3,171 tool calls, the same files were
re-opened **117 times within a single session**. `lib/db/schema.ts` alone (797 lines,
35 tables) was opened 16 times, `app/globals.css` (3,924 lines) 8 times. Nothing was
learned on the second read that was not there on the first.

Half of `snailshop.md` is generated from the code, so its table, route, big-file and
script indexes are true by construction. Trust them.

## Before you open source

**1. Look it up first.** Anything shaped like "where is X", "what columns does Y have",
"which routes exist under Z", "what does that npm script run" is a lookup in
`snailshop.md`, not a search. The generated index gives you `file:line`.

**2. Read the range, not the file.** Once the index gives a line number, read around
that line. Opening a 1,000-line component to see one function is the habit this skill
exists to break — 28 tracked files are over 600 lines.

**3. One wide grep beats five narrow ones.** Always `-n`, so the line numbers come back
with the hits and you never have to search for the same thing twice.

**4. Do not re-open what you have already read this session.** If you cannot remember
what was in it, say you cannot remember. Silently re-reading looks like diligence and
costs the same as the first read.

**5. Stop at the third open.** About to open one file for the third time in a task?
Stop. Take one of three exits instead: use the index, ask the user, or say plainly that
you do not have enough information. A third read is the signal that the loop has
started, not that the answer is close.

## While you work

Keep a short running note of what you find, as `path:line — what it does`. It costs
nothing during the task and it is what makes the end-of-task update cheap; without it,
updating `snailshop.md` means reading everything again, which defeats the point.

## When the task ends

**Rebuild the generated half** if the task touched `lib/db/schema.ts`, any
`app/api/**/route.ts`, `package.json` scripts, or grew a file past 600 lines:

```bash
npm run knowledge:build     # rewrite the generated block
npm run knowledge:check     # exits 1 if the block is stale
```

**Add to the hand-written half** only what is durable and not derivable:

- a trap that cost real time, and how to recognise it next time
- a decision that closes off an option ("deploy is Docker only")
- the file order for a change that was harder to work out than it should have been
- a location that is genuinely hard to find

**Do not add**: anything the generator already covers, anything readable from
`git log`, or details that only matter to the task just finished. Those belong in the
commit message.

**Say what you added.** Never edit `snailshop.md` silently — report the lines you
added along with the rest of the work.

## One fact, one home

Before writing a fact into `snailshop.md`, check the ownership table at the top of it.
Rules that always apply belong in `CLAUDE.md`; per-directory detail belongs in that
directory's `AGENTS.md`; how a human gets set up belongs in `README.md`. Repeating a
rule in a second file is how the previous documentation layer ended up with 115
references to files that no longer existed — the copies drifted and nobody noticed.

`npm run knowledge:check` enforces this for the rules that were actually found
duplicated: it exits 1 if one of them appears outside the file that owns it. If you
need to mention a rule elsewhere, link to its owner instead of restating it.

## Keeping the file honest

The hand-written half is a working index, not an archive. If it grows past roughly 200
lines, something in it is too local — move it to the `AGENTS.md` of the directory it
describes. A file nobody can skim gets skipped, and a skipped index is worse than none
because it still looks like it is doing its job.

`snailshop.md` is tracked in git and the repository is not private yet. Nothing goes in
it that could not be read by anyone: no secrets, no tokens, no customer data.
