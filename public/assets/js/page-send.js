/**
 * Send page — interactivity wired to the Beam API.
 * Blade renders the static layout; this hydrates the file list, toggles,
 * expiry segmented control and the send action (api.transfers.create).
 */
import { api, ApiError, toast, humanSize, ext, KIND, kindFromName, ic, paintStorage, usageState, hydrateUsage } from './beam.js';

const DEFAULT_SWITCHES = () => ({ pw: false, burn: false, notify: true });
const state = {
  files: [],                                   // { id, file, name, size, sizeBytes, kind }
  switches: DEFAULT_SWITCHES(),
  expiry: '7d',
  mode: 'email',                               // 'email' (notify recipients) | 'link' (just a shareable link)
  sending: false,
  sent: false,                                 // true while the "On the way" panel is shown
};
let seq = 0;

const $ = (s, r = document) => r.querySelector(s);
const refs = {};

function fileRowHtml(f, i) {
  const thumb = f.url
    ? `<div class="w-11 h-11 rounded-xl flex-none bg-cover bg-center ring-1 ring-ink-150" style="background-color:#ECEEF1;background-image:url('${f.url}')"></div>`
    : `<div class="w-11 h-11 rounded-xl flex items-center justify-center flex-none text-white font-mono font-bold text-[11px] uppercase shadow-sm" style="background:${KIND[f.kind] || KIND.default}">${ext(f.name)}</div>`;
  return `<div class="file-in group flex items-center gap-3 p-2 rounded-xl hover:bg-ink-50 transition-colors" style="animation-delay:${Math.min(i, 8) * 45}ms">
    ${thumb}
    <div class="flex-1 min-w-0">
      <div class="text-sm font-semibold text-ink-900 truncate">${f.name}</div>
      <div class="text-[11px] text-ink-400 mt-0.5"><span class="font-semibold uppercase tracking-wide">${ext(f.name)}</span> · ${f.size}</div>
    </div>
    <button type="button" data-remove="${i}" aria-label="Remove file" class="w-8 h-8 flex items-center justify-center rounded-full text-ink-400 hover:bg-danger-50 hover:text-danger-500 transition-colors flex-none">${ic('x', 'w-[18px] h-[18px]')}</button>
  </div>`;
}

function renderFiles() {
  refs.list.innerHTML = state.files.map((f, i) => fileRowHtml(f, i)).join('');
  syncFilesMeta();
}

// Update totals / empty-state / meter WITHOUT rebuilding the list (so removing one
// row doesn't re-run every other row's entrance animation — that was the flicker).
function syncFilesMeta() {
  const has = state.files.length > 0;
  refs.empty.classList.toggle('hidden', has);
  refs.list.classList.toggle('hidden', !has);
  refs.total.textContent = `${state.files.length} file${state.files.length === 1 ? '' : 's'} · ${humanSize(state.files.reduce((a, f) => a + f.sizeBytes, 0)) || '0 B'}`;
  updateStorageMeter();
  updateSend();
}

// Bound once (in init). Removes just the clicked row's node — no full re-render.
function onListClick(e) {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  const row = btn.closest('.file-in');
  const idx = row ? [...refs.list.children].indexOf(row) : -1;
  if (idx < 0) return;
  const [removed] = state.files.splice(idx, 1);
  if (removed && removed.url) URL.revokeObjectURL(removed.url);   // free the image preview
  row.remove();
  syncFilesMeta();
}

// Storage meter reflects REAL server usage (from beam.js / GET /api/usage) plus
// the bytes currently staged. Survives refresh & incognito (guests metered by IP).
function stagedBytes() { return state.files.reduce((a, f) => a + f.sizeBytes, 0); }
function updateStorageMeter() { paintStorage(stagedBytes()); }
function overQuota() { return usageState.loaded && stagedBytes() > usageState.remaining; }

function promptRegister(serverMsg) {
  const guest = usageState.scope === 'guest';
  toast(serverMsg || (guest
    ? 'Free 2 GB limit reached — create a free account to keep sending.'
    : 'Plan storage limit reached — upgrade to send more.'), 'danger');
  setTimeout(() => location.assign(guest ? '/login?mode=signup' : '/upgrade'), 1500);
}

