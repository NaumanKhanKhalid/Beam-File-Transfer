/**
 * Admin page — subscribers table + add/assign modal.
 * Renders from a local list (seeded server-side, hydrated from
 * api.admin.subscribers when signed in as admin). Mutations update the list
 * and call the admin API best-effort (works once rows carry a real id).
 */
import { api, ApiError, toast, initialsOf, ic } from './beam.js';

const $ = (s, r = document) => r.querySelector(s);
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const PRICE = { Free: 0, Pro: 599, Business: 1499 };
const STAT = { active: ['success', 'Active'], past_due: ['warning', 'Past due'], canceled: ['danger', 'Canceled'] };
const BADGE = { success: 'bg-success-50 text-success-700', warning: 'bg-warning-50 text-warning-700', danger: 'bg-danger-50 text-danger-700', neutral: 'bg-ink-100 text-ink-600' };
const badge = (tone, label) => `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE[tone] || BADGE.neutral}"><span class="w-1.5 h-1.5 rounded-full bg-current"></span>${label}</span>`;

let users = [];
let modal = null;

/* ---- Confirm dialog (guards accidental destructive clicks) ---------------- */
function confirmAction({ title, body, confirmLabel = 'Confirm', tone = 'danger' }) {
  return new Promise((resolve) => {
    const toneCls = tone === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 text-white'
      : 'bg-spark-500 hover:bg-spark-600 text-ink-900';
    const root = $('#adminModalRoot');
    root.innerHTML = `<div class="fixed inset-0 z-[60] flex items-center justify-center p-6" style="background:rgba(14,15,18,.55)" data-c-overlay>
      <div class="fade-in bg-white rounded-2xl shadow-xl w-[400px] max-w-full p-6">
        <h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">${title}</h3>
        <p class="text-[13.5px] text-ink-500 leading-relaxed mt-1.5">${body}</p>
        <div class="flex gap-2.5 mt-6">
          <button type="button" data-c-no class="flex-1 h-[44px] rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 font-semibold text-[14px] transition-colors">Keep it</button>
          <button type="button" data-c-yes class="flex-1 h-[44px] rounded-full ${toneCls} font-semibold text-[14px] transition-colors">${confirmLabel}</button>
        </div>
      </div>
    </div>`;
    const done = (val) => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); resolve(val); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onKey);
    root.querySelector('[data-c-overlay]').addEventListener('click', (e) => { if (e.target === e.currentTarget) done(false); });
    root.querySelector('[data-c-no]').addEventListener('click', () => done(false));
    root.querySelector('[data-c-yes]').addEventListener('click', () => done(true));
  });
}

/* ---- API best-effort (no-op without an id / backend) --------------------- */
const planKey = (p) => (p || '').toLowerCase();
async function apiTry(fn) { try { await fn(); } catch (e) { /* demo / offline: local state already updated */ } }

/* ---- Render -------------------------------------------------------------- */
function renderMetrics() {
  const active = users.filter((u) => u.status === 'active');
  const paying = users.filter((u) => u.mrr > 0);
  const mrr = users.reduce((a, u) => a + (u.status === 'active' ? u.mrr : 0), 0);
  const churned = users.filter((u) => u.status === 'canceled').length;
  const metric = (icon, tone, k, v, sub) => {
    const chip = { success: 'bg-success-50 text-success-600', brand: 'bg-brand-50 text-brand-500', spark: 'bg-spark-500/20 text-spark-600', danger: 'bg-danger-50 text-danger-500' }[tone] || 'bg-ink-100 text-ink-500';
    return `<div class="bg-white border border-ink-100 rounded-2xl px-5 py-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400">${k}</div>
        <span class="w-7 h-7 rounded-lg flex items-center justify-center ${chip}">${ic(icon, 'w-[15px] h-[15px]')}</span>
      </div>
      <div class="font-display font-bold text-[28px] text-ink-900 tracking-tight mt-1.5">${v}</div>
      <div class="text-[12px] text-ink-400">${sub}</div>
    </div>`;
  };
  $('#adminMetrics').innerHTML =
    metric('zap', 'success', 'MRR', money(mrr), 'monthly recurring') +
    metric('users', 'brand', 'Active subs', active.length, 'paying & free') +
    metric('crown', 'spark', 'Paying customers', paying.length, 'Pro + Business') +
    metric('trash', 'danger', 'Churned', churned, 'this period');
}

