# dsh-usage-dashboard

DeepSeek 平台用量仪表盘插件:在 DeepSeek Harness Web UI 右下角挂一枚余额角标,点开展示**真实扣费数据**(与 platform.deepseek.com/usage 同源),不必再切回开发平台查看花费。

## 功能

- **账户余额**:官方 `/user/balance`(API Key)+ 平台 `get_user_summary`(登录态),充值/赠送拆分
- **今日 / 本月实际花费与 Token**、请求数、缓存命中率
- **每日柱状图**(花费 / Token 双视图),SVG 手绘无重型依赖,可回看历史月份
- **模型分布**(按实际扣费聚合)
- **userToken 管理面板**:一次性粘贴平台登录态,保存在宿主端 `$DSH_HOME/storages/dsh-usage-dashboard.secret`(0600 权限),浏览器只会拿到脱敏值;支持验证、清除、环境变量 `DEEPSEEK_PLATFORM_TOKEN` 兜底

## 刷新机制

| 触发方式 | 说明 |
|---|---|
| 固定轮询 | 宿主端每 `refreshIntervalMs`(默认 10 分钟)向 DeepSeek 拉取一次;浏览器端每 `clientPollIntervalMs`(默认 30 秒)读一次本地缓存;页面隐藏时暂停,回到前台立即补拉 |
| 任务完成即时刷新 | 监听会话 `turn/end` 事件,每轮任务结束后立即向 DeepSeek 拉取一次,最小冷却 `taskRefreshCooldownMs`(默认 60 秒),高频任务自动合并防连击 |
| 手动 | 面板 ↻ 按钮穿透缓存强制刷新;打开面板、切换月份、保存配置时也会立即刷新 |

> DeepSeek 账单本身有分钟级结算延迟,任务刚结束立刻拉到的数字可能尚未完全入账,下一个轮询周期会自动补齐。

## 数据来源

| 数据 | 接口 | 凭据 |
|---|---|---|
| 官方余额 | `GET {apiBaseUrl}/user/balance` | API Key(默认 `DEEPSEEK_API_KEY`,经 `ctx.credentials` 解析) |
| 平台余额 | `GET {platformBaseUrl}/api/v0/users/get_user_summary` | 平台 `userToken` |
| 每日用量 | `GET {platformBaseUrl}/api/v0/usage/amount?month=&year=` | 平台 `userToken` |
| 每日花费 | `GET {platformBaseUrl}/api/v0/usage/cost?month=&year=` | 平台 `userToken` |

> 平台用量接口为**未公开接口**(usage 页面同源,社区应用已在使用的稳定调用方式),官方改版可能导致失效;
> 插件对响应做防御式解析,失效时保留上次成功数据并显示错误,不影响 Harness 本身。

## ⚠️ 安全与隐私(使用前必读)

- **userToken 是账户级凭证**。真实扣费数据来自 platform.deepseek.com 的登录态接口,需要你的 `userToken`(相当于平台账户的访问凭证),请像保管密码一样对待它,**不要**把它粘贴进公开渠道、聊天记录或任何 git 仓库。
- **网络只流向 DeepSeek 官方**:token 仅用于向 `platform.deepseek.com` 的三个未公开用量接口发起**只读**查询,以及官方 `api.deepseek.com/user/balance`。插件不含任何遥测、统计上报或第三方转发。
- **本地存储**:token 保存在 `$DSH_HOME/storages/dsh-usage-dashboard.secret`(0600 权限,仅宿主进程可读);浏览器页面只能拿到脱敏值(`abcd****wxyz`),明文 token 不会下发到浏览器。也可以用环境变量 `DEEPSEEK_PLATFORM_TOKEN` 代替。
- **仓库与代码不含任何密钥**;插件代码不会打印、记录或上传 token。
- **未公开接口风险**:`/api/v0/usage/*` 是平台内部接口,无 SLA,官方改版可能导致数据失效(不影响 Harness 本体,失败时保留上次成功数据)。
- **清除方法**:面板 ⚙️ 设置 →「清除已保存的 token」,或直接删除 `~/.dsh/storages/dsh-usage-dashboard.secret`。
- 使用本插件即表示你已了解上述风险并自行承担。详见 [SECURITY.md](./SECURITY.md)。

## 安装

### 方式一:从 GitHub 克隆(推荐)

```sh
git clone https://github.com/nzz0991999-ai/dsh-usage-dashboard
dsh plugin --profile web add ./dsh-usage-dashboard
```

### 方式二:本地源码

```sh
dsh plugin --profile web add <本目录绝对路径>
```

执行后**重启 `dsh web`**,刷新页面即可看到右下角余额角标。

### 配置 userToken

1. 浏览器登录 <https://platform.deepseek.com>
2. DevTools(F12)→ Application → Local Storage → 选中 `platform.deepseek.com`
3. 复制 `userToken` 字段的值
4. 回到 Harness,点开右下角仪表盘 → ⚙️ 设置 → 粘贴 → 「验证并保存」

(也可以不粘贴,直接 `export DEEPSEEK_PLATFORM_TOKEN=...` 后重启 `dsh web`。)

## 覆盖配置

写进 `$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- id: dsh-usage-dashboard
  config:
    refreshIntervalMs: 300000      # 服务器向 DeepSeek 拉取用量的频率(ms)
    clientPollIntervalMs: 15000    # 浏览器读取缓存的频率(ms)
    timeoutMs: 8000                # 单次请求超时(ms)
    historyMonths: 6               # 面板可回看的月数
    apiKeyRef: DEEPSEEK_API_KEY    # 官方余额用的凭据引用名
    taskRefreshCooldownMs: 60000   # 任务完成后即时刷新的最小冷却(ms)
```

## 卸载

```sh
dsh plugin --profile web remove dsh-usage-dashboard
```

(如不再使用,可同时删除 `$DSH_HOME/storages/dsh-usage-dashboard.secret`。)

## 开发与发布流程

- **本地运行版**:`dsh-usage-dashboard/` —— 已 `dsh plugin --profile web add` 链接进 profile,直接改代码、重启 `dsh web` 即生效。
- **GitHub 发布版**:`dsh-usage-dashboard-github/` —— 独立副本 + git 仓库,与本地运行版隔离,发布过程不影响正在运行的插件。
- **同步**:本地改完并验证后,运行 `./sync-to-github.sh` 把发布文件复制到 GitHub 版目录,再在其中 `git add -A && git commit && git push`。
- 原则:**先在本机跑通更新,再同步发布**。

## License

MIT
