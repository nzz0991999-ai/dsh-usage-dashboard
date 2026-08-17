# Security Policy

[English](./SECURITY_EN.md) | **中文**

## 支持范围

- 本插件仅支持查询 DeepSeek 官方 API 与 DeepSeek Platform 的账户余额、用量和扣费数据,不支持 Harness 中配置的其他模型供应商。
- 使用其他供应商时,面板可能继续显示 DeepSeek 数据、显示不可用或报错;这些结果均不代表当前模型供应商的真实余额或花费。

## 凭证处理原则

- 本仓库与代码中**不包含任何密钥**。请勿在 Issue、PR 或任何公开渠道粘贴你的 `userToken` 或 API Key。
- 插件运行所需的两个凭据只存在于使用者的本机:
  - 平台登录态 `userToken` → `$DSH_HOME/storages/dsh-usage-dashboard.secret`(0600 权限)或环境变量 `DEEPSEEK_PLATFORM_TOKEN`
  - DeepSeek API Key → 经 Harness 的 `ctx.credentials` 解析(即 `$DSH_HOME/.credentials.yaml` 或进程环境)
- 网络请求只发往 `api.deepseek.com` 与 `platform.deepseek.com` 两个官方域名,均为只读查询;插件不含遥测、统计上报或任何第三方转发。
- 浏览器端只能获得脱敏后的 token 显示值(`abcd****wxyz`),明文 token 不会下发到页面。

## 日志与安装记录

- 不要运行或分享会完整打印 `$DSH_HOME/.credentials.yaml`、进程环境或 token 值的诊断命令。排查凭据时只输出字段名或脱敏指纹。
- 分享日志、截图或会话压缩包前,搜索并移除 `sk-`、`userToken`、`DEEPSEEK_API_KEY`、`DEEPSEEK_PLATFORM_TOKEN` 及 Authorization/Bearer 请求头。
- 安装工具生成的环境快照也可能含有敏感信息。调试完成后,检查并删除不再需要的文件,例如 `$DSH_HOME/logs/dsh-web-env-snapshot.json`。
- 一旦凭据可能被记录或分享,请先在 DeepSeek 平台轮换/删除凭据,再处理已保存的日志或压缩包。

## 报告漏洞

- 一般问题:直接开 [GitHub Issue](https://github.com/nzz0991999-ai/dsh-usage-dashboard/issues)。
- 涉及敏感信息(疑似泄露、可复现的越权等):**不要**公开细节,开一个 Issue 说明"需要私下沟通"即可,我们会联系你。
- 如果你怀疑自己的 `userToken` 已泄露,请立即在 platform.deepseek.com 重新登录以轮换登录态,使旧 token 失效。
- 如果你怀疑 API Key 已泄露,请立即在 DeepSeek 平台删除并重新创建 Key。
