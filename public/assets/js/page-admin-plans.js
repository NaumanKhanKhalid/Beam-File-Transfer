/**
 * Admin → Plans page. Self-contained editor for the plan catalogue:
 * create, edit (name, prices, storage, expiry, branding) and delete plans.
 * Reads/writes via api.admin.* (DB-backed); falls back to local state in the
 * demo (not signed in).
 */
import { api, ApiError, toast, ic } from './beam.js';

const $ = (s, r = document) => r.querySelector(s);
const GB = 1024 * 1024 * 1024;
let plansData = [];   // [{ key?, name, monthly, yearly, max_bytes, expiry_days, branding, _new?, _dirty? }]

function defaultPlans() {
  return [
    { key: 'free',     name: 'Free',     monthly: 0,    yearly: 0,    max_bytes: 2 * GB,    expiry_days: 7,    branding: false },
    { key: 'pro',      name: 'Pro',      monthly: 749,  yearly: 599,  max_bytes: 200 * GB,  expiry_days: 365,  branding: true },
    { key: 'business', name: 'Business', monthly: 1899, yearly: 1499, max_bytes: 1024 * GB, expiry_days: 3650, branding: true },
  ];
}
function plansFromApi(obj) { return Object.entries(obj || {}).map(([key, v]) => ({ key, ...v })); }

/* ---- Confirm dialog ------------------------------------------------------ */
function confirmAction({ title, body, confirmLabel = 'Confirm' }) {
  return new Promise((resolve) => {
    const root = $('#adminModalRoot');
    root.innerHTML = `<div class="fixed inset-0 z-[60] flex items-center justify-center p-6" style="background:rgba(14,15,18,.55)" data-c-overlay>
      <div class="fade-in bg-white rounded-2xl shadow-xl w-[400px] max-w-full p-6">
        <h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">${title}</h3>
        <p class="text-[13.5px] text-ink-500 leading-relaxed mt-1.5">${body}</p>
        <div class="flex gap-2.5 mt-6">
          <button type="button" data-c-no class="flex-1 h-[44px] rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 font-semibold text-[14px] transition-colors">Keep it</button>
          <button type="button" data-c-yes class="flex-1 h-[44px] rounded-full bg-danger-500 hover:bg-danger-600 text-white font-semibold text-[14px] transition-colors">${confirmLabel}</button>
        </div>
      </div>
    </div>`;
    const done = (v) => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onKey);
    root.querySelector('[data-c-overlay]').addEventListener('click', (e) => { if (e.target === e.currentTarget) done(false); });
    root.querySelector('[data-c-no]').addEventListener('click', () => done(false));
    root.querySelector('[data-c-yes]').addEventListener('click', () => done(true));
  });
}

/* ---- Render -------------------------------------------------------------- */
function render() {
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
      const btn = $(`[data-plan-save="${pi}"]`);
      if (btn) btn.className = 'mt-2 h-9 rounded-full text-[13px] font-semibold transition-colors bg-spark-500 hover:bg-spark-600 text-ink-900';
    });
  });
  host.querySelectorAll('[data-plan-brand]').forEach((b) => b.addEventListener('click', () => {
    const p = plansData[+b.dataset.planBrand]; p.branding = !p.branding; p._dirty = true; render();
  }));
  host.querySelectorAll('[data-plan-save]').forEach((b) => b.addEventListener('click', () => savePlan(+b.dataset.planSave)));
  host.querySelectorAll('[data-plan-del]').forEach((b) => b.addEventListener('click', () => deletePlan(+b.dataset.planDel)));
}

function addPlan() {
  plansData.push({ name: '', monthly: 0, yearly: 0, max_bytes: 10 * GB, expiry_days: 30, branding: false, _new: true });
  render();
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
    if (r && r.plans) plansData = plansFromApi(r.plans);
    render();
    toast(p._new ? `${payload.name} created` : `${payload.name} saved`, 'success');
  } catch (e) {
    p._dirty = false; p._new = false; if (!p.key) p.key = payload.name.toLowerCase().replace(/\s+/g, '-');
    render();
    toast(api.authenticated ? (e instanceof ApiError ? e.first : 'Could not save plan.') : 'Saved locally (demo).', api.authenticated ? 'danger' : 'brand');
  }
}

async function deletePlan(pi) {
  const p = plansData[pi]; if (!p) return;
  if (p._new) { plansData.splice(pi, 1); render(); return; }
  const ok = await confirmAction({ title: 'Delete plan?', body: `“${p.name}” will be removed. Existing subscribers keep their plan name but it won’t be offered to new ones.`, confirmLabel: 'Delete plan' });
  if (!ok) return;
  try {
    const r = await api.admin.deletePlan(p.key);
    if (r && r.plans) plansData = plansFromApi(r.plans);
  } catch (e) { plansData.splice(pi, 1); }
  render();
  toast(`${p.name} deleted`, 'brand');
}

/* ---- Boot ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  plansData = defaultPlans();
  render();
  $('[data-plan-add]')?.addEventListener('click', addPlan);

  if (api.authenticated) {
    try {
      const r = await api.admin.plans();
      if (r && r.plans) { plansData = plansFromApi(r.plans); render(); }
    } catch (e) { /* keep defaults */ }
  }
});
