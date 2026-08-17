# Changelog

[English](./CHANGELOG_EN.md) | **中文**

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式,版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