function renderRows() {
  $('#adminRows').innerHTML = users.map((u, i) => {
    const [st, sl] = STAT[u.status] || STAT.active;
    return `<tr class="border-b border-ink-100 last:border-0 hover:bg-ink-50 transition-colors">
      <td class="py-3 pl-5 pr-3"><div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-full bg-brand-500 text-white font-display font-bold text-xs flex items-center justify-center flex-none">${u.initials || initialsOf(u.name)}</span>
        <div class="min-w-0"><div class="text-sm font-semibold text-ink-900 truncate">${u.name}</div><div class="text-[12px] text-ink-400 truncate">${u.email}</div></div>
      </div></td>
      <td class="px-3"><select data-plan-sel="${i}" class="text-[13px] font-semibold rounded-lg border border-ink-150 bg-white px-2.5 py-1.5 text-ink-900 outline-none focus:border-brand-500 cursor-pointer">${planNames().map((p) => `<option ${u.plan === p ? 'selected' : ''}>${p}</option>`).join('')}</select></td>
      <td class="px-3">${badge(st, sl)}</td>
      <td class="px-3 font-mono text-[13px] text-ink-700">${u.mrr > 0 ? money(u.mrr) + '/mo' : '—'}</td>
      <td class="px-3 text-[13px] text-ink-400 whitespace-nowrap">${u.since || '—'}</td>
      <td class="px-3 pr-5 text-right whitespace-nowrap">
        ${u.status === 'active'
          ? `<button data-cancel="${i}" class="h-8 px-3 rounded-full text-[12px] font-semibold text-danger-700 hover:bg-danger-50 transition-colors">Cancel</button>`
          : `<button data-react="${i}" class="h-8 px-3 rounded-full text-[12px] font-semibold text-success-700 hover:bg-success-50 transition-colors">Reactivate</button>`}
        <button data-remove="${i}" aria-label="Remove" class="h-8 w-8 inline-flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-danger-500 transition-colors">${ic('trash', 'w-4 h-4')}</button>
      </td>
    </tr>`;
  }).join('');

  $('#adminRows').querySelectorAll('[data-plan-sel]').forEach((s) => s.addEventListener('change', () => setPlan(+s.dataset.planSel, s.value)));
  $('#adminRows').querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => cancel(+b.dataset.cancel)));
  $('#adminRows').querySelectorAll('[data-react]').forEach((b) => b.addEventListener('click', () => reactivate(+b.dataset.react)));
  $('#adminRows').querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => remove(+b.dataset.remove)));
}

function render() { renderMetrics(); renderRows(); }

