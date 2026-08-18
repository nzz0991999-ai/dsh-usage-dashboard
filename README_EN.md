# dsh-usage-dashboard

**English** | [中文](./README.md)

A usage dashboard plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a balance pill in the bottom-right corner of the Web UI that expands into a full panel showing your **actual billed spend** (same data source as platform.deepseek.com/usage) — no more switching back to the platform to check costs.

> **Scope:** This plugin queries only balance, usage, and billing data from the official DeepSeek API and DeepSeek Platform. Even if Harness is configured with another model provider, the plugin does not read that provider's billing data. The panel may continue to show DeepSeek data, show an unavailable state, or report an error; none of these represent the current model provider's actual balance or cost.

The current stable version is `1.0.2`. See [CHANGELOG_EN.md](./CHANGELOG_EN.md) for the changes in every version.

## Features

- **DeepSeek account balance**: official `/user/balance` (API key) + platform `get_user_summary` (userToken), with top-up vs. granted breakdown
- **DeepSeek today / current-month actual cost and tokens**, request count, cache hit rate
- **Daily bar chart** (cost / token dual view, hand-rolled SVG, no heavy dependencies), historical month browsing; model breakdown
- **Refresh strategy**: fixed polling (host every 10 min by default / page every 30 s) + refresh right after each task completes (`turn/end` event, 60 s cooldown) + manual force refresh
- **userToken panel**: paste once, online validation, one-click clear, masked display

## Refresh strategy

| Trigger | Description |
|---|---|
| Fixed polling | Host fetches DeepSeek every `refreshIntervalMs` (default 10 min); browser reads the local cache every `clientPollIntervalMs` (default 30 s); polling pauses while the page is hidden and resumes on foreground |
| Task-completion refresh | Listens for session `turn/end` events and fetches DeepSeek once right after each task, with a minimum cooldown of `taskRefreshCooldownMs` (default 60 s) to coalesce bursts |
| Manual | The ↻ button force-refreshes through the cache; opening the panel, switching months, and saving settings also refresh immediately |

> DeepSeek billing settles with a few minutes of delay, so numbers fetched right after a task may not be fully settled yet; the next polling cycle catches up automatically.

## DeepSeek data sources

| Data | Endpoint | Credential |
|---|---|---|
| Official balance | `GET {apiBaseUrl}/user/balance` | API key (default `DEEPSEEK_API_KEY`, resolved via `ctx.credentials`) |
| Platform balance | `GET {platformBaseUrl}/api/v0/users/get_user_summary` | platform `userToken` |
| Daily usage | `GET {platformBaseUrl}/api/v0/usage/amount?month=&year=` | platform `userToken` |
| Daily cost | `GET {platformBaseUrl}/api/v0/usage/cost?month=&year=` | platform `userToken` |

> The platform usage endpoints are **undocumented** (the same ones the usage page calls, and already used by community apps). They may break without notice if the platform changes; the plugin parses defensively, keeps the last successful data on failure, and never affects Harness itself.

## ⚠️ Security & privacy (read before use)

- **userToken is an account-level credential.** Billed data comes from platform.deepseek.com's signed-in endpoints and requires your `userToken` (equivalent to your platform account's access credential). Treat it like a password and **never** paste it into public channels, chats, or any git repository.
- **Traffic goes only to official DeepSeek domains**: the token is used solely for **read-only** queries against three undocumented usage endpoints on `platform.deepseek.com`, plus the official `api.deepseek.com/user/balance`. The plugin contains no telemetry, analytics, or third-party forwarding.
- **Local storage**: the token is stored in `$DSH_HOME/storages/dsh-usage-dashboard.secret` (mode 0600, readable only by the host process). The browser only ever receives the masked value (`abcd****wxyz`); the plaintext token is never sent to the page. You can also use the `DEEPSEEK_PLATFORM_TOKEN` environment variable instead.
- **This repository and its code contain no credentials**; the plugin never prints, logs, or uploads the token.
- **Sanitize installation records before sharing them**: never run or share commands that print the complete `.credentials.yaml`, environment, or token values. Before sending logs or a session archive, search for and remove `sk-`, `userToken`, `DEEPSEEK_API_KEY`, and `DEEPSEEK_PLATFORM_TOKEN`. Delete unneeded diagnostic snapshots such as `$DSH_HOME/logs/dsh-web-env-snapshot.json`.
- **Undocumented endpoint risk**: `/api/v0/usage/*` are internal platform endpoints with no SLA; they may change without notice (this never affects Harness itself, and failures keep the last good data).
- **How to remove**: panel ⚙️ settings → "Clear saved token", or delete `~/.dsh/storages/dsh-usage-dashboard.secret`.
- By using this plugin you acknowledge the risks above and assume them yourself. See [SECURITY.md](./SECURITY.md) for details.

## Installation

### Prerequisites

- Node.js `18` or newer
- A working DeepSeek Harness installation
- `pnpm` available (the plugin installer invokes it)

Check first:

```sh
node --version
pnpm --version
```

If the second command is not found, install the pinned version:

```sh
npm install --global pnpm@10.15.0
```

### Option 1: pinned npm package (recommended)

No repository clone is required:

```sh
dsh plugin --profile web add deepseek-harness-usage-dashboard@1.0.2
```

