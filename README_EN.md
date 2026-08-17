# dsh-usage-dashboard

**English** | [中文](./README.md)

A usage dashboard plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a balance pill in the bottom-right corner of the Web UI that expands into a full panel showing your **actual billed spend** (same data source as platform.deepseek.com/usage) — no more switching back to the platform to check costs.

> **Scope:** This plugin queries only balance, usage, and billing data from the official DeepSeek API and DeepSeek Platform. Even if Harness is configured with another model provider, the plugin does not read that provider's billing data. The panel may continue to show DeepSeek data, show an unavailable state, or report an error; none of these represent the current model provider's actual balance or cost.

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
- **Undocumented endpoint risk**: `/api/v0/usage/*` are internal platform endpoints with no SLA; they may change without notice (this never affects Harness itself, and failures keep the last good data).
- **How to remove**: panel ⚙️ settings → "Clear saved token", or delete `~/.dsh/storages/dsh-usage-dashboard.secret`.
- By using this plugin you acknowledge the risks above and assume them yourself. See [SECURITY.md](./SECURITY.md) for details.

## Installation

### Option 1: clone from GitHub (recommended)

```sh
git clone https://github.com/nzz0991999-ai/dsh-usage-dashboard
dsh plugin --profile web add ./dsh-usage-dashboard
```

### Option 2: local source

```sh
dsh plugin --profile web add <absolute path to this directory>
```

Restart `dsh web` afterwards and refresh the page — the balance pill appears in the bottom-right corner.

### Configure DeepSeek Platform userToken

1. Sign in to <https://platform.deepseek.com> in your browser
2. DevTools (F12) → Application → Local Storage → select `platform.deepseek.com`
3. Copy the value of the `userToken` key
4. Back in Harness, open the bottom-right dashboard → ⚙️ settings → paste → "Verify & save"

(Alternatively, `export DEEPSEEK_PLATFORM_TOKEN=...` before starting `dsh web`.)

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
dsh plugin --profile web remove dsh-usage-dashboard
```

(If you no longer need it, also delete `$DSH_HOME/storages/dsh-usage-dashboard.secret`.)
