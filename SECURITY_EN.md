# Security Policy

**English** | [中文](./SECURITY.md)

## Supported scope

- This plugin queries only balance, usage, and billing data from the official DeepSeek API and DeepSeek Platform. It does not support other model providers configured in Harness.
- When another provider is in use, the panel may continue to show DeepSeek data, show an unavailable state, or report an error. None of these results represent the current model provider's actual balance or cost.

## Credential handling principles

- This repository and its code **contain no credentials**. Never paste your `userToken` or API key into Issues, PRs, or any public channel.
- The two credentials the plugin needs exist only on the user's own machine:
  - platform sign-in `userToken` → `$DSH_HOME/storages/dsh-usage-dashboard.secret` (mode 0600) or the `DEEPSEEK_PLATFORM_TOKEN` environment variable
  - DeepSeek API key → resolved through Harness's `ctx.credentials` (i.e. `$DSH_HOME/.credentials.yaml` or process environment)
- Network requests go only to the two official domains `api.deepseek.com` and `platform.deepseek.com`, and are all read-only queries. The plugin contains no telemetry, analytics, or third-party forwarding.
- The browser only ever receives the masked token value (`abcd****wxyz`); the plaintext token is never sent to the page.

## Logs and installation records

- Never run or share diagnostic commands that print the complete `$DSH_HOME/.credentials.yaml`, process environment, or token values. When debugging credentials, output only field names or masked fingerprints.
- Before sharing logs, screenshots, or session archives, search for and remove `sk-`, `userToken`, `DEEPSEEK_API_KEY`, `DEEPSEEK_PLATFORM_TOKEN`, and Authorization/Bearer headers.
- Environment snapshots created by installation tooling may also contain sensitive data. After debugging, inspect and delete files that are no longer needed, such as `$DSH_HOME/logs/dsh-web-env-snapshot.json`.
- If a credential may have been recorded or shared, rotate or delete it on DeepSeek Platform before handling the saved logs or archive.

## Reporting vulnerabilities

- General issues: open a [GitHub Issue](https://github.com/nzz0991999-ai/dsh-usage-dashboard/issues).
- Sensitive matters (suspected leaks, reproducible privilege issues): **do not** post details publicly — open an Issue saying you need to communicate privately and we will contact you.
- If you suspect your own `userToken` has leaked, sign in again at platform.deepseek.com immediately to rotate the session and invalidate the old token.
- If you suspect an API key has leaked, delete it on DeepSeek Platform immediately and create a replacement.
