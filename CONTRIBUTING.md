# Contributing

[English](./CONTRIBUTING_EN.md) | **中文**

感谢你对 dsh-usage-dashboard 的关注!欢迎提交 Issue 和 Pull Request。

## 目录结构

```
.
├── src/               # 宿主端插件(纯 ESM,无需构建)
│   └── index.js       # 数据拉取、缓存、HTTP 路由、凭据管理
├── client/            # 浏览器端 bundle(lazy-CJS,无需构建)
│   └── client.js      # shell.overlay 角标 + 仪表盘面板
├── cordis.patch.yml   # bundle patch 层(默认配置)
└── package.json       # dsh.bundle / dsh.client 清单
```

## 本地开发

```sh
# 1. 克隆仓库
git clone https://github.com/nzz0991999-ai/dsh-usage-dashboard

# 2. 安装到 web profile
dsh plugin --profile web add "file:$(pwd)/dsh-usage-dashboard"

# 3. 修改代码后重启生效
dsh web --port 3080   # 或你使用的端口
```

## 修改规范

- 宿主端(`src/index.js`)是纯 ESM + Cordis 插件:导出 `name`、`Config`(schemastery)、`apply(ctx, config)`;路由经 `ctx.inject(['webServer'])` 注册
- 浏览器端(`client/client.js`)是 lazy-CJS bundle:`window.__ModuleLoader__.load({ id, factory })`,经 `ctx.slots.register` 注册进 `shell.overlay` 插槽
- 两端都不需要构建步骤,直接改源文件即可
- 修改配置项时,请同步更新:`Config` schema、`cordis.patch.yml` 默认值、README 配置示例
- 定价/计费逻辑只与 DeepSeek 官方定价表对齐,不要在代码里硬编码汇率或个人账户信息

## 提交规范

- 一个 PR 只做一件事;提交信息用祈使句(如 `fix: 处理 token 过期提示`)
- 涉及用户数据的改动,请先阅读 [SECURITY.md](./SECURITY.md),并确认不会把任何凭据写入仓库
- 本地自检:`npm install && npm test && node --check client/client.js && npm run pack:check`

## 安全红线

- **任何情况下都不要**把 userToken、API Key 或真实账户数据提交进仓库(包括测试脚本、注释、日志)
- 网络请求只允许发往 `api.deepseek.com` 与 `platform.deepseek.com` 两个官方域名
