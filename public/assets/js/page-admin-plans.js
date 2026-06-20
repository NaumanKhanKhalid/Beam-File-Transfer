/**
 * Admin → Plans page. Self-contained editor for the plan catalogue:
 * name, tagline, prices, storage (with unit), link expiry (with unit, incl.
 * unlimited), per-transfer download limit, "Most popular" flag, custom branding,
 * and an editable feature list (the bullets shown on the upgrade page).
 * Reads/writes via api.admin.* (DB-backed); falls back to local state in demo.
 */
import { api, ApiError, toast, ic, requireAdmin } from './beam.js';

const $ = (s, r = document) => r.querySelector(s);
const GB = 1024 * 1024 * 1024;
const UNIT = { MB: 1024 * 1024, GB: GB, TB: GB * 1024 };
const EMIN = { minutes: 1, hours: 60, days: 1440 };
let plansData = [];

const attr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const round2 = (n) => Math.round(n * 100) / 100;

function bestStorageUnit(b) { if (b >= UNIT.TB) return 'TB'; if (b >= UNIT.GB) return 'GB'; return 'MB'; }
function bestExpiryUnit(min) {
  if (min == null) return 'unlimited';
  if (min >= EMIN.days && min % EMIN.days === 0) return 'days';
  if (min >= EMIN.hours && min % EMIN.hours === 0) return 'hours';
  return 'minutes';
}

/** Normalise an incoming plan into the editor's working shape. */
function hydrate(p) {
  const q = {
    key: p.key,
    name: p.name || '',
    tagline: p.tagline || '',
    monthly: +p.monthly || 0,
    yearly: +p.yearly || 0,
    max_bytes: +p.max_bytes || 0,
    expiry_minutes: p.expiry_minutes == null ? null : +p.expiry_minutes,
    download_limit: p.download_limit == null ? null : +p.download_limit,
    file_limit: p.file_limit == null ? null : +p.file_limit,
    branding: !!p.branding,
    popular: !!p.popular,
    features: Array.isArray(p.features) ? p.features.slice() : [],
    _new: !!p._new,
  };
  q._su = bestStorageUnit(q.max_bytes);
  q._eu = bestExpiryUnit(q.expiry_minutes);
  return q;
}

function defaultPlans() {
  return [
    { key: 'free', name: 'Free', tagline: 'For the occasional send', monthly: 0, yearly: 0, max_bytes: 2 * GB, expiry_minutes: 7 * 1440, download_limit: 20, file_limit: 20, branding: false, popular: false,
      features: ['2 GB per transfer', '7-day link expiry', 'Up to 20 files per transfer', 'Email, link & QR sharing', 'Up to 20 downloads per transfer', 'Encrypted transfers'] },
    { key: 'pro', name: 'Pro', tagline: 'For freelancers & creators', monthly: 749, yearly: 599, max_bytes: 200 * GB, expiry_minutes: 365 * 1440, download_limit: null, file_limit: null, branding: true, popular: true,
      features: ['Everything in Free, plus:', '200 GB per transfer', '1-year link expiry', 'Unlimited files & downloads', 'Custom branding & logo', 'Password protection', 'Delete-after-download', 'Live download tracking', 'Priority email support'] },
    { key: 'business', name: 'Business', tagline: 'For teams & studios', monthly: 1899, yearly: 1499, max_bytes: 1024 * GB, expiry_minutes: null, download_limit: null, file_limit: null, branding: true, popular: false,
      features: ['Everything in Pro, plus:', '1 TB per transfer', 'Unlimited link expiry', 'Admin & member roles', 'Custom domain (files.you.com)', 'SSO + audit log', 'Dedicated support'] },
  ].map(hydrate);
}
function plansFromApi(obj) { return Object.entries(obj || {}).map(([key, v]) => hydrate({ key, ...v })); }

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
const numInput = (pi, key, val, suffix, icon) =>
  `<label class="flex items-center justify-between gap-2 py-1.5">
    <span class="flex items-center gap-2 text-[13px] text-ink-600">${icon ? `<span class="text-ink-300">${ic(icon, 'w-4 h-4')}</span>` : ''}${key.label}</span>
    <span class="flex items-center gap-1.5">
      <input data-pf="${pi}:${key.f}" value="${attr(val)}" inputmode="decimal" placeholder="${attr(key.ph || '')}"
        class="w-[72px] h-9 px-2.5 text-right rounded-lg border border-ink-200 text-[13px] font-mono font-semibold text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20 transition">
      ${suffix}
    </span>
  </label>`;

const unitSelect = (pi, f, current, opts) =>
  `<select data-pf="${pi}:${f}" class="h-8 px-1 rounded-md border border-ink-200 text-[11px] font-semibold text-ink-600 bg-white outline-none focus:border-brand-500 transition flex-none">
    ${opts.map((o) => `<option value="${o[0]}" ${o[0] === current ? 'selected' : ''}>${o[1]}</option>`).join('')}
  </select>`;

