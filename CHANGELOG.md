# Changelog

[English](./CHANGELOG_EN.md) | **中文**

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式,版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## 版本导航

| 版本 | 重点 |
|---|---|
| `1.0.2` | 修复 npm 包名变更后的浏览器 bundle 注册 ID,补充一致性 CI 与稳定安装路径 |
| `1.0.1` | 更换 npm 包名、移除 `zod`、补充 Windows 安装与排障文档；已被 `1.0.2` 替代 |
| `1.0.0` | 宣布稳定版本,明确仅支持 DeepSeek 官方余额、用量和扣费数据 |
| `0.1.0` | 首个功能版本,提供余额角标、用量面板、Token 管理和刷新机制 |

## [1.0.2] - 2026-08-18

### 修复

- 修正浏览器端 `window.__ModuleLoader__.load()` 的最外层注册 ID,使其与 npm 包名 `deepseek-harness-usage-dashboard` 一致
- 保留宿主端 Cordis 运行时 ID `dsh-usage-dashboard`,避免破坏已有配置、路由、缓存和卸载标识
- 修复新用户安装后可能出现的 `Failed to load plugins`

### 安装与文档

- 当前推荐安装版本统一为 `1.0.2`
- GitHub Release 备用方式改为“下载 `.tgz`、校验 SHA-256、使用 `file:` 安装”,兼容 pnpm 完整性策略
- 明确 `1.0.1` 已被替代,避免继续安装存在前端注册 ID 问题的版本
- README 增加版本导航,中英文文档同步说明每个版本的重点变化

### CI

- 新增自动断言:客户端最外层注册 ID 必须等于 `package.json.name`,防止包重命名再次造成前端加载失败

## [1.0.1] - 2026-08-18

### 变更

- npm 包改名为未占用的 `deepseek-harness-usage-dashboard`,插件运行时 ID 继续使用 `dsh-usage-dashboard`
- 移除未使用的 `zod`,并固定 `@deepseek-ai/schemastery` 依赖版本
- npm 发布包补充中英文 README、Security、Changelog 与 License 文件

### 安装与文档

- npm 固定版本安装成为首选方式,同时提供 GitHub Release `.tgz` 备用路径
- 补充 Node.js/pnpm 前置条件、Windows `file:` 本地安装方式和同一工作目录重启说明
- 补充端口 `3080` 被占用、`link:` 依赖缺失和安装后无角标的排查步骤
- 加强 `userToken` 获取、凭据区分和日志/会话压缩包脱敏提示

### CI

- 新增 Windows 与 Ubuntu 的入口导入、客户端语法、npm 打包内容及发布 dry-run 检查

> **兼容性提示:**`1.0.1` 的 npm 包名已经更换,但前端 bundle 仍注册旧 ID。该版本已被 `1.0.2` 替代,新用户不要安装 `1.0.1`。

## [1.0.0] - 2026-08-17

### 变更

- 项目进入稳定版本,版本号升级至 `1.0.0`

### 文档

- 明确插件仅支持 DeepSeek 官方 API 与 DeepSeek Platform 的余额、用量和扣费数据
- 明确使用其他模型供应商时,面板数据不代表该供应商的真实余额或花费,并可能显示不可用或报错

## [0.1.0] - 2026-08-17

### 新增

- 右下角余额角标 + 用量仪表盘面板(注册于 `shell.overlay` 插槽)
- 账户余额:官方 `/user/balance`(API Key)+ 平台 `get_user_summary`(userToken),充值/赠送拆分
- 今日 / 本月实际扣费与 Token、请求数、缓存命中率
- 每日花费 / Token 柱状图(SVG 手绘),支持回看历史月份;模型分布
- 刷新机制:固定轮询(默认 10 分钟 / 页面 30 秒)+ 任务完成即时刷新(`turn/end` 事件,60 秒冷却)+ 手动强制刷新
- userToken 管理面板:一次性粘贴、在线验证、一键清除、脱敏显示
- 凭据安全:token 仅存本机 0600 密钥文件,浏览器只读脱敏值;支持环境变量 `DEEPSEEK_PLATFORM_TOKEN`

### 文档

- README(功能 / 数据来源 / 安全与隐私 / 安装 / 配置 / 卸载)
- SECURITY.md、CONTRIBUTING.md、LICENSE(MIT)
