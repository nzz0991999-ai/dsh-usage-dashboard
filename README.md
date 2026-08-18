# dsh-usage-dashboard

[English](./README_EN.md) | **中文**

DeepSeek 平台用量仪表盘插件:在 DeepSeek Harness Web UI 右下角挂一枚余额角标,点开展示**真实扣费数据**(与 platform.deepseek.com/usage 同源),不必再切回开发平台查看花费。

> **适用范围:**本插件仅查询 DeepSeek 官方 API 与 DeepSeek Platform 的账户余额、用量和扣费数据。即使 Harness 配置了其他模型供应商,本插件也不会读取相应供应商的账单;此时面板可能继续显示 DeepSeek 数据、显示不可用或报错,均不代表当前模型供应商的真实余额或花费。

当前稳定版本为 `1.0.2`,完整的小版本变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 效果预览

安装并配置后,右下角余额角标可展开为完整的 DeepSeek 用量仪表盘:

![DeepSeek Harness 用量仪表盘效果预览](./docs/images/usage-dashboard-preview.jpg)

## 功能

- **DeepSeek 账户余额**:官方 `/user/balance`(API Key)+ 平台 `get_user_summary`(登录态),充值/赠送拆分
- **DeepSeek 今日 / 本月实际花费与 Token**、请求数、缓存命中率
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

## DeepSeek 数据来源

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
- **分享安装记录前必须脱敏**:不要运行或分享会完整打印 `.credentials.yaml`、环境变量或 token 的命令。发送日志/会话压缩包前,请搜索并移除 `sk-`、`userToken`、`DEEPSEEK_API_KEY`、`DEEPSEEK_PLATFORM_TOKEN` 等内容;不再需要的调试快照(例如 `$DSH_HOME/logs/dsh-web-env-snapshot.json`)应及时删除。
- **未公开接口风险**:`/api/v0/usage/*` 是平台内部接口,无 SLA,官方改版可能导致数据失效(不影响 Harness 本体,失败时保留上次成功数据)。
- **清除方法**:面板 ⚙️ 设置 →「清除已保存的 token」,或直接删除 `~/.dsh/storages/dsh-usage-dashboard.secret`。
- 使用本插件即表示你已了解上述风险并自行承担。详见 [SECURITY.md](./SECURITY.md)。

## 安装

### 准备工作

- Node.js `18` 或更高版本
- 已能正常启动 DeepSeek Harness
- `pnpm` 可用(插件安装器会调用它)

先检查:

```sh
node --version
pnpm --version
```

如果第二条命令提示未找到,安装固定版本:

```sh
npm install --global pnpm@10.15.0
```

### 方式一:npm 固定版本(推荐)

无需克隆仓库,直接安装发布包:

```sh
dsh plugin --profile web add deepseek-harness-usage-dashboard@1.0.2
```

这里特意固定为 `1.0.2`,避免未来发布版本后安装结果发生变化。

### 方式二:GitHub Release `.tgz`(npm 不可用或受 pnpm 完整性策略限制时)