// Compact boxed cell (label on top, control below) — laid out in a 2-col grid so
// pricing/limits take ~half the vertical space of stacked rows.
const cell = (pi, f, label, icon, val, control, ph = '') =>
  `<div class="rounded-lg border border-ink-150 bg-ink-50/50 px-2.5 py-2">
    <div class="text-[10px] font-semibold uppercase tracking-[.03em] text-ink-400 flex items-center gap-1 mb-1">${ic(icon, 'w-3 h-3 text-ink-300')}${label}</div>
    <div class="flex items-center gap-1">
      <input data-pf="${pi}:${f}" value="${attr(val)}" placeholder="${attr(ph)}" inputmode="decimal"
        class="w-full min-w-0 h-8 px-2 text-right rounded-md border border-ink-200 text-[13px] font-mono font-semibold text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[2px] focus:ring-brand-500/20 transition">
      ${control}
    </div>
  </div>`;

function render() {
  const host = $('#adminPlans');
  if (!host) return;

  host.innerHTML = plansData.map((p, pi) => {
    const branded = !!p.branding;
    const ring = p.popular ? 'ring-1 ring-brand-500/40' : (branded ? 'ring-1 ring-brand-500/15' : '');
    const chip = branded ? 'bg-spark-500 text-ink-900' : 'bg-white/10 text-spark-500';
    const tierIcon = branded ? 'crown' : 'shield';
    const yearlySave = p.monthly > 0 && p.yearly > 0 && p.yearly < p.monthly ? Math.round((1 - p.yearly / p.monthly) * 100) : 0;

    const storageVal = round2(p.max_bytes / UNIT[p._su]);
    const storageSuffix = unitSelect(pi, 'su', p._su, [['MB', 'MB'], ['GB', 'GB'], ['TB', 'TB']]);
    const isUnlimited = p._eu === 'unlimited';
    const expiryVal = isUnlimited ? '' : Math.round(p.expiry_minutes / EMIN[p._eu]);
    const expirySuffix = unitSelect(pi, 'eu', p._eu, [['minutes', 'min'], ['hours', 'hrs'], ['days', 'days'], ['unlimited', '∞']]);

    const toggle = (f, on, label, icon) =>
      `<button type="button" data-plan-toggle="${pi}:${f}" aria-pressed="${on}"
        class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[12px] font-semibold transition-colors ${on ? 'border-brand-500/40 bg-brand-50 text-brand-700' : 'border-ink-150 bg-white text-ink-500 hover:bg-ink-50'}">
        <span class="${on ? 'text-brand-500' : 'text-ink-300'}">${ic(on ? 'check' : icon, 'w-4 h-4')}</span>
        <span class="truncate">${label}</span>
      </button>`;

    const features = (p.features || []).map((f, fi) =>
      `<div class="flex items-center gap-1.5">
        <span class="text-success-500 flex-none">${ic('check', 'w-3.5 h-3.5')}</span>
        <input data-pf="${pi}:feat:${fi}" value="${attr(f)}" placeholder="Feature line"
          class="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-ink-200 text-[12.5px] text-ink-700 bg-white outline-none focus:border-brand-500 transition">
        <button type="button" data-feat-del="${pi}:${fi}" aria-label="Remove feature" class="w-7 h-7 flex items-center justify-center rounded-lg text-ink-300 hover:text-danger-500 hover:bg-danger-500/10 transition flex-none">${ic('x', 'w-3.5 h-3.5')}</button>
      </div>`).join('');

    return `<div data-plan-card="${pi}" class="relative rounded-2xl border bg-white overflow-hidden flex flex-col ${p.popular ? 'border-brand-500/50 ring-2 ring-brand-500/20 shadow-lg' : 'border-ink-150 shadow-sm'}">
      ${p.popular ? `<div class="bg-brand-500 text-white text-[11px] font-bold tracking-[.08em] text-center py-1.5 flex items-center justify-center gap-1.5">${ic('zap', 'w-3.5 h-3.5')}MOST POPULAR</div>` : ''}
      <div class="bg-ink-900 px-4 py-3.5 flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-lg ${chip} flex items-center justify-center flex-none">${ic(tierIcon, 'w-[16px] h-[16px]')}</span>
        <input data-pf="${pi}:name" value="${attr(p.name)}" placeholder="Plan name"
          class="flex-1 min-w-0 font-display font-bold text-[16px] text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-spark-500 outline-none transition pb-0.5 placeholder:text-ink-500">
        <button type="button" data-plan-del="${pi}" aria-label="Delete plan" class="w-8 h-8 flex items-center justify-center rounded-full text-ink-400 hover:bg-danger-500/15 hover:text-danger-400 transition-colors flex-none">${ic('trash', 'w-[15px] h-[15px]')}</button>
      </div>

      <div class="p-4 flex flex-col flex-1">
        <input data-pf="${pi}:tagline" value="${attr(p.tagline)}" placeholder="Short tagline"
          class="w-full text-[12.5px] font-medium text-ink-500 bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-500 outline-none transition pb-1 mb-3 placeholder:text-ink-300 placeholder:font-normal">

        <div class="pb-3 mb-3 border-b border-ink-100">
          <div class="flex items-end gap-1.5">
            <span class="font-display font-bold text-[30px] leading-none text-ink-900 tracking-tight">${p.monthly > 0 ? '₹' + Number(p.monthly).toLocaleString('en-IN') : 'Free'}</span>
            ${p.monthly > 0 ? '<span class="text-[13px] text-ink-400 font-medium pb-0.5">/mo</span>' : ''}
            ${yearlySave ? `<span class="ml-auto text-[11px] font-bold text-success-700 bg-success-50 px-2 py-1 rounded-full leading-none">Save ${yearlySave}%</span>` : ''}
          </div>
          <div class="text-[12px] text-ink-400 mt-2">${yearlySave ? `or ₹${Number(p.yearly).toLocaleString('en-IN')}/mo billed yearly` : (p.monthly === 0 ? 'Free forever — no card needed' : '&nbsp;')}</div>
        </div>

        <div class="text-[11px] font-semibold tracking-[.06em] uppercase text-ink-400 mb-1.5">Pricing</div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          ${cell(pi, 'monthly', 'Monthly', 'zap', p.monthly, '<span class="text-[11px] text-ink-400 flex-none">₹</span>')}
          ${cell(pi, 'yearly', 'Yearly', 'crown', p.yearly, '<span class="text-[10px] text-ink-400 flex-none">₹/mo</span>')}
        </div>

        <div class="text-[11px] font-semibold tracking-[.06em] uppercase text-ink-400 mb-1.5">Limits</div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          ${cell(pi, 'sv', 'Storage', 'inbox', storageVal, storageSuffix)}
          ${cell(pi, 'ev', 'Link expiry', 'clock', expiryVal, expirySuffix, isUnlimited ? '∞' : '')}
          ${cell(pi, 'dl', 'Downloads', 'download', p.download_limit == null ? '' : p.download_limit, '<span class="text-[10px] text-ink-400 flex-none">/file</span>', '∞')}
          ${cell(pi, 'fl', 'Files', 'inbox', p.file_limit == null ? '' : p.file_limit, '<span class="text-[10px] text-ink-400 flex-none">files</span>', '∞')}
        </div>

        <div class="grid grid-cols-2 gap-2 mb-1">
          ${toggle('branding', branded, 'Branding', 'palette')}
          ${toggle('popular', p.popular, 'Popular', 'zap')}
        </div>

        <div class="mt-2 pt-3 border-t border-ink-100">
          <button type="button" data-feat-toggle="${pi}" class="w-full flex items-center justify-between gap-2 group">
            <span class="text-[11px] font-semibold tracking-[.06em] uppercase text-ink-400">Features <span class="text-ink-300">(${(p.features || []).length})</span></span>
            <span class="text-ink-400 group-hover:text-ink-700 transition-colors" style="transform:rotate(${p._featOpen ? '90deg' : '0deg'})">${ic('chevR', 'w-4 h-4')}</span>
          </button>
          ${p._featOpen ? `<div class="flex flex-col gap-1.5 max-h-[220px] overflow-auto scroll-thin pr-0.5 -mr-0.5 mt-2">${features}</div>
          <button type="button" data-feat-add="${pi}" class="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">${ic('plus', 'w-3.5 h-3.5')}Add feature</button>` : ''}
        </div>

        <button type="button" data-plan-save="${pi}" class="mt-4 h-10 rounded-xl text-[13px] font-semibold transition-colors ${p._dirty || p._new ? 'bg-spark-500 hover:bg-spark-600 text-ink-900' : 'bg-ink-100 text-ink-400 cursor-not-allowed'}">${p._new ? 'Create plan' : (p._dirty ? 'Save changes' : 'Saved')}</button>
      </div>
    </div>`;
  }).join('');

  wire();
}