function updateSend() {
  if (!refs.send || !refs.send.isConnected) return;   // form swapped out (sending/sent)
  const has = state.files.length > 0;
  const over = has && overQuota();
  const ready = has && !state.sending;
  refs.send.disabled = !ready;
  refs.send.className = 'mt-5 w-full h-[52px] rounded-full font-semibold text-[17px] flex items-center justify-center gap-2 transition ' +
    (!ready ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
      : over ? 'bg-danger-500 hover:bg-danger-600 text-white active:translate-y-px'
      : 'bg-spark-500 hover:bg-spark-600 text-ink-900 active:translate-y-px');
  refs.sendLabel.textContent = state.sending ? 'Uploading…'
    : !has ? 'Add files to send'
    : over ? (usageState.scope === 'guest' ? 'Free limit reached — register' : 'Limit reached — upgrade')
    : state.mode === 'link' ? 'Create link'
    : 'Encrypt & send';
}

const isPro = () => ['pro', 'business'].includes(String(usageState.plan || '').toLowerCase());

// Expiry presets (minutes). Rendered dynamically and filtered to the plan's real
// max — senders only ever see (and can pick) durations their plan allows, plus a
// free-form "Custom…" option. A plan with expiry_minutes:null = unlimited.
const EXPIRY_PRESETS = [
  { v: '1h',  label: '1 hour',  min: 60 },
  { v: '1d',  label: '1 day',   min: 1440 },
  { v: '3d',  label: '3 days',  min: 4320 },
  { v: '7d',  label: '7 days',  min: 10080 },
  { v: '30d', label: '30 days', min: 43200 },
  { v: '1y',  label: '1 year',  min: 525600 },
];
let plansCatalog = null;
let planLimits = { expiryMin: undefined, downloadLimit: undefined, name: '' };
let customExpiryMin = null;   // remembered custom value (minutes) while "Custom" is active

// Pull the (admin-editable) plan catalogue and read THIS sender's real limits.
async function loadPlanLimits() {
  if (!plansCatalog) {
    try { const r = await api.plans(); plansCatalog = r.plans || r || {}; }
    catch (e) { plansCatalog = {}; }
  }
  const key = String(usageState.plan || 'free').toLowerCase();
  const p = plansCatalog[key] || plansCatalog.free || {};
  planLimits = {
    expiryMin:     ('expiry_minutes' in p) ? p.expiry_minutes : undefined,
    downloadLimit: ('download_limit' in p) ? p.download_limit : undefined,
    name: p.name || '',
  };
  renderExpiry();
  paintLimitsInfo();
}

// Plan expiry cap in minutes: number, or null = unlimited. Until the plan loads
// (undefined) we default to a safe 7-day cap so we don't briefly over-offer.
function expiryCap() { const m = planLimits.expiryMin; return m === undefined ? 10080 : m; }

function fmtExpiryMin(min) {
  if (min == null) return 'never expire';
  if (min % 1440 === 0) { const d = min / 1440; if (d % 365 === 0) { const y = d / 365; return y + (y > 1 ? ' years' : ' year'); } return d + (d > 1 ? ' days' : ' day'); }
  if (min % 60 === 0) { const h = min / 60; return h + (h > 1 ? ' hours' : ' hour'); }
  return min + ' minute' + (min === 1 ? '' : 's');
}

function chipHtml(v, label, on) {
  return `<button type="button" data-expiry="${v}" class="expiry-chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[13px] font-medium transition-all ${on ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-150 text-ink-700 hover:border-ink-300'}">${label}</button>`;
}

