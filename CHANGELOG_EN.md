# Changelog

**English** | [中文](./CHANGELOG.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/) and [SemVer](https://semver.org/).

## Version guide

| Version | Focus |
|---|---|
| `1.2.0` | Today-usage fix (the official usage page's own `by_api_key` endpoints, bucketed by the configured timezone, so “today” is no longer zero), `timezoneOffsetSec` config, in-panel language switch, heatmap collapsed by default, model legend showing amount and tokens together, English translation gaps closed and copy reworded, amounts following the account currency, footer version fixed |
| `1.1.1` | In-panel update hint (queries npm latest, hint only), fixed invisible dark-mode button text, clarified the userToken onboarding text |
| `1.1.0` | Major UI overhaul: usage heatmap, model donut (day/week/month + period browsing), 3×2 metric grid, peak/valley glow, outside-click close & fade animations, and “cost” → “amount” wording |
| `1.0.2` | Fixes the browser bundle registration ID after the npm rename and adds CI/install safeguards |
| `1.0.1` | Renamed the npm package, removed `zod`, and added Windows install/troubleshooting docs; superseded by `1.0.2` |
| `1.0.0` | Declared the stable release and clarified DeepSeek-only billing scope |
| `0.1.0` | First feature release with the balance pill, usage panel, token management, and refresh strategy |

## [1.2.0] - 2026-09-11

### Fixed

- **“Today amount / Today tokens / Requests (day)” always showed 0, disagreeing with the official usage page**: the host used the legacy `GET /api/v0/usage/amount|cost?month=&year=` endpoints. Measured behaviour: their day buckets are cut by **UTC** (their `2026-09-08` row equals GMT+8 9/8 08:00 → 9/9 08:00) and the **current day's bucket is always zero** — usage between 00:00 and 08:00 Beijing time lands in the previous day's bucket, and today never appears. Daily data now comes from the endpoints the official usage page itself calls, `GET /api/v0/usage/by_api_key/amount|cost?start=&end=&tz=` (epoch seconds + timezone offset), which bucket by GMT+8 and **update the current day live**; the heatmap's today cell, the model “Day” view and the month edges (no more 8-hour misalignment) are correct too
- **Legacy endpoints kept as a fallback**: if the new endpoints fail (including undocumented-API changes), the host falls back to them and still follows stale-while-error, keeping the last successful data
- **“Today” no longer follows the browser timezone**: the client used to derive “today” and the current month from the browser's local date. When the browser/system timezone differs (for example through a proxy/Flash egress), the cross-midnight window looked up a date the platform has no data for yet and “Today” read zero again. The today/requests/tokens chips, month loading, the heatmap's today marker, the model donut's day/week browsing and the footer's “updated at” clock now all use the host-provided `timezoneOffsetSec` (default GMT+8); the heatmap and donut calendar maths were also switched to UTC arithmetic, immune to the browser timezone and DST. The host's “current month” and the `/usage-dashboard/month` default month are aligned the same way
- **Footer version was stuck at `v1.1.1`**: the version was hardcoded in the dictionaries (`"footer.version": "v1.1.1"`) and the host-reported version was never used — the footer read 1.1.1 even on 1.2.0. The dictionaries now use `v{version}` rendered from `update.currentVersion`, and the host keeps `currentVersion` even when the npm check fails (offline) or the user disables it (`checkUpdate: false`), so the footer always shows the real version
- **Two English layout defects**: (1) the peak/valley banner joined its title and hint into one nowrap line, so longer English text was ellipsised (`… · Defer to valley h`); it now renders up to two lines. (2) The model section header packs a label plus two segmented groups into one non-wrapping row, so in English `Model breakdown` and `By amount / By tokens` were each squeezed onto two lines; the row now wraps as a whole, text no longer breaks mid-phrase, and the English label is shortened to `Models`
- **The official balance endpoint timed out occasionally and left a permanent red footer line**: one measured attempt hung for 8s and was aborted (`This operation was aborted`) while `curl` and Node `fetch` to the same host answered in ~0.1s — a transient stall, not a config problem. The host now **retries once** (1s apart; not retried when no API key is configured), so a transient stall self-heals
- **The “Top-up / Granted” line disappeared whenever the official balance failed**: it only read `balances[0]` from that endpoint. It now falls back to the platform `get_user_summary` wallets (`normal_wallets` → top-up, `bonus_wallets` → granted) and hides only when neither source has data
- **The footer's “Updated” time could freeze at the official endpoint's first failure**: it preferred `official.fetchedAt`, which the host keeps on failure, so a persistently failing official endpoint froze the clock. It now uses the timestamp of the data actually shown (month → platform balance → official balance → client fetch time)

### Added

- **In-panel language switch**: Settings now offers a “Panel language” row — “Follow interface / 中文 / English”. The default follows the Harness UI language (the host `t` seat passes straight through); an explicit choice affects this panel only and is stored in the browser's localStorage (survives reloads and restarts). Because `register(ns, { zh, en })` requires both shipped dictionaries, a non-zh/en language (say a future third-party Japanese pack) resolves through the locale fallback chain to English instead of showing raw keys; an invalid or unsupported stored value falls back to “Follow interface”
- **Heatmap collapsed by default**: the panel is ~120 px shorter by default; click the “Usage heatmap” heading to expand or collapse, and the state is remembered in browser-local preferences. The donut's “month” browsing still reuses the same monthly payloads, so the number of API calls is unchanged
- **`timezoneOffsetSec` config** (default `28800` = GMT+8): controls day bucketing and the request `start`/`end` alignment; must be a multiple of 900 within `[-43200, 50400]`, otherwise it falls back to GMT+8

### Changed

- **The model-donut legend now shows amount and tokens together**: the primary value still follows the sort dimension (large and bold) while the other dimension rides along as small same-row text (hovering explains it as “Amount: x / Tokens: x”); the “amount / tokens” switch was renamed to “By amount / By tokens” to make its sorting semantics explicit. Models with zero amount but non-zero tokens are no longer filtered out — they show ¥0.00 plus their tokens
- **Filled the English-UI translation gaps**: 11 hardcoded Chinese strings outside the dictionaries (save/clear notices, verification failure, the heatmap tooltip's requests/cached text, period labels, the previous/next buttons, the token placeholder) were moved into the dictionaries, and locale-dependent date formats (`9月11日`) now render per language (`9/11` for English), ranges included
- **Amounts follow the account's billing currency**: the today/month amount cards and the heatmap tooltip were hardcoded to `CNY`, so a USD account saw `¥`. They now take the account currency from 「month payload → platform balance → official balance → CNY」 (symbol only, **no FX conversion** — whatever the platform returns is what is shown); the host also prefers the account currency when several currency buckets are returned instead of always preferring CNY
- **English copy rewritten for native phrasing**: reworded entries that read like literal translations, e.g. `Billed usage comes from platform.deepseek.com's undocumented usage APIs…`, `Today: 19% of the month`, `Today requests`, `Cache hit rate`, `Amount: ¥34.54`, `cache hit 98.7%`, `Models`, `🌙 Valley hour · ~50% off`; a failed token check now shows a localized sentence (`The token is invalid or expired.`) instead of a raw code, keeping the raw text only for HTTP/network failures, and the heatmap caption's dimension word is lower-cased (`Daily amount over the last 6 months`)
- **Localized token-source labels**: “Token configured (source: secret-file)” no longer shows the raw English value; it now reads `local secret file` / `DEEPSEEK_PLATFORM_TOKEN env var` / `not set`, with unknown sources shown verbatim so a future host value cannot silently disappear

### Notes

- The in-panel language only overrides this plugin's copy; the Harness UI language itself is still switched in Settings → General → Language (a framework-provided row that this panel follows)
- Dead code removed: 9 locale keys left over from older versions with no remaining reference (`chart.empty`, `chart.axisToken`, `pv.peak.short`, `pv.valley.short`, `pv.banner.peak.count`, `pv.banner.valley.count`, `chip.requests`, `chip.cacheHit`, `pill.balance`) plus the never-called `durationText()` helper and its 4 dedicated keys (`pv.dur.hm/h/m/now`) and the host's unreachable `runtimeToken` branch (`source: 'runtime'`, leaving token sources as `env → secret-file → none`); each dictionary now holds 90 keys
- One request per month still covers the whole month (month length ≤ 31 days, exactly the platform's maximum query range); request count, polling and refresh cadence are unchanged
- `?force=1` already bypasses the host's 10-minute cache (the panel ↻ button and opening the panel send it); if the last refresh happened before local midnight, a zero can still show briefly for one poll cycle, which is normal cache latency

## [1.1.1] - 2026-09-08

### Added

- **In-panel “new version” hint**: the host queries npm for the `deepseek-harness-usage-dashboard` latest version every `updateCheckIntervalMs` (default 6 h) and compares it to its own; the settings panel shows an upgrade hint (`dsh plugin --profile web update deepseek-harness-usage-dashboard`) when a newer release exists. Hint only — never auto-installed; network failures are silently ignored; disable via `checkUpdate`

### Fixed

- **Invisible button text in dark mode**: `.dshud_btn_danger` (“Clear saved token”) and error text no longer rely on `--dsw-alias-state-error-primary`, which can darken with the theme; the color is now a fixed, readable red `#ef4444` in both themes. The primary “Verify & save” button now uses a hard-coded brand-blue `#2563eb` background with white text (no theme variables that flip brightness), so its label is legible in both light and dark modes
- **userToken onboarding text clarified**: the settings hint is now split into “Get it” + “Security” so beginners can follow along and professionals get a concise reference; EN/CN updated

### Installation & docs

- README (CN/EN): split the npm install into “Option 1A: track updates (default, easiest upgrades)” and “Option 1B: pinned version (reproducible)”, and added an “Upgrading” section listing per-method upgrade commands plus the `dsh plugin --profile web outdated` check
- README (CN/EN): added a v1.1.1 “Screenshots” gallery (`docs/images`, 5 images)
- README (CN/EN) and `cordis.patch.yml`: documented the `checkUpdate` and `updateCheckIntervalMs` options
- Current stable version bumped to `1.1.1`

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