/** Flip the save button to a dirty state without a full re-render (keeps focus). */
function markDirty(pi) {
  const p = plansData[pi]; if (!p) return;
  p._dirty = true;
  const btn = $(`[data-plan-save="${pi}"]`);
  if (btn) { btn.className = 'mt-4 h-10 rounded-xl text-[13px] font-semibold transition-colors bg-spark-500 hover:bg-spark-600 text-ink-900'; btn.textContent = p._new ? 'Create plan' : 'Save changes'; }
}

function wire() {
  const host = $('#adminPlans');

  host.querySelectorAll('input[data-pf]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const [pi, f, fi] = inp.dataset.pf.split(':');
      const p = plansData[+pi]; if (!p) return;
      if (f === 'name') p.name = inp.value;
      else if (f === 'tagline') p.tagline = inp.value;
      else if (f === 'monthly') p.monthly = parseFloat(inp.value) || 0;
      else if (f === 'yearly') p.yearly = parseFloat(inp.value) || 0;
      else if (f === 'sv') p.max_bytes = Math.round((parseFloat(inp.value) || 0) * UNIT[p._su]);
      else if (f === 'ev') { if (p._eu !== 'unlimited') p.expiry_minutes = Math.max(1, Math.round((parseFloat(inp.value) || 1) * EMIN[p._eu])); }
      else if (f === 'dl') { const n = parseInt(inp.value, 10); p.download_limit = (inp.value === '' || isNaN(n) || n <= 0) ? null : n; }
      else if (f === 'fl') { const n = parseInt(inp.value, 10); p.file_limit = (inp.value === '' || isNaN(n) || n <= 0) ? null : n; }
      else if (f === 'feat') p.features[+fi] = inp.value;
      markDirty(+pi);
    });
  });

  // Unit selects (storage / expiry) — recompute from the live value, then re-render.
  host.querySelectorAll('select[data-pf]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const [pi, f] = sel.dataset.pf.split(':');
      const p = plansData[+pi]; if (!p) return;
      if (f === 'su') {
        const v = parseFloat($(`[data-pf="${pi}:sv"]`)?.value) || 0;
        p._su = sel.value; p.max_bytes = Math.round(v * UNIT[sel.value]);
      } else if (f === 'eu') {
        p._eu = sel.value;
        if (sel.value === 'unlimited') p.expiry_minutes = null;
        else {
          const cur = parseFloat($(`[data-pf="${pi}:ev"]`)?.value) || (p.expiry_minutes ? p.expiry_minutes / EMIN[sel.value] : 7);
          p.expiry_minutes = Math.max(1, Math.round(cur * EMIN[sel.value]));
        }
      }
      p._dirty = true; render();
    });
  });

  host.querySelectorAll('[data-plan-toggle]').forEach((b) => b.addEventListener('click', () => {
    const [pi, f] = b.dataset.planToggle.split(':');
    const p = plansData[+pi]; if (!p) return;
    p[f] = !p[f]; p._dirty = true; render();
  }));
  host.querySelectorAll('[data-feat-toggle]').forEach((b) => b.addEventListener('click', () => {
    const p = plansData[+b.dataset.featToggle]; if (!p) return;
    p._featOpen = !p._featOpen; render();
  }));
  host.querySelectorAll('[data-feat-add]').forEach((b) => b.addEventListener('click', () => {
    const p = plansData[+b.dataset.featAdd]; if (!p) return;
    p._featOpen = true; p.features.push(''); p._dirty = true; render();
  }));
  host.querySelectorAll('[data-feat-del]').forEach((b) => b.addEventListener('click', () => {
    const [pi, fi] = b.dataset.featDel.split(':');
    const p = plansData[+pi]; if (!p) return;
    p.features.splice(+fi, 1); p._dirty = true; render();
  }));
  host.querySelectorAll('[data-plan-save]').forEach((b) => b.addEventListener('click', () => savePlan(+b.dataset.planSave)));
  host.querySelectorAll('[data-plan-del]').forEach((b) => b.addEventListener('click', () => deletePlan(+b.dataset.planDel)));
}