/* ---- Mutations ----------------------------------------------------------- */
// Plan names offered in the row dropdown (from the live catalogue, fallback to base 3).
function planNames() { return plansData.length ? plansData.map((p) => p.name) : ['Free', 'Pro', 'Business']; }
// MRR for a plan name (yearly price preferred), from the live catalogue.
function priceForName(name) {
  const p = plansData.find((x) => x.name === name);
  if (p) return +(p.yearly || p.monthly) || 0;
  return PRICE[name] || 0;
}
function setPlan(i, plan) {
  const u = users[i]; if (!u) return;
  u.plan = plan;
  u.mrr = priceForName(plan);
  if (u.mrr > 0 && u.status === 'canceled') u.status = 'active';
  render(); toast(`${u.name} moved to ${plan}`, 'brand');
  if (u.id) apiTry(() => api.admin.updateSubscriber(u.id, { plan: planKey(plan) }));
}
async function cancel(i) {
  const u = users[i]; if (!u) return;
  const ok = await confirmAction({ title: 'Cancel subscription?', body: `${u.name}’s plan will be canceled and their MRR drops to ₹0. You can reactivate later.`, confirmLabel: 'Cancel subscription' });
  if (!ok) return;
  u.status = 'canceled'; u.mrr = 0; render(); toast(`${u.name}'s subscription canceled`, 'danger');
  if (u.id) apiTry(() => api.admin.updateSubscriber(u.id, { status: 'canceled' }));
}
function reactivate(i) {
  const u = users[i]; if (!u) return;
  u.status = 'active'; if (u.plan !== 'Free') u.mrr = priceForName(u.plan); render(); toast(`${u.name} reactivated`, 'success');
  if (u.id) apiTry(() => api.admin.updateSubscriber(u.id, { status: 'active' }));
}
async function remove(i) {
  const u = users[i]; if (!u) return;
  const ok = await confirmAction({ title: 'Remove subscriber?', body: `${u.name} (${u.email}) will be removed from the list. This can’t be undone.`, confirmLabel: 'Remove' });
  if (!ok) return;
  users.splice(i, 1); render(); toast(`${u.name} removed`, 'brand');
  if (u.id) apiTry(() => api.admin.removeSubscriber(u.id));
}

/* ---- Add / assign modal -------------------------------------------------- */
function openAdd() {
  const hasCandidates = users.some((u) => u.plan === 'Free' || u.status === 'canceled');
  modal = { mode: hasCandidates ? 'existing' : 'new', userIndex: '', plan: 'Pro', status: 'active' };
  renderModal();
}
function closeModal() { modal = null; $('#adminModalRoot').innerHTML = ''; }

function renderModal() {
  if (!modal) return;
  const m = modal;
  const candidates = users.map((u, i) => ({ u, i })).filter((o) => o.u.plan === 'Free' || o.u.status === 'canceled');
  const tab = (mode, label) => `<button type="button" data-mode="${mode}" class="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${m.mode === mode ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}">${label}</button>`;
  const field = (label, id, ph) => `<label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">${label}</span><input id="${id}" placeholder="${ph}" class="h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>`;
  const sel = (label, field, val, opts) => `<label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">${label}</span><select data-field="${field}" class="h-11 px-3 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 cursor-pointer">${opts.map((o) => `<option value="${o[0]}" ${val === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
  const existingBlock = candidates.length
    ? `<label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Customer</span>
        <select data-pick class="h-11 px-3 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 cursor-pointer">
          <option value="">Select a customer…</option>
          ${candidates.map((o) => `<option value="${o.i}" ${String(m.userIndex) === String(o.i) ? 'selected' : ''}>${o.u.name} · ${o.u.email} (${o.u.plan === 'Free' ? 'on Free' : 'canceled'})</option>`).join('')}
        </select></label>`
    : `<div class="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-5 text-center text-[13px] text-ink-400">Everyone already has an active plan. Add a new customer instead.</div>`;
  const newBlock = field('Full name', 'amName', 'Aria Bose') + field('Email', 'amEmail', 'aria@studio.co');

  $('#adminModalRoot').innerHTML = `<div class="fixed inset-0 z-[55] flex items-center justify-center p-6" style="background:rgba(14,15,18,.55)" data-overlay>
    <div class="fade-in bg-white rounded-2xl shadow-xl w-[460px] max-w-full p-6">
      <div class="flex items-center justify-between mb-1"><h3 class="font-display font-bold text-xl text-ink-900 tracking-tight whitespace-nowrap">Assign a subscription</h3>
        <button type="button" data-close class="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 transition-colors">${ic('x', 'w-5 h-5')}</button></div>
      <p class="text-[13px] text-ink-400 mb-4">Pick who to subscribe, then choose their plan.</p>
      <div class="flex gap-1 bg-ink-100 rounded-xl p-1 mb-4">${tab('existing', 'Existing customer')}${tab('new', 'New customer')}</div>
      <div class="flex flex-col gap-3.5">
        ${m.mode === 'existing' ? existingBlock : newBlock}
        <div class="grid grid-cols-2 gap-3.5">
          ${sel('Plan', 'plan', m.plan, [['Pro', 'Pro — ₹599/mo'], ['Business', 'Business — ₹1,499/mo'], ['Free', 'Free']])}
          ${sel('Status', 'status', m.status, [['active', 'Active'], ['past_due', 'Past due'], ['canceled', 'Canceled']])}
        </div>
      </div>
      <div class="flex gap-2.5 mt-6">
        <button type="button" data-close class="flex-1 h-[46px] rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 font-semibold text-[15px] transition-colors">Cancel</button>
        <button type="button" data-save class="flex-1 h-[46px] rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 font-semibold text-[15px] transition-colors">${m.mode === 'existing' ? 'Assign plan' : 'Add & subscribe'}</button>
      </div>
    </div>
  </div>`;

  const root = $('#adminModalRoot');
  root.querySelector('[data-overlay]').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { modal.mode = b.dataset.mode; modal.userIndex = ''; renderModal(); }));
  root.querySelectorAll('[data-field]').forEach((s) => s.addEventListener('change', () => { modal[s.dataset.field] = s.value; }));
  root.querySelector('[data-pick]')?.addEventListener('change', (e) => { modal.userIndex = e.target.value === '' ? '' : +e.target.value; });
  root.querySelector('[data-save]').addEventListener('click', saveModal);
}