// Render only the presets the plan allows (+ Forever if unlimited) + a Custom chip.
function renderExpiry() {
  const group = refs.expiryGroup; if (!group) return;
  const cap = expiryCap();
  const unlimited = cap === null;
  const presets = EXPIRY_PRESETS.filter((p) => unlimited || p.min <= cap);

  const valid = new Set(presets.map((c) => c.v));
  if (unlimited) valid.add('forever');
  const selIsCustom = typeof state.expiry === 'string' && state.expiry.startsWith('m:');
  if (!selIsCustom && !valid.has(state.expiry)) {
    state.expiry = valid.has('7d') ? '7d' : (presets.length ? presets[presets.length - 1].v : (unlimited ? 'forever' : '1h'));
  }

  let html = presets.map((c) => chipHtml(c.v, c.label, state.expiry === c.v)).join('');
  if (unlimited) html += chipHtml('forever', 'Forever', state.expiry === 'forever');
  html += chipHtml('__custom', 'Custom…', selIsCustom);
  group.innerHTML = html;
  group.querySelectorAll('[data-expiry]').forEach((b) => b.addEventListener('click', () => onExpiryClick(b.dataset.expiry)));

  renderCustomRow(selIsCustom);
  paintUpsell();
}

function defaultCustomMin() { const cap = expiryCap(); return cap === null ? 60 : Math.min(60, cap); }

function onExpiryClick(v) {
  if (v === '__custom') {
    // Seed the custom value from the currently-selected preset (or remembered
    // value), clamped to the plan cap — so it never opens above the max.
    if (!customExpiryMin) {
      const cur = EXPIRY_PRESETS.find((p) => p.v === state.expiry);
      customExpiryMin = cur ? cur.min : defaultCustomMin();
    }
    const cap = expiryCap();
    if (cap !== null && customExpiryMin > cap) customExpiryMin = cap;
    state.expiry = 'm:' + customExpiryMin;
  } else {
    state.expiry = v;
  }
  renderExpiry();
}

// Inline number + unit for a free-form expiry, clamped to the plan cap.
function renderCustomRow(show) {
  const row = $('#expiryCustomRow'); if (!row) return;
  if (!show) { row.classList.add('hidden'); row.classList.remove('flex'); row.innerHTML = ''; return; }
  const cap = expiryCap();
  const cur = customExpiryMin || defaultCustomMin();
  let unit = 'minutes', val = cur;
  if (cur % 1440 === 0) { unit = 'days'; val = cur / 1440; }
  else if (cur % 60 === 0) { unit = 'hours'; val = cur / 60; }
  const units = [['minutes', 'min'], ['hours', 'hrs'], ['days', 'days']];
  // Don't offer a unit bigger than the plan cap (avoids "1 days · max 3 hours").
  const unitOk = (u) => cap === null || (u === 'minutes') || (u === 'hours' && cap >= 60) || (u === 'days' && cap >= 1440);
  row.innerHTML = `
    <div class="flex items-center gap-2.5 flex-wrap bg-ink-50 border border-ink-150 rounded-xl px-3 py-2.5 w-full">
      <span class="text-[12px] font-medium text-ink-600">Expire after</span>
      <span class="inline-flex items-center rounded-lg border border-ink-200 bg-white overflow-hidden focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-500/20 transition">
        <input id="customExpiryVal" type="number" min="1" value="${val}" class="w-14 h-9 px-2.5 text-right text-[13px] font-mono font-semibold text-ink-900 bg-transparent border-0 outline-none">
        <select id="customExpiryUnit" class="h-9 pl-2 pr-1.5 text-[12px] font-semibold text-ink-600 bg-ink-50 border-0 border-l border-ink-200 outline-none cursor-pointer">
          ${units.filter((u) => unitOk(u[0])).map((u) => `<option value="${u[0]}" ${u[0] === unit ? 'selected' : ''}>${u[1]}</option>`).join('')}
        </select>
      </span>
      ${cap !== null ? `<span class="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 whitespace-nowrap">${ic('clock', 'w-3 h-3')}Max ${fmtExpiryMin(cap)}</span>` : ''}
    </div>`;
  row.classList.remove('hidden'); row.classList.add('flex', 'flex-wrap');

  const valEl = $('#customExpiryVal');
  const unitEl = $('#customExpiryUnit');
  const recompute = (notify) => {
    const per = unitEl.value === 'days' ? 1440 : unitEl.value === 'hours' ? 60 : 1;
    let n = Math.max(1, parseInt(valEl.value, 10) || 1);
    let mins = n * per;
    if (cap !== null && mins > cap) {
      n = Math.max(1, Math.floor(cap / per));   // largest value that fits the cap in this unit
      mins = n * per;
      valEl.value = n;                          // write the clamped value back — UI can't show over-max
      if (notify) toast(`Your plan allows up to ${fmtExpiryMin(cap)}.`, 'brand');
    }
    customExpiryMin = mins;
    state.expiry = 'm:' + mins;
  };
  valEl.addEventListener('input', () => recompute(false));
  valEl.addEventListener('blur', () => recompute(true));
  unitEl.addEventListener('change', () => recompute(true));
  customExpiryMin = cur; state.expiry = 'm:' + cur;   // sync state to what's shown
}

