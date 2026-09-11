/**
 * dsh-usage-dashboard — 宿主端(host half)。
 *
 * 数据源:
 *   1. 官方余额:  GET {apiBaseUrl}/user/balance         (API Key, 已文档化)
 *   2. 平台余额:  GET {platformBaseUrl}/api/v0/users/get_user_summary   (登录态 userToken)
 *   3. 平台用量:  GET {platformBaseUrl}/api/v0/usage/by_api_key/amount?start=&end=&tz=  (登录态 userToken)
 *   4. 平台花费:  GET {platformBaseUrl}/api/v0/usage/by_api_key/cost?start=&end=&tz=    (登录态 userToken)
 *      3/4 与官网用量页同源: start/end 为 epoch 秒, tz 为时区偏移秒(默认 28800 = GMT+8),
 *      按本地日历日切桶且**当天实时更新**。整月一次请求(月长 ≤ 31 天, 平台允许的上限)。
 *      旧接口 /api/v0/usage/amount|cost?month=&year= 作为兜底: 它按 UTC 切天且当天恒为 0。
 *
 * userToken 解析顺序: 运行时配置(POST /usage-dashboard/config 设置并持久化)
 *   → 环境变量 DEEPSEEK_PLATFORM_TOKEN → 密钥文件($DSH_HOME/storages/dsh-usage-dashboard.secret, 0600)。
 * 浏览器只能读取脱敏后的配置与缓存, 永远不会拿到明文 token。
 *
 * 平台 2/3/4 为未公开接口, 响应结构以防御式解析为主(见 normalizeSummary / normalizeMonth /
 * normalizeMonthBuckets), 接口失效时保留上次成功值(stale-while-error)。
 */
import Schema from '@deepseek-ai/schemastery'
import { promises as fsp } from 'node:fs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-usage-dashboard'

export const Config = Schema.object({
  /** DeepSeek 平台基址(用量/平台余额) */
  platformBaseUrl: Schema.string().default('https://platform.deepseek.com'),
  /** DeepSeek API 基址(官方余额) */
  apiBaseUrl: Schema.string().default('https://api.deepseek.com'),
  /** 官方余额查询用的 credentials 引用名 */
  apiKeyRef: Schema.string().default('DEEPSEEK_API_KEY'),
  /**
   * 平台用量接口使用的时区偏移(秒, 东为正), 默认 28800 = GMT+8。
   * 官方用量页所有日期均按 GMT+8 显示, 该值同时决定按天分桶与请求的 start/end 对齐;
   * 必须是 900 的整数倍且落在 [-43200, 50400](平台接口限制)。
   */
  timezoneOffsetSec: Schema.number().default(28800),
  /** 服务器向 DeepSeek 拉取数据的频率(ms) */
  refreshIntervalMs: Schema.number().min(30000).default(600000),
  /** 浏览器读取本地缓存的频率(ms) */
  clientPollIntervalMs: Schema.number().min(5000).default(30000),
  /** 单次请求超时(ms) */
  timeoutMs: Schema.number().min(1000).default(8000),
  /** 面板可回看的月数 */
  historyMonths: Schema.number().min(1).max(24).default(6),
  /** 任务完成后触发即时刷新的最小冷却(ms), 防止高频任务连击平台接口 */
  taskRefreshCooldownMs: Schema.number().min(5000).default(60000),
  /** 峰时窗口列表("HH:MM-HH:MM", 北京时间); 其余时间为谷时 */
  peakWindows: Schema.array(Schema.string()).default(['09:00-12:00', '14:00-18:00']),
  /** 是否检查 npm 上是否有新版本(仅提示, 不自动安装) */
  checkUpdate: Schema.boolean().default(true),
  /** 检查新版本的频率(ms) */
  updateCheckIntervalMs: Schema.number().min(60000).default(21600000),
})

// ---------------------------------------------------------------------------
// 归一化工具
// ---------------------------------------------------------------------------

const toNum = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 平台用量接口要求的时区偏移(秒): 900 的整数倍且落在 [-43200, 50400]; 非法值回落到 GMT+8。 */
const DEFAULT_TZ_SEC = 28800
const normalizeTzSec = (v) => (Number.isInteger(v) && v % 900 === 0 && v >= -43200 && v <= 50400 ? v : DEFAULT_TZ_SEC)

/** 归一化官方 `/user/balance`。 */
export const normalizeBalances = (data) => {
  const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : []
  return infos.map((info) => ({
    currency: typeof info?.currency === 'string' && info.currency !== '' ? info.currency : 'CNY',
    total: toNum(info?.total_balance) ?? 0,
    granted: toNum(info?.granted_balance) ?? 0,
    toppedUp: toNum(info?.topped_up_balance) ?? 0,
  }))
}

/** usage 类型 → 语义字段。 */
const USAGE_TYPES = {
  PROMPT_TOKEN: 'promptTokens',
  PROMPT_CACHE_HIT_TOKEN: 'cacheHitTokens',
  PROMPT_CACHE_MISS_TOKEN: 'cacheMissTokens',
  RESPONSE_TOKEN: 'outputTokens',
  REQUEST: 'requests',
}