function saveModal() {
  const m = modal; if (!m) return;
  const plan = m.plan, status = m.status;
  const mrr = status !== 'active' ? 0 : PRICE[plan];
  if (m.mode === 'existing') {
    if (m.userIndex === '' || m.userIndex == null) { toast('Select a customer first.', 'danger'); return; }
    const u = users[m.userIndex]; if (!u) return;
    u.plan = plan; u.status = status; u.mrr = mrr;
    if (u.id) apiTry(() => api.admin.updateSubscriber(u.id, { plan: planKey(plan), status }));
    closeModal(); render(); toast(`${u.name} subscribed to ${plan}`, 'success');
  } else {
    const name = ($('#amName') || {}).value || '';
    const email = ($('#amEmail') || {}).value || '';
    if (!name.trim()) { toast('Enter a name.', 'danger'); return; }
    if (!email.includes('@')) { toast('Enter a valid email.', 'danger'); return; }
    const u = { name: name.trim(), email: email.trim(), plan, status, mrr, since: 'Jun 2026', initials: initialsOf(name) };
    users.unshift(u);
    apiTry(() => api.admin.addSubscriber({ name: u.name, email: u.email, plan: planKey(plan), status }));
    closeModal(); render(); toast(`${u.name} added & subscribed to ${plan}`, 'success');
  }
}

/* ---- Plans management (DB-backed: create / edit / delete) ---------------- */
let plansData = [];        // array of { key?, name, monthly, yearly, max_bytes, expiry_days, branding, _new?, _dirty? }
const GB = 1024 * 1024 * 1024;

function defaultPlans() {
  return [
    { key: 'free',     name: 'Free',     monthly: 0,    yearly: 0,    max_bytes: 2 * GB,    expiry_days: 7,    branding: false },
    { key: 'pro',      name: 'Pro',      monthly: 749,  yearly: 599,  max_bytes: 200 * GB,  expiry_days: 365,  branding: true },
    { key: 'business', name: 'Business', monthly: 1899, yearly: 1499, max_bytes: 1024 * GB, expiry_days: 3650, branding: true },
  ];
}

function plansFromApi(obj) {
  // API returns an assoc keyed by plan key → convert to ordered array.
  return Object.entries(obj || {}).map(([key, v]) => ({ key, ...v }));
}

// Keep the MRR map (rows / reactivate) in sync with edited prices.
function syncPriceMap() {
  const byName = (n) => plansData.find((p) => p.name === n);
  PRICE.Free = +(byName('Free')?.monthly) || 0;
  PRICE.Pro = +(byName('Pro')?.yearly ?? byName('Pro')?.monthly) || 0;
  PRICE.Business = +(byName('Business')?.yearly ?? byName('Business')?.monthly) || 0;
}

