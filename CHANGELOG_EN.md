# Changelog

**English** | [中文](./CHANGELOG.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/) and [SemVer](https://semver.org/).

## Version guide

| Version | Focus |
|---|---|
| `1.0.2` | Fixes the browser bundle registration ID after the npm rename and adds CI/install safeguards |
| `1.0.1` | Renamed the npm package, removed `zod`, and added Windows install/troubleshooting docs; superseded by `1.0.2` |
| `1.0.0` | Declared the stable release and clarified DeepSeek-only billing scope |
| `0.1.0` | First feature release with the balance pill, usage panel, token management, and refresh strategy |

## [1.0.2] - 2026-08-18

### Fixed

- Fixed the top-level `window.__ModuleLoader__.load()` registration ID so it matches the npm package name `deepseek-harness-usage-dashboard`
- Kept the host-side Cordis runtime ID `dsh-usage-dashboard` unchanged, preserving existing config, routes, cache, and uninstall identifiers
- Fixed the `Failed to load plugins` boot failure that could affect new installations

### Installation and docs

- Standardized current installation examples on `1.0.2`
- Changed the GitHub Release fallback to “download `.tgz`, verify SHA-256, install with `file:`” for pnpm integrity-policy compatibility
- Marked `1.0.1` as superseded so new users do not install the registration-ID-broken version
- Added a version guide and synchronized the per-version changes in both README languages

### CI

- Added an automated assertion that the client top-level registration ID equals `package.json.name`, preventing another package-rename loading failure

## [1.0.1] - 2026-08-18

### Changed

- Renamed the npm package to the available `deepseek-harness-usage-dashboard`; the runtime plugin ID remains `dsh-usage-dashboard`
- Removed unused `zod` and pinned `@deepseek-ai/schemastery`
- Included the bilingual README, Security, Changelog, and License files in the npm package

### Installation and docs

- Made the pinned npm package the primary install path and added a GitHub Release `.tgz` fallback
- Added Node.js/pnpm prerequisites, Windows `file:` local installation, and same-workspace restart guidance
- Added troubleshooting for occupied port `3080`, missing `link:` dependencies, and a missing balance pill
- Improved `userToken` onboarding, credential distinctions, and sanitization guidance for logs/session archives

### CI

- Added Windows and Ubuntu checks for host import, client syntax, npm package contents, and publish dry-run

> **Compatibility notice:** `1.0.1` changed the npm package name but retained the old client registration ID. It has been superseded by `1.0.2`; new users should not install `1.0.1`.

## [1.0.0] - 2026-08-17

### Changed

- Declared the project stable and bumped the version to `1.0.0`

### Docs

- Clarified that the plugin supports balance, usage, and billing data only from the official DeepSeek API and DeepSeek Platform
- Clarified that, with another model provider, the panel does not represent that provider's actual balance or cost and may show an unavailable state or report an error

## [0.1.0] - 2026-08-17

### Added

- Bottom-right balance pill + usage dashboard panel (registered in the `shell.overlay` slot)
- Account balance: official `/user/balance` (API key) + platform `get_user_summary` (userToken), with top-up vs. granted breakdown
- Today / current-month actual cost and tokens, request count, cache hit rate
- Daily cost / token bar chart (hand-rolled SVG) with historical month browsing; model breakdown
- Refresh strategy: fixed polling (default 10 min host / 30 s page) + task-completion refresh (`turn/end` event, 60 s cooldown) + manual force refresh
- userToken panel: paste once, online validation, one-click clear, masked display
- Credential safety: token stored only in a local 0600 secret file, browser sees only the masked value; `DEEPSEEK_PLATFORM_TOKEN` environment variable supported

### Docs

- README (features / data sources / security & privacy / install / config / uninstall)
- SECURITY.md, CONTRIBUTING.md, LICENSE (MIT)
