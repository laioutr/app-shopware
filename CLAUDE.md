# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

Be direct and objective. Offer solutions alongside criticism rather than agreement by default.

## What this is

A [Laioutr](https://laioutr.com) App: a Nuxt module that plugs [Shopware 6](https://www.shopware.com)
into a Laioutr storefront as its commerce backend. It publishes as `@laioutr/app-shopware` on public
npm and was extracted from the Laioutr monorepo, so some conventions here are platform-wide rather
than local to this repo.

The module maps Shopware's Store API onto Laioutr's canonical entity model through Orchestr, so
storefront components stay backend-agnostic.

## Setup and commands

`@laioutr-core/*` and `@laioutr-app/ui` come from Laioutr's registry. Render the template with a
token **before** installing — a bare `pnpm install` will fail to resolve them:

```bash
sed "s|NPM_LAIOUTR_TOKEN|$YOUR_TOKEN|" .npmrc.config > .npmrc
pnpm install
```

```bash
pnpm dev            # dev:prepare, then the playground on :3000 (needs .env — see .env.example)
pnpm dev:prepare    # stub build + module prepare + playground prepare
pnpm lint
pnpm test
pnpm test:types     # vue-tsc over the module and the playground
pnpm changeset      # describe a change for the next release
pnpm vitest run src/path/to/file.test.ts   # a single suite
```

**Run `pnpm dev:prepare` before lint or typecheck.** `tsconfig.json` extends `./.nuxt/tsconfig.json`,
which that command generates. Without it the import resolver cannot read any path and lint reports
every import as unresolved — hundreds of errors that are pure artifact. This is the standalone
equivalent of the monorepo's "always use `turbo run`" rule; there is no turbo here.

## Architecture

`src/module.ts` is the Nuxt module entry: it registers runtime config, the app's server routes, its
public assets, page types, and hands its Orchestr directory to `registerLaioutrApp`.

`src/runtime/` splits three ways:

| Path | Role |
| --- | --- |
| `server/orchestr/<entity>/` | Orchestr handlers — the app's data surface |
| `server/shopware-helper/` | Pure mapping and session logic, where nearly all tests live |
| `app/` | Client side: the checkout section, its embed frame, the image provider |

**Orchestr handler types**, by filename suffix:

- `*.query.ts` — fetch and return entity IDs
- `*.link.ts` — relationships between entities
- `*.resolver.ts` — resolve data components for an entity
- `*.action.ts` — mutations and side effects
- `*.page-index.ts` — enumerate a page type's entities and resolve a URL back to one
- `*.template.ts` — preset, labelled query inputs an editor picks from in Studio

Canonical entity types come from `@laioutr-core/canonical-types`; this repo consumes them and does
not define them. A shape that feels wrong belongs upstream, not patched locally.

## Rules

### Paths the app owns

Every URL this app owns is namespaced under `/app-shopware/` — public assets
(`src/runtime/app/public/app-shopware/…`), server routes, and any page it registers. An app shares
one origin with the project's editor-created content pages and every other installed app, so an
un-namespaced path collides.

Two hard don'ts:

1. **Never route a browser navigation through `/api/laioutr/*`.** frontend-core gates that namespace
   behind the project secret; a link click or redirect sends no such header and gets a 401. Reserve
   it for authenticated JSON endpoints this app's own code calls with the secret.
2. **Never use a bare top-level path** (`/checkout`, `/cart`) — it collides with content slugs.

### Nitro hooks

This module exposes `shopware:context-token:resolve` and `shopware:context-token:changed`. Name new
hooks `namespace:entity:action` in kebab-case, present tense before an action and past tense after.

A hook earns its place where code runs an effect the developer cannot otherwise reach. For hooks
whose handlers influence a returned value, pass a `result: { value }` slot — hookable ignores handler
return values, so mutation is the only way out — and read it back synchronously. A **bail** hook
(no seed, runs before the default) selects or replaces; a **filter** hook (seeded with the resolved
default, runs after) post-processes. Seed the same slot you read.

### Money

Money is `{ amount, currency }` where `amount` is **minor units (cents)** and `currency` is an
**ISO 4217 code** (`EUR`, `USD`) — never a symbol, never a label, never lowercase. Default to `EUR`
in fixtures unless the currency is material.

```ts
{ amount: 1999, currency: 'EUR' }   // ✅
{ amount: 19.99, currency: 'EUR' }  // ✘ must be cents
{ amount: 1999, currency: '€' }     // ✘ symbol
```

### Comments

Comments explain **why**. The code already says what. The failure mode here is over-commenting.

- Say the reason, constraint or consequence — not a paraphrase of the line below.
- Present tense, describing the code as it is. Git holds the changelog; a comment is not one.
- Comment the code that is there, not code that isn't. Never explain a removed line or warn against
  a tempting alternative — that addresses a hypothetical editor while every real reader pays for it.
  The pull is strongest right after fixing a bug; resist it. That rationale belongs in the commit
  message and the changeset.
- One line where one line does. No banners, no ASCII art, no JSDoc restating a signature.

A live constraint the code obeys is fair game (`upstream returns null despite the type`).

### No design-doc references

Never cite a design doc, plan, spec, ADR or review from code, comments, test names or error
messages — no `§4.1`, no doc paths, no plan-invented IDs. Section numbers drift, and the reader
wanted the reason, not a filing reference. State it inline in a clause instead.

Real external identifiers are fine: ticket keys, RFC numbers, published spec sections, CVEs,
upstream issue URLs.

### Sections and blocks

Do not write Vue component tests — no mounting, no Vue Test Utils, no component snapshots — unless
explicitly asked. Tests for composables, helpers and pure logic are wanted; that is where this
repo's coverage lives.

`defineSection`'s `studio.description` carries the load for both humans and agents. The optional `ai`
metadata takes only `description` and `examples`, and **an absent `ai` object is the normal state**.
When present it states declarative, non-inferable facts — never use/avoid/never guidance, which
measurably degrades composition, and never anything already visible in the schema.

### Changesets

Releases run through changesets. `pnpm changeset` before opening a PR that changes published
behaviour; merging the generated "chore: release" PR publishes to npm via OIDC.

Write for the **package consumer**, not the contributor. Build internals, refactor lists and
type-system mechanics belong in the commit message. A purely internal change needs no changeset.

Breaking changes flag themselves in the body with a bold `**Breaking:**` prefix and a before/after
snippet. Every file in `.changeset/` is unreleased and ships as one changelog section, so a changeset
describes the feature at release, not the increment one PR added — rewrite an existing entry rather
than adding a sibling that only parses if you read the first.

### TypeScript refactoring

**Use LSP `findReferences`, not grep, to find symbol references** — before deleting a symbol, file or
export, or when planning a rename. Grep misses template usages, dynamic references and type-only
imports. Fall back to grep only when the LSP returns nothing (Nuxt `#imports` auto-imports are the
usual case).

For bulk transforms prefer, in order: a TypeScript LSP tool, then ast-grep, then ts-morph. Remove any
temporary refactor script when you are done.

### Bulk refactors

- **Preserve every comment.** JSDoc, TODOs and inline notes get silently stripped during bulk
  rewrites. Carry them over.
- Audit afterwards in this order: exported names → helper types → properties → runtime functions →
  comments. "Typecheck passes" is not sufficient.

### Git safety

Do not use `git reset`, `git checkout HEAD`, `git stash` or any other command that can discard tree
changes without asking first. If the tree is in an unexpected state, offer the user the chance to
fix it themselves.

Never suppress output on state-changing git commands — the exit code does not distinguish "applied
cleanly" from "left a half-merged tree". Before claiming work is committed, run `git diff HEAD --stat`
and confirm the files you expect are listed.

### Subagents

When spawning subagents, pass `model` explicitly and use only `opus` or `sonnet` — never `fable` or
`haiku`. Rule of thumb: `sonnet` for research and mechanical work, `opus` for complex implementation
or judgment-heavy review.

## Conventions

**Commits** follow conventional commits, Angular style — `feat(shopware): …`, `fix: …`, `chore: …`.
Not enforced by a hook in this repo; keep to it anyway.

**Namespaces**: `@laioutr/*` is public npm, `@laioutr-core/*` and `@laioutr-app/*` are Laioutr's
registry. This package is public; its platform dependencies are not, which is why they are peer
dependencies the host project supplies.

**Design docs and plans**, if you write them, go in `docs/plans/` as
`YYYY-MM-DD-<topic>-design.md` or `-plan.md`. Research goes in `docs/research/`, reviews in
`docs/reviews/` — not in `docs/plans/`.

New rules given by the user go in `.claude/rules/` as their own file. Ask if a rule is unclear.

## Further reading

Platform documentation lives at [docs.laioutr.com](https://docs.laioutr.com) — Orchestr, the data
model, UI components, sections and blocks, and the API reference.
