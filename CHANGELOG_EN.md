# Changelog

**English** | [中文](./CHANGELOG.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/) and [SemVer](https://semver.org/).

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