// Small line under the chips: the plan's real expiry cap + download limit,
// shown as tidy pills (not a run-on sentence).
function limitPill(icon, txt) {
  return `<span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-600 bg-ink-50 border border-ink-150 rounded-full px-2.5 py-1">${ic(icon, 'w-3.5 h-3.5 text-ink-400')}${txt}</span>`;
}
function paintLimitsInfo() {
  const el = $('[data-plan-limits]'); if (!el) return;
  const pills = [];
  if (planLimits.expiryMin !== undefined) pills.push(limitPill('clock', planLimits.expiryMin == null ? 'Never expires' : 'Up to ' + fmtExpiryMin(planLimits.expiryMin)));
  if (state.switches && state.switches.burn) pills.push(limitPill('zap', 'Single-use'));
  else if (planLimits.downloadLimit !== undefined) pills.push(limitPill('download', planLimits.downloadLimit == null ? 'Unlimited downloads' : `${planLimits.downloadLimit} downloads`));
  if (!pills.length) { el.classList.add('hidden'); el.classList.remove('flex'); return; }
  el.innerHTML = pills.join('');
  el.classList.remove('hidden'); el.classList.add('flex');
}

// "Need longer? Upgrade" hint when the plan can't reach the longer presets.
function paintUpsell() {
  const el = $('[data-expiry-upsell]'); if (!el) return;
  const cap = expiryCap();
  const hasLonger = cap !== null && EXPIRY_PRESETS.some((p) => p.min > cap);
  if (cap === null || !hasLonger) { el.classList.add('hidden'); return; }
  el.innerHTML = `Need longer than ${fmtExpiryMin(cap)}? <a href="/upgrade" class="font-semibold hover:underline">Upgrade →</a>`;
  el.classList.remove('hidden');
}

// Mode toggle: "Send email" (notify recipients) vs "Create link" (just a link).
// In link mode the email field is hidden and recipients are skipped.
function applyMode() {
  const field = $('#emailField');
  if (field) field.classList.toggle('hidden', state.mode === 'link');
  refs.modeToggle?.querySelectorAll('[data-mode]').forEach((b) => {
    const on = b.dataset.mode === state.mode;
    b.className = 'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-semibold transition-all ' +
      (on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700');
  });
  updateSend();
}

function bindMode() {
  refs.modeToggle = $('#modeToggle');
  refs.modeToggle?.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => { state.mode = b.dataset.mode; applyMode(); }));
  applyMode();
}

// Expiry chips are rendered dynamically (renderExpiry) and filtered to the plan.
function gateProExpiry() { renderExpiry(); }

// Recursively read dropped directory entries (webkitGetAsEntry) into a flat File[],
// tagging each with .relPath so the folder structure is preserved like the picker.
function readEntries(entries) {
  const out = [];
  const readDir = (dirReader) => new Promise((resolve) => {
    const acc = [];
    const pump = () => dirReader.readEntries((batch) => {
      if (!batch.length) return resolve(acc);
      acc.push(...batch); pump();                 // readEntries returns in chunks
    }, () => resolve(acc));
    pump();
  });
  const walk = async (entry) => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      try { file.relPath = entry.fullPath.replace(/^\/+/, ''); } catch (_) { /* read-only on some browsers */ }
      out.push(file);
    } else if (entry.isDirectory) {
      const kids = await readDir(entry.createReader());
      for (const k of kids) await walk(k);
    }
  };
  return (async () => { for (const e of entries) await walk(e); return out; })();
}

