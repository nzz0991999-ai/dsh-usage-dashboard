/**
 * dsh-usage-dashboard — 浏览器端(lazy-CJS client bundle)。
 *
 * 注册进全局悬浮层插槽 `shell.overlay`: 右下角一枚余额角标, 点击展开毛玻璃仪表盘:
 *   - 账户余额(官方 /user/balance + 平台 get_user_summary)
 *   - 今日 / 本月实际花费与 Token、请求数、缓存命中率
 *   - 当月每日花费/Token 柱状图(SVG 手绘, 可回看历史月份)
 *   - 设置面板: 粘贴平台 userToken(仅存宿主端 0600 密钥文件, 浏览器只拿脱敏值)
 */
window.__ModuleLoader__.load({
	id: "deepseek-harness-usage-dashboard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region styles
		const CSS_ID = "dsh-usage-dashboard/styles.css";
		if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-usage-dashboard";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = [
				".dshud_root{position:fixed;right:16px;bottom:16px;z-index:5000;pointer-events:auto;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary)}",
				".dshud_pill{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.2));box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.12));cursor:pointer;user-select:none;transition:transform .15s ease,box-shadow .15s ease;backdrop-filter:blur(12px)}",
				".dshud_pill:hover{transform:translateY(-1px);box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,0.18))}",
				".dshud_dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-error-primary,#ef4444)}",
				".dshud_dot_success{background:var(--dsw-alias-state-success-primary,#10b981)}",
				".dshud_dot_warning{background:var(--dsw-alias-state-warn-primary,#f59e0b)}",
				".dshud_dot_loading{animation:dshud-pulse .8s ease-in-out infinite}",
				"@keyframes dshud-pulse{0%,100%{opacity:.5}50%{opacity:1}}",
				".dshud_amount{font-weight:600;font-variant-numeric:tabular-nums}",
				".dshud_panel{width:420px;max-width:calc(100vw - 32px);max-height:min(660px,calc(100vh - 92px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.2));border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 16px 48px rgba(0,0,0,0.2));backdrop-filter:blur(16px);overflow:hidden;animation:dshud-fadein .16s ease-out}",
				"@keyframes dshud-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
				".dshud_header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(128,128,128,0.12));background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.03))}",
				".dshud_title{font-weight:600;font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
				".dshud_iconbtn{background:transparent;border:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:5px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;transition:background-color .15s ease,color .15s ease}",
				".dshud_iconbtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,0.1))}",
				".dshud_iconbtn:disabled{opacity:.4;cursor:default;background:transparent}",
				".dshud_body{padding:12px 14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}",
				".dshud_banner{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);font-size:12px}",
				".dshud_banner_error{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.35)}",
				".dshud_link{color:var(--dsw-alias-brand-primary,#3b82f6);background:none;border:none;padding:0;font-size:12px;cursor:pointer;text-align:left;text-decoration:underline}",
				".dshud_link:hover{opacity:.85}",
				".dshud_balance_row{display:flex;align-items:baseline;justify-content:space-between;gap:8px}",
				".dshud_balance_main{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}",
				".dshud_balance_sub{font-size:11px;color:var(--dsw-alias-label-tertiary);display:flex;gap:8px}",
				".dshud_chips{display:flex;gap:6px;flex-wrap:wrap}",
				".dshud_chip{flex:1;min-width:72px;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.05));border:1px solid var(--dsw-alias-border-l3,rgba(128,128,128,0.1))}",
				".dshud_chip_label{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_chip_value{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}",
				".dshud_tabs{display:flex;gap:4px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.04));border-radius:8px;padding:3px}",
				".dshud_tab{flex:1;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background-color .15s ease,color .15s ease}",
				".dshud_tab_active{background:var(--dsw-alias-bg-layer-1,#ffffff);color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 4px rgba(0,0,0,0.1))}",
				".dshud_monthnav{display:flex;align-items:center;justify-content:space-between;gap:8px}",
				".dshud_month_label{font-weight:600;font-size:12.5px;font-variant-numeric:tabular-nums}",
				".dshud_chart{width:100%;display:block}",
				".dshud_chart_empty{color:var(--dsw-alias-label-tertiary);padding:10px 0;text-align:center}",
				".dshud_chart_bar{fill:var(--dsw-alias-brand-primary,#3b82f6);opacity:.82;transition:opacity .12s ease}",
				".dshud_chart_bar:hover{opacity:1}",
				".dshud_chart_bar_today{fill:var(--dsw-alias-state-warn-primary,#f59e0b)}",
				".dshud_chart_axis{stroke:var(--dsw-alias-border-l2,rgba(128,128,128,0.25));stroke-width:1}",
				".dshud_chart_text{fill:var(--dsw-alias-label-tertiary);font-size:9px}",
				".dshud_models{display:flex;flex-direction:column;gap:4px}",
				".dshud_model_row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px}",
				".dshud_model_name{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}",
				".dshud_model_val{font-variant-numeric:tabular-nums;flex-shrink:0}",
				".dshud_footer{display:flex;flex-direction:column;gap:2px;padding:8px 14px;border-top:1px solid var(--dsw-alias-border-l3,rgba(128,128,128,0.12));font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_err{color:var(--dsw-alias-state-error-primary,#ef4444)}",
				".dshud_modal_backdrop{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,0.5));backdrop-filter:blur(6px);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}",
				".dshud_modal{background:var(--dsw-alias-bg-base,var(--dsw-alias-bg-layer-1,#ffffff));border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,0.2));border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 24px 64px rgba(0,0,0,0.25));width:440px;max-width:96vw;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:1.5}",
				".dshud_modal_header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.12));font-weight:600}",
				".dshud_modal_body{padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}",
				".dshud_field{display:flex;flex-direction:column;gap:4px}",
				".dshud_field_label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
				".dshud_field_hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.45}",
				".dshud_input{background:var(--dsw-specific-input-major,var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.08)));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.2));border-radius:6px;padding:8px 10px;color:var(--dsw-alias-label-primary);font-size:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;width:100%;box-sizing:border-box;outline:none}",
				".dshud_input:focus{border-color:var(--dsw-alias-brand-primary,#3b82f6);box-shadow:0 0 0 2px rgba(59,130,246,0.2)}",
				".dshud_btnrow{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}",
				".dshud_btn{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:5px;transition:all .15s ease}",
				".dshud_btn_primary{background:var(--dsw-alias-brand-primary,#3b82f6);color:#ffffff}",
				".dshud_btn_primary:hover{filter:brightness(1.1)}",
				".dshud_btn_primary:disabled{opacity:.5;cursor:default;filter:none}",
				".dshud_btn_ghost{background:transparent;border-color:var(--dsw-alias-border-l2,rgba(128,128,128,0.25));color:var(--dsw-alias-label-secondary)}",
				".dshud_btn_ghost:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1,rgba(128,128,128,0.45))}",
				".dshud_btn_danger{background:transparent;border-color:rgba(239,68,68,0.4);color:var(--dsw-alias-state-error-primary,#ef4444)}",
				".dshud_msg{font-size:11.5px;padding:8px 10px;border-radius:6px}",
				".dshud_msg_ok{background:rgba(16,185,129,0.1);color:var(--dsw-alias-state-success-primary,#10b981)}",
				".dshud_msg_err{background:rgba(239,68,68,0.1);color:var(--dsw-alias-state-error-primary,#ef4444)}"
			].join("\n");
			document.head.appendChild(tag);
		}
		//#endregion

		//#region formatting
		const CURRENCY_SYMBOLS = { CNY: "¥", USD: "$", EUR: "€" };
		const currencySymbol = (currency) => CURRENCY_SYMBOLS[currency] ?? currency + " ";
		function formatMoney(amount, currency) {
			const n = Number(amount);
			if (!Number.isFinite(n)) return currencySymbol(currency) + "—";
			if (n === 0) return currencySymbol(currency) + "0.00";
			const fixed = n >= 1 ? 2 : n >= 0.01 ? 3 : 4;
			return currencySymbol(currency) + n.toFixed(fixed);
		}
		function formatTokens(n) {
			if (!Number.isFinite(n)) return "—";
			const scaled = (v) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
			if (n < 1e3) return String(n);
			if (n < 1e6) return scaled(n / 1e3) + "K";
			return scaled(n / 1e6) + "M";
		}
		function formatClock(ms) {
			if (!ms) return "—";
			return new Date(ms).toLocaleTimeString();
		}
		function formatPercent(rate) {
			if (rate === null || rate === undefined) return "—";
			return (rate * 100).toFixed(1) + "%";
		}
		//#endregion

		//#region store(单例: 页面级共享一个轮询器)
		const DEFAULT_POLL_MS = 30000;
		let snapshot = {
			status: "loading",
			payload: null,
			at: 0,
			open: false,
			tab: "cost",
			viewYear: null,
			viewMonth: null,
			monthState: "idle",
			monthPayload: null,
			settingsOpen: false,
			saving: false,
			saveMessage: null,
		};
		const listeners = new Set();
		let timer = null;
		let pollMs = DEFAULT_POLL_MS;
		let inflightStatus = null;
		let inflightMonth = null;
		let started = false;

		const notify = () => { for (const fn of [...listeners]) fn(); };
		const set = (patch) => { snapshot = { ...snapshot, ...patch }; notify(); };

		const refreshStatus = (force = false) => {
			if (inflightStatus !== null) return inflightStatus;
			inflightStatus = (async () => {
				try {
					const url = force ? "/usage-dashboard/status?force=1" : "/usage-dashboard/status";
					const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
					if (!res.ok) throw new Error("HTTP " + res.status);
					const data = await res.json();
					if (typeof data.config?.clientPollIntervalMs === "number" && data.config.clientPollIntervalMs >= 5000) {
						pollMs = Math.min(data.config.clientPollIntervalMs, 3600000);
					}
					set({ status: "ok", payload: data, at: Date.now() });
				} catch (error) {
					set({ status: snapshot.status === "ok" ? "ok" : "error", message: error instanceof Error ? error.message : String(error), at: Date.now() });
				}
				inflightStatus = null;
			})();
			return inflightStatus;
		};

		const schedule = () => {
			if (timer !== null) return;
			timer = setTimeout(() => {
				timer = null;
				if (document.hidden) return;
				refreshStatus().then(schedule, schedule);
			}, pollMs);
		};

		const nowMonth = () => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; };

		const effectiveMonth = () => {
			const nm = nowMonth();
			const year = snapshot.viewYear ?? nm.year;
			const month = snapshot.viewMonth ?? nm.month;
			const key = year * 12 + month;
			const nmKey = nm.year * 12 + nm.month;
			if (key > nmKey) return nm;
			if (year < 2020) return { year: 2020, month: 1 };
			return { year, month };
		};

		const refreshMonth = (year, month, force = false) => {
			if (inflightMonth !== null) return inflightMonth;
			set({ monthState: "loading", monthPayload: null, monthError: null, monthCode: null });
			inflightMonth = (async () => {
				try {
					const url = "/usage-dashboard/month?month=" + month + "&year=" + year + (force ? "&force=1" : "");
					const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
					if (!res.ok) throw new Error("HTTP " + res.status);
					const data = await res.json();
					set({ monthState: data.state === "ok" ? "ok" : "error", monthPayload: data.payload ?? null, monthError: data.error ?? null, monthCode: data.code ?? null });
				} catch (error) {
					set({ monthState: "error", monthError: error instanceof Error ? error.message : String(error) });
				}
				inflightMonth = null;
			})();
			return inflightMonth;
		};

		const store = {
			subscribe(fn) {
				listeners.add(fn);
				if (!started) {
					started = true;
					refreshStatus().then(schedule, schedule);
				}
				return () => {
					listeners.delete(fn);
					if (listeners.size === 0) {
						started = false;
						if (timer !== null) { clearTimeout(timer); timer = null; }
					}
				};
			},
			getSnapshot() { return snapshot; },
			toggle() {
				const open = !snapshot.open;
				set({ open });
				if (open) {
					const { year, month } = effectiveMonth();
					if (snapshot.monthPayload === null || snapshot.viewYear !== year || snapshot.viewMonth !== month) refreshMonth(year, month);
					refreshStatus();
				}
			},
			setTab(tab) { set({ tab }); },
			prevMonth() {
				const { year, month } = effectiveMonth();
				let m = month - 1, y = year;
				if (m < 1) { m = 12; y -= 1; }
				set({ viewYear: y, viewMonth: m });
				refreshMonth(y, m);
			},
			nextMonth() {
				const { year, month } = effectiveMonth();
				const nm = nowMonth();
				if (year * 12 + month >= nm.year * 12 + nm.month) return;
				let m = month + 1, y = year;
				if (m > 12) { m = 1; y += 1; }
				set({ viewYear: y, viewMonth: m });
				refreshMonth(y, m);
			},
			openSettings() { set({ settingsOpen: true, saveMessage: null }); },
			closeSettings() { set({ settingsOpen: false }); },
			async saveToken(token) {
				set({ saving: true, saveMessage: null });
				try {
					const res = await fetch("/usage-dashboard/config", {
						method: "POST",
						cache: "no-store",
						headers: { "content-type": "application/json", accept: "application/json" },
						body: JSON.stringify({ platformToken: token }),
					});
					const data = await res.json().catch(() => ({}));
					if (data.ok === true) {
						set({ saving: false, saveMessage: { ok: true, text: "userToken 已保存并验证通过" } });
						refreshStatus(true);
					} else {
						set({ saving: false, saveMessage: { ok: false, text: "验证失败: " + (data.error ?? "token 无效或已过期") } });
					}
				} catch (error) {
					set({ saving: false, saveMessage: { ok: false, text: error instanceof Error ? error.message : String(error) } });
				}
			},
			async clearToken() {
				set({ saving: true, saveMessage: null });
				try {
					await fetch("/usage-dashboard/config", {
						method: "POST",
						cache: "no-store",
						headers: { "content-type": "application/json", accept: "application/json" },
						body: JSON.stringify({ platformToken: "" }),
					});
					set({ saving: false, saveMessage: { ok: true, text: "已清除 userToken" } });
					refreshStatus(true);
				} catch (error) {
					set({ saving: false, saveMessage: { ok: false, text: error instanceof Error ? error.message : String(error) } });
				}
			},
		};
		//#endregion

		//#region locale
		const NS = "usageDashboard";
		const zh = {
			"pill.balance": "余额 {amount}",
			"pill.loading": "用量数据加载中…",
			"pill.error": "用量数据不可用",
			"panel.title": "DeepSeek 用量仪表盘",
			"panel.refresh": "立即刷新",
			"panel.settings": "设置",
			"panel.close": "关闭",
			"panel.noToken.title": "未配置平台登录态 userToken",
			"panel.noToken.desc": "真实扣费数据来自 platform.deepseek.com 的私有用量接口, 需要你登录平台后从浏览器 localStorage 复制一次 userToken。",
			"panel.noToken.action": "打开设置粘贴 token",
			"panel.tokenExpired": "userToken 已过期, 请重新登录 platform.deepseek.com 后在设置里更新。",
			"balance.total": "账户余额",
			"balance.topup": "充值 {amount}",
			"balance.granted": "赠送 {amount}",
			"chip.todayCost": "今日花费",
			"chip.todayTokens": "今日 Token",
			"chip.monthCost": "本月花费",
			"chip.monthTokens": "本月 Token",
			"chip.requests": "请求数",
			"chip.cacheHit": "缓存命中率",
			"tab.cost": "花费",
			"tab.tokens": "Token",
			"chart.empty": "本月暂无数据",
			"chart.axisToken": "峰值 {v} tokens/日",
			"models.title": "模型分布",
			"footer.updated": "数据更新于 {time}",
			"footer.source": "来源: 平台官方用量接口 · 官方余额接口",
			"footer.sourceNoToken": "来源: 官方余额接口(未配置平台 token)",
			"footer.openPlatform": "打开 platform.deepseek.com/usage ›",
			"footer.errSummary": "平台用量接口异常: {error}",
			"footer.errOfficial": "官方余额接口异常: {error}",
			"settings.title": "用量仪表盘设置",
			"settings.close": "关闭",
			"settings.token.label": "平台登录态 userToken",
			"settings.token.hint": "登录 platform.deepseek.com 后: 浏览器 DevTools → Application → Local Storage → 选中 platform.deepseek.com → 复制 userToken 字段的值粘贴到下方。token 只保存在本机宿主端(0600 权限文件), 不会进入任何对话或上传。",
			"settings.token.placeholder": "粘贴 userToken(当前: {masked})",
			"settings.token.save": "验证并保存",
			"settings.token.clear": "清除已保存的 token",
			"settings.token.saving": "验证中…",
			"settings.interval.label": "服务器拉取间隔(分钟)",
			"settings.interval.hint": "宿主端向 DeepSeek 拉取用量数据的频率, 建议 5~30 分钟。",
			"settings.interval.save": "保存间隔设置",
			"settings.interval.saved": "✓ 已保存",
			"settings.status.hasToken": "已配置 token(来源: {source})",
			"settings.status.noToken": "未配置 token",
		};
		const en = {
			"pill.balance": "Balance {amount}",
			"pill.loading": "Loading usage…",
			"pill.error": "Usage unavailable",
			"panel.title": "DeepSeek Usage Dashboard",
			"panel.refresh": "Refresh now",
			"panel.settings": "Settings",
			"panel.close": "Close",
			"panel.noToken.title": "Platform userToken not configured",
			"panel.noToken.desc": "Billed usage comes from platform.deepseek.com private usage APIs; paste your userToken once (browser localStorage) to sync real spend data.",
			"panel.noToken.action": "Open settings to paste token",
			"panel.tokenExpired": "userToken expired — sign in to platform.deepseek.com again and update it in settings.",
			"balance.total": "Account balance",
			"balance.topup": "Top-up {amount}",
			"balance.granted": "Granted {amount}",
			"chip.todayCost": "Today cost",
			"chip.todayTokens": "Today tokens",
			"chip.monthCost": "Month cost",
			"chip.monthTokens": "Month tokens",
			"chip.requests": "Requests",
			"chip.cacheHit": "Cache hit rate",
			"tab.cost": "Cost",
			"tab.tokens": "Tokens",
			"chart.empty": "No data this month",
			"chart.axisToken": "Peak {v} tokens/day",
			"models.title": "Model breakdown",
			"footer.updated": "Updated {time}",
			"footer.source": "Source: platform usage APIs · official balance API",
			"footer.sourceNoToken": "Source: official balance API (platform token not set)",
			"footer.openPlatform": "Open platform.deepseek.com/usage ›",
			"footer.errSummary": "Platform usage API error: {error}",
			"footer.errOfficial": "Official balance API error: {error}",
			"settings.title": "Usage Dashboard Settings",
			"settings.close": "Close",
			"settings.token.label": "Platform userToken",
			"settings.token.hint": "Sign in to platform.deepseek.com, then DevTools → Application → Local Storage → copy the userToken value. It stays in a local 0600 host-side file only.",
			"settings.token.placeholder": "Paste userToken (current: {masked})",
			"settings.token.save": "Verify & save",
			"settings.token.clear": "Clear saved token",
			"settings.token.saving": "Verifying…",
			"settings.interval.label": "Server refresh interval (minutes)",
			"settings.interval.hint": "How often the host fetches usage from DeepSeek (5–30 min recommended).",
			"settings.interval.save": "Save interval",
			"settings.interval.saved": "✓ Saved",
			"settings.status.hasToken": "Token configured (source: {source})",
			"settings.status.noToken": "No token configured",
		};
		//#endregion

		//#region components
		const IRefresh = _ui_primitives.IconRefreshOutline14;
		const ISettings = _ui_primitives.IconSettingsOutline16;
		const IClose = _ui_primitives.IconCloseOutline16;
		const IPrev = _ui_primitives.IconChevronLeftOutline14;
		const INext = _ui_primitives.IconChevronRightOutline14;

		const todayDay = () => {
			const d = new Date();
			return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
		};

		function pickBalance(payload) {
			// 优先平台余额, 回退官方余额
			if (payload.summary?.state === "ok" && payload.summary.payload && payload.summary.payload.total > 0) {
				return { amount: payload.summary.payload.total, currency: payload.summary.payload.currency ?? "CNY" };
			}
			const info = payload.official;
			if (info?.state === "ok" && Array.isArray(info.payload?.balances) && info.payload.balances.length > 0) {
				const primary = info.payload.balances[0];
				return { amount: primary.total, currency: primary.currency };
			}
			return null;
		}

		function monthOfPayload(payload) {
			if (payload?.month?.state === "ok" && payload.month.payload) return payload.month.payload;
			return null;
		}

		function Chart({ month, tab, t }) {
			if (month === null) {
				return react.createElement("div", { className: "dshud_chart_empty" }, t("chart.empty"));
			}
			const days = month.days ?? [];
			if (days.length === 0) return react.createElement("div", null, t("chart.empty"));
			const values = days.map((d) => (tab === "cost" ? d.cost ?? 0 : d.tokens ?? 0));
			const max = Math.max(...values, 1e-9);
			const W = 368, H = 132, padB = 16, padT = 12;
			const daysInMonth = new Date(month.year, month.month, 0).getDate();
			const slot = W / daysInMonth;
			const barW = Math.max(1.5, slot * 0.62);
			const td = todayDay();
			const isCurrent = td.year === month.year && td.month === month.month;
			const bars = [];
			for (let d = 1; d <= daysInMonth; d++) {
				const entry = days.find((x) => x.day === d);
				const v = entry ? (tab === "cost" ? entry.cost ?? 0 : entry.tokens ?? 0) : 0;
				const h = Math.max(v > 0 ? (v / max) * (H - padT - padB) + 1 : 0.8, 0.8);
				const x = (d - 1) * slot + (slot - barW) / 2;
				const y = H - padB - h;
				const title = (entry?.date ?? (month.year + "-" + month.month + "-" + d)) + " · " +
					(tab === "cost" ? formatMoney(v, "CNY") : formatTokens(v));
				bars.push(react.createElement("rect", {
					key: d,
					x, y, width: barW, height: h, rx: 1,
					className: "dshud_chart_bar" + (isCurrent && d === td.day ? " dshud_chart_bar_today" : ""),
					children: react.createElement("title", null, title),
				}));
			}
			const labels = [];
			for (let d = 1; d <= daysInMonth; d += 5) {
				labels.push(react.createElement("text", { key: "l" + d, x: (d - 1) * slot + slot / 2, y: H - 5, className: "dshud_chart_text", textAnchor: "middle" }, String(d)));
			}
			const peakLabel = tab === "cost" ? formatMoney(max, "CNY") : formatTokens(Math.round(max));
			return react.createElement("svg", {
				className: "dshud_chart",
				viewBox: "0 0 " + W + " " + H,
				role: "img",
				"aria-label": tab === "cost" ? "每日花费柱状图" : "每日 Token 柱状图",
			}, [
				react.createElement("line", { key: "ax", x1: 0, y1: H - padB + 0.5, x2: W, y2: H - padB + 0.5, className: "dshud_chart_axis" }),
				react.createElement("text", { key: "pk", x: W, y: 10, className: "dshud_chart_text", textAnchor: "end" }, tab === "cost" ? peakLabel : t("chart.axisToken", { v: formatTokens(Math.round(max)) })),
				...bars,
				...labels,
			]);
		}

		function Panel({ t }) {
			const snap = react.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
			const payload = snap.payload;
			const balance = payload ? pickBalance(payload) : null;
			const hasToken = payload?.hasToken === true;
			const tokenExpired = payload?.summary?.code === "token-expired" || payload?.month?.code === "token-expired";
			const { year, month } = effectiveMonth();
			const nm = nowMonth();
			const isCurrentMonth = year === nm.year && month === nm.month;
			const td = todayDay();

			let currentMonth = monthOfPayload(payload);
			if (isCurrentMonth && snap.monthState !== "loading") {
				if (snap.monthState === "ok" && snap.monthPayload) currentMonth = snap.monthPayload;
			}
			const viewedMonth = isCurrentMonth ? currentMonth : snap.monthPayload;

			const header = react.createElement("div", { className: "dshud_header", key: "head" }, [
				react.createElement("span", { className: "dshud_dot" + (balance ? " dshud_dot_success" : "") + (snap.status === "loading" ? " dshud_dot_loading" : ""), key: "dot" }),
				react.createElement("span", { className: "dshud_title", key: "title" }, t("panel.title")),
				react.createElement("button", { className: "dshud_iconbtn", key: "refresh", title: t("panel.refresh"), "aria-label": t("panel.refresh"), onClick: () => { refreshStatus(true); refreshMonth(year, month, true); }, children: react.createElement(IRefresh, null) }),
				react.createElement("button", { className: "dshud_iconbtn", key: "settings", title: t("panel.settings"), "aria-label": t("panel.settings"), onClick: store.openSettings, children: react.createElement(ISettings, null) }),
				react.createElement("button", { className: "dshud_iconbtn", key: "close", title: t("panel.close"), "aria-label": t("panel.close"), onClick: store.toggle, children: react.createElement(IClose, null) }),
			]);

			const bodyChildren = [];

			// 余额区
			if (balance !== null) {
				const sub = payload.official?.state === "ok" && Array.isArray(payload.official.payload?.balances) && payload.official.payload.balances.length > 0
					? payload.official.payload.balances[0] : null;
				bodyChildren.push(react.createElement("div", { className: "dshud_balance_row", key: "bal" }, [
					react.createElement("div", { key: "main" }, [
						react.createElement("div", { className: "dshud_balance_main" }, formatMoney(balance.amount, balance.currency)),
						react.createElement("div", { className: "dshud_balance_sub" }, t("balance.total")),
					]),
					sub !== null ? react.createElement("div", { className: "dshud_balance_sub", key: "sub" }, [
						react.createElement("span", { key: "a" }, t("balance.topup", { amount: formatMoney(sub.toppedUp, sub.currency) })),
						react.createElement("span", { key: "b" }, t("balance.granted", { amount: formatMoney(sub.granted, sub.currency) })),
					]) : null,
				]));
			} else if (snap.status === "error") {
				bodyChildren.push(react.createElement("div", { className: "dshud_banner dshud_banner_error", key: "balerr" }, t("pill.error") + ": " + (snap.message ?? "")));
			}

			// token 状态横幅
			if (!hasToken) {
				bodyChildren.push(react.createElement("div", { className: "dshud_banner", key: "notoken" }, [
					react.createElement("strong", { key: "t" }, t("panel.noToken.title")),
					react.createElement("span", { key: "d" }, t("panel.noToken.desc")),
					react.createElement("button", { className: "dshud_link", key: "a", onClick: store.openSettings }, t("panel.noToken.action")),
				]));
			} else if (tokenExpired) {
				bodyChildren.push(react.createElement("div", { className: "dshud_banner dshud_banner_error", key: "expired" }, t("panel.tokenExpired")));
			}

			// 今日/本月 指标
			const view = viewedMonth;
			const todayEntry = isCurrentMonth && view ? (view.days ?? []).find((d) => d.day === td.day) : null;
			if (view !== null && view !== undefined && (view.days?.length ?? 0) > 0) {
				const chips = [];
				if (todayEntry) {
					chips.push(react.createElement("div", { className: "dshud_chip", key: "tc" }, [
						react.createElement("span", { className: "dshud_chip_label" }, t("chip.todayCost")),
						react.createElement("span", { className: "dshud_chip_value" }, formatMoney(todayEntry.cost ?? 0, "CNY")),
					]));
					chips.push(react.createElement("div", { className: "dshud_chip", key: "tt" }, [
						react.createElement("span", { className: "dshud_chip_label" }, t("chip.todayTokens")),
						react.createElement("span", { className: "dshud_chip_value" }, formatTokens(todayEntry.tokens ?? 0)),
					]));
				}
				chips.push(react.createElement("div", { className: "dshud_chip", key: "mc" }, [
					react.createElement("span", { className: "dshud_chip_label" }, isCurrentMonth ? t("chip.monthCost") : (year + "年" + month + "月花费")),
					react.createElement("span", { className: "dshud_chip_value" }, formatMoney(view.totals?.cost ?? 0, "CNY")),
				]));
				chips.push(react.createElement("div", { className: "dshud_chip", key: "mt" }, [
					react.createElement("span", { className: "dshud_chip_label" }, t("chip.monthTokens")),
					react.createElement("span", { className: "dshud_chip_value" }, formatTokens(view.totals?.tokens ?? 0)),
				]));
				if ((view.totals?.requests ?? 0) > 0) {
					chips.push(react.createElement("div", { className: "dshud_chip", key: "rq" }, [
						react.createElement("span", { className: "dshud_chip_label" }, t("chip.requests")),
						react.createElement("span", { className: "dshud_chip_value" }, String(view.totals.requests)),
					]));
				}
				if (view.cacheHitRate !== null && view.cacheHitRate !== undefined) {
					chips.push(react.createElement("div", { className: "dshud_chip", key: "ch" }, [
						react.createElement("span", { className: "dshud_chip_label" }, t("chip.cacheHit")),
						react.createElement("span", { className: "dshud_chip_value" }, formatPercent(view.cacheHitRate)),
					]));
				}
				bodyChildren.push(react.createElement("div", { className: "dshud_chips", key: "chips" }, chips));
			}

			// 图表
			bodyChildren.push(react.createElement("div", { className: "dshud_tabs", key: "tabs" }, [
				react.createElement("button", { className: "dshud_tab" + (snap.tab === "cost" ? " dshud_tab_active" : ""), onClick: () => store.setTab("cost"), key: "cost" }, t("tab.cost")),
				react.createElement("button", { className: "dshud_tab" + (snap.tab === "tokens" ? " dshud_tab_active" : ""), onClick: () => store.setTab("tokens"), key: "tok" }, t("tab.tokens")),
			]));
			bodyChildren.push(react.createElement("div", { className: "dshud_monthnav", key: "nav" }, [
				react.createElement("button", { className: "dshud_iconbtn", onClick: store.prevMonth, title: "‹", "aria-label": "上一月", children: react.createElement(IPrev, null), key: "prev" }),
				react.createElement("span", { className: "dshud_month_label", key: "label" }, year + " 年 " + month + " 月" + (isCurrentMonth ? " · 本月" : "")),
				react.createElement("button", {
					className: "dshud_iconbtn",
					onClick: store.nextMonth,
					disabled: isCurrentMonth,
					title: "›",
					"aria-label": "下一月",
					children: react.createElement(INext, null),
					key: "next",
				}),
			]));
			if (snap.monthState === "loading" && viewedMonth === null) {
				bodyChildren.push(react.createElement("div", { key: "chart" }, t("pill.loading")));
			} else {
				bodyChildren.push(react.createElement(Chart, { month: viewedMonth, tab: snap.tab, t, key: "chart" }));
			}
			if (snap.monthState === "error" && viewedMonth === null) {
				bodyChildren.push(react.createElement("div", { className: "dshud_err", key: "montherr" }, t("footer.errSummary", { error: snap.monthError ?? snap.monthCode ?? "" })));
			}

			// 模型分布
			if (viewedMonth !== null && Array.isArray(viewedMonth.modelTotals) && viewedMonth.modelTotals.length > 0) {
				bodyChildren.push(react.createElement("div", { key: "models", className: "dshud_models" }, [
					react.createElement("div", { className: "dshud_field_label", key: "h" }, t("models.title")),
					...viewedMonth.modelTotals.map((m, i) => react.createElement("div", { className: "dshud_model_row", key: i }, [
						react.createElement("span", { className: "dshud_model_name" }, m.model ?? "unknown"),
						react.createElement("span", { className: "dshud_model_val" }, formatMoney(m.cost ?? 0, "CNY") + " · " + formatTokens(m.tokens ?? 0)),
					])),
				]));
			}

			// 底部
			const footerItems = [];
			footerItems.push(react.createElement("span", { key: "time" }, t("footer.updated", { time: formatClock(payload?.official?.fetchedAt ?? snap.at) })));
			footerItems.push(react.createElement("span", { key: "src" }, hasToken ? t("footer.source") : t("footer.sourceNoToken")));
			if (payload?.official?.state === "error") {
				footerItems.push(react.createElement("span", { className: "dshud_err", key: "oe" }, t("footer.errOfficial", { error: payload.official.error ?? "" })));
			}
			if (payload?.summary?.state === "error" && hasToken) {
				footerItems.push(react.createElement("span", { className: "dshud_err", key: "se" }, t("footer.errSummary", { error: payload.summary.error ?? "" })));
			}
			footerItems.push(react.createElement("a", {
				key: "link",
				className: "dshud_link",
				href: "https://platform.deepseek.com/usage",
				target: "_blank",
				rel: "noreferrer",
			}, t("footer.openPlatform")));

			return react.createElement("div", { className: "dshud_root" }, [
				snap.open ? react.createElement("div", { className: "dshud_panel", key: "panel" }, [
					header,
					react.createElement("div", { className: "dshud_body", key: "body" }, bodyChildren),
					react.createElement("div", { className: "dshud_footer", key: "footer" }, footerItems),
				]) : null,
				react.createElement("button", {
					className: "dshud_pill",
					key: "pill",
					onClick: store.toggle,
					title: t("panel.title"),
				}, [
					react.createElement("span", { className: "dshud_dot" + (balance ? " dshud_dot_success" : "") + (snap.status === "loading" ? " dshud_dot_loading" : ""), key: "dot" }),
					react.createElement("span", { className: "dshud_amount", key: "amt" },
						balance !== null ? t("pill.balance", { amount: formatMoney(balance.amount, balance.currency) })
							: snap.status === "error" ? t("pill.error") : t("pill.loading")),
				]),
			]);
		}

		function SettingsModal({ t }) {
			const snap = react.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
			const [token, setToken] = react.useState("");
			const [intervalMin, setIntervalMin] = react.useState("");
			const payload = snap.payload;
			const cfg = payload?.config ?? {};
			const masked = cfg.tokenMasked ?? "";
			const hasToken = payload?.hasToken === true;

			return react.createElement("div", { className: "dshud_modal_backdrop", onClick: (e) => { if (e.target === e.currentTarget) store.closeSettings(); } }, [
				react.createElement("div", { className: "dshud_modal", key: "m" }, [
					react.createElement("div", { className: "dshud_modal_header", key: "h" }, [
						react.createElement("span", { key: "t" }, t("settings.title")),
						react.createElement("button", { className: "dshud_iconbtn", key: "x", onClick: store.closeSettings, title: t("settings.close"), "aria-label": t("settings.close"), children: react.createElement(IClose, null) }),
					]),
					react.createElement("div", { className: "dshud_modal_body", key: "b" }, [
						react.createElement("div", { className: "dshud_field", key: "status" }, [
							react.createElement("span", { className: "dshud_field_label" }, t("settings.token.label")),
							react.createElement("span", { className: "dshud_field_hint" }, hasToken ? t("settings.status.hasToken", { source: payload?.tokenSource ?? "?" }) : t("settings.status.noToken")),
						]),
						react.createElement("div", { className: "dshud_field", key: "input" }, [
							react.createElement("textarea", {
								className: "dshud_input",
								rows: 3,
								value: token,
								onChange: (e) => setToken(e.target.value),
								placeholder: t("settings.token.placeholder", { masked: masked || "未设置" }),
								spellCheck: false,
							}),
							react.createElement("span", { className: "dshud_field_hint" }, t("settings.token.hint")),
						]),
						react.createElement("div", { className: "dshud_btnrow", key: "tokenbtns" }, [
							hasToken ? react.createElement("button", { className: "dshud_btn dshud_btn_danger", key: "clear", onClick: () => store.clearToken(), disabled: snap.saving }, t("settings.token.clear")) : null,
							react.createElement("button", {
								className: "dshud_btn dshud_btn_primary",
								key: "save",
								onClick: () => store.saveToken(token),
								disabled: snap.saving || token.trim() === "",
							}, snap.saving ? t("settings.token.saving") : t("settings.token.save")),
						]),
						react.createElement("div", { className: "dshud_field", key: "interval" }, [
							react.createElement("span", { className: "dshud_field_label" }, t("settings.interval.label")),
							react.createElement("input", {
								className: "dshud_input",
								type: "number",
								min: 1,
								max: 60,
								value: intervalMin,
								onChange: (e) => setIntervalMin(e.target.value),
								placeholder: String(Math.round((cfg.refreshIntervalMs ?? 600000) / 60000)),
							}),
							react.createElement("span", { className: "dshud_field_hint" }, t("settings.interval.hint")),
						]),
						react.createElement("div", { className: "dshud_btnrow", key: "intbtns" }, [
							react.createElement("button", {
								className: "dshud_btn dshud_btn_ghost",
								key: "intsave",
								onClick: async () => {
									const n = Number(intervalMin);
									if (!Number.isFinite(n) || n < 1 || n > 60) return;
									await fetch("/usage-dashboard/config", {
										method: "POST",
										cache: "no-store",
										headers: { "content-type": "application/json", accept: "application/json" },
										body: JSON.stringify({ refreshIntervalMs: n * 60000, clientPollIntervalMs: Math.max(10000, n * 60000 / 3) }),
									});
									setIntervalMin("");
									set({ saveMessage: { ok: true, text: t("settings.interval.saved") } });
								},
							}, t("settings.interval.save")),
						]),
						snap.saveMessage ? react.createElement("div", {
							className: "dshud_msg " + (snap.saveMessage.ok ? "dshud_msg_ok" : "dshud_msg_err"),
							key: "msg",
						}, snap.saveMessage.text) : null,
					]),
				]),
			]);
		}
		//#endregion

		//#region plugin
		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-usage-dashboard: dictionaries");
			// 等待 ui-layout 声明 shell.overlay 后再注册本条目。
			ctx.slots.inject("shell.overlay", () => {
				const dispose = ctx.slots.register({
					name: "shell.overlay",
					id: "dsh-usage-dashboard",
					order: 10,
					locale: NS,
				}, function OverlayEntry(props) {
					const snap = react.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
					return react.createElement(react.Fragment, null, [
						react.createElement(Panel, { key: "panel", t: props.t ?? ((k, vars) => k) }),
						snap.settingsOpen ? react.createElement(SettingsModal, { key: "settings", t: props.t ?? ((k, vars) => k) }) : null,
					]);
				});
				return () => dispose();
			});
			// 页面回到前台时立即刷新一次。
			ctx.effect(() => {
				const onVisibility = () => { if (!document.hidden) refreshStatus().then(schedule, schedule); };
				document.addEventListener("visibilitychange", onVisibility);
				return () => document.removeEventListener("visibilitychange", onVisibility);
			}, "dsh-usage-dashboard: visibility resume");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