请先从 [v1.0.2 Release](https://github.com/nzz0991999-ai/dsh-usage-dashboard/releases/tag/v1.0.2) 下载 `.tgz`,再用本地 `file:` 路径安装。这样 pnpm 可以把 tarball 固定写入 Profile 锁文件:

```powershell
dsh plugin --profile web add "file:C:/Users/你的用户名/Downloads/deepseek-harness-usage-dashboard-1.0.2.tgz"
Get-FileHash "C:/Users/你的用户名/Downloads/deepseek-harness-usage-dashboard-1.0.2.tgz" -Algorithm SHA256
```

SHA-256 应与 Release 页面公布的值一致。远程 URL 也可直接尝试:

```sh
dsh plugin --profile web add https://github.com/nzz0991999-ai/dsh-usage-dashboard/releases/download/v1.0.2/deepseek-harness-usage-dashboard-1.0.2.tgz
```

### 方式三:固定标签的本地源码(开发者)

```sh
git clone --branch v1.0.2 --depth 1 https://github.com/nzz0991999-ai/dsh-usage-dashboard
dsh plugin --profile web add "file:$(pwd)/dsh-usage-dashboard"
```

Windows PowerShell 请使用带 `file:` 的绝对路径,并把反斜杠改成正斜杠:

```powershell
dsh plugin --profile web add "file:F:/path/to/dsh-usage-dashboard"
```

> 不要直接传普通目录路径。Windows 实测中,普通路径可能被安装成 `link:` 依赖,导致 `@deepseek-ai/schemastery` 没有安装;`file:`、npm 包和 Release `.tgz` 均可避免这个问题。

安装完成后,回到你平时启动 Harness 的**同一个工作目录**,重启 `dsh web` 并刷新页面。右下角出现余额角标即安装成功。不要从另一个目录重复启动,否则 Harness 可能使用不同的工作区,或因 `3080` 端口已被占用而启动失败。

### 配置 DeepSeek Platform userToken

`DEEPSEEK_API_KEY` 与 `userToken` 不是同一个凭据:API Key 用于官方余额接口;平台登录态 `userToken` 用于今日/月度用量和实际扣费。`platform.deepseek.com` 与 `api.deepseek.com` 是 DeepSeek 官方统一域名,不是本插件自建的中转地址。

1. 用 Chrome 或 Edge 登录 <https://platform.deepseek.com>,并保持该页面处于登录状态。
2. 按 `F12` 打开 DevTools → **Application(应用)** → **Local Storage(本地存储)** → `https://platform.deepseek.com`。
3. 搜索 `userToken`,只复制其 **Value(值)**,不要复制字段名、引号或前后空格。如果找不到,刷新平台页面或重新登录后再检查。
4. 回到 Harness,打开右下角仪表盘 → ⚙️ 设置 → 粘贴 → 「验证并保存」。保存成功后只会显示脱敏值。

请勿把 `userToken` 粘贴到终端、聊天、Issue、截图或安装日志中。高级用户也可在启动 Harness 前设置 `DEEPSEEK_PLATFORM_TOKEN`,但命令行历史可能保存明文,因此面板粘贴方式更安全。

## 常见安装问题

### `EADDRINUSE: address already in use 127.0.0.1:3080`

这通常表示已有一个 `dsh web` 正在运行,不是插件、API Key 或 `userToken` 出错。如果原来的页面能打开,直接使用并刷新,不要再次启动。

Windows PowerShell 可先确认监听进程:

```powershell
$dshPid = Get-NetTCPConnection -LocalPort 3080 -State Listen |
  Select-Object -First 1 -ExpandProperty OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$dshPid" |
  Select-Object ProcessId, CommandLine
```

确认它确实是旧的 `dsh web` 后,再结束并从正确工作目录重启:

```powershell
taskkill /PID $dshPid /T /F
Set-Location "F:/path/to/your/harness-workspace"
dsh web
```

macOS/Linux 可用 `lsof -nP -iTCP:3080 -sTCP:LISTEN` 查看进程,确认后执行 `kill <PID>`,再从原工作目录启动。

### `ERR_MODULE_NOT_FOUND: @deepseek-ai/schemastery`

这是本地目录被作为 `link:` 安装时可能出现的依赖缺失。移除旧插件后,改用上面的 npm、Release `.tgz`,或带 `file:` 的绝对路径重新安装:

```sh
dsh plugin --profile web remove dsh-usage-dashboard
dsh plugin --profile web add deepseek-harness-usage-dashboard@1.0.2
```

### 安装后没有角标

确认安装和重启都使用 `web` profile,并从原 Harness 工作目录启动;然后对浏览器页面执行一次强制刷新。若当前已有一个旧的 `dsh web` 进程,先按上面的端口占用步骤确认并重启该进程。

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
dsh plugin --profile web remove deepseek-harness-usage-dashboard
```

如果你卸载的是使用旧包名安装的 `1.0.0` 或更早版本,请改用 `dsh plugin --profile web remove dsh-usage-dashboard`。如不再使用,可同时删除 `$DSH_HOME/storages/dsh-usage-dashboard.secret`。
