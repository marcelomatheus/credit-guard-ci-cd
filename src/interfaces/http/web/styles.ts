export const styles = `
:root {
  color-scheme: light;
  --bg: #f3f7f6;
  --surface: #ffffff;
  --surface-2: #e8f1ee;
  --surface-3: #d4e4de;
  --border: #cfdfd8;
  --border-strong: #81988e;
  --text: #142e27;
  --text-2: #36564b;
  --text-3: #4f6b60;
  --accent: #0f6b5b;
  --accent-hover: #0b5246;
  --accent-soft: #dff3eb;
  --accent-text: #095646;
  --on-accent: #ffffff;
  --ok: #236333;
  --ok-soft: #e8f4e5;
  --warn: #855211;
  --warn-soft: #fff2d5;
  --bad: #aa3537;
  --bad-soft: #fce9e7;
  --ok-line: #388447;
  --warn-line: #a66b0c;
  --bad-line: #c34749;
  --ink: #103f35;
  --ink-2: #154c40;
  --ink-line: #3c7060;
  --ink-text: #e0efe7;
  --ink-muted: #a9cdbb;
  --ink-heading: #ffffff;
  --ink-ok: #a8db89;
  --ink-warn: #f1c16c;
  --ink-bad: #f4a29c;
  --r-sm: 4px;
  --r-md: 6px;
  --r-lg: 8px;
  --font: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --font-display: "Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #0b1815;
    --surface: #11251f;
    --surface-2: #18322a;
    --surface-3: #24483b;
    --border: #2b4a3e;
    --border-strong: #668d7c;
    --text: #edf5f0;
    --text-2: #bfd3c6;
    --text-3: #99b8a7;
    --accent: #74d9b5;
    --accent-hover: #9ae8cb;
    --accent-soft: #1b3c30;
    --accent-text: #a6efd0;
    --on-accent: #0b241b;
    --ok: #a8db89;
    --ok-soft: #213622;
    --warn: #f1c16c;
    --warn-soft: #3b301b;
    --bad: #f4a29c;
    --bad-soft: #402723;
    --ok-line: #a8db89;
    --warn-line: #f1c16c;
    --bad-line: #f4a29c;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0b1815;
  --surface: #11251f;
  --surface-2: #18322a;
  --surface-3: #24483b;
  --border: #2b4a3e;
  --border-strong: #668d7c;
  --text: #edf5f0;
  --text-2: #bfd3c6;
  --text-3: #99b8a7;
  --accent: #74d9b5;
  --accent-hover: #9ae8cb;
  --accent-soft: #1b3c30;
  --accent-text: #a6efd0;
  --on-accent: #0b241b;
  --ok: #a8db89;
  --ok-soft: #213622;
  --warn: #f1c16c;
  --warn-soft: #3b301b;
  --bad: #f4a29c;
  --bad-soft: #402723;
  --ok-line: #a8db89;
  --warn-line: #f1c16c;
  --bad-line: #f4a29c;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; scroll-padding-top: 88px; -webkit-tap-highlight-color: transparent; }
@media (pointer: fine) { html { overscroll-behavior: none; } }
body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
h1, h2, h3, p { margin: 0; }
h1, h2, h3 { font-family: var(--font-display); line-height: 1.2; letter-spacing: -0.01em; text-wrap: balance; }
p { text-wrap: pretty; }
button, input, select { font: inherit; color: inherit; touch-action: manipulation; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; }
a { color: var(--accent-text); text-underline-offset: 3px; }
[hidden] { display: none !important; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
code { font-family: var(--mono); font-size: 0.92em; }
.num { font-variant-numeric: tabular-nums; }
.muted { color: var(--text-3); }
.small { font-size: 14px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.icon { width: 1.15em; height: 1.15em; flex: none; display: inline-block; vertical-align: -0.2em; }

.skip-link { position: absolute; left: 16px; top: -60px; z-index: 50; padding: 10px 14px; border-radius: var(--r-md); background: var(--accent); color: var(--on-accent); font-weight: 600; text-decoration: none; }
.skip-link:focus { top: 12px; }

.brand { display: inline-flex; align-items: center; gap: 10px; font-family: var(--font-display); font-weight: 700; font-size: 18px; letter-spacing: -0.015em; color: var(--text); text-decoration: none; }
.brand-mark { width: 30px; height: 30px; border-radius: var(--r-md); display: grid; place-items: center; background: var(--accent); color: var(--on-accent); }
.brand-mark .icon { width: 18px; height: 18px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 16px; border-radius: var(--r-md); border: 1px solid transparent; font-weight: 600; font-size: 15px; white-space: nowrap; text-decoration: none; transition: background-color 0.15s var(--ease), border-color 0.15s var(--ease), color 0.15s var(--ease), transform 0.1s var(--ease); }
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-secondary { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.btn-secondary:hover:not(:disabled) { border-color: var(--text-3); background: var(--surface-2); }
.btn:disabled { opacity: 0.5; }
.btn-block { width: 100%; }
.btn-lg { min-height: 48px; font-size: 16px; }
.btn-sm { min-height: 36px; padding: 0 12px; font-size: 14px; }
.btn .spinner { display: none; }
.btn[aria-busy="true"] .spinner { display: inline-block; }
.btn[aria-busy="true"] .btn-trailing { display: none; }
.spinner { width: 16px; height: 16px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.link-btn { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 4px; border: 0; background: none; color: var(--accent-text); font-weight: 600; font-size: 14px; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; transition: text-decoration-color 0.15s var(--ease); }
.link-btn:hover { text-decoration-color: currentColor; }
.icon-btn { width: 40px; height: 40px; display: inline-grid; place-items: center; border-radius: var(--r-md); border: 1px solid var(--border); background: var(--surface); color: var(--text-2); transition: border-color 0.15s var(--ease), color 0.15s var(--ease); }
.icon-btn:hover { border-color: var(--text-3); color: var(--text); }

.field { display: grid; gap: 6px; }
.label, .field label { font-size: 14px; font-weight: 600; color: var(--text-2); }
.hint { font-size: 13px; color: var(--text-3); }
.field-error { font-size: 13px; font-weight: 600; color: var(--bad); display: flex; gap: 6px; align-items: center; }
.input-wrap { position: relative; display: flex; align-items: center; min-height: 44px; border-radius: var(--r-md); border: 1px solid var(--border-strong); background: var(--surface); transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease); }
.input-wrap:hover { border-color: var(--text-3); }
.input-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.input-wrap > .icon { margin-left: 12px; color: var(--text-3); }
.input-wrap input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border: 0; background: transparent; outline: none; }
.input-wrap .prefix { padding-left: 12px; color: var(--text-3); font-weight: 600; }
.input-wrap.is-invalid { border-color: var(--bad); }
.input-wrap.is-invalid:focus-within { box-shadow: 0 0 0 3px var(--bad-soft); }
.input-action { margin-right: 2px; width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--text-3); }
.input-action:hover { color: var(--text); }
.select { width: 100%; height: 44px; padding: 0 40px 0 12px; border-radius: var(--r-md); border: 1px solid var(--border-strong); background-color: var(--surface); color: var(--text); appearance: none; -webkit-appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--text-3) 50%), linear-gradient(135deg, var(--text-3) 50%, transparent 50%); background-position: calc(100% - 20px) 19px, calc(100% - 15px) 19px; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease); }
.select:hover { border-color: var(--text-3); }
.select:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.select option { background-color: var(--surface); color: var(--text); }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { min-height: 36px; padding: 0 12px; border-radius: var(--r-md); border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; transition: border-color 0.15s var(--ease), color 0.15s var(--ease), background-color 0.15s var(--ease); }
.chip:hover { border-color: var(--text-3); color: var(--text); }
.chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-text); }

.segmented { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); border: 1px solid var(--border-strong); border-radius: var(--r-md); overflow: hidden; background: var(--surface); }
.segmented label { position: relative; }
.segmented label + label { border-left: 1px solid var(--border-strong); }
.segmented input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.segmented span { display: grid; place-items: center; min-height: 42px; font-size: 15px; font-weight: 600; color: var(--text-2); font-variant-numeric: tabular-nums; transition: background-color 0.15s var(--ease), color 0.15s var(--ease); }
.segmented input:hover + span { background: var(--surface-2); color: var(--text); }
.segmented input:checked + span { background: var(--accent); color: var(--on-accent); }
.segmented input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: -4px; }
.segmented input:disabled + span { opacity: 0.5; }
.segmented-auto { display: inline-grid; grid-auto-flow: column; grid-template-columns: none; }
.segmented-auto span { padding: 0 14px; min-height: 38px; font-size: 14px; }

.badge { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 0 8px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; white-space: nowrap; background: var(--surface-2); color: var(--text-2); }
.badge .icon { width: 14px; height: 14px; }
.badge-ok { background: var(--ok-soft); color: var(--ok); }
.badge-warn { background: var(--warn-soft); color: var(--warn); }
.badge-bad { background: var(--bad-soft); color: var(--bad); }
.badge-accent { background: var(--accent-soft); color: var(--accent-text); }
.badge-dot::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.alert { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--r-md); font-size: 15px; line-height: 1.45; }
.alert .icon { margin-top: 2px; width: 18px; height: 18px; }
.alert-bad { background: var(--bad-soft); color: var(--bad); }
.alert-info { background: var(--surface); color: var(--text-2); border: 1px solid var(--border); }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 24px; }
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
.card-head h2 { font-size: 17px; font-weight: 650; }

.skeleton { position: relative; overflow: hidden; border-radius: var(--r-sm); background: var(--surface-2); }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.5), transparent); animation: shimmer 1.3s infinite; }
:root[data-theme="dark"] .skeleton::after { background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.05), transparent); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .skeleton::after { background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.05), transparent); } }
@keyframes shimmer { to { transform: translateX(100%); } }
.sk-line { height: 12px; }
.sk-title { height: 22px; width: 55%; }
.sk-block { height: 72px; }
.sk-stack { display: grid; gap: 12px; }

.empty { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 48px 16px; }
.empty > .icon { width: 32px; height: 32px; color: var(--text-3); margin-bottom: 4px; }
.empty h3 { font-size: 17px; }
.empty p { color: var(--text-3); max-width: 380px; }
.empty .btn { margin-top: 8px; }

.auth { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.auth-side { display: flex; flex-direction: column; justify-content: space-between; gap: 40px; padding: 40px 56px; background: var(--ink); color: var(--ink-text); }
.auth-side .brand { color: var(--ink-heading); }
.auth-side h2 { font-size: clamp(30px, 3vw, 42px); font-weight: 700; letter-spacing: -0.02em; color: var(--ink-heading); max-width: 16ch; }
.auth-side .lede { margin-top: 14px; font-size: 17px; line-height: 1.55; color: var(--ink-muted); max-width: 46ch; }
.policy-frame { border: 1px solid var(--ink-line); border-radius: var(--r-lg); background: var(--ink-2); overflow: hidden; max-width: 520px; }
.policy-frame-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--ink-line); font-size: 14px; color: var(--ink-muted); }
.policy-frame-head code { color: var(--ink-text); }
.policy-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.policy-table th { padding: 10px 16px; text-align: left; font-size: 13px; font-weight: 600; color: var(--ink-muted); background: transparent; border-bottom: 1px solid var(--ink-line); }
.policy-table td { padding: 11px 16px; border-bottom: 1px solid var(--ink-line); color: var(--ink-text); font-variant-numeric: tabular-nums; }
.policy-table tr:last-child td { border-bottom: 0; }
.policy-table .td-num, .policy-table .th-num { text-align: right; }
.policy-table .tone { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; vertical-align: 1px; }
.policy-table .tone-ok { background: var(--ink-ok); }
.policy-table .tone-warn { background: var(--ink-warn); }
.policy-table .tone-bad { background: var(--ink-bad); }
.policy-rules { margin: 0; padding: 14px 16px; border-top: 1px solid var(--ink-line); display: grid; gap: 6px; font-size: 14px; color: var(--ink-muted); list-style: none; }
.auth-foot { font-size: 14px; color: var(--ink-muted); }

.auth-panel { display: grid; place-items: center; padding: 40px 24px; }
.auth-card { width: 100%; max-width: 420px; }
.auth-card > .brand { display: none; margin-bottom: 32px; }
.auth-card h1 { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.auth-card > .lede { margin-top: 6px; margin-bottom: 24px; color: var(--text-3); }
.profile-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.profile { display: grid; gap: 2px; padding: 12px 14px; text-align: left; border-radius: var(--r-md); border: 1px solid var(--border-strong); background: var(--surface); transition: border-color 0.15s var(--ease), background-color 0.15s var(--ease); }
.profile:hover { border-color: var(--text-3); }
.profile[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent); }
.profile strong { display: flex; align-items: center; gap: 8px; font-size: 15px; }
.profile[aria-pressed="true"] strong { color: var(--accent-text); }
.profile small { font-size: 13px; color: var(--text-3); }
#loginForm { display: grid; gap: 16px; }
#loginAlert { margin-bottom: 16px; }
.fine-print { margin-top: 24px; font-size: 14px; color: var(--text-3); }

.topbar { position: sticky; top: 0; z-index: 10; background: var(--surface); border-bottom: 1px solid var(--border); }
.topbar-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: stretch; gap: 32px; }
.topbar-inner > .brand { align-self: center; }
.tabs { display: flex; gap: 4px; }
.tab { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 0; background: transparent; color: var(--text-3); font-weight: 600; font-size: 15px; transition: color 0.15s var(--ease); }
.tab::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px; background: transparent; transition: background-color 0.15s var(--ease); }
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { color: var(--text); }
.tab[aria-selected="true"]::after { background: var(--accent); }
.tab:focus-visible { outline-offset: -6px; }
.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.user-chip { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 700; background: var(--accent-soft); color: var(--accent-text); flex: none; }
.user-meta { display: grid; line-height: 1.25; }
.user-meta strong { font-size: 14px; }
.user-meta small { font-size: 13px; color: var(--text-3); }

.container { max-width: 1200px; margin: 0 auto; padding: 32px 24px 48px; outline: none; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.page-head h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.page-head p { margin-top: 6px; color: var(--text-3); max-width: 62ch; }
#viewerNotice { margin-bottom: 20px; }

.sim-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 24px; align-items: start; }
.sim-grid .result-card { position: sticky; top: 88px; min-height: 560px; }
#simForm { display: grid; gap: 20px; }
#simForm .card-head { margin-bottom: 0; }
#simSubmit { margin-top: 4px; }

.profile-card { min-height: 214px; padding: 16px; border-radius: var(--r-md); background: var(--surface-2); }
.pc-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pc-head .avatar { width: 40px; height: 40px; font-size: 14px; }
.pc-name { font-weight: 650; }
.pc-sub { font-size: 14px; color: var(--text-3); }
.pc-body { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; margin-top: 16px; }
.pc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 0; }
.pc-stats dt { font-size: 13px; color: var(--text-3); }
.pc-stats dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; }
.pc-flags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }

.score { position: relative; width: 88px; height: 88px; flex: none; }
.score svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.score circle { fill: none; stroke-width: 8; }
.score .track { stroke: var(--surface-3); }
.score .value { stroke-linecap: butt; transition: stroke-dashoffset 0.6s var(--ease); }
.score.is-ok .value { stroke: var(--ok-line); }
.score.is-warn .value { stroke: var(--warn-line); }
.score.is-bad .value { stroke: var(--bad-line); }
.score-label { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; }
.score-label strong { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.score-label small { font-size: 12px; color: var(--text-3); }
.score-sm { width: 68px; height: 68px; }
.score-sm .score-label strong { font-size: 17px; }

.result-status { display: grid; gap: 6px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
.result-status .badge { justify-self: start; }
.result-title { display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.result-title .icon { width: 26px; height: 26px; }
.result-title.is-ok { color: var(--ok); }
.result-title.is-warn { color: var(--warn); }
.result-title.is-bad { color: var(--bad); }
.result-text { color: var(--text-2); }
.result-lead { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; padding: 20px 0; border-bottom: 1px solid var(--border); }
.result-lead .figure-label { font-size: 14px; color: var(--text-3); }
.result-lead .figure-value { font-family: var(--font-display); font-size: 40px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.1; }
.result-lead .figure-sub { font-size: 14px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; }
.facts > div { padding: 14px 0; border-bottom: 1px solid var(--border); }
.facts > div:nth-child(odd) { padding-right: 16px; }
.facts > div:nth-child(even) { padding-left: 16px; border-left: 1px solid var(--border); }
.facts dt { font-size: 14px; color: var(--text-3); }
.facts dd { margin: 2px 0 0; font-size: 19px; font-weight: 650; font-variant-numeric: tabular-nums; }
.facts dd small { display: block; font-size: 13px; font-weight: 400; color: var(--text-3); }
.meter { padding: 18px 0; border-bottom: 1px solid var(--border); }
.meter-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 14px; color: var(--text-3); }
.meter-head strong { font-size: 17px; color: var(--text); font-variant-numeric: tabular-nums; }
.meter-track { position: relative; height: 8px; margin-top: 12px; border-radius: 2px; background: var(--surface-3); }
.meter-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 2px; background: var(--ok-line); width: 0; transition: width 0.6s var(--ease); }
.meter-fill.is-bad { background: var(--bad-line); }
.meter-limit { position: absolute; top: -5px; bottom: -5px; width: 2px; background: var(--text); left: 50%; }
.meter-scale { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.section-title { margin-top: 20px; font-size: 15px; font-weight: 650; }
.reasons { list-style: none; margin: 8px 0 0; padding: 0; }
.reasons li { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; }
.reasons li + li { border-top: 1px solid var(--border); }
.reasons .icon { margin-top: 3px; }
.reasons .is-ok { color: var(--ok); }
.reasons .is-warn { color: var(--warn); }
.reasons .is-bad { color: var(--bad); }
.result-foot { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--text-3); }

.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-group { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.toolbar .select { width: auto; min-width: 220px; height: 40px; background-position: calc(100% - 20px) 17px, calc(100% - 15px) 17px; }
.table-card { padding: 0; overflow: hidden; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; font-size: 13px; font-weight: 600; color: var(--text-3); padding: 12px 16px; background: var(--surface-2); border-bottom: 1px solid var(--border); white-space: nowrap; }
td { padding: 12px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--surface-2); }
.th-num, .td-num { text-align: right; font-variant-numeric: tabular-nums; }
.td-strong { font-weight: 600; }
.cell-sub { display: block; font-size: 13px; font-weight: 400; color: var(--text-3); }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--text-3); }
.pager-actions { display: flex; gap: 8px; }

.customer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.customer-card { display: grid; gap: 16px; align-content: start; }
.cc-body { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; }
.cc-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border); }

.app-footer { max-width: 1200px; margin: 0 auto; padding: 0 24px 32px; display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 14px; color: var(--text-3); }
.app-footer a { color: var(--text-2); }

@media (max-width: 1080px) {
  .sim-grid { grid-template-columns: 1fr; }
  .sim-grid .result-card { position: static; min-height: 0; }
}
@media (max-width: 960px) {
  .auth { grid-template-columns: 1fr; }
  .auth-side { display: none; }
  .auth-card > .brand { display: inline-flex; }
}
@media (max-width: 760px) {
  .topbar-inner { height: auto; flex-wrap: wrap; gap: 0 12px; padding: 10px 16px 0; }
  .topbar-inner > .brand { padding-bottom: 6px; }
  .tabs { order: 3; width: calc(100% + 32px); margin: 0 -16px; border-top: 1px solid var(--border); }
  .tab { flex: 1; justify-content: center; min-height: 48px; padding: 0 6px; }
  .user-meta, .logout-label { display: none; }
  .topbar-actions { padding-bottom: 6px; }
  .container { padding: 24px 16px 40px; }
  .page-head { flex-direction: column; align-items: flex-start; }
  .card { padding: 18px; }
  .segmented { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .segmented label:nth-child(4) { border-left: 0; }
  .segmented label:nth-child(n+4) { border-top: 1px solid var(--border-strong); }
  .segmented span, .segmented-auto span { min-height: 44px; }
  .chip, .btn, .btn-sm, .link-btn, .icon-btn, .topbar-inner > .brand, .app-footer a { min-height: 44px; }
  .app-footer a { display: inline-flex; align-items: center; }
  .icon-btn { width: 44px; height: 44px; }
  .facts { grid-template-columns: 1fr; }
  .facts > div:nth-child(odd), .facts > div:nth-child(even) { padding-left: 0; padding-right: 0; border-left: 0; }
  .pc-body, .cc-body { grid-template-columns: 1fr; justify-items: start; }
  .customer-grid { grid-template-columns: 1fr; }
  .toolbar .select { width: 100%; }
  .app-footer { padding: 0 16px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
`;
