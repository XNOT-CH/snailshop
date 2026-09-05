# CLAUDE.md

## Always

Load the `andrej-karpathy-skills:karpathy-guidelines` skill before starting any
coding work in this repo — writing, reviewing or refactoring — without waiting to
be asked, and follow it for the rest of the task.

The plugin being enabled in `~/.claude/settings.json` only makes the skill
available; it does not make it apply. This file is what makes it apply.

Loading a skill on your own is expected, but never silently: say which skill you
are using and why, the first time you use it in a task. That applies to
`karpathy-guidelines` and to every workflow skill (`debug-mantra`, `scrutinize`,
`post-mortem`, `management-talk`, `qwenchance`).

## Where the project knowledge lives

**`snailshop.md` at the repo root is the index — read it before opening source.**
It holds the order of files each common change touches, the traps already paid
for, the boundaries and safety rules, plus a generated index of every database
table, API route, file over 600 lines and npm script, each with a line number.
Half of it is rebuilt from the code by `npm run knowledge:build`, so the indexes
cannot silently go stale.

Looking a fact up there instead of re-reading an 800-line file is the point: the
same files were re-opened 117 times within single sessions before it existed.
The `snailshop` skill in `.claude/skills/` has the lookup and update workflow.

Most directories also carry their own `AGENTS.md` — a short map of what the
folder is, its high-signal files, and what to read alongside it. Before editing
inside a directory, read the nearest one. Nested instructions win for their own
directory.

These are plain Markdown files, so nothing loads them automatically. Opening them
is your job.

## Rules that override anything else you read

**Never run `npm run db:push` against `localhost:3307`.** That is the database the
`web` container serves from, and it already sits behind `lib/db/schema.ts`.
A push applies the whole accumulated diff to live data. Add tables, columns and indexes
there with targeted SQL instead (see `drizzle/`). The one place a push is allowed is
the isolated dev database on :3308 — go through `scripts/windows/db-push-dev.bat`,
which refuses to run unless `.env.development.local` points at that port.

**Deploy is Docker only.** `docker compose up -d --build web`, or
`scripts/windows/deploy-web.bat`. The Dockerfile runs `npm run build` itself.
There is no Workers/Vercel path.

**Branch per piece of work, without being asked.** Create the branch, verify it
is green, `git merge --no-ff` into `master`, push, delete the branch.

**Write the tests that catch silent failures yourself** — money, permissions, and
guards. UI work and code deletion do not need new tests; check those in a
browser instead.

**No percentages in the admin UI.** Use real numbers — baht, people, spins,
"X จาก Y" — because that is what the person reading the dashboard can act on.

## Environment

- `npm run dev` serves on port 3001; port 3000 is the Docker production build.
- The site is in Thai. Preserve Thai user-facing text unless asked to change it.
- Many repo files still open as CRLF on Windows even though `.gitattributes` sets
  `eol=lf`; a partial `sed`/patch against a mixed-ending file fails silently.
