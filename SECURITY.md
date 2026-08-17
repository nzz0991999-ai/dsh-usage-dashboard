# Security Policy

## 凭证处理原则

- 本仓库与代码中**不包含任何密钥**。请勿在 Issue、PR 或任何公开渠道粘贴你的 `userToken` 或 API Key。
- 插件运行所需的两个凭据只存在于使用者的本机:
  - 平台登录态 `userToken` → `$DSH_HOME/storages/dsh-usage-dashboard.secret`(0600 权限)或环境变量 `DEEPSEEK_PLATFORM_TOKEN`
  - DeepSeek API Key → 经 Harness 的 `ctx.credentials` 解析(即 `$DSH_HOME/.credentials.yaml` 或进程环境)
- 网络请求只发往 `api.deepseek.com` 与 `platform.deepseek.com` 两个官方域名,均为只读查询;插件不含遥测、统计上报或任何第三方转发。
- 浏览器端只能获得脱敏后的 token 显示值(`abcd****wxyz`),明文 token 不会下发到页面。

## 报告漏洞

- 一般问题:直接开 [GitHub Issue](https://github.com/nzz0991999-ai/dsh-usage-dashboard/issues)。
- 涉及敏感信息(疑似泄露、可复现的越权等):**不要**公开细节,开一个 Issue 说明"需要私下沟通"即可,我们会联系你。
- 如果你怀疑自己的 `userToken` 已泄露,请立即在 platform.deepseek.com 重新登录以轮换登录态,使旧 token 失效。
