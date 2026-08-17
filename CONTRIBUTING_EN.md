# Contributing

**English** | [中文](./CONTRIBUTING.md)

Thanks for your interest in dsh-usage-dashboard! Issues and pull requests are welcome.

## Repository layout

```
.
├── src/               # host-side plugin (plain ESM, no build step)
│   └── index.js       # data fetching, caching, HTTP routes, credential handling
├── client/            # browser-side bundle (lazy-CJS, no build step)
│   └── client.js      # shell.overlay pill + dashboard panel
├── cordis.patch.yml   # bundle patch layer (default config)
└── package.json       # dsh.bundle / dsh.client manifest
```

## Local development

```sh
# 1. Clone the repository
git clone https://github.com/nzz0991999-ai/dsh-usage-dashboard

# 2. Install into the web profile
dsh plugin --profile web add ./dsh-usage-dashboard

# 3. Restart dsh web after code changes
dsh web --port 3080   # or your port
```

## Code conventions

- Host side (`src/index.js`) is a plain ESM + Cordis plugin: export `name`, `Config` (schemastery) and `apply(ctx, config)`; routes are registered via `ctx.inject(['webServer'])`
- Browser side (`client/client.js`) is a lazy-CJS bundle: `window.__ModuleLoader__.load({ id, factory })`, registered into the `shell.overlay` slot via `ctx.slots.register`
- Neither half needs a build step — edit the sources directly
- When changing configuration options, update the `Config` schema, the `cordis.patch.yml` defaults, and the README examples together
- Pricing/billing logic must only mirror the official DeepSeek pricing table; never hard-code exchange rates or personal account data

## Commit conventions

- One PR does one thing; imperative commit messages (e.g. `fix: handle token expiry notice`)
- Before touching anything user-data related, read [SECURITY.md](./SECURITY.md) and make sure no credential can end up in the repository
- Syntax check: `node --check src/index.js && node --check client/client.js`

## Security red lines

- **Never** commit userToken, API keys, or real account data into the repository (including test scripts, comments, or logs)
- Network requests are only allowed to the two official domains `api.deepseek.com` and `platform.deepseek.com`