/** 单个模型条目 {model, usage:[{type, amount}]} → {promptTokens, cacheHitTokens, ...} */
const usageMap = (modelEntry) => {
  const out = {}
  for (const u of Array.isArray(modelEntry?.usage) ? modelEntry.usage : []) {
    const key = USAGE_TYPES[u?.type]
    if (key === undefined) continue
    const n = toNum(u?.amount)
    if (n !== null) out[key] = (out[key] ?? 0) + n
  }
  return out
}

const dayOfDate = (dateStr) => {
  const m = String(dateStr ?? '').match(/(\d{4})-(\d{2})-(\d{2})/)
  return m !== null ? Number(m[3]) : null
}

/** 把按天累加的中间结构折叠成 payload(normalizeMonth / normalizeMonthBuckets 共用)。 */
const buildMonthPayload = (byDay, year, month, currency) => {
  const days = [...byDay.values()].sort((a, b) => a.day - b.day).map((d) => ({
    day: d.day,
    date: `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
    cost: d.cost,
    tokens: d.tokens,
    inputTokens: d.promptTokens + d.cacheHitTokens + d.cacheMissTokens,
    outputTokens: d.outputTokens,
    cacheHitTokens: d.cacheHitTokens,
    requests: d.requests,
    models: Object.values(d.models),
  }))

  const totals = {
    cost: days.reduce((a, d) => a + d.cost, 0),
    tokens: days.reduce((a, d) => a + d.tokens, 0),
    requests: days.reduce((a, d) => a + d.requests, 0),
  }
  const inputSum = days.reduce((a, d) => a + d.inputTokens, 0)
  const hitSum = days.reduce((a, d) => a + d.cacheHitTokens, 0)

  const modelMap = new Map()
  for (const d of days) {
    for (const m of d.models) {
      const cur = modelMap.get(m.model) ?? { model: m.model, cost: 0, tokens: 0 }
      cur.cost += m.cost
      cur.tokens += m.tokens
      modelMap.set(m.model, cur)
    }
  }

  return {
    year,
    month,
    currency,
    days,
    totals,
    cacheHitRate: inputSum > 0 ? hitSum / inputSum : null,
    modelTotals: [...modelMap.values()].sort((a, b) => b.cost - a.cost),
  }
}

/** 新建/取出某一天的累加器。 */
const ensureDay = (byDay, day) => {
  if (!byDay.has(day)) {
    byDay.set(day, { day, cost: 0, tokens: 0, promptTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, requests: 0, models: {} })
  }
  return byDay.get(day)
}

/** 模型名兜底。 */
const modelName = (entry) => (typeof entry?.model === 'string' && entry.model !== '' ? entry.model : 'unknown')

/**
 * 归一化某月的 amount + cost 两个响应(2026-08 实测 schema, 旧接口):
 *   amount: data.biz_data = { total: [...], days: [{date, data:[{model, usage:[{type, amount}]}]}] }
 *   cost:   data.biz_data = [ { currency, total: [...], days: [...] } ]  (多币种桶, 取第一个)
 * 注意: 该接口的"天"按 UTC 切分(实测 UTC 9/8 的行 == GMT+8 9/8 08:00 → 9/9 08:00),
 * 且当天(本地日历日)的行恒为 0, 因此只作为新接口失败时的兜底。
 * 输出 { year, month, days, totals, cacheHitRate, modelTotals, currency }。
 */
export const normalizeMonth = (amountData, costData, year, month) => {
  const amountBiz = amountData?.data?.biz_data ?? amountData?.data ?? {}
  const costBizRaw = costData?.data?.biz_data
  const costBiz = Array.isArray(costBizRaw) ? (costBizRaw[0] ?? {}) : (costBizRaw ?? {})
  const currency = typeof costBiz.currency === 'string' && costBiz.currency !== '' ? costBiz.currency : 'CNY'

  const amountDays = Array.isArray(amountBiz.days) ? amountBiz.days : []
  const costDays = Array.isArray(costBiz.days) ? costBiz.days : []

  const byDay = new Map()
  const ensure = (day) => ensureDay(byDay, day)

  // cost 天表: 按天 × 模型累加各类型金额(REQUEST 不计花费)
  for (const entry of costDays) {
    const day = dayOfDate(entry?.date)
    if (day === null) continue
    const d = ensure(day)
    for (const me of Array.isArray(entry?.data) ? entry.data : []) {
      const u = usageMap(me)
      const cost = (u.promptTokens ?? 0) + (u.cacheHitTokens ?? 0) + (u.cacheMissTokens ?? 0) + (u.outputTokens ?? 0)
      d.cost += cost
      const model = modelName(me)
      if (!d.models[model]) d.models[model] = { model, cost: 0, tokens: 0 }
      d.models[model].cost += cost
    }
  }

  // amount 天表: 按天 × 模型累加 token 与请求数
  for (const entry of amountDays) {
    const day = dayOfDate(entry?.date)
    if (day === null) continue
    const d = ensure(day)
    for (const me of Array.isArray(entry?.data) ? entry.data : []) {
      const u = usageMap(me)
      d.promptTokens += u.promptTokens ?? 0
      d.cacheHitTokens += u.cacheHitTokens ?? 0
      d.cacheMissTokens += u.cacheMissTokens ?? 0
      d.outputTokens += u.outputTokens ?? 0
      d.requests += u.requests ?? 0
      d.tokens += (u.promptTokens ?? 0) + (u.cacheHitTokens ?? 0) + (u.cacheMissTokens ?? 0) + (u.outputTokens ?? 0)
      const model = modelName(me)
      if (!d.models[model]) d.models[model] = { model, cost: 0, tokens: 0 }
      d.models[model].tokens += (u.promptTokens ?? 0) + (u.cacheHitTokens ?? 0) + (u.cacheMissTokens ?? 0) + (u.outputTokens ?? 0)
    }
  }

  return buildMonthPayload(byDay, year, month, currency)
}

/**
 * 归一化某月的 by_api_key amount + cost 响应(2026-09 实测 schema, 与官网用量页同源):
 *   amount: data.biz_data = { start, end, bucket, models, series:[{api_key, model, buckets:[{time, usage:{TYPE: amount}}]}] }
 *   cost:   data.biz_data = { start, end, bucket, models, data:[{currency, series:[{api_key, model, buckets:[{time, cost}]}]}] }
 * `time` 是 UTC 秒; `time + tzSec` 的 UTC 日历日即为本地(默认 GMT+8)日期 —— 与官方用量页
 * "所有日期均按 GMT+8 显示" 一致, 且当天的桶是实时更新的(today 不再恒为 0)。
 * 输出结构与 normalizeMonth 完全一致。
 */
export const normalizeMonthBuckets = (amountData, costData, year, month, tzSec = 28800, preferredCurrency = null) => {
  const amountBiz = amountData?.data?.biz_data ?? amountData?.data ?? {}
  const costBizRaw = costData?.data?.biz_data ?? costData?.data ?? {}
  const costGroups = Array.isArray(costBizRaw?.data) ? costBizRaw.data : []
  // 优先账户计费币种(美元账户不会因为存在 CNY 桶就被显示成 ¥), 其次 CNY, 最后第一个币种桶
  const costGroup = costGroups.find((g) => preferredCurrency !== null && g?.currency === preferredCurrency)
    ?? costGroups.find((g) => g?.currency === 'CNY')
    ?? costGroups[0] ?? {}
  const currency = typeof costGroup?.currency === 'string' && costGroup.currency !== '' ? costGroup.currency : 'CNY'

  const amountSeries = Array.isArray(amountBiz?.series) ? amountBiz.series : []
  const costSeries = Array.isArray(costGroup?.series) ? costGroup.series : []

  /** bucket 的 UTC 秒 → 本地日历日(只保留本月内的桶)。 */
  const dayOfBucket = (time) => {
    const n = toNum(time)
    if (n === null) return null
    const d = new Date((n + tzSec) * 1000)
    if (Number.isNaN(d.getTime())) return null
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month) return null
    return d.getUTCDate()
  }

  const byDay = new Map()

  // cost 序列: 按天 × 模型累加金额
  for (const entry of costSeries) {
    const model = modelName(entry)
    for (const bucket of Array.isArray(entry?.buckets) ? entry.buckets : []) {
      const day = dayOfBucket(bucket?.time)
      if (day === null) continue
      const cost = toNum(bucket?.cost) ?? 0
      const d = ensureDay(byDay, day)
      d.cost += cost
      if (!d.models[model]) d.models[model] = { model, cost: 0, tokens: 0 }
      d.models[model].cost += cost
    }
  }

  // amount 序列: 按天 × 模型累加 token 与请求数
  for (const entry of amountSeries) {
    const model = modelName(entry)
    for (const bucket of Array.isArray(entry?.buckets) ? entry.buckets : []) {
      const day = dayOfBucket(bucket?.time)
      if (day === null) continue
      const u = bucket?.usage ?? {}
      const prompt = toNum(u.PROMPT_TOKEN) ?? 0
      const cacheHit = toNum(u.PROMPT_CACHE_HIT_TOKEN) ?? 0
      const cacheMiss = toNum(u.PROMPT_CACHE_MISS_TOKEN) ?? 0
      const output = toNum(u.RESPONSE_TOKEN) ?? 0
      const requests = toNum(u.REQUEST) ?? 0
      const tokens = prompt + cacheHit + cacheMiss + output
      const d = ensureDay(byDay, day)
      d.promptTokens += prompt
      d.cacheHitTokens += cacheHit
      d.cacheMissTokens += cacheMiss
      d.outputTokens += output
      d.requests += requests
      d.tokens += tokens
      if (!d.models[model]) d.models[model] = { model, cost: 0, tokens: 0 }
      d.models[model].tokens += tokens
    }
  }

  return buildMonthPayload(byDay, year, month, currency)
}

/** 归一化平台 get_user_summary。 */
export const normalizeSummary = (data) => {
  const bizData = data?.data?.biz_data ?? data?.data ?? {}
  const wallets = []
  for (const key of ['normal_wallets', 'bonus_wallets']) {
    for (const w of Array.isArray(bizData?.[key]) ? bizData[key] : []) {
      const balance = toNum(w?.balance)
      if (balance !== null) wallets.push({ kind: key, currency: typeof w?.currency === 'string' ? w.currency : 'CNY', balance })
    }
  }
  const normal = wallets.filter((w) => w.kind === 'normal_wallets')
  const bonus = wallets.filter((w) => w.kind === 'bonus_wallets')
  const total = normal.reduce((a, w) => a + w.balance, 0)
  const currency = normal[0]?.currency ?? wallets[0]?.currency ?? 'CNY'
  const totalCosts = (Array.isArray(bizData?.total_costs) ? bizData.total_costs : [])
    .map((c) => ({ currency: typeof c?.currency === 'string' ? c.currency : 'CNY', amount: toNum(c?.amount) ?? 0 }))
  return {
    total,
    currency,
    normalWallets: normal.map(({ currency: c, balance }) => ({ currency: c, balance })),
    bonusWallets: bonus.map(({ currency: c, balance }) => ({ currency: c, balance })),
    totalCosts,
    rawBizData: bizData ?? null,
  }
}

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
    if (body.length > 1e6) {
      req.destroy()
      reject(new Error('Payload too large'))
    }
  })
  req.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {})
    } catch {
      reject(new Error('Invalid JSON'))
    }
  })
  req.on('error', reject)
})

const maskToken = (k) => {
  if (!k || typeof k !== 'string') return ''
  if (k.length <= 8) return '********'
  return k.slice(0, 4) + '****' + k.slice(-4)
}

export function apply(ctx, config) {
  let runtimeConfig = {
    platformBaseUrl: config.platformBaseUrl ?? 'https://platform.deepseek.com',
    apiBaseUrl: config.apiBaseUrl ?? 'https://api.deepseek.com',
    apiKeyRef: config.apiKeyRef ?? 'DEEPSEEK_API_KEY',
    timezoneOffsetSec: normalizeTzSec(config.timezoneOffsetSec),
    refreshIntervalMs: config.refreshIntervalMs ?? 600000,
    clientPollIntervalMs: config.clientPollIntervalMs ?? 30000,
    timeoutMs: config.timeoutMs ?? 8000,
    historyMonths: config.historyMonths ?? 6,
    taskRefreshCooldownMs: config.taskRefreshCooldownMs ?? 60000,
    peakWindows: Array.isArray(config.peakWindows) && config.peakWindows.length > 0
      ? [...config.peakWindows]
      : ['09:00-12:00', '14:00-18:00'],
    checkUpdate: config.checkUpdate !== false,
    updateCheckIntervalMs: config.updateCheckIntervalMs ?? 21600000,
  }

  // ---- userToken 持久化($DSH_HOME/storages/dsh-usage-dashboard.secret, 0600) ----
  const secretPath = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'storages', 'dsh-usage-dashboard.secret')
  let secretToken = ''

  const loadSecret = async () => {
    try {
      if (!existsSync(secretPath)) return
      const raw = await fsp.readFile(secretPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (typeof parsed?.platformToken === 'string') secretToken = parsed.platformToken
    } catch (error) {
      ctx.logger.warn(`[dsh-usage-dashboard] secret load failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  const saveSecret = async (token) => {
    try {
      if (token === '') {
        await fsp.rm(secretPath, { force: true })
        secretToken = ''
        return
      }
      await fsp.mkdir(join(secretPath, '..'), { recursive: true })
      await fsp.writeFile(secretPath, JSON.stringify({ platformToken: token, savedAt: Date.now() }), { mode: 0o600 })
      secretToken = token
    } catch (error) {
      ctx.logger.warn(`[dsh-usage-dashboard] secret save failed: ${error instanceof Error ? error.message : error}`)
      throw error
    }
  }

  const getToken = () => {
    if (process.env.DEEPSEEK_PLATFORM_TOKEN) return { token: process.env.DEEPSEEK_PLATFORM_TOKEN, source: 'env' }
    if (secretToken !== '') return { token: secretToken, source: 'secret-file' }
    return { token: '', source: 'none' }
  }

  const resolveApiKey = async () => {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(runtimeConfig.apiKeyRef)
        if (hit !== undefined) return hit.value
      } catch {
        /* 解析失败视为未配置 */
      }
    }
    return process.env[runtimeConfig.apiKeyRef] ?? ''
  }

  // ---- HTTP 工具 ----
  const fetchJson = async (url, { bearer = null, timeoutMs = null, headers: extraHeaders = null } = {}) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? runtimeConfig.timeoutMs)
    try {
      const headers = { Accept: 'application/json', ...(extraHeaders ?? {}) }
      if (bearer) headers.Authorization = `Bearer ${bearer}`
      const res = await fetch(url, { headers, signal: controller.signal })
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        err.status = res.status
        throw err
      }
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  }

  // 平台接口有 WAF: 裸请求(无浏览器 UA/Referer)会被 429 拦截, 必须带上浏览器特征头。
  const PLATFORM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Referer: 'https://platform.deepseek.com/usage',
    Origin: 'https://platform.deepseek.com',
  }

  const platformFetch = (path, timeoutMs) => {
    const { token } = getToken()
    if (token === '') return Promise.reject(Object.assign(new Error('token-missing'), { code: 'token-missing' }))
    return fetchJson(`${runtimeConfig.platformBaseUrl.replace(/\/+$/, '')}${path}`, { bearer: token, timeoutMs, headers: PLATFORM_HEADERS })
  }

  const platformCode = (data, error) => {
    if (error?.message === 'token-missing' || error?.code === 'token-missing') return 'token-missing'
    if (data?.code === 40002 || data?.code === 40003) return 'token-expired'
    if (data?.data?.biz_code === 40002 || data?.data?.biz_code === 40003) return 'token-expired'
    if (data?.code !== undefined && data?.code !== 0 && data?.code !== '0') return 'api-error'
    if (data?.data?.biz_code !== undefined && data?.data?.biz_code !== 0 && data?.data?.biz_code !== '0') return 'api-error'
    return null
  }

  // ---- 缓存 ----
  let official = { state: 'empty', payload: null, error: null, fetchedAt: 0 }
  let summary = { state: 'empty', payload: null, error: null, fetchedAt: 0 }
  const months = new Map() // "Y-M" -> { state, payload, error, fetchedAt }
  let inflightOfficial = null
  let inflightSummary = null
  const inflightMonths = new Map()

  /** 账户计费币种: 平台余额 → 官方余额 → null(未知)。 */
  const accountCurrency = () => (
    summary.payload?.currency
    ?? official.payload?.balances?.[0]?.currency
    ?? null
  )

  /** 官方余额失败后的重试间隔(实测偶发 8s 挂起被 abort, 重试一次通常即恢复)。 */
  const OFFICIAL_RETRY_DELAY_MS = 1000

  const refreshOfficial = () => {
    if (inflightOfficial !== null) return inflightOfficial
    const attempt = async () => {
      const key = await resolveApiKey()
      if (key === '') throw Object.assign(new Error('api-key-missing'), { code: 'api-key-missing' })
      return fetchJson(`${runtimeConfig.apiBaseUrl.replace(/\/+$/, '')}/user/balance`, { bearer: key })
    }
    inflightOfficial = (async () => {
      try {
        let data
        try {
          data = await attempt()
        } catch (error) {
          // 瞬时超时/网络抖动重试一次; 未配置 API Key 则重试无意义
          if (error?.code === 'api-key-missing') throw error
          await new Promise((resolve) => setTimeout(resolve, OFFICIAL_RETRY_DELAY_MS))
          data = await attempt()
        }
        official = {
          state: 'ok',
          payload: { isAvailable: data?.is_available === true, balances: normalizeBalances(data) },
          error: null,
          fetchedAt: Date.now(),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        official = { state: official.state === 'ok' ? 'ok' : 'error', payload: official.payload, error: message, fetchedAt: official.fetchedAt || Date.now() }
      }
    })().finally(() => { inflightOfficial = null })
    return inflightOfficial
  }

  const refreshSummary = () => {
    if (inflightSummary !== null) return inflightSummary
    inflightSummary = (async () => {
      try {
        const data = await platformFetch('/api/v0/users/get_user_summary')
        const code = platformCode(data, null)
        if (code !== null) throw Object.assign(new Error(code), { code })
        summary = { state: 'ok', payload: normalizeSummary(data), error: null, fetchedAt: Date.now() }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const code = error?.code ?? null
        summary = { state: summary.state === 'ok' ? 'ok' : 'error', payload: summary.payload, error: message, code, fetchedAt: summary.fetchedAt || Date.now() }
      }
    })().finally(() => { inflightSummary = null })
    return inflightSummary
  }

  /**
   * 以配置时区(而非宿主系统时区)为准的"现在": 返回的 Date 用 getUTC* 读取即为该时区的墙上时间。
   * 平台用量按 timezoneOffsetSec 分天, 宿主的"当前月"必须与之一致, 否则跨月/跨日会错位。
   */
  const zonedNow = (ms = Date.now()) => new Date(ms + runtimeConfig.timezoneOffsetSec * 1000)
  const currentMonthOf = () => {
    const d = zonedNow()
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
  }
  const currentKeyOf = () => {
    const { year, month } = currentMonthOf()
    return `${year}-${month}`
  }

  /** 本地时区下某月的 [月初 00:00, 次月初 00:00) → epoch 秒。 */
  const monthRangeSec = (year, month) => {
    const tz = runtimeConfig.timezoneOffsetSec
    const start = Math.floor(Date.UTC(year, month - 1, 1) / 1000) - tz
    const end = Math.floor(Date.UTC(year, month, 1) / 1000) - tz
    return { start, end, tz }
  }

  /**
   * 首选数据源: by_api_key 桶接口(官网用量页同源)。
   * 一次请求覆盖整月(月长 ≤ 31 天, 正好是平台允许的最大范围), bucket 自动为 86400(按天),
   * 按 GMT+8 切天, 且当天的桶实时更新 —— 这是"今日"能显示出来的关键。
   */
  const fetchMonthBuckets = async (year, month) => {
    const { start, end, tz } = monthRangeSec(year, month)
    const query = `start=${start}&end=${end}&tz=${tz}`
    const [amountData, costData] = await Promise.all([
      platformFetch(`/api/v0/usage/by_api_key/amount?${query}`).catch(() => null),
      platformFetch(`/api/v0/usage/by_api_key/cost?${query}`).catch(() => null),
    ])
    if (amountData === null && costData === null) throw Object.assign(new Error('usage-fetch-failed'), { code: 'usage-fetch-failed' })
    const code = platformCode(amountData ?? costData, null)
    if (code !== null) throw Object.assign(new Error(code), { code })
    const bizOf = (data) => data?.data?.biz_data ?? null
    if (bizOf(amountData) === null && bizOf(costData) === null) throw Object.assign(new Error('usage-fetch-failed'), { code: 'usage-fetch-failed' })
    return { ...normalizeMonthBuckets(amountData, costData, year, month, tz, accountCurrency()), source: 'by_api_key' }
  }

  /**
   * 兜底数据源: 旧 month/year 接口。
   * 其"天"按 UTC 切分且当天恒为 0(见 normalizeMonth 注释), 仅在首选接口失败时使用。
   */
  const fetchMonthLegacy = async (year, month) => {
    const [amountData, costData] = await Promise.all([
      platformFetch(`/api/v0/usage/amount?month=${month}&year=${year}`).catch(() => null),
      platformFetch(`/api/v0/usage/cost?month=${month}&year=${year}`).catch(() => null),
    ])
    if (amountData === null && costData === null) throw Object.assign(new Error('usage-fetch-failed'), { code: 'usage-fetch-failed' })
    const code = platformCode(amountData ?? costData, null)
    if (code !== null) throw Object.assign(new Error(code), { code })
    return { ...normalizeMonth(amountData, costData, year, month), source: 'legacy' }
  }

  const refreshMonth = (year, month, force = false) => {
    const key = `${year}-${month}`
    if (inflightMonths.has(key)) return inflightMonths.get(key)
    const cached = months.get(key)
    if (!force && cached !== undefined && cached.state === 'ok' && Date.now() - cached.fetchedAt < 600000) {
      return Promise.resolve(cached)
    }
    const task = (async () => {
      let payload = null
      let failure = null
      try {
        payload = await fetchMonthBuckets(year, month)
      } catch (error) {
        failure = error
      }
      if (payload === null) {
        try {
          payload = await fetchMonthLegacy(year, month)
          ctx.logger.warn(`[dsh-usage-dashboard] by_api_key 用量接口失败(${failure instanceof Error ? failure.message : failure}), 已回退旧接口`)
        } catch (error) {
          failure = failure ?? error
        }
      }
      if (payload !== null) {
        months.set(key, { state: 'ok', payload, error: null, code: null, source: payload.source ?? null, fetchedAt: Date.now() })
        return
      }
      const message = failure instanceof Error ? failure.message : String(failure)
      const code = failure?.code ?? null
      const prev = months.get(key)
      months.set(key, { state: prev?.state === 'ok' ? 'ok' : 'error', payload: prev?.payload ?? null, error: message, code, fetchedAt: prev?.fetchedAt ?? 0 })
    })().finally(() => { inflightMonths.delete(key) })
    inflightMonths.set(key, task)
    return task
  }

  // ---- 版本更新检查(仅提示, 不自动升级; 只访问 npm 官方元数据端点, 无遥测) ----
  let updateInfo = { state: 'empty', currentVersion: '', latestVersion: null, hasNewer: false, error: null, checkedAt: 0 }
  let inflightUpdate = null
  let ownVersionPromise = null
  let updateTimer = null
  const getOwnVersion = () => {
    if (ownVersionPromise === null) {
      ownVersionPromise = fsp.readFile(new URL('../package.json', import.meta.url), 'utf8')
        .then((raw) => { try { return JSON.parse(raw).version || '' } catch { return '' } })
        .catch(() => '')
    }
    return ownVersionPromise
  }
  const cmpVersion = (a, b) => {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < 3; i += 1) {
      const x = pa[i] ?? 0
      const y = pb[i] ?? 0
      if (x > y) return 1
      if (x < y) return -1
    }
    return 0
  }
  const checkForUpdate = () => {
    if (!runtimeConfig.checkUpdate) return Promise.resolve()
    if (inflightUpdate !== null) return inflightUpdate
    inflightUpdate = (async () => {
      // 本机版本与网络无关: 先取出来, 失败路径也要保留, 客户端页脚依赖它显示真实版本
      const current = await getOwnVersion()
      updateInfo = { ...updateInfo, currentVersion: current !== '' ? current : updateInfo.currentVersion }
      try {
        const data = await fetchJson('https://registry.npmjs.org/deepseek-harness-usage-dashboard/latest', { timeoutMs: Math.min(runtimeConfig.timeoutMs, 10000) })
        const latest = typeof data?.version === 'string' ? data.version : null
        const hasNewer = latest !== null && current !== '' && cmpVersion(latest, current) > 0
        updateInfo = { state: 'ok', currentVersion: current, latestVersion: latest, hasNewer, error: null, checkedAt: Date.now() }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        updateInfo = { ...updateInfo, state: updateInfo.state === 'ok' ? 'ok' : 'error', error: message, checkedAt: updateInfo.checkedAt || Date.now() }
      }
    })().finally(() => { inflightUpdate = null })
    return inflightUpdate
  }
  const resetUpdateTimer = () => {
    if (updateTimer !== null) clearTimeout(updateTimer)
    if (!runtimeConfig.checkUpdate) return
    updateTimer = setTimeout(() => { void checkForUpdate(); resetUpdateTimer() }, runtimeConfig.updateCheckIntervalMs)
  }

  const serializeStatus = () => {
    const { token, source } = getToken()
    const hasToken = token !== ''
    const emptyEntry = { state: 'empty', payload: null, error: null, code: null, fetchedAt: 0 }
    const current = currentMonthOf()
    const month = hasToken ? (months.get(currentKeyOf()) ?? emptyEntry) : emptyEntry
    return {
      ok: true,
      hasToken,
      tokenSource: source,
      config: {
        platformBaseUrl: runtimeConfig.platformBaseUrl,
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        apiKeyRef: runtimeConfig.apiKeyRef,
        timezoneOffsetSec: runtimeConfig.timezoneOffsetSec,
        refreshIntervalMs: runtimeConfig.refreshIntervalMs,
        clientPollIntervalMs: runtimeConfig.clientPollIntervalMs,
        timeoutMs: runtimeConfig.timeoutMs,
        historyMonths: runtimeConfig.historyMonths,
        taskRefreshCooldownMs: runtimeConfig.taskRefreshCooldownMs,
        peakWindows: [...runtimeConfig.peakWindows],
        tokenMasked: maskToken(token),
      },
      official: { ...official, payload: official.payload },
      summary: hasToken ? { ...summary, payload: summary.payload } : emptyEntry,
      month: {
        year: current.year,
        month: current.month,
        state: month.state,
        payload: month.payload,
        error: month.error ?? null,
        code: month.code ?? null,
        source: month.source ?? null,
        fetchedAt: month.fetchedAt,
      },
      update: { ...updateInfo },
    }
  }

  const serializeMonth = (year, month) => {
    const key = `${year}-${month}`
    const entry = months.get(key) ?? { state: 'empty', payload: null, error: null, fetchedAt: 0 }
    return {
      year,
      month,
      state: entry.state,
      payload: entry.payload,
      error: entry.error ?? null,
      code: entry.code ?? null,
      source: entry.source ?? null,
      fetchedAt: entry.fetchedAt,
    }
  }

  // ---- 刷新循环 ----
  let loopTimer = null
  let taskTimer = null
  let lastTickAt = 0
  const tick = () => {
    lastTickAt = Date.now()
    void refreshOfficial()
    if (getToken().token !== '') {
      void refreshSummary()
      const { year, month } = currentMonthOf()
      void refreshMonth(year, month)
    }
  }
  const resetLoop = () => {
    if (loopTimer !== null) clearTimeout(loopTimer)
    const run = () => {
      tick()
      loopTimer = setTimeout(run, runtimeConfig.refreshIntervalMs)
    }
    loopTimer = setTimeout(run, 1500)
  }

  /**
   * 任务完成后的即时刷新: 带冷却防连击。
   * 多个任务几乎同时结束时, 只会在冷却窗口后合并为一次向 DeepSeek 的拉取。
   */
  const scheduleTaskTick = () => {
    if (taskTimer !== null) return
    const cooldown = Math.max(5000, runtimeConfig.taskRefreshCooldownMs)
    const delay = Math.max(0, cooldown - (Date.now() - lastTickAt))
    taskTimer = setTimeout(() => {
      taskTimer = null
      tick()
    }, delay)
  }

  ctx.effect(() => {
    void loadSecret().then(() => {
      resetLoop()
      // 无论是否开启更新检查, 都先把本机版本号准备好(客户端页脚显示用)
      void getOwnVersion().then((v) => { if (v !== '') updateInfo = { ...updateInfo, currentVersion: v } })
      void checkForUpdate()
      resetUpdateTimer()
    })
    return () => {
      if (loopTimer !== null) clearTimeout(loopTimer)
      if (updateTimer !== null) clearTimeout(updateTimer)
    }
  }, 'dsh-usage-dashboard: refresh loop')

  // 会话事件火线: 每一轮任务结束(turn/end)就触发一次即时刷新(带冷却)。
  ctx.effect(() => {
    ctx.on('session/event', (_session, event) => {
      if (event?.type === 'turn/end') scheduleTaskTick()
    })
    return () => {
      if (taskTimer !== null) clearTimeout(taskTimer)
      taskTimer = null
    }
  }, 'dsh-usage-dashboard: task-complete refresh')

  // ---- 路由 ----
  ctx.inject(['webServer'], (webCtx) => {
    const sendJson = (res, statusCode, data) => {
      const body = JSON.stringify(data)
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body),
      })
      res.end(body)
    }

    // 1. 状态缓存路由
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/usage-dashboard/status',
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
          res.writeHead(405, { Allow: 'GET, HEAD, POST' })
          res.end()
          return
        }
        const parsedUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (parsedUrl.searchParams.get('force') === '1' || req.method === 'POST') tick()
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end()
          return
        }
        sendJson(res, 200, serializeStatus())
      },
    }), 'dsh-usage-dashboard: status route')

    // 2. 单月明细路由
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/usage-dashboard/month',
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.writeHead(405, { Allow: 'GET, POST' })
          res.end()
          return
        }
        const parsedUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
        const fallback = currentMonthOf()
        const year = Number(parsedUrl.searchParams.get('year')) || fallback.year
        const month = Number(parsedUrl.searchParams.get('month')) || fallback.month
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2020 || year > 2100) {
          sendJson(res, 400, { ok: false, error: 'invalid-month' })
          return
        }
        const force = parsedUrl.searchParams.get('force') === '1' || req.method === 'POST'
        await refreshMonth(year, month, force)
        sendJson(res, 200, serializeMonth(year, month))
      },
    }), 'dsh-usage-dashboard: month route')

    // 3. 配置读写路由(唯一可写入 userToken 的入口)
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/usage-dashboard/config',
      async handler(req, res) {
        if (req.method === 'GET') {
          const { token, source } = getToken()
          sendJson(res, 200, {
            ok: true,
            hasToken: token !== '',
            tokenSource: source,
            tokenMasked: maskToken(token),
            config: serializeStatus().config,
          })
          return
        }
        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            let tokenChanged = false
            if (typeof body.platformToken === 'string') {
              const trimmed = body.platformToken.trim()
              if (trimmed === '' && getToken().token !== '') {
                // 清空 token
                await saveSecret('')
                tokenChanged = true
              } else if (trimmed !== '' && trimmed !== getToken().token) {
                // 校验新 token: 用它调一次平台余额接口
                let valid = false
                let validationError = null
                try {
                  const data = await fetchJson(`${runtimeConfig.platformBaseUrl.replace(/\/+$/, '')}/api/v0/users/get_user_summary`, { bearer: trimmed })
                  const code = platformCode(data, null)
                  if (code === null) valid = true
                  else validationError = code
                } catch (error) {
                  validationError = error instanceof Error ? error.message : String(error)
                }
                if (!valid) {
                  sendJson(res, 200, { ok: false, tokenInvalid: true, error: validationError ?? 'unknown' })
                  return
                }
                await saveSecret(trimmed)
                tokenChanged = true
              }
            }
            let intervalChanged = false
            if (typeof body.refreshIntervalMs === 'number' && body.refreshIntervalMs >= 30000) {
              if (runtimeConfig.refreshIntervalMs !== body.refreshIntervalMs) intervalChanged = true
              runtimeConfig.refreshIntervalMs = body.refreshIntervalMs
            }
            if (typeof body.clientPollIntervalMs === 'number' && body.clientPollIntervalMs >= 5000) runtimeConfig.clientPollIntervalMs = body.clientPollIntervalMs
            if (typeof body.timeoutMs === 'number' && body.timeoutMs >= 1000) runtimeConfig.timeoutMs = body.timeoutMs
            if (typeof body.historyMonths === 'number' && body.historyMonths >= 1 && body.historyMonths <= 24) runtimeConfig.historyMonths = body.historyMonths
            if (typeof body.taskRefreshCooldownMs === 'number' && body.taskRefreshCooldownMs >= 5000) runtimeConfig.taskRefreshCooldownMs = body.taskRefreshCooldownMs
            if (typeof body.checkUpdate === 'boolean') runtimeConfig.checkUpdate = body.checkUpdate
            if (typeof body.updateCheckIntervalMs === 'number' && body.updateCheckIntervalMs >= 60000) runtimeConfig.updateCheckIntervalMs = body.updateCheckIntervalMs

            if (tokenChanged || intervalChanged) resetLoop()
            void checkForUpdate()
            resetUpdateTimer()
            tick()
            sendJson(res, 200, { ok: true, tokenChanged, config: serializeStatus().config })
          } catch (err) {
            sendJson(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) })
          }
          return
        }
        res.writeHead(405, { Allow: 'GET, POST' })
        res.end()
      },
    }), 'dsh-usage-dashboard: config route')
  })
}
