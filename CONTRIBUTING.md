# Contributing to Lunário

The product scope, requirements (RF/RNF) and architecture decisions live in
[LUNARIO.md](LUNARIO.md). Read it before starting on a feature.

## Getting started

Requirements: **Node.js 24** (see `.nvmrc`) and npm. Recommended:
[Gitleaks](https://github.com/gitleaks/gitleaks) for the local secret scan
(`winget install Gitleaks.Gitleaks` or `brew install gitleaks`).

```sh
npm ci            # install exact locked dependencies and set up git hooks
npm run dev       # start the dev server
npm run check     # everything CI runs: format, lint, typecheck, tests + coverage
npm run build     # production build into dist/
npm run preview   # serve the production build (test the PWA/offline mode here)
```

## Repository layout

| Path       | Contents                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`     | The PWA (React + TypeScript + Vite). `app/src/i18n` holds UI text; `app/teste-calendario/` is the temporary Q-09 phone test page (Portuguese only, not part of the offline app) |
| `public/`  | Static assets copied as-is; `icon.svg` is the source of all app icons. `_headers` sets Cloudflare Pages response headers (CSP, caching)                                         |
| `data/`    | Source catalogue (crops, windows, zones…), the single source of truth. Every text field has `pt` and `en`                                                                       |
| `scripts/` | Build-time scripts (catalog.json, zone derivation, `.ics` files)                                                                                                                |
| `worker/`  | Cloudflare Worker for frost alerts (D-33): subscriptions API, D1 migrations, nightly cron                                                                                       |
| `.github/` | CI, deploy, release and Dependabot configuration                                                                                                                                |

This is a **public** repository: never commit tokens, keys or personal data. Secrets live
only in GitHub Actions secrets and Cloudflare.

## Workflow: GitHub Flow

`main` is always releasable and deploys automatically. All work happens on short-lived branches
and reaches `main` through a pull request.

1. Branch from an up-to-date `main` using a type prefix:
   `feat/moon-phases`, `fix/sunset-timezone`, `docs/…`, `chore/…`, `ci/…`, `refactor/…`, `test/…`.
2. Commit in small steps using [Conventional Commits](https://www.conventionalcommits.org/)
   (enforced by a `commit-msg` hook):
   `feat(today): show sunrise and sunset`, `fix(i18n): missing English label`.
3. Open a PR. Before merging, **tidy the branch** so that every commit stands on its own
   (see below).
4. CI must be green: commit messages, secret scan, format, lint, typecheck, tests with
   ≥ 80 % coverage, build, production dependency audit.
5. **Rebase-merge** and delete the branch.

Use `feat!:` or a `BREAKING CHANGE:` footer for breaking changes.

### Why rebase merging, and what it asks of you

PRs are **rebase-merged**: every commit on the branch lands on `main` unchanged, so `main`
keeps the step-by-step history, and each commit becomes a line in the changelog. This means
each commit must be meaningful on its own:

- One logical change per commit, with a Conventional Commit message. CI lints **every**
  commit in the PR, not just the last one.
- No "fix typo" or "address review" commits. Fold them into the commit they fix:
  ```sh
  git commit --fixup <sha>                  # record the fix against the commit it belongs to
  git rebase -i --autosquash origin/main    # fold fixups in before merging
  git push --force-with-lease               # safe on your own feature branch
  ```
  CI rejects branches that still contain `fixup!`, `squash!` or merge commits.
- Keep the branch up to date by **rebasing** on `main` (`git pull --rebase origin main`),
  not by merging `main` into it.
- Only `feat` and `fix` commits (and breaking changes) bump the version. Use `refactor`,
  `test`, `docs`, `chore` or `ci` for everything else, so the changelog stays about
  user-visible changes.

### Local guard rails

Husky installs these hooks on `npm ci`:

- **pre-commit**: ESLint and Prettier on staged files (lint-staged), then a Gitleaks scan of
  the staged changes. If Gitleaks isn't installed, the scan is skipped with a warning; CI
  still runs it.
- **commit-msg**: commitlint
- **pre-push**: refuses pushes to `main`

## Tests

- Vitest with Testing Library and jsdom. Test files sit next to the code: `foo.ts` → `foo.test.ts`.
- Coverage thresholds (80 % lines/branches/functions/statements) are enforced in CI.
- Pure logic (astronomy, holidays, zone derivation) should be tested with known reference
  values, for example published moon-phase times or the Easter date for a given year.

## Internationalisation

UI text is never hard-coded. Add every key to both `app/src/i18n/locales/pt-PT.json` (default)
and `en.json`. A test fails if the two files diverge.

To change the sowing calendar, edit the CSV files in `data/` and run `npm run catalog`; the
format, codes and build steps are in [data/README.md](data/README.md).

Catalogue content in `data/` is bilingual too (D-13 in LUNARIO.md): every text field is
`{ pt, en }`, and the build fails if a translation is missing. Sayings keep the Portuguese
original and give the English _meaning_ (`sentido_en`) rather than a literal translation.
Codes such as `acao` or `familia` stay as codes and are translated in the UI.

## Versioning and releases

The project follows [Semantic Versioning](https://semver.org/). Releases are automated with
[release-please](https://github.com/googleapis/release-please):

- Every merge to `main` updates an open **release PR** that bumps `package.json` and writes
  `CHANGELOG.md` from the commit history.
- Merging the release PR creates the `vX.Y.Z` tag and a GitHub Release.
- Before 1.0, `feat` bumps the minor version and `fix` bumps the patch version.

The version is shown in the app footer.

## CI/CD

| Workflow                   | Trigger                  | What it does                                                                                                           |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                   | PRs and pushes to `main` | Commit message lint (every PR commit), Gitleaks scan of the full history, format, lint, typecheck, tests, build, audit |
| `deploy.yml`               | CI succeeded             | Deploys to Cloudflare Pages: `main` → production, PR branch → preview URL                                              |
| `release.yml`              | Pushes to `main`         | Maintains the release PR, tags and publishes releases                                                                  |
| Dependabot                 | Monthly                  | One grouped npm PR (minor/patch) and one grouped GitHub Actions PR                                                     |
| `dependabot-automerge.yml` | Dependabot PRs           | Turns on auto-merge for minor/patch updates; they rebase-merge once the required checks pass                           |

Deploys run only after CI passes, and only for branches in this repository. Pull requests
from forks and Dependabot get CI but no preview, because they have no access to secrets.

### Dependency updates

- **Minor and patch** updates arrive once a month in a single PR and merge themselves when CI
  is green. If CI fails, the PR stays open for you to look at.
- **Majors** of runtime libraries (React, i18next, …) arrive as individual PRs and are never
  auto-merged.
- **Majors of build and test tooling** (TypeScript, ESLint, Vite, Vitest, Prettier, …) are
  ignored by Dependabot and upgraded by hand on a `chore/` branch, once the ecosystem
  supports them (for example, TypeScript 7 needs typescript-eslint support first).
- **Security updates** are not on a schedule; they arrive as soon as an advisory is published.

## One-time setup (maintainer)

These cannot be committed as files.

**Cloudflare**

1. Create a free Cloudflare account. Under **Workers & Pages → Create → Pages → Upload
   assets**, create a project named `lunario` with production branch `main`. Or run
   `npx wrangler pages project create lunario --production-branch main`.
2. Create an API token (**My Profile → API Tokens → Create token**) with only the
   **Account → Cloudflare Pages → Edit** permission. The frost alerts Worker also needs
   **Account → Workers Scripts → Edit** and **Account → D1 → Edit**.
3. In GitHub, **Settings → Secrets and variables → Actions**, add `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID`. The account ID is shown in the Cloudflare dashboard sidebar.

**Frost alerts Worker (D-33)**

Run these on your own machine, logged in with `npx wrangler login`. Nothing here is a
secret except the VAPID private key, which must never be committed, pasted in an issue or
sent to anyone.

1. Create the database: `npx wrangler d1 create lunario-alerts`. Put the `database_id` it
   prints in `worker/wrangler.jsonc` (it is an identifier, not a secret).
2. Generate the push keys: `npm run vapid-keys`. Put the **public** key in
   `worker/wrangler.jsonc` (`VAPID_PUBLIC_KEY`) and in `app/src/frost/alerts.ts`. Store the **private**
   key only in Cloudflare: `cd worker && npx wrangler secret put VAPID_PRIVATE_KEY` and paste
   it when asked.
3. Add the Workers and D1 permissions to the API token (see above).
4. Merge to `main`: the deploy workflow applies the D1 migrations and deploys the Worker.
   Until step 1 is done it skips the Worker with a notice. The Worker's address is
   `https://lunario-alerts.<your-subdomain>.workers.dev` (shown in the deploy log). The app
   calls it from `ALERTS_URL` in `app/src/frost/alerts.ts`, and `public/_headers` allows it
   in the CSP `connect-src`; change both if the address changes.

The app turns alerts on from the Alerts screen (the bell at the top, `#/alertas`). This only works on the production site and
its previews: the Worker refuses other origins, and the dev server has no service worker.
Notifications are shown by `public/push-sw.js`, imported into the generated service worker.
To check the whole chain without waiting for a frosty night, send a test notification to a
stored subscription: read its endpoint with
`npx wrangler d1 execute lunario-alerts --remote --command "SELECT endpoint FROM subscriptions"`
(from `worker/`) and `POST {"endpoint": "…"}` to `/subscriptions/test` with an app
`Origin` header. Refused pushes are logged with the push service's status and reason;
watch them with `npx wrangler tail lunario-alerts`. Endpoints are personal data: never
paste them in issues or logs.

To try the Worker locally: `cd worker && npx wrangler dev --test-scheduled`, then open
`http://localhost:8787/__scheduled` to run the nightly check once.

**GitHub**

1. **Settings → General → Pull Requests**: allow **rebase merging** only (untick merge
   commits and squash merging), and enable "Always suggest updating pull request branches",
   "Allow auto-merge" and "Automatically delete head branches".
2. **Settings → Actions → General → Workflow permissions**: enable "Allow GitHub Actions
   to create and approve pull requests" (needed by release-please). Under "Fork pull
   request workflows", require approval for first-time contributors.
3. **Settings → Rules → Rulesets → New branch ruleset** targeting `main`:
   - Restrict deletions; block force pushes
   - Require a pull request before merging (0 approvals is fine for a solo maintainer);
     allowed merge methods: **Rebase** only
   - Require status checks to pass: `Verify`, `Secret scan` and `Commit messages`; require
     branches to be up to date
   - Require linear history
4. **Settings → Code security**: enable Dependabot alerts, secret scanning and push
   protection (free for public repositories).
5. Optional: create a fine-grained personal access token (contents, pull requests and
   issues: read/write on this repository only) and save it as the Actions secret
   `RELEASE_PLEASE_TOKEN`. Without it, CI does not run automatically on release PRs, so
   required checks will block them until re-triggered (for example, by closing and
   reopening the PR).
6. Add the **same token** a second time under **Settings → Secrets and variables →
   Dependabot**, also named `RELEASE_PLEASE_TOKEN`. Workflows started by Dependabot can only
   read Dependabot secrets, and auto-merge needs a personal token: merges made with the
   built-in `GITHUB_TOKEN` do not trigger CI, Release or Deploy on `main`. Without it,
   Dependabot PRs simply wait for you to merge them by hand.

## Third-party assets and data

Every icon, illustration, font, texture or data source must be listed in
[CREDITS.md](CREDITS.md) with its source and licence (RNF-07). If you call a new external
API from the app, also add its origin to `connect-src` in `public/_headers`, or the
Content Security Policy will block it in production. Avoid CC BY-SA for core assets and anything marked "free
for personal use".