function renderPlans() {
  const host = $('#adminPlans');
  if (!host) return;
  const row = (pi, key, label, val, suffix = '') =>
    `<label class="flex items-center justify-between gap-2 py-1.5">
      <span class="text-[12px] text-ink-500">${label}</span>
      <span class="flex items-center gap-1.5">
        <input data-pf="${pi}:${key}" value="${val}" inputmode="decimal"
          class="w-[88px] h-8 px-2.5 text-right rounded-lg border border-ink-200 text-[13px] font-mono text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20 transition">
        <span class="text-[11px] text-ink-400 w-8">${suffix}</span>
      </span>
    </label>`;
  host.innerHTML = plansData.map((p, pi) => {
    const accent = p.branding ? 'border-brand-200' : 'border-ink-150';
    return `<div data-plan-card="${pi}" class="rounded-2xl border ${accent} bg-white p-4 flex flex-col">
      <div class="flex items-center gap-2 mb-3">
        <input data-pf="${pi}:name" value="${p.name}" placeholder="Plan name"
          class="flex-1 min-w-0 font-display font-bold text-[16px] text-ink-900 bg-transparent border-b border-transparent hover:border-ink-150 focus:border-brand-500 outline-none transition pb-0.5">
        <button type="button" data-plan-del="${pi}" aria-label="Delete plan" class="w-8 h-8 flex items-center justify-center rounded-full text-ink-300 hover:bg-danger-50 hover:text-danger-500 transition-colors flex-none">${ic('trash', 'w-4 h-4')}</button>
      </div>
      <div class="border-t border-ink-100 pt-1">
        ${row(pi, 'monthly', 'Monthly', p.monthly, '₹')}
        ${row(pi, 'yearly', 'Yearly', p.yearly, '₹/mo')}
        ${row(pi, 'gb', 'Storage', Math.round((p.max_bytes / GB) * 10) / 10, 'GB')}
        ${row(pi, 'expiry_days', 'Expiry', p.expiry_days, 'days')}
      </div>
      <label class="flex items-center justify-between gap-2 py-2 mt-1 border-t border-ink-100">
        <span class="text-[12px] text-ink-500">Custom branding</span>
        <button type="button" data-plan-brand="${pi}" class="w-10 h-6 rounded-full transition-colors relative ${p.branding ? 'bg-brand-500' : 'bg-ink-200'}">
          <span class="absolute top-0.5 ${p.branding ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full bg-white shadow transition-all"></span>
        </button>
      </label>
      <button type="button" data-plan-save="${pi}" class="mt-2 h-9 rounded-full text-[13px] font-semibold transition-colors ${p._dirty || p._new ? 'bg-spark-500 hover:bg-spark-600 text-ink-900' : 'bg-ink-100 text-ink-400 cursor-not-allowed'}">${p._new ? 'Create plan' : 'Save'}</button>
    </div>`;
  }).join('');

  host.querySelectorAll('[data-pf]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const [pi, f] = inp.dataset.pf.split(':');
      const p = plansData[+pi]; if (!p) return;
      if (f === 'name') p.name = inp.value;
      else if (f === 'gb') p.max_bytes = Math.round((parseFloat(inp.value) || 0) * GB);
      else if (f === 'expiry_days') p.expiry_days = Math.max(1, Math.round(parseFloat(inp.value) || 1));
      else p[f] = parseFloat(inp.value) || 0;
      p._dirty = true;
      markCardDirty(+pi);
    });
  });
  host.querySelectorAll('[data-plan-brand]').forEach((b) => b.addEventListener('click', () => {
    const p = plansData[+b.dataset.planBrand]; p.branding = !p.branding; p._dirty = true; renderPlans();
  }));
  host.querySelectorAll('[data-plan-save]').forEach((b) => b.addEventListener('click', () => savePlan(+b.dataset.planSave)));
  host.querySelectorAll('[data-plan-del]').forEach((b) => b.addEventListener('click', () => deletePlan(+b.dataset.planDel)));
}

