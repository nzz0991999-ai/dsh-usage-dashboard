/**
 * dsh-usage-dashboard — 浏览器端(lazy-CJS client bundle)。
 *
 * 注册进全局悬浮层插槽 `shell.overlay`: 右下角一枚余额角标, 点击展开毛玻璃仪表盘:
 *   - 账户余额(官方 /user/balance + 平台 get_user_summary)
 *   - 今日 / 本月实际金额与 Token、请求数、缓存命中率
 *   - 当月每日金额/Token 柱状图(SVG 手绘, 可回看历史月份)
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
				".dshud_pill{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.2));box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.12));cursor:pointer;user-select:none;font-size:12px;transition:transform .15s ease,box-shadow .15s ease;backdrop-filter:blur(12px)}",
				".dshud_pill:hover{transform:translateY(-1px)}",
				"@keyframes dshud-glow{0%,100%{box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.12)),0 0 0 1px rgba(249,115,22,.35),0 0 14px rgba(239,68,68,.32)}50%{box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.12)),0 0 0 1px rgba(249,115,22,.6),0 0 24px rgba(239,68,68,.62)}}",
				".dshud_pill_peak{border-color:rgba(249,115,22,.85);animation:dshud-glow 3s ease-in-out infinite}",
				".dshud_pill_valley{border-color:rgba(16,185,129,.78);box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.12)),0 0 0 1px rgba(16,185,129,.28),0 0 12px rgba(16,185,129,.3)}",
				".dshud_dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-error-primary,#ef4444)}",
				".dshud_dot_success{background:var(--dsw-alias-state-success-primary,#10b981)}",
				".dshud_dot_warning{background:var(--dsw-alias-state-warn-primary,#f59e0b)}",
				".dshud_dot_loading{animation:dshud-pulse .8s ease-in-out infinite}",
				"@keyframes dshud-pulse{0%,100%{opacity:.5}50%{opacity:1}}",
				".dshud_amount{font-weight:600;font-size:11.5px;font-variant-numeric:tabular-nums}",
				".dshud_panel{width:420px;max-width:calc(100vw - 32px);max-height:min(660px,calc(100vh - 92px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.2));border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 16px 48px rgba(0,0,0,0.2));backdrop-filter:blur(16px);overflow:hidden;animation:dshud-fadein .16s ease-out}",
				"@keyframes dshud-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
				"@keyframes dshud-fadeout{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(8px)}}",
				".dshud_panel_closing{animation:dshud-fadeout .16s ease-in forwards;pointer-events:none}",
				".dshud_header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(128,128,128,0.12));background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.03))}",
				".dshud_title{font-weight:600;font-size:12.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
				".dshud_updated{font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex-shrink:0}",
				".dshud_iconbtn{background:transparent;border:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;transition:background-color .15s ease,color .15s ease}",
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
				".dshud_chips{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
				".dshud_chip{display:flex;flex-direction:column;gap:2px;padding:7px 9px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.05));border:1px solid var(--dsw-alias-border-l3,rgba(128,128,128,0.1))}",
				".dshud_chip_label{font-size:10px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_chip_value{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}",
				".dshud_chip_bar{display:block;height:3px;border-radius:2px;background:var(--dsw-alias-border-l3,rgba(128,128,128,0.18));overflow:hidden;margin-top:4px}",
				".dshud_chip_bar_fill{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary,#3b82f6);opacity:.75}",
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
				".dshud_footer_row{display:flex;align-items:center;justify-content:space-between;gap:8px}",
				".dshud_footer_ver{font-size:10px;color:var(--dsw-alias-label-tertiary);flex-shrink:0;opacity:.85;font-variant-numeric:tabular-nums}",
				".dshud_footer_src{display:inline-flex;align-items:center;gap:2px}",
				".dshud_footer_src .dshud_link{font-size:10.5px;text-decoration:underline}",
				".dshud_footer_src .dshud_link:hover{text-decoration:underline}",
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
				".dshud_msg_err{background:rgba(239,68,68,0.1);color:var(--dsw-alias-state-error-primary,#ef4444)}",
				".dshud_pvbanner{position:relative;display:flex;flex-direction:column;gap:2px;padding:8px 12px 8px 13px;border-radius:10px;font-size:11.5px;line-height:1.45;overflow:hidden;flex-shrink:0}",
				".dshud_pvbanner::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}",
				".dshud_pvbanner_peak{background:linear-gradient(90deg,rgba(239,68,68,.13),rgba(249,115,22,.05));border:1px solid rgba(239,68,68,.4)}",
				".dshud_pvbanner_peak::before{background:linear-gradient(180deg,#f97316,#ef4444)}",
				".dshud_pvbanner_valley{background:linear-gradient(90deg,rgba(16,185,129,.13),rgba(16,185,129,.05));border:1px solid rgba(16,185,129,.4)}",
				".dshud_pvbanner_valley::before{background:linear-gradient(180deg,#34d399,#059669)}",
				".dshud_pvbanner_row{display:flex;align-items:center;justify-content:space-between;gap:8px}",
				".dshud_pvbanner_title{display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
				".dshud_pvpill{flex-shrink:0;font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.25));color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
				".dshud_pvbanner_sub{font-size:10.5px;opacity:.95}",
				".dshud_caption{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_hm{display:block;width:100%;overflow:visible}",
				".dshud_hm_month{fill:var(--dsw-alias-label-secondary);font-size:8.5px;font-weight:600;font-family:inherit}",
				".dshud_hm_today{fill:none;stroke:var(--dsw-alias-label-primary);stroke-width:1.6px}",
				".dshud_hm_legend{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:6px;font-size:10px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_hm_swatch{width:10px;height:10px;border-radius:2px;flex-shrink:0}",
				".dshud_hm_wrap{position:relative}",
				".dshud_body{overflow-x:hidden}",
				".dshud_tip{position:absolute;z-index:6;pointer-events:none;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-surface-elevated,#ffffff));border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,0.22));border-radius:8px;box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,0.16));padding:6px 9px;font-size:11px;line-height:1.4;white-space:nowrap;color:var(--dsw-alias-label-primary)}",
				".dshud_tip_date{font-weight:600;font-size:11px}",
				".dshud_tip_main{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;margin:1px 0}",
				".dshud_tip_sub{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
				"@keyframes dshud-tipin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
				".dshud_tip_inner{display:flex;flex-direction:column;animation:dshud-tipin .12s ease-out}",
				".dshud_sect_head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
				".dshud_sec_tabs{display:inline-flex;gap:2px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,0.05));border-radius:7px;padding:2px}",
				".dshud_sec_tab{border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;padding:3px 8px;border-radius:5px;cursor:pointer;transition:background-color .15s ease,color .15s ease}",
				".dshud_sec_tab_active{background:var(--dsw-alias-bg-layer-1,#ffffff);color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 3px rgba(0,0,0,0.1))}",
				".dshud_periodrow{display:flex;align-items:center;gap:6px;margin-top:8px;color:var(--dsw-alias-label-secondary)}",
				".dshud_periodlabel{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;min-width:96px;text-align:center}",
				".dshud_donut_box{display:flex;align-items:center;gap:16px;margin-top:8px}",
				".dshud_donut{position:relative;width:128px;height:128px;flex-shrink:0}",
				".dshud_donut svg{display:block;width:128px;height:128px;transform:rotate(-90deg)}",
				".dshud_donut_center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none}",
				".dshud_donut_total{font-size:15px;font-weight:700;line-height:1.25;font-variant-numeric:tabular-nums}",
				".dshud_donut_cap{font-size:9.5px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_donut_legend{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}",
				".dshud_dleg_row{display:flex;align-items:center;gap:7px;font-size:11.5px;line-height:1.3;min-width:0}",
				".dshud_dleg_dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}",
				".dshud_dleg_name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}",
				".dshud_dleg_meta{flex-shrink:0;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:1px}",
				".dshud_dleg_val{font-weight:600;font-variant-numeric:tabular-nums}",
				".dshud_dleg_pct{font-size:9.5px;color:var(--dsw-alias-label-tertiary)}",
				".dshud_models_empty{font-size:11.5px;color:var(--dsw-alias-label-tertiary);padding:10px 0}"
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
		function formatClockShort(ms) {
			if (!ms) return "—";
			const d = new Date(ms);
			const p = (n) => (n < 10 ? "0" : "") + n;
			return p(d.getHours()) + ":" + p(d.getMinutes());
		}
		function formatPercent(rate) {
			if (rate === null || rate === undefined) return "—";
			return (rate * 100).toFixed(1) + "%";
		}

		// 峰谷时段(北京时间 UTC+8): 窗口由宿主配置下发("HH:MM-HH:MM"), 其余时间为谷时。
		function parseHhmm(s) {
			const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
			if (!m) return null;
			const h = Number(m[1]), mm = Number(m[2]);
			if (h > 23 || mm > 59) return null;
			return h * 60 + mm;
		}
		function peakWindowsOf(cfg) {
			const raw = Array.isArray(cfg?.peakWindows) && cfg.peakWindows.length > 0
				? cfg.peakWindows : ["09:00-12:00", "14:00-18:00"];
			const wins = [];
			for (const s of raw) {
				const parts = String(s).split("-");
				const start = parseHhmm(parts[0]), end = parseHhmm(parts[1]);
				if (start !== null && end !== null && end > start) wins.push({ start, end, label: String(s) });
			}
			return wins.sort((x, y) => x.start - y.start);
		}
		function peakState(nowMs, cfg) {
			const wins = peakWindowsOf(cfg);
			if (wins.length === 0) return { enabled: false, isPeak: false, curLabel: null, windowsLabel: "", nextChangeMin: null, nextIsPeak: false };
			const bjtMs = nowMs + 8 * 3600e3;
			const b = new Date(bjtMs);
			const mins = b.getUTCHours() * 60 + b.getUTCMinutes();
			const cur = wins.find((w) => mins >= w.start && mins < w.end) || null;
			let nextChange = null;
			let nextIsPeak = false;
			if (cur !== null) {
				nextChange = cur.end;
				nextIsPeak = false;
			} else {
				const nxt = wins.find((w) => w.start > mins);
				if (nxt !== undefined) { nextChange = nxt.start; nextIsPeak = true; }
				else { nextChange = wins[0].start + 1440; nextIsPeak = true; }
			}
			const dayFloor = Math.floor(bjtMs / 86400000) * 86400000;
			const nextChangeMin = Math.max(1, Math.ceil((dayFloor + nextChange * 60000 - bjtMs) / 60000));
			return {
				enabled: true,
				isPeak: cur !== null,
				curLabel: cur ? cur.label : null,
				windowsLabel: wins.map((w) => w.label).join(" / "),
				nextChangeMin,
				nextIsPeak,
			};
		}
		function durationText(min, t) {
			if (!Number.isFinite(min) || min <= 0) return t("pv.dur.now");
			const h = Math.floor(min / 60), m = min % 60;
			if (h > 0 && m > 0) return t("pv.dur.hm", { h, m });
			if (h > 0) return t("pv.dur.h", { h });
			return t("pv.dur.m", { m });
		}
		function durationCompact(min) {
			if (!Number.isFinite(min) || min <= 0) return "0m";
			const h = Math.floor(min / 60), m = min % 60;
			return h > 0 ? h + "h" + (m > 0 ? m + "m" : "") : m + "m";
		}
		//#endregion

		//#region store(单例: 页面级共享一个轮询器)
		const DEFAULT_POLL_MS = 30000;
		let snapshot = {
			status: "loading",
			payload: null,
			at: 0,
			open: false,
			closing: false,
			tab: "cost",
			modelTab: "cost",
			donutRange: "month",
			donutOffset: 0,
			usageState: "idle",
			usageMonths: null,
			usageError: null,
			usageKey: "",
			settingsOpen: false,
			saving: false,
			saveMessage: null,
		};
		const listeners = new Set();
		let timer = null;
		let pollMs = DEFAULT_POLL_MS;
		let inflightStatus = null;
		let inflightUsage = null;
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
					if (snapshot.open) loadUsage();
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

		const monthAdd = (year, month, delta) => {
			let m = month + delta, y = year;
			while (m < 1) { m += 12; y -= 1; }
			while (m > 12) { m -= 12; y += 1; }
			return { year: y, month: m };
		};

		const fetchMonthData = async (y, m, force) => {
			const res = await fetch("/usage-dashboard/month?month=" + m + "&year=" + y + (force ? "&force=1" : ""), { cache: "no-store", headers: { accept: "application/json" } });
			if (!res.ok) throw new Error("HTTP " + res.status);
			const data = await res.json();
			return { year: y, month: m, state: data.state === "ok" ? "ok" : "error", payload: data.payload ?? null, error: data.error ?? null };
		};

		/** 加载热力图窗口: 近 N 个月(含当月), N = historyMonths(默认 6, 上限 12)。 */
		const loadUsage = (force = false) => {
			const nm = nowMonth();
			const n = Math.max(1, Math.min(12, Number(snapshot.payload?.config?.historyMonths) || 6));
			const start = monthAdd(nm.year, nm.month, -(n - 1));
			const key = nm.year + "-" + nm.month;
			if (inflightUsage !== null) return;
			if (!force && snapshot.usageState === "ok" && snapshot.usageKey === key) return;
			set({ usageState: "loading", usageMonths: null, usageError: null });
			inflightUsage = (async () => {
				try {
					const jobs = [];
					for (let y = start.year, m = start.month; ; ) {
						jobs.push(fetchMonthData(y, m, force));
						if (y === nm.year && m === nm.month) break;
						const nxt = monthAdd(y, m, 1);
						y = nxt.year; m = nxt.month;
					}
					const results = await Promise.all(jobs);
					results.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
					const okCurrent = results.length > 0 && results[results.length - 1].state === "ok";
					const failed = results.filter((r) => r.state !== "ok");
					set({
						usageState: okCurrent ? "ok" : "error",
						usageMonths: results,
						usageKey: key,
						usageError: failed.length > 0 ? failed[0].error ?? "unknown" : null,
					});
				} catch (error) {
					set({ usageState: "error", usageError: error instanceof Error ? error.message : String(error) });
				}
				inflightUsage = null;
			})();
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
				if (snapshot.open) {
					store.closePanel();
					return;
				}
				set({ open: true, closing: false });
				loadUsage();
				refreshStatus();
			},
			closePanel() {
				if (!snapshot.open && !snapshot.closing) return;
				// 同步置 closing: 让面板保持挂载直接播放淡出, 避免"先卸载再重挂"造成闪烁
				set({ open: false, closing: true, settingsOpen: false });
				setTimeout(() => {
					if (!snapshot.open) set({ closing: false });
				}, 170);
			},
			setTab(tab) { set({ tab }); },
			setModelTab(tab) { set({ modelTab: tab }); },
			setDonutRange(range) { set({ donutRange: range, donutOffset: 0 }); },
			setDonutOffset(offset) { set({ donutOffset: Math.min(0, offset) }); },
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
			"chip.todayCost": "今日金额",
			"chip.todayTokens": "今日 Token",
			"chip.monthCost": "本月金额",
			"chip.monthTokens": "本月 Token",
			"chip.requests": "请求数",
			"chip.cacheHit": "缓存命中率",
			"tab.cost": "金额",
			"tab.tokens": "Token",
			"chart.empty": "本月暂无数据",
			"chart.axisToken": "峰值 {v} tokens/日",
			"models.title": "模型分布",
			"footer.updated": "数据更新于 {time}",
			"footer.source": "数据来源: ",
			"footer.platform": "DeepSeek 开放平台 · 官方",
			"footer.version": "v1.1.0",
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
			"pv.peak.short": "峰",
			"pv.valley.short": "谷",
			"pv.banner.peak.title": "⚡ 当前峰时 · 价格高位",
			"pv.banner.peak.count": "距谷时还有 {time} · 非紧急任务建议延后",
			"pv.banner.valley.title": "🌙 当前谷时 · 约 5 折优惠中",
			"pv.banner.valley.count": "距下次峰时还有 {time} · 适合批量跑任务",
			"pv.windowsTip": "峰时 {windows}(北京时间), 其余谷时约 5 折 — 以官方实时费率为准",
			"pv.dur.hm": "{h} 小时 {m} 分",
			"pv.dur.h": "{h} 小时",
			"pv.dur.m": "{m} 分钟",
			"pv.dur.now": "即将",
			"hm.caption": "近 {n} 个月每日{what} · 颜色越深越高",
			"hm.empty": "暂无用量数据",
			"hm.monthFail": "部分月份用量加载失败: {error}",
			"hm.legend.less": "少",
			"hm.legend.more": "多",
			"hm.tip.none": "该日无用量",
			"models.none": "暂无用量数据",
			"models.other": "其他",
			"models.r.today": "日",
			"models.r.week": "周",
			"models.r.month": "月",
			"chip.requestsDay": "请求数(日)",
			"chip.cacheHitMonth": "缓存命中率(月)",
			"chip.share": "今日占本月 {pct}%",
			"pv.next.valley": "距谷时",
			"pv.next.peak": "距峰时",
			"pv.banner.peak.hint": "建议延后至谷时",
			"pv.banner.valley.hint": "适合批量任务",
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
			"chip.todayCost": "Today amount",
			"chip.todayTokens": "Today tokens",
			"chip.monthCost": "Month amount",
			"chip.monthTokens": "Month tokens",
			"chip.requests": "Requests",
			"chip.cacheHit": "Cache hit rate",
			"tab.cost": "Amount",
			"tab.tokens": "Tokens",
			"chart.empty": "No data this month",
			"chart.axisToken": "Peak {v} tokens/day",
			"models.title": "Model breakdown",
			"footer.updated": "Updated {time}",
			"footer.source": "Data source: ",
			"footer.platform": "DeepSeek Platform · Official",
			"footer.version": "v1.1.0",
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
			"pv.peak.short": "P",
			"pv.valley.short": "V",
			"pv.banner.peak.title": "⚡ Peak hour · higher rates",
			"pv.banner.peak.count": "Valley starts in {time} · consider deferring heavy tasks",
			"pv.banner.valley.title": "🌙 Valley hour — ~50% off promo",
			"pv.banner.valley.count": "Next peak in {time} · good time for batch tasks",
			"pv.windowsTip": "Peak windows {windows} (Beijing time); other hours ~50% off — subject to official rates",
			"pv.dur.hm": "{h}h {m}m",
			"pv.dur.h": "{h}h",
			"pv.dur.m": "{m} min",
			"pv.dur.now": "imminent",
			"hm.caption": "Daily {what} over the last {n} months · darker = higher",
			"hm.empty": "No usage data yet",
			"hm.monthFail": "Some months failed to load: {error}",
			"hm.legend.less": "less",
			"hm.legend.more": "more",
			"hm.tip.none": "no usage this day",
			"models.none": "No usage data",
			"models.other": "Other",
			"models.r.today": "Day",
			"models.r.week": "Week",
			"models.r.month": "Month",
			"chip.requestsDay": "Requests (day)",
			"chip.cacheHitMonth": "Cache hit (month)",
			"chip.share": "Today is {pct}% of month",
			"pv.next.valley": "valley in",
			"pv.next.peak": "peak in",
			"pv.banner.peak.hint": "Defer to valley hours",
			"pv.banner.valley.hint": "Great for batch tasks",
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

		// 用量热力图(仿 DeepSeek usage 页 Token 活动热力图)
		const HM_FILLS = [
			"rgba(120,134,156,0.12)",
			"rgba(59,130,246,0.22)",
			"rgba(59,130,246,0.45)",
			"rgba(59,130,246,0.7)",
			"rgba(29,78,216,0.95)"
		];
		function hmLevel(v, max) {
			if (v <= 0 || max <= 0) return 0;
			const q = v / max;
			return q >= 0.75 ? 4 : q >= 0.5 ? 3 : q >= 0.25 ? 2 : 1;
		}
		const hmDayKey = (y, m, d) => y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;

		function Heatmap({ months, tab, t }) {
			// 汇总窗口内每个日期的值(只统计加载成功的月份)
			const dayMap = new Map();
			let max = 0;
			for (const en of months) {
				const days = en?.payload?.days;
				if (!Array.isArray(days)) continue;
				for (const d of days) {
					const cost = Number(d.cost) || 0;
					const tokens = Number(d.tokens) || 0;
					const v = tab === "cost" ? cost : tokens;
					if (v > max) max = v;
					dayMap.set(d.date, {
						cost, tokens,
						requests: Number(d.requests) || 0,
						input: Number(d.inputTokens) || 0,
						hit: Number(d.cacheHitTokens) || 0,
					});
				}
			}
			const td = todayDay();
			const [hover, setHover] = react.useState(null);
			const cRef = react.useRef(null);
			if (months.length === 0) return react.createElement("div", null, t("hm.empty"));

			const first = months[0];
			let start = new Date(first.year, first.month - 1, 1);
			const end = new Date(td.year, td.month - 1, td.day);
			if (end.getTime() < start.getTime()) return react.createElement("div", null, t("hm.empty"));
			const dow0 = (start.getDay() + 6) % 7; // Mon=0
			const gridStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dow0);
			const totalDays = Math.floor((end.getTime() - gridStart.getTime()) / 86400000) + 1;
			const weeks = Math.ceil(totalDays / 7);

			const CELL = 11, GAP = 2, PITCH = CELL + GAP, PAD_X = 2;
			const W = weeks * PITCH - GAP + PAD_X * 2;
			const H = 7 * PITCH - GAP + 16;

			const cells = [];
			const monthCols = [];
			for (let i = 0; i < totalDays; i++) {
				const dt = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
				const col = Math.floor(i / 7);
				const row = (dt.getDay() + 6) % 7;
				const key = hmDayKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
				if (dt.getDate() === 1) monthCols.push({ ym: dt.getFullYear() * 12 + (dt.getMonth() + 1), y: dt.getFullYear(), m: dt.getMonth() + 1, col });
				const rec = dayMap.get(key);
				const x = PAD_X + col * PITCH;
				const y = row * PITCH;
				let fill = HM_FILLS[0];
				if (rec !== undefined) {
					const v = tab === "cost" ? rec.cost : rec.tokens;
					fill = HM_FILLS[hmLevel(v, max)];
				}
				const isToday = key === hmDayKey(td.year, td.month, td.day);
				cells.push(react.createElement("rect", {
					key: key,
					x, y, width: CELL, height: CELL, rx: 2, fill,
					onMouseMove: (e) => {
						if (cRef.current === null) return;
						const r = cRef.current.getBoundingClientRect();
						setHover({ key, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
					},
					onMouseLeave: () => setHover(null),
				}));
				if (isToday) {
					cells.push(react.createElement("rect", { key: key + "_t", x: x - 0.5, y: y - 0.5, width: CELL + 1, height: CELL + 1, rx: 3, className: "dshud_hm_today" }));
				}
			}
			const monthLabels = monthCols.map(({ ym, y: yy, m, col }) => {
				const showYear = m === 1 || col === 0;
				return react.createElement("text", { key: ym, x: PAD_X + col * PITCH, y: H - 3, className: "dshud_hm_month" }, (showYear ? yy + "/" : "") + m);
			});
			const legend = HM_FILLS.map((c, l) => react.createElement("span", { key: l, className: "dshud_hm_swatch", style: { background: c } }));

			const tip = hover === null ? null : (() => {
				const rec = dayMap.get(hover.key);
				const w = hover.w || 320;
				const above = hover.y > 64;
				const anchorRight = hover.x > w * 0.5;   // 右半区: 卡片向左扩展; 左半区: 向右扩展, 避免溢出
				const left = Math.max(4, Math.min(hover.x, w - 4));
				const top = above ? hover.y - 8 : hover.y + 14;
				const transform = above
					? (anchorRight ? "translate(-100%,-100%)" : "translate(0,-100%)")
					: (anchorRight ? "translate(-100%,0)" : "translate(0,0)");
				const [yy, mm, dd] = hover.key.split("-").map(Number);
				const isToday = hover.key === hmDayKey(td.year, td.month, td.day);
				const hasUse = rec !== undefined && (Number(rec.tokens) > 0 || Number(rec.requests) > 0);
				const main = hasUse
					? (tab === "cost" ? formatMoney(rec.cost, "CNY") : formatTokens(rec.tokens))
					: null;
				const subParts = [];
				if (hasUse) {
					subParts.push(String(rec.requests) + " 请求");
					if (rec.input > 0) subParts.push("命中 " + formatPercent(rec.hit / rec.input));
				} else {
					subParts.push(t("hm.tip.none"));
				}
				return react.createElement("div", {
					className: "dshud_tip",
					key: "tip",
					style: { left, top, transform },
				}, [
					react.createElement("div", { className: "dshud_tip_inner", key: "in" }, [
						react.createElement("div", { className: "dshud_tip_date", key: "d" }, mm + "月" + dd + "日" + (isToday ? " · 今天" : "") + (yy !== td.year ? " " + yy : "")),
						main !== null ? react.createElement("div", { className: "dshud_tip_main", key: "m" }, main) : null,
						subParts.length > 0 ? react.createElement("div", { className: "dshud_tip_sub", key: "s" }, subParts.join(" · ")) : null,
					]),
				]);
			})();

			return react.createElement("div", { className: "dshud_hm_wrap", key: "hm", ref: cRef }, [
				react.createElement("svg", { className: "dshud_hm", viewBox: "0 0 " + W + " " + H, role: "img" }, [
					...cells,
					...monthLabels,
				]),
				react.createElement("div", { className: "dshud_hm_legend", key: "legend" }, [
					react.createElement("span", { key: "less" }, t("hm.legend.less")),
					...legend,
					react.createElement("span", { key: "more" }, t("hm.legend.more")),
				]),
				tip,
			]);
		}

		const DONUT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];
		const DONUT_OTHER = "#9ca3af";

		/** 按月 payload 汇总"日期 → 当日各模型用量", 供今日/本周范围聚合。 */
		const modelsByDate = (payloads) => {
			const out = new Map();
			for (const p of payloads) {
				if (p === null || !Array.isArray(p.days)) continue;
				for (const d of p.days) {
					if (!Array.isArray(d.models)) continue;
					const list = d.models.map((m) => ({ model: m.model ?? "unknown", cost: Number(m.cost) || 0, tokens: Number(m.tokens) || 0 }))
						.filter((m) => m.cost > 0 || m.tokens > 0);
					if (list.length > 0) out.set(d.date, list);
				}
			}
			return out;
		};
		const sumModelLists = (lists) => {
			const agg = new Map();
			for (const list of lists) {
				for (const m of list) {
					const e = agg.get(m.model) ?? { model: m.model, cost: 0, tokens: 0 };
					e.cost += m.cost;
					e.tokens += m.tokens;
					agg.set(m.model, e);
				}
			}
			return [...agg.values()];
		};
		const colorOf = (i, isOther) => (isOther ? DONUT_OTHER : DONUT_COLORS[i % DONUT_COLORS.length]);

		function ModelDonut({ totals, tab, t, currency }) {
			const val = (m) => Number(tab === "cost" ? m.cost : m.tokens) || 0;
			const segs = (totals || []).map((m) => ({ model: m.model ?? "unknown", v: val(m) }))
				.filter((s) => s.v > 0)
				.sort((a, b) => b.v - a.v);
			const grand = segs.reduce((a, s) => a + s.v, 0);
			if (segs.length === 0 || grand <= 0) {
				return react.createElement("div", { className: "dshud_models_empty" }, t("models.none"));
			}
			// 保留份额 >=1.5% 的前 8 名, 其余并入"其他"(灰色)
			const big = [];
			let smallSum = 0;
			for (const s of segs) {
				if (big.length < 8 && s.v / grand >= 0.015) big.push(s);
				else smallSum += s.v;
			}
			const finalSegs = big.map((s) => ({ model: s.model, v: s.v, isOther: false }));
			if (smallSum > 0) finalSegs.push({ model: t("models.other"), v: smallSum, isOther: true });

			const S = 128, CX = 64, CY = 64, R = 48, SW = 15, GAP = 2.5;
			const C = 2 * Math.PI * R;
			const arcs = [
				react.createElement("circle", { key: "bg", cx: CX, cy: CY, r: R, fill: "none", stroke: "rgba(128,128,128,0.12)", strokeWidth: SW }),
			];
			let acc = 0;
			finalSegs.forEach((s, i) => {
				const len = Math.max(0, (s.v / grand) * C - GAP);
				if (len <= 0) return;
				arcs.push(react.createElement("circle", {
					key: "a" + i,
					cx: CX, cy: CY, r: R, fill: "none",
					stroke: colorOf(i, s.isOther),
					strokeWidth: SW,
					strokeDasharray: len + " " + (C - len),
					strokeDashoffset: -acc,
				}));
				acc += len + GAP;
			});
			const totalLabel = tab === "cost" ? formatMoney(grand, currency) : formatTokens(Math.round(grand));
			const capLabel = tab === "cost" ? t("tab.cost") : t("tab.tokens");

			return react.createElement("div", { className: "dshud_donut_box" }, [
				react.createElement("div", { className: "dshud_donut", key: "d" }, [
					react.createElement("svg", { width: S, height: S, viewBox: "0 0 " + S + " " + S }, arcs),
					react.createElement("div", { className: "dshud_donut_center", key: "c" }, [
						react.createElement("span", { className: "dshud_donut_total", key: "t" }, totalLabel),
						react.createElement("span", { className: "dshud_donut_cap", key: "l" }, capLabel),
					]),
				]),
				react.createElement("div", { className: "dshud_donut_legend", key: "l" },
					finalSegs.map((s, i) => react.createElement("div", { className: "dshud_dleg_row", key: s.model + "_" + i, title: s.model }, [
						react.createElement("span", { className: "dshud_dleg_dot", key: "dot", style: { background: colorOf(i, s.isOther) } }),
						react.createElement("span", { className: "dshud_dleg_name", key: "n" }, s.model),
						react.createElement("span", { className: "dshud_dleg_meta", key: "m" }, [
							react.createElement("span", { className: "dshud_dleg_val", key: "v" }, tab === "cost" ? formatMoney(s.v, currency) : formatTokens(Math.round(s.v))),
							react.createElement("span", { className: "dshud_dleg_pct", key: "p" }, (s.v / grand * 100).toFixed(1) + "%"),
						]),
					])),
				),
			]);
		}

		function Panel({ t }) {
			const snap = react.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
			const payload = snap.payload;

			// 面板开关动画状态由 store 的 closing 同步管理(避免先卸载再重挂造成的闪烁);
			// 此处负责"点击面板外部自动关闭"。
			const rootRef = react.useRef(null);
			const panelVisible = snap.open === true || snap.closing === true;
			const panelClosing = snap.closing === true && snap.open !== true;
			react.useEffect(() => {
				if (!snap.open) return undefined;
				const onDown = (e) => {
					if (!e.target || typeof e.target.closest !== "function") return;
					if (e.target.closest(".dshud_root, .dshud_modal_backdrop")) return; // 点在自己/设置弹层内不关
					store.closePanel();
				};
				document.addEventListener("pointerdown", onDown);
				return () => document.removeEventListener("pointerdown", onDown);
			}, [snap.open]);
			const balance = payload ? pickBalance(payload) : null;
			const hasToken = payload?.hasToken === true;
			const tokenExpired = payload?.summary?.code === "token-expired" || payload?.month?.code === "token-expired";
			const td = todayDay();

			// 峰谷时段(纯本地计算, 北京时间; 无需网络)
			const pv = peakState(Date.now(), payload?.config ?? {});

			// 当月明细: 优先 /status 携带(服务器轮询刷新), 回退热力图窗口的当月
			const currentMonth = monthOfPayload(payload)
				?? (snap.usageMonths !== null && snap.usageMonths.length > 0 ? snap.usageMonths[snap.usageMonths.length - 1].payload : null);

			const header = react.createElement("div", { className: "dshud_header", key: "head" }, [
				react.createElement("span", { className: "dshud_title", key: "title" }, t("panel.title")),
				react.createElement("span", { className: "dshud_updated", key: "upd" }, t("footer.updated", { time: formatClockShort(payload?.official?.fetchedAt ?? snap.at) })),
				react.createElement("button", { className: "dshud_iconbtn", key: "refresh", title: t("panel.refresh"), "aria-label": t("panel.refresh"), onClick: () => { refreshStatus(true); loadUsage(true); }, children: react.createElement(IRefresh, null) }),
				react.createElement("button", { className: "dshud_iconbtn", key: "settings", title: t("panel.settings"), "aria-label": t("panel.settings"), onClick: store.openSettings, children: react.createElement(ISettings, null) }),
				react.createElement("button", { className: "dshud_iconbtn", key: "close", title: t("panel.close"), "aria-label": t("panel.close"), onClick: store.toggle, children: react.createElement(IClose, null) }),
			]);

			const bodyChildren = [];

			// 峰谷横幅(左侧标题 + 右侧紧凑倒计时 pill)
			if (pv.enabled) {
				const pvTitle = pv.isPeak
					? t("pv.banner.peak.title", { w: pv.curLabel ?? "" })
					: t("pv.banner.valley.title");
				const pvHint = pv.isPeak ? t("pv.banner.peak.hint") : t("pv.banner.valley.hint");
				const pvPill = t(pv.isPeak ? "pv.next.valley" : "pv.next.peak") + " " + durationCompact(pv.nextChangeMin);
				bodyChildren.push(react.createElement("div", {
					className: "dshud_pvbanner " + (pv.isPeak ? "dshud_pvbanner_peak" : "dshud_pvbanner_valley"),
					key: "pvbanner",
					title: t("pv.windowsTip", { windows: pv.windowsLabel }),
				}, [
					react.createElement("div", { className: "dshud_pvbanner_row", key: "row" }, [
						react.createElement("span", { className: "dshud_pvbanner_title", key: "title" }, pvTitle + " · " + pvHint),
						react.createElement("span", { className: "dshud_pvpill", key: "pill" }, pvPill),
					]),
				]));
			}

			// 余额区
			if (balance !== null) {
				const sub = payload.official?.state === "ok" && Array.isArray(payload.official.payload?.balances) && payload.official.payload.balances.length > 0
					? payload.official.payload.balances[0] : null;
				bodyChildren.push(react.createElement("div", { className: "dshud_balance_row", key: "bal" }, [
					react.createElement("div", { key: "main" }, [
						react.createElement("div", { className: "dshud_balance_main" }, formatMoney(balance.amount, balance.currency)),
						react.createElement("div", { className: "dshud_balance_sub", key: "label" }, t("balance.total")),
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

			// 今日/本月 指标(3×2 网格; 今日卡带"占本月"进度条)
			const view = currentMonth;
			const todayEntry = view ? (view.days ?? []).find((d) => d.day === td.day) : null;
			if (view !== null && view !== undefined && (view.days?.length ?? 0) > 0) {
				const monthCost = view.totals?.cost ?? 0;
				const monthTokens = view.totals?.tokens ?? 0;
				const dayCost = todayEntry?.cost ?? 0;
				const dayTokens = todayEntry?.tokens ?? 0;
				const share = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);
				const chipNode = (key, label, value, bar) => react.createElement("div", {
					className: "dshud_chip",
					key,
					title: bar === null ? undefined : t("chip.share", { pct: share(bar[0], bar[1]).toFixed(0) }),
				}, [
					react.createElement("span", { className: "dshud_chip_label", key: "l" }, label),
					react.createElement("span", { className: "dshud_chip_value", key: "v" }, value),
					bar === null ? null : react.createElement("span", { className: "dshud_chip_bar", key: "b" }, [
						react.createElement("span", { className: "dshud_chip_bar_fill", style: { width: share(bar[0], bar[1]) + "%" } }),
					]),
				]);
				bodyChildren.push(react.createElement("div", { className: "dshud_chips", key: "chips" }, [
					chipNode("tc", t("chip.todayCost"), formatMoney(dayCost, "CNY"), [dayCost, monthCost]),
					chipNode("tt", t("chip.todayTokens"), formatTokens(dayTokens), [dayTokens, monthTokens]),
					chipNode("rd", t("chip.requestsDay"), String(todayEntry?.requests ?? 0), null),
					chipNode("mc", t("chip.monthCost"), formatMoney(monthCost, "CNY"), null),
					chipNode("mt", t("chip.monthTokens"), formatTokens(monthTokens), null),
					chipNode("ch", t("chip.cacheHitMonth"), view.cacheHitRate === null || view.cacheHitRate === undefined ? "—" : formatPercent(view.cacheHitRate), null),
				]));
			}

			// 图表(热力图, 近 N 个月; 无月度翻页)
			bodyChildren.push(react.createElement("div", { className: "dshud_tabs", key: "tabs" }, [
				react.createElement("button", { className: "dshud_tab" + (snap.tab === "cost" ? " dshud_tab_active" : ""), onClick: () => store.setTab("cost"), key: "cost" }, t("tab.cost")),
				react.createElement("button", { className: "dshud_tab" + (snap.tab === "tokens" ? " dshud_tab_active" : ""), onClick: () => store.setTab("tokens"), key: "tok" }, t("tab.tokens")),
			]));
			if (snap.usageState === "loading" && snap.usageMonths === null) {
				bodyChildren.push(react.createElement("div", { className: "dshud_caption", key: "hmload" }, t("pill.loading")));
			} else if (snap.usageMonths !== null && snap.usageMonths.length > 0) {
				bodyChildren.push(react.createElement("div", { className: "dshud_caption", key: "hmcap" }, t("hm.caption", {
					n: snap.usageMonths.length,
					what: snap.tab === "cost" ? t("tab.cost") : t("tab.tokens"),
				})));
				bodyChildren.push(react.createElement(Heatmap, { months: snap.usageMonths, tab: snap.tab, t, key: "hm" }));
			} else {
				bodyChildren.push(react.createElement("div", { className: "dshud_err", key: "hmempty" }, t("hm.empty")));
			}
			if (snap.usageError !== null && snap.usageError !== undefined) {
				bodyChildren.push(react.createElement("div", { className: "dshud_err", key: "hmerr" }, t("hm.monthFail", { error: snap.usageError })));
			}

			// 模型分布(环形图, 可按 日/周/月 左右翻看)
			let donutTotals = [];
			let donutLabel = "";
			let canPrev = false;
			let canNext = false;
			if (currentMonth !== null) {
				const range = snap.donutRange ?? "month";
				const k = snap.donutOffset ?? 0;
				if (range === "month") {
					let en = null;
					if (snap.usageMonths !== null && snap.usageMonths.length > 0) {
						const idx = snap.usageMonths.length - 1 + k;
						en = idx >= 0 ? snap.usageMonths[idx] : null;
					}
					donutTotals = en && en.payload ? (en.payload.modelTotals ?? []) : (k === 0 ? (currentMonth.modelTotals ?? []) : []);
					donutLabel = (en ? en.year : td.year) + "-" + String(en ? en.month : td.month).padStart(2, "0");
					canNext = k < 0;
					canPrev = k < (snap.usageMonths ? snap.usageMonths.length - 1 : 0);
				} else {
					const payloads = [currentMonth];
					if (snap.usageMonths !== null) {
						for (const en of snap.usageMonths) payloads.push(en.payload);
					}
					const byDate = modelsByDate(payloads);
					const tdDate = new Date(td.year, td.month - 1, td.day);
					const keyOf = (d) => hmDayKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
					const lists = [];
					let periodStart = null;
					if (range === "today") {
						periodStart = new Date(tdDate.getFullYear(), tdDate.getMonth(), tdDate.getDate() + k);
						const hit = byDate.get(keyOf(periodStart));
						if (hit !== undefined) lists.push(hit);
						donutLabel = (periodStart.getMonth() + 1) + "月" + periodStart.getDate() + "日";
					} else {
						const off = (tdDate.getDay() + 6) % 7;
						periodStart = new Date(tdDate.getFullYear(), tdDate.getMonth(), tdDate.getDate() - off + 7 * k);
						for (let i = 0; i < 7; i++) {
							const dt = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + i);
							if (dt.getTime() > tdDate.getTime()) break;
							const hit = byDate.get(keyOf(dt));
							if (hit !== undefined) lists.push(hit);
						}
						const weekEnd = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 6);
						donutLabel = (periodStart.getMonth() + 1) + "月" + periodStart.getDate() + "日–" + (weekEnd.getMonth() + 1) + "月" + weekEnd.getDate() + "日";
					}
					donutTotals = sumModelLists(lists);
					// 用最早可用日期限制可回看范围
					let oldest = null;
					for (const key of byDate.keys()) {
						const t = new Date(key);
						if (oldest === null || t < oldest) oldest = t;
					}
					if (oldest !== null && periodStart !== null) {
						canPrev = periodStart.getTime() > oldest.getTime();
					}
					canNext = k < 0;
				}
			}
			if (currentMonth !== null) {
				bodyChildren.push(react.createElement("div", { className: "dshud_sect_head", key: "modelshead" }, [
					react.createElement("span", { className: "dshud_field_label", key: "h" }, t("models.title")),
					react.createElement("div", { className: "dshud_sec_tabs", key: "tabd" }, [
						react.createElement("button", { className: "dshud_sec_tab" + (snap.modelTab === "cost" ? " dshud_sec_tab_active" : ""), onClick: () => store.setModelTab("cost"), key: "cost" }, t("tab.cost")),
						react.createElement("button", { className: "dshud_sec_tab" + (snap.modelTab === "tokens" ? " dshud_sec_tab_active" : ""), onClick: () => store.setModelTab("tokens"), key: "tok" }, t("tab.tokens")),
					]),
					react.createElement("div", { className: "dshud_sec_tabs", key: "tabr" }, [
						react.createElement("button", { className: "dshud_sec_tab" + ((snap.donutRange ?? "month") === "today" ? " dshud_sec_tab_active" : ""), onClick: () => store.setDonutRange("today"), key: "today" }, t("models.r.today")),
						react.createElement("button", { className: "dshud_sec_tab" + ((snap.donutRange ?? "month") === "week" ? " dshud_sec_tab_active" : ""), onClick: () => store.setDonutRange("week"), key: "week" }, t("models.r.week")),
						react.createElement("button", { className: "dshud_sec_tab" + ((snap.donutRange ?? "month") === "month" ? " dshud_sec_tab_active" : ""), onClick: () => store.setDonutRange("month"), key: "month" }, t("models.r.month")),
					]),
				]));
				bodyChildren.push(react.createElement("div", { className: "dshud_periodrow", key: "periodnav" }, [
					react.createElement("button", { className: "dshud_iconbtn", key: "prev", onClick: () => store.setDonutOffset((snap.donutOffset ?? 0) - 1), disabled: !canPrev, "aria-label": "上一期", title: "上一期", children: react.createElement(IPrev, null) }),
					react.createElement("span", { className: "dshud_periodlabel", key: "label" }, donutLabel),
					react.createElement("button", { className: "dshud_iconbtn", key: "next", onClick: () => store.setDonutOffset((snap.donutOffset ?? 0) + 1), disabled: !canNext, "aria-label": "下一期", title: "下一期", children: react.createElement(INext, null) }),
				]));
				bodyChildren.push(donutTotals.length === 0
					? react.createElement("div", { className: "dshud_models_empty", key: "donutempty" }, donutLabel + " · " + t("models.none"))
					: react.createElement(ModelDonut, {
						totals: donutTotals,
						tab: snap.modelTab,
						t,
						currency: currentMonth.currency ?? "CNY",
						key: "donut",
					}));
			}

			// 底部
			const footerItems = [];
			footerItems.push(react.createElement("div", { className: "dshud_footer_row", key: "srcrow" }, [
				react.createElement("span", { className: "dshud_footer_src", key: "src" }, [
					react.createElement("span", { key: "l" }, t("footer.source")),
					react.createElement("a", {
						key: "a",
						className: "dshud_link",
						href: "https://platform.deepseek.com/usage",
						target: "_blank",
						rel: "noreferrer",
					}, t("footer.platform")),
				]),
				react.createElement("span", { className: "dshud_footer_ver", key: "ver" }, t("footer.version")),
			]));
			if (payload?.official?.state === "error") {
				footerItems.push(react.createElement("span", { className: "dshud_err", key: "oe" }, t("footer.errOfficial", { error: payload.official.error ?? "" })));
			}
			if (payload?.summary?.state === "error" && hasToken) {
				footerItems.push(react.createElement("span", { className: "dshud_err", key: "se" }, t("footer.errSummary", { error: payload.summary.error ?? "" })));
			}

			return react.createElement("div", { className: "dshud_root", ref: rootRef }, [
				panelVisible ? react.createElement("div", {
					className: "dshud_panel" + (panelClosing ? " dshud_panel_closing" : ""),
					key: "panel",
				}, [
					header,
					react.createElement("div", { className: "dshud_body", key: "body" }, bodyChildren),
					react.createElement("div", { className: "dshud_footer", key: "footer" }, footerItems),
				]) : null,
				react.createElement("button", {
					className: "dshud_pill " + (pv.enabled ? (pv.isPeak ? "dshud_pill_peak" : "dshud_pill_valley") : "dshud_pill_valley"),
					key: "pill",
					onClick: store.toggle,
					title: pv.enabled ? t("pv.windowsTip", { windows: pv.windowsLabel }) : t("panel.title"),
				}, [
					react.createElement("span", { className: "dshud_amount", key: "amt" },
						balance !== null ? formatMoney(balance.amount, balance.currency)
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
