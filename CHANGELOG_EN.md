# Changelog

**English** | [中文](./CHANGELOG.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/) and [SemVer](https://semver.org/).

## Version guide

| Version | Focus |
|---|---|
| `1.1.0` | Major UI overhaul: usage heatmap, model donut (day/week/month + period browsing), 3×2 metric grid, peak/valley glow, outside-click close & fade animations, and “cost” → “amount” wording |
| `1.0.2` | Fixes the browser bundle registration ID after the npm rename and adds CI/install safeguards |
| `1.0.1` | Renamed the npm package, removed `zod`, and added Windows install/troubleshooting docs; superseded by `1.0.2` |
| `1.0.0` | Declared the stable release and clarified DeepSeek-only billing scope |
| `0.1.0` | First feature release with the balance pill, usage panel, token management, and refresh strategy |

## [Unreleased]

### Installation & docs

- README (CN/EN): split the npm install into “Option 1A: track updates (default, easiest upgrades)” and “Option 1B: pinned version (reproducible)”, and added an “Upgrading” section listing per-method upgrade commands plus the `dsh plugin --profile web outdated` check
- README (CN/EN): added a v1.1.0 “Screenshots” gallery (`docs/images`, 5 images)

## [1.1.0] - 2026-09-08

### Added

- **Peak/valley display**: a unified banner at the top of the panel (amber peak / green valley with a compact countdown pill) and a peak/valley **border glow** on the bottom-right pill (amber pulse in peak, static green in valley). Default peak windows `09:00–12:00` / `14:00–18:00` Beijing time; other hours are valley (~50% off); windows overridable via `peakWindows`; computed purely client-side
- **Usage heatmap** (GitHub style, replacing the single-month bar chart): daily amount/tokens across the last `historyMonths` months (default 6), darker = higher, today outlined; hovering a cell pops a live tooltip (date, amount/tokens, requests, cache-hit rate); days with no usage say “no usage this day”
- **Model donut**: grouped by **day / week / month** and browsable **‹ ›** between periods, toggling amount/tokens, with the period total in the center; small models fold into a gray “Other” (shown individually when share ≥1.5% and within the top 8); zero-usage models hidden; 10-color palette
- **Metric cards as a 3×2 grid**: Today amount · Today tokens · Requests (day) / Month amount · Month tokens · Cache hit (month), with explicit granularity labels; each today card carries a “share of month” progress bar (hover shows the percentage)
- **Task-completion refresh**: the host listens for session `turn/end` events and re-fetches from DeepSeek after each task, gated by `taskRefreshCooldownMs` (default 60 s) so bursts coalesce into one fetch

### Changed

- UI wording unified from “cost” to “amount” (Chinese 花费 → 金额)
- Pill slimmed down: removed the peak/valley text chip and the standalone status dot; it now shows just the amount plus the period border glow
- Peak/valley banner is now a single line (guidance folded into the title) and the two banners share an identical style except hue; month paging removed (heatmap shows a month window instead)
- Footer consolidated to “Data source: DeepSeek Platform · Official” (clickable, always underlined) with a muted `v1.1.0` on the right; “Updated HH:MM” moved into the panel header
- Panel interaction: clicking anywhere outside the panel closes it; opening and closing both animate with a 160 ms fade
- Granularity labels shortened from “Today/This week/This month” to “Day/Week/Month”; empty states now read “{period} · No usage data”

### Fixed

- Hover tooltip overflowing/clipped on the right-hand columns and causing a horizontal scrollbar — anchored inward and guarded with `overflow-x`
- `React.` misuse (`React` undefined) that crashed and removed the whole overlay entry when opening — switched to lowercase `react`
- Donut “week” view crashing on click (block-scoped variable) and day/week paging moving into the future instead of the past (sign bug)
- Closing panel flicker caused by unmount-then-remount — `closing` is now part of the store snapshot so the fade-out plays in place
- Crowded/unbalanced metric cards — fixed 3×2 grid with day/month granularity labels

### Installation & docs

- README (EN) feature list, refresh strategy, and install version references synced to `1.1.0`

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
