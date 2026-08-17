# Changelog

[English](./CHANGELOG_EN.md) | **中文**

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式,版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