function addFiles(fileList) {
  // If a transfer was just sent, adding files starts a fresh one (resets the form).
  if (state.sent) restoreDeliverForm({ resetState: true });
  [...fileList].forEach((file) => {
    // Folder picks carry a webkitRelativePath like "deck/assets/logo.png" — keep it
    // as the display name so the folder structure is visible (and preserved on send).
  const relName = file.relPath || file.webkitRelativePath || file.name;
    const kind = kindFromName(file.name);
    const item = { id: ++seq, file, name: relName, sizeBytes: file.size, size: humanSize(file.size), kind };
    if (kind === 'image') item.url = URL.createObjectURL(file);   // real thumbnail preview
    state.files.push(item);
  });
  renderFiles();
}

function bindToggles() {
  document.querySelectorAll('[data-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.switch;
      state.switches[id] = !state.switches[id];
      btn.setAttribute('data-on', state.switches[id]);
      if (id === 'pw') syncPwField();
      if (id === 'burn') { paintLimitsInfo(); syncBurnHelp(); }   // burn changes the effective download cap
    });
  });
}

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

// Reflect state.switches onto the toggle buttons (after the form is rebuilt) and
// show/hide the access-code field accordingly.
function applySwitches() {
  document.querySelectorAll('[data-switch]').forEach((btn) => {
    btn.setAttribute('data-on', String(!!state.switches[btn.dataset.switch]));
  });
  syncPwField();
  syncBurnHelp();
}

// Swap the burn row's own subtitle when "Delete after download" is on — cleaner
// than an orphaned helper line below the divider.
function syncBurnHelp() {
  const sub = $('[data-sub="burn"]'); if (!sub) return;
  const on = !!(state.switches && state.switches.burn);
  sub.textContent = on ? 'Files are deleted right after the first download' : 'Burn after reading';
  sub.classList.toggle('whitespace-nowrap', !on);
}

// Restore the deliver form (after send / error). resetState=true clears the
// toggles + access code for a brand-new transfer; false keeps them for a retry.
function restoreDeliverForm({ resetState }) {
  if (resetState) state.switches = DEFAULT_SWITCHES();
  state.sending = false;
  state.sent = false;
  refs.deliver.innerHTML = refs.deliverHtml;
  rebindDeliver();
}

// Show/hide the access-code field with the Password-protect toggle.
function syncPwField() {
  const field = $('#pwField');
  const input = $('#pwInput');
  if (!field || !input) return;
  const on = !!state.switches.pw;
  field.classList.toggle('hidden', !on);
  if (on && !input.value.trim()) input.value = genCode();   // seed a code the first time
  if (on) input.focus();
}

function bindExpiry() { renderExpiry(); }

function sendingPanelHtml(pct) {
  return `<p class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 mb-2">Sending</p>
    <div class="flex flex-col gap-4 mt-2">
      <div>
        <div class="flex justify-between items-baseline mb-1.5">
          <span class="text-[13px] font-medium text-ink-900">${pct < 18 ? 'Encrypting…' : 'Uploading'}</span>
          <span class="font-mono text-xs text-ink-400" data-prog-meta></span>
        </div>
        <div class="h-2 bg-ink-100 rounded-full overflow-hidden ${pct < 12 ? 'indet' : ''}"><div data-prog-bar class="h-full bg-brand-500 rounded-full transition-all duration-300" style="width:${pct < 12 ? 35 : pct}%"></div></div>
      </div>
      <p class="text-[13px] text-ink-400">Keep this tab open. Files are encrypted in your browser before they leave your device.</p>
    </div>`;
}