The explicit `1.0.2` keeps the installation reproducible when later versions are released.

### Option 2: GitHub Release `.tgz` (when npm is unavailable or pnpm integrity policy blocks a URL)

Download the `.tgz` from the [v1.0.2 Release](https://github.com/nzz0991999-ai/dsh-usage-dashboard/releases/tag/v1.0.2), then install it with a local `file:` path. This lets pnpm record the tarball in the Profile lockfile:

```powershell
dsh plugin --profile web add "file:C:/Users/your-name/Downloads/deepseek-harness-usage-dashboard-1.0.2.tgz"
Get-FileHash "C:/Users/your-name/Downloads/deepseek-harness-usage-dashboard-1.0.2.tgz" -Algorithm SHA256
```

The SHA-256 must match the value published on the Release page. You may also try the remote URL directly:

```sh
dsh plugin --profile web add https://github.com/nzz0991999-ai/dsh-usage-dashboard/releases/download/v1.0.2/deepseek-harness-usage-dashboard-1.0.2.tgz
```

### Option 3: pinned local source (developers)

```sh
git clone --branch v1.0.2 --depth 1 https://github.com/nzz0991999-ai/dsh-usage-dashboard
dsh plugin --profile web add "file:$(pwd)/dsh-usage-dashboard"
```

On Windows PowerShell, use an absolute `file:` path with forward slashes:

```powershell
dsh plugin --profile web add "file:F:/path/to/dsh-usage-dashboard"
```

> Do not pass a plain directory path. On Windows, it may become a `link:` dependency and omit `@deepseek-ai/schemastery`. A `file:` path, npm package, or Release `.tgz` avoids that issue.

After installation, return to the **same workspace directory** from which you normally start Harness, restart `dsh web`, and refresh the page. The bottom-right balance pill confirms success. Starting from another directory may select a different Harness workspace or fail because port `3080` is already in use.

### Configure DeepSeek Platform userToken

`DEEPSEEK_API_KEY` and `userToken` are different credentials. The API key serves the official balance endpoint; the platform sign-in `userToken` serves daily/monthly usage and actual billed-spend endpoints. `platform.deepseek.com` and `api.deepseek.com` are DeepSeek's official shared domains, not relays operated by this plugin.

1. Sign in to <https://platform.deepseek.com> with Chrome or Edge and keep the page signed in.
2. Press `F12` → **Application** → **Local Storage** → `https://platform.deepseek.com`.
3. Search for `userToken` and copy only its **Value**, without the key name, quotes, or surrounding whitespace. If it is missing, refresh or sign in again and recheck.
4. In Harness, open the bottom-right dashboard → ⚙️ settings → paste → "Verify & save". Only a masked value is shown after saving.

Never paste a `userToken` into a terminal, chat, Issue, screenshot, or installation log. Advanced users may set `DEEPSEEK_PLATFORM_TOKEN` before starting Harness, but shell history can retain plaintext, so the dashboard form is safer.

## Installation troubleshooting

### `EADDRINUSE: address already in use 127.0.0.1:3080`

This normally means that another `dsh web` is already running; it is not a plugin, API-key, or `userToken` failure. If the existing page opens, use and refresh it instead of starting a duplicate server.

In Windows PowerShell, identify the listener first:

```powershell
$dshPid = Get-NetTCPConnection -LocalPort 3080 -State Listen |
  Select-Object -First 1 -ExpandProperty OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$dshPid" |
  Select-Object ProcessId, CommandLine
```

Only after confirming it is the old `dsh web` process, stop it and restart from the correct workspace:

```powershell
taskkill /PID $dshPid /T /F
Set-Location "F:/path/to/your/harness-workspace"
dsh web
```

On macOS/Linux, use `lsof -nP -iTCP:3080 -sTCP:LISTEN`, confirm the process, run `kill <PID>`, and start again from the original workspace.

### `ERR_MODULE_NOT_FOUND: @deepseek-ai/schemastery`

A local directory installed as a `link:` dependency may omit dependencies. Remove the old plugin and reinstall from npm, the Release `.tgz`, or an absolute `file:` path:

```sh
dsh plugin --profile web remove dsh-usage-dashboard
dsh plugin --profile web add deepseek-harness-usage-dashboard@1.0.2
```

### No balance pill after installation

Confirm both installation and restart use the `web` profile and start Harness from the original workspace, then hard-refresh the browser page. If an old `dsh web` process is still running, identify and restart it using the port steps above.

## Configuration overrides

Write into `$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- id: dsh-usage-dashboard
  config:
    refreshIntervalMs: 300000      # how often the host fetches DeepSeek (ms)
    clientPollIntervalMs: 15000    # how often the browser reads the cache (ms)
    timeoutMs: 8000                # per-request timeout (ms)
    historyMonths: 6               # months browsable in the panel
    apiKeyRef: DEEPSEEK_API_KEY    # credential reference for the official balance
    taskRefreshCooldownMs: 60000   # min cooldown of the task-completion refresh (ms)
```

## Uninstall

```sh
dsh plugin --profile web remove deepseek-harness-usage-dashboard
```

For `1.0.0` or older installations that used the old package name, run `dsh plugin --profile web remove dsh-usage-dashboard` instead. If you no longer need it, also delete `$DSH_HOME/storages/dsh-usage-dashboard.secret`.