function addPlan() {
  plansData.push(hydrate({ name: '', tagline: '', monthly: 0, yearly: 0, max_bytes: 10 * GB, expiry_minutes: 30 * 1440, download_limit: null, branding: false, popular: false, features: [], _new: true }));
  render();
  const cards = $('#adminPlans').querySelectorAll('[data-plan-card]');
  cards[cards.length - 1]?.querySelector('[data-pf$=":name"]')?.focus();
}

function payloadFor(p) {
  return {
    name: p.name.trim(),
    tagline: (p.tagline || '').trim(),
    monthly: p.monthly,
    yearly: p.yearly,
    max_bytes: p.max_bytes,
    expiry_minutes: p.expiry_minutes,   // null = unlimited
    download_limit: p.download_limit,   // null = unlimited
    file_limit: p.file_limit,           // null = unlimited
    branding: !!p.branding,
    popular: !!p.popular,
    features: (p.features || []).map((f) => String(f).trim()).filter(Boolean),
  };
}

async function savePlan(pi) {
  const p = plansData[pi]; if (!p) return;
  if (!p._dirty && !p._new) return;
  if (!String(p.name).trim()) { toast('Give the plan a name.', 'danger'); return; }
  const payload = payloadFor(p);
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
  if (!(await requireAdmin())) return;   // admins only — guard bounces everyone else
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