function sentPanelHtml(t) {
  return `<div class="text-center">
    <div class="relative w-[72px] h-[72px] mx-auto mb-3">
      <span class="spark" style="--dx:44px;--dy:0"></span>
      <span class="spark" style="--dx:31px;--dy:31px;width:5px;height:5px"></span>
      <span class="spark" style="--dx:0;--dy:46px"></span>
      <span class="spark" style="--dx:-31px;--dy:31px;width:5px;height:5px;background:#fff"></span>
      <span class="spark" style="--dx:-44px;--dy:0"></span>
      <span class="spark" style="--dx:-31px;--dy:-31px;width:5px;height:5px"></span>
      <span class="spark" style="--dx:0;--dy:-46px;background:#fff"></span>
      <span class="spark" style="--dx:31px;--dy:-31px;width:5px;height:5px"></span>
      <div class="success-badge w-[72px] h-[72px] rounded-2xl bg-spark-500 text-ink-900 flex items-center justify-center shadow-[0_8px_24px_rgba(198,255,61,.4)]">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="success-check" d="M20 6L9 17l-5-5"/></svg>
      </div>
    </div>
    <h2 class="font-display font-bold text-[22px] text-ink-900 tracking-tight">On the way</h2>
    <p class="text-ink-400 text-sm mt-1">${t.fileCount} files · ${t.total}</p>
    <div class="flex items-center gap-2.5 bg-ink-50 border border-ink-150 rounded-xl py-2 pl-3.5 pr-2 mt-4">
      <span class="font-mono text-[13px] text-brand-600 flex-1 min-w-0 text-left truncate">${t.linkDisplay}</span>
      <button type="button" data-copy="${t.linkFull}" class="flex items-center gap-2 h-[34px] px-3.5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-[13px] font-semibold whitespace-nowrap transition-colors">${ic('check', 'w-[15px] h-[15px]')}Copy link</button>
    </div>
    ${t.code ? `<div class="flex items-center justify-between gap-2.5 bg-ink-900 rounded-xl py-2.5 px-3.5 mt-2.5">
      <div class="text-left"><div class="text-[10px] font-semibold tracking-[.08em] uppercase text-ink-400">Access code</div><div class="font-mono font-bold text-lg text-spark-500 tracking-[.2em] leading-tight">${t.code}</div></div>
      <button type="button" data-copy-code="${t.code}" class="h-[34px] px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold whitespace-nowrap transition-colors">Copy code</button>
    </div>
    <p class="text-[11px] text-ink-400 mt-1.5">Share this code separately — recipients need it to unlock.</p>` : ''}
    <div class="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-ink-100">
      <div data-qr data-qr-url="${t.linkFull}" class="p-3 bg-white rounded-xl ring-1 ring-ink-150"></div>
      <span class="text-[11px] text-ink-400">Scan to open this transfer on any device</span>
    </div>
    <button type="button" data-reset class="mt-4 h-[42px] px-5 rounded-full text-ink-700 hover:bg-ink-100 text-sm font-semibold transition-colors">New transfer</button>
  </div>`;
}