function markCardDirty(pi) {
  const btn = $(`[data-plan-save="${pi}"]`);
  if (btn) { btn.className = 'mt-2 h-9 rounded-full text-[13px] font-semibold transition-colors bg-spark-500 hover:bg-spark-600 text-ink-900'; }
}

function addPlan() {
  plansData.push({ name: '', monthly: 0, yearly: 0, max_bytes: 10 * GB, expiry_days: 30, branding: false, _new: true });
  renderPlans();
  const cards = $('#adminPlans').querySelectorAll('[data-plan-card]');
  cards[cards.length - 1]?.querySelector('[data-pf$=":name"]')?.focus();
}

async function savePlan(pi) {
  const p = plansData[pi]; if (!p) return;
  if (!p._dirty && !p._new) return;
  if (!String(p.name).trim()) { toast('Give the plan a name.', 'danger'); return; }
  const payload = { name: p.name.trim(), monthly: p.monthly, yearly: p.yearly, max_bytes: p.max_bytes, expiry_days: p.expiry_days, branding: !!p.branding };
  try {
    const r = p._new ? await api.admin.createPlan(payload) : await api.admin.updatePlan(p.key, payload);
    if (r && r.plans) { plansData = plansFromApi(r.plans); syncPriceMap(); renderPlans(); renderMetrics(); renderRows(); }
    toast(p._new ? `${payload.name} created` : `${payload.name} saved`, 'success');
  } catch (e) {
    // Demo / offline: keep local state.
    p._dirty = false; p._new = false; if (!p.key) p.key = payload.name.toLowerCase().replace(/\s+/g, '-');
    syncPriceMap(); renderPlans(); renderMetrics(); renderRows();
    toast(api.authenticated ? (e instanceof ApiError ? e.first : 'Could not save plan.') : 'Saved locally (demo).', api.authenticated ? 'danger' : 'brand');
  }
}

async function deletePlan(pi) {
  const p = plansData[pi]; if (!p) return;
  if (p._new) { plansData.splice(pi, 1); renderPlans(); return; }   // unsaved card — just drop it
  const ok = await confirmAction({ title: 'Delete plan?', body: `“${p.name}” will be removed. Existing subscribers keep their plan name but it won’t be offered to new ones.`, confirmLabel: 'Delete plan' });
  if (!ok) return;
  try {
    const r = await api.admin.deletePlan(p.key);
    if (r && r.plans) plansData = plansFromApi(r.plans);
  } catch (e) { plansData.splice(pi, 1); }
  syncPriceMap(); renderPlans(); renderMetrics(); renderRows();
  toast(`${p.name} deleted`, 'brand');
}

/* ---- Boot ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  try { users = JSON.parse($('#adminSeed').textContent); } catch (e) { users = []; }
  render();
  $('[data-admin-add]').addEventListener('click', openAdd);
  $('[data-plan-add]')?.addEventListener('click', addPlan);

  // Plans: show defaults immediately; hydrate from the API when admin.
  plansData = defaultPlans();
  syncPriceMap();
  renderPlans();

  if (api.authenticated) {
    try {
      const r = await api.admin.plans();
      if (r && r.plans) { plansData = plansFromApi(r.plans); syncPriceMap(); renderPlans(); renderMetrics(); renderRows(); }
    } catch (e) { /* keep defaults */ }
  }

  if (api.authenticated) {
    try {
      const r = await api.admin.subscribers();
      const list = (r.subscribers || r.data || r || []);
      if (list.length) {
        users = list.map((s) => ({
          id: s.id, name: s.name, email: s.email,
          plan: (s.plan || 'free').replace(/^./, (c) => c.toUpperCase()),
          status: s.status || 'active', mrr: s.mrr ?? 0, since: s.since || '—',
          initials: s.initials || initialsOf(s.name),
        }));
        render();
      }
    } catch (e) { /* keep seed */ }
  }
});
