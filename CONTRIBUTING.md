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

| Path       | Contents                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`     | The PWA (React + TypeScript + Vite). `app/src/i18n` holds UI text                                                                       |
| `public/`  | Static assets copied as-is; `icon.svg` is the source of all app icons. `_headers` sets Cloudflare Pages response headers (CSP, caching) |
| `data/`    | Source catalogue (crops, windows, zones…), the single source of truth. Every text field has `pt` and `en`                               |
| `scripts/` | Build-time scripts (catalog.json, zone derivation, `.ics` files)                                                                        |
| `worker/`  | Cloudflare Worker for frost alerts (phase 3)                                                                                            |
| `.github/` | CI, deploy, release and Dependabot configuration                                                                                        |

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
3. Open a PR. Its **title** must also be a Conventional Commit, because PRs are
   **squash-merged** and the title becomes the commit on `main`.
4. CI must be green: PR title, format, lint, typecheck, tests with ≥ 80 % coverage, build,
   production dependency audit.
5. Squash-merge and delete the branch.

Use `feat!:` or a `BREAKING CHANGE:` footer for breaking changes.

### Local guard rails

Husky installs these hooks on `npm ci`:

- **pre-commit**: ESLint and Prettier on staged files (lint-staged), then a Gitleaks scan of
  the staged changes. If Gitleaks isn't installed, the scan is skipped with a warning; CI
  still runs it.
- **commit-msg**: commitlint
- **pre-push**: refuses direct pushes from `main`

## Tests

- Vitest with Testing Library and jsdom. Test files sit next to the code: `foo.ts` → `foo.test.ts`.
- Coverage thresholds (80 % lines/branches/functions/statements) are enforced in CI.
- Pure logic (astronomy, holidays, zone derivation) should be tested with known reference
  values, for example published moon-phase times or the Easter date for a given year.

## Internationalisation

UI text is never hard-coded. Add every key to both `app/src/i18n/locales/pt-PT.json` (default)
and `en.json`. A test fails if the two files diverge.

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

| Workflow      | Trigger                  | What it does                                                                                    |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| `ci.yml`      | PRs and pushes to `main` | PR title check, Gitleaks scan of the full history, format, lint, typecheck, tests, build, audit |
| `deploy.yml`  | CI succeeded             | Deploys to Cloudflare Pages: `main` → production, PR branch → preview URL                       |
| `release.yml` | Pushes to `main`         | Maintains the release PR, tags and publishes releases                                           |
| Dependabot    | Weekly                   | Grouped npm and GitHub Actions updates                                                          |

Deploys run only after CI passes, and only for branches in this repository. Pull requests
from forks and Dependabot get CI but no preview, because they have no access to secrets.

## One-time setup (maintainer)

These cannot be committed as files.

**Cloudflare**

1. Create a free Cloudflare account. Under **Workers & Pages → Create → Pages → Upload
   assets**, create a project named `lunario` with production branch `main`. Or run
   `npx wrangler pages project create lunario --production-branch main`.
2. Create an API token (**My Profile → API Tokens → Create token**) with only the
   **Account → Cloudflare Pages → Edit** permission. Phase 3 will also need
   **Workers Scripts → Edit**.
3. In GitHub, **Settings → Secrets and variables → Actions**, add `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID`. The account ID is shown in the Cloudflare dashboard sidebar.

**GitHub**

1. **Settings → General → Pull Requests**: allow **squash merging** only, set the default
   commit message to "Pull request title", and enable "Automatically delete head branches".
2. **Settings → Actions → General → Workflow permissions**: enable "Allow GitHub Actions
   to create and approve pull requests" (needed by release-please). Under "Fork pull
   request workflows", require approval for first-time contributors.
3. **Settings → Rules → Rulesets → New branch ruleset** targeting `main`:
   - Restrict deletions; block force pushes
   - Require a pull request before merging (0 approvals is fine for a solo maintainer)
   - Require status checks to pass: `Verify`, `Secret scan` and `PR title`; require branches
     to be up to date
   - Require linear history
4. **Settings → Code security**: enable Dependabot alerts, secret scanning and push
   protection (free for public repositories).
5. Optional: create a fine-grained personal access token (contents and pull requests:
   read/write on this repository only) and save it as the Actions secret
   `RELEASE_PLEASE_TOKEN`. Without it, CI does not run automatically on release PRs, so
   required checks will block them until re-triggered (for example, by closing and
   reopening the PR).

## Third-party assets and data

Every icon, illustration, font, texture or data source must be listed in
[CREDITS.md](CREDITS.md) with its source and licence (RNF-07). If you call a new external
API from the app, also add its origin to `connect-src` in `public/_headers`, or the
Content Security Policy will block it in production. Avoid CC BY-SA for core assets and anything marked "free
for personal use".