async function doSend() {
  if (!state.files.length || state.sending) return;

  // Strict quota gate — block before uploading and push guests to register.
  if (overQuota()) { promptRegister(); return; }

  // Guests: require a name (asked once, then remembered) so the transfer isn't anonymous.
  if (!api.authenticated && !guestName()) {
    toast('Add your name so recipients know who sent it.', 'danger');
    const fi = $('#fromInput'); if (fi) { fi.focus(); }
    return;
  }

  // Read the form fields BEFORE swapping the panel — they live inside
  // #deliverPanel, which the sending UI replaces below.
  const message = ($('#msgInput')?.value || '').trim();
  // In "Create link" mode we don't email anyone, so recipients are ignored.
  const recipients = state.mode === 'link'
    ? []
    : ($('#emailInput')?.value || '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

  // "Send email" mode needs at least one valid recipient.
  if (state.mode === 'email') {
    const bad = recipients.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (!recipients.length) {
      toast('Add at least one recipient email — or switch to “Create link”.', 'danger');
      $('#emailInput')?.focus();
      return;
    }
    if (bad) { toast(`“${bad}” doesn’t look like a valid email.`, 'danger'); $('#emailInput')?.focus(); return; }
  }
  const senderName = api.authenticated ? undefined : guestName();

  state.sending = true; updateSend();
  // Capture the access code (if password protection is on) before the panel swaps.
  const accessCode = state.switches.pw ? (($('#pwInput')?.value || '').trim() || genCode()) : undefined;
  refs.deliver.innerHTML = sendingPanelHtml(1);
  const metaEl = () => $('[data-prog-meta]', refs.deliver);
  const barEl = () => $('[data-prog-bar]', refs.deliver);
  const totalBytes = state.files.reduce((a, f) => a + f.sizeBytes, 0);

  try {
    const t = await api.transfers.create({
      files: state.files.map((f) => f.file),
      message: message || undefined,
      title: message || undefined,
      recipients,
      senderName,
      expiry: state.expiry,
      password: accessCode,
      burn: state.switches.burn, notify: state.switches.notify,
      branded: true,   // backend applies the sender's brand only if they're Pro + branding enabled
      onProgress: (p) => { if (barEl()) barEl().style.width = Math.max(p, 2) + '%'; if (metaEl()) metaEl().textContent = `${humanSize(Math.round(totalBytes * p / 100))} / ${humanSize(totalBytes)}`; },
    });
    refs.deliver.innerHTML = sentPanelHtml({
      // Full link keeps the real scheme (http on localhost) so the copied URL works;
      // the displayed version just drops the scheme for looks.
      linkFull: t.link || (location.origin + '/r/new'),
      linkDisplay: (t.link || '').replace(/^https?:\/\//, '') || 'beam.to/r/new',
      code: accessCode,
      total: humanSize(t.total_bytes ?? totalBytes),
      fileCount: (t.files || state.files).length,
    });
    wireSentPanel();
    toast('Transfer sent — link ready to share', 'success');
    state.sent = true;
    state.files = [];          // clear the left list so it doesn't look like a pending transfer
    renderFiles();
    hydrateUsage();   // refresh the meter with the new server-side usage
  } catch (e) {
    restoreDeliverForm({ resetState: false });   // keep files + options for a retry
    updateSend();
    if (e instanceof ApiError && (e.code === 'guest_used' || e.code === 'guest_quota_exceeded' || e.code === 'quota_exceeded')) {
      if (e.code === 'guest_used') { try { localStorage.setItem('beam.guestUsed', '1'); localStorage.removeItem('beam.gateChoice'); } catch (_) {} }
      promptRegister(e.first);                          // limit hit server-side
    } else {
      toast(e instanceof ApiError ? e.first : (e?.message || 'Could not reach the API — is the server running?'), 'danger');
    }
  }
}

function wireSentPanel() {
  $('[data-reset]', refs.deliver)?.addEventListener('click', () => {
    state.files = [];
    restoreDeliverForm({ resetState: true });
    renderFiles();
  });
  $('[data-copy]', refs.deliver)?.addEventListener('click', (e) => {
    const link = e.currentTarget.dataset.copy;
    // Already a full URL from the API — copy as-is (no hardcoded https).
    const full = /^https?:\/\//.test(link) ? link : (location.origin + '/' + link.replace(/^\/+/, ''));
    navigator.clipboard?.writeText(full).catch(() => {});
    toast('Link copied', 'spark');
  });
  $('[data-copy-code]', refs.deliver)?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(e.currentTarget.dataset.copyCode).catch(() => {});
    toast('Access code copied', 'spark');
  });
  // Render the QR straight away (shown by default on the success panel).
  const qrHolder = $('[data-qr]', refs.deliver);
  if (qrHolder) {
    const raw = qrHolder.dataset.qrUrl || '';
    const url = /^https?:\/\//.test(raw) ? raw : (location.origin + '/' + raw.replace(/^\/+/, ''));
    try { window.BeamQR.render(qrHolder, url, 132); }
    catch (err) { qrHolder.textContent = 'QR unavailable'; }
  }
}

// Wire the access-code field's "New code" button (re-bound after each panel rebuild).
function wirePwField() {
  $('#pwRegen')?.addEventListener('click', () => { const i = $('#pwInput'); if (i) { i.value = genCode(); i.focus(); } });
}

const GUEST_NAME_KEY = 'beam.guestName';
// Guests send anonymously by default — ask their name once (persisted) so the
// recipient (and the stored transfer) shows who it's from instead of "Guest".
function initGuestName() {
  const field = $('#fromField');
  const input = $('#fromInput');
  if (!field || !input) return;
  if (api.authenticated) { field.classList.add('hidden'); return; }   // signed-in: account name is used
  field.classList.remove('hidden');
  field.classList.add('flex');
  input.value = localStorage.getItem(GUEST_NAME_KEY) || '';
  input.addEventListener('input', () => localStorage.setItem(GUEST_NAME_KEY, input.value.trim()));
}
function guestName() { return (localStorage.getItem(GUEST_NAME_KEY) || '').trim(); }

function rebindDeliver() {
  refs.expiryGroup = $('#expiryGroup');
  refs.send = $('#sendBtn');
  refs.sendLabel = $('#sendBtnLabel');
  bindToggles(); bindExpiry();
  refs.send.addEventListener('click', doSend);
  wirePwField(); applySwitches();
  bindMode();
}

document.addEventListener('DOMContentLoaded', () => {
  refs.list = $('#fileList');
  refs.list?.addEventListener('click', onListClick);   // delegated remove (bound once)
  refs.empty = $('#fileEmpty');
  refs.total = $('#fileTotal');
  refs.deliver = $('#deliverPanel');
  refs.deliverHtml = refs.deliver.innerHTML;            // snapshot to restore after send
  refs.expiryGroup = $('#expiryGroup');
  refs.send = $('#sendBtn');
  refs.sendLabel = $('#sendBtnLabel');
  refs.pick = $('#filepick');
  refs.folderPick = $('#folderpick');
  const dz = $('#dz');
  const dzTitle = $('[data-dz-title]', dz);
  const dzTitleText = dzTitle ? dzTitle.textContent : '';

  document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => refs.pick.click()));
  document.querySelectorAll('[data-pick-folder]').forEach((b) => b.addEventListener('click', () => refs.folderPick.click()));
  dz.addEventListener('click', () => refs.pick.click());
  // Depth counter so moving over child elements doesn't flicker the active state.
  let dragDepth = 0;
  const dzOn = () => { dz.classList.add('active'); if (dzTitle) dzTitle.textContent = 'Release to add files'; };
  const dzOff = () => { dz.classList.remove('active'); if (dzTitle) dzTitle.textContent = dzTitleText; };
  dz.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; dzOn(); });
  dz.addEventListener('dragover', (e) => e.preventDefault());
  dz.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dzOff(); });
  dz.addEventListener('drop', async (e) => {
    e.preventDefault(); dragDepth = 0; dzOff();
    // If a folder was dropped, traverse its entries (preserving paths); else plain files.
    const items = e.dataTransfer.items;
    if (items && items.length && typeof items[0].webkitGetAsEntry === 'function') {
      const entries = [...items].map((it) => it.webkitGetAsEntry()).filter(Boolean);
      if (entries.some((en) => en && en.isDirectory)) {
        try { addFiles(await readEntries(entries)); return; } catch (_) { /* fall through */ }
      }
    }
    addFiles(e.dataTransfer.files);
  });
  refs.pick.addEventListener('change', () => { addFiles(refs.pick.files); refs.pick.value = ''; });
  refs.folderPick?.addEventListener('change', () => { addFiles(refs.folderPick.files); refs.folderPick.value = ''; });

  bindToggles(); bindExpiry();
  refs.send.addEventListener('click', doSend);
  wirePwField(); applySwitches();
  bindMode();
  initGuestName();
  renderFiles();

  // Re-gate expiry chips + plan limits once real plan info arrives (usage hydrates async).
  loadPlanLimits();
  document.addEventListener('beam:usage', loadPlanLimits);
});
