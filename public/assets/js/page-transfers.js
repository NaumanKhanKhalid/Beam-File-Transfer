/**
 * Transfers dashboard — fills the stat cards and the transfer grid with REAL
 * data from the API. Scope is automatic: signed-in users see their account's
 * transfers; guests see the ones sent from this device/network (metered by IP),
 * matching the storage quota. No demo data.
 */
import { api, humanSize, ic } from './beam.js';

const BADGE = {
  success: 'bg-success-50 text-success-700', warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700', brand: 'bg-brand-50 text-brand-700',
  neutral: 'bg-ink-100 text-ink-600', spark: 'bg-spark-500 text-ink-900',
};
const badge = (tone, label) =>
  `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE[tone] || BADGE.neutral}">${tone !== 'neutral' ? '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' : ''}${label}</span>`;

/* Relative expiry text from an ISO date. */
function expiryText(iso, expired) {
  if (expired) return 'Expired';
  if (!iso) return 'No expiry';
  const days = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  if (days <= 0) return 'Expires today';
  return `in ${days} day${days > 1 ? 's' : ''}`;
}

/* Derive a status badge from the transfer's real flags. */
function statusOf(t) {
  if (t.burned) return { tone: 'danger', state: 'Burned' };
  if (t.expired) return { tone: 'danger', state: 'Expired' };
  const days = t.expires_at ? Math.ceil((new Date(t.expires_at) - Date.now()) / 86400000) : 99;
  if (days <= 2) return { tone: 'warning', state: 'Expiring' };
  if ((t.download_count ?? 0) === 0) return { tone: 'neutral', state: 'No views' };
  if (t.protected) return { tone: 'brand', state: 'Encrypted' };
  return { tone: 'success', state: 'Active' };
}

function cardHtml(t, i = 0) {
  const s = statusOf(t);
  const count = t.files_count ?? (t.files || []).length ?? 0;
  const meta = `${count} file${count === 1 ? '' : 's'} · ${humanSize(t.total_bytes || 0)}`;
  return `<div data-slug="${t.slug || ''}" role="button" tabindex="0" style="animation-delay:${Math.min(i, 10) * 45}ms" class="card-in bg-white border border-ink-100 rounded-xl p-[18px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer flex flex-col gap-3.5">
    <div class="flex items-start gap-3">
      <div class="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-none text-brand-500">${ic('download2', 'w-6 h-6')}</div>
      <div class="flex-1 min-w-0"><div class="font-display font-bold text-[17px] text-ink-900 truncate tracking-tight">${t.title || 'Untitled transfer'}</div><div class="font-mono text-xs text-ink-400 mt-0.5">${meta}</div></div>
      <span data-badge>${badge(s.tone, s.state)}</span>
    </div>
    <div class="flex items-center justify-between gap-2.5 pt-3 border-t border-ink-100">
      <span class="flex items-center gap-1.5 text-[13px] text-ink-700">${ic('download', 'w-[15px] h-[15px] text-ink-400')}<b class="font-mono text-ink-900" data-count>${t.download_count ?? 0}</b> downloads</span>
      <span class="flex items-center gap-1.5 text-[13px] text-ink-700">${ic('clock', 'w-[15px] h-[15px] text-ink-400')}${expiryText(t.expires_at, t.expired)}</span>
    </div>
  </div>`;
}

const emptyHtml = `<div class="col-span-full py-16 text-center">
    <div class="w-14 h-14 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-4">${ic('upload', 'w-7 h-7')}</div>
    <div class="font-display font-bold text-lg text-ink-900">No transfers yet</div>
    <p class="text-ink-400 text-sm mt-1.5 mb-5">Files you send will show up here — with downloads and expiry.</p>
    <a href="/" class="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold transition-colors">${ic('plus', 'w-4 h-4')}Send your first file</a>
  </div>`;

function setStat(key, html) {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (el) el.innerHTML = html;
}

async function loadStats() {
  try {
    const s = await api.transfers.stats();
    setStat('active', `${s.active ?? 0}`);
    setStat('downloads', `${s.downloads_week ?? 0}`);
    const sent = humanSize(s.data_sent_bytes || 0).split(' ');
    setStat('data', `${sent[0]}<small class="text-[13px] text-ink-400 font-body ml-1.5">${sent[1] || 'B'}</small>`);
  } catch (e) {
    setStat('active', '0'); setStat('downloads', '0'); setStat('data', '0<small class="text-[13px] text-ink-400 font-body ml-1.5">B</small>');
  }
}

const RECENT_LIMIT = 6;          // cards shown before "View all" is expanded
let _rows = [];                  // all loaded transfers (accumulates across pages)
let _expanded = false;
let _page = 1;                   // highest page loaded
let _lastPage = 1;
let _total = 0;
let _loadingMore = false;
let _query = '';                 // active search filter (lowercased)

function matchedRows() {
  if (!_query) return _rows;
  return _rows.filter((t) => `${t.title || ''} ${t.slug || ''}`.toLowerCase().includes(_query));
}

function updateViewAllBtn() {
  const btn = document.querySelector('[data-view-all]');
  if (!btn) return;
  // Hide the View-all toggle while searching (results show in full).
  if (!_query && _total > RECENT_LIMIT) {
    btn.classList.remove('hidden'); btn.classList.add('flex');
    const label = btn.querySelector('[data-view-all-label]');
    const icon = btn.querySelector('[data-view-all-icon]');
    if (label) label.textContent = _expanded ? 'Show less' : `View all ${_total}`;
    if (icon) icon.style.transform = _expanded ? 'rotate(-90deg)' : '';
  } else {
    btn.classList.add('hidden'); btn.classList.remove('flex');
  }
}

const noResultsHtml = (q) => `<div class="col-span-full py-16 text-center">
    <div class="w-14 h-14 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-4">${ic('search', 'w-6 h-6')}</div>
    <div class="font-display font-bold text-lg text-ink-900">No matches for “${q}”</div>
    <p class="text-ink-400 text-sm mt-1.5">Try a different name, or clear the search.</p>
  </div>`;

function renderGrid() {
  const grid = document.getElementById('txGrid');
  if (!_rows.length) { grid.innerHTML = emptyHtml; updateViewAllBtn(); return; }
  const rows = matchedRows();
  if (_query && !rows.length) { grid.innerHTML = noResultsHtml(_query); updateViewAllBtn(); return; }
  // While searching, show ALL matches; otherwise the recent-6 / expanded view.
  const shown = _query ? rows : (_expanded ? rows : rows.slice(0, RECENT_LIMIT));
  let html = shown.map(cardHtml).join('');
  // Load more only in the normal (non-search) expanded view.
  if (!_query && _expanded && _rows.length < _total) {
    const remaining = _total - _rows.length;
    html += `<div class="col-span-full flex justify-center pt-3"><button type="button" data-load-more class="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-sm font-semibold transition-colors disabled:opacity-60">${ic('download', 'w-4 h-4')}Load ${Math.min(20, remaining)} more <span class="text-ink-400">(${remaining} left)</span></button></div>`;
  }
  grid.innerHTML = html;
  subscribeLive(_rows);
  const lm = grid.querySelector('[data-load-more]');
  if (lm) lm.addEventListener('click', () => loadMore(lm));
  updateViewAllBtn();
}

/* Read pagination meta from a Laravel resource-collection response. */
function readPage(r) {
  const rows = r.data || r || [];
  const meta = r.meta || {};
  return {
    rows,
    lastPage: meta.last_page || 1,
    total: meta.total != null ? meta.total : rows.length,
  };
}

async function loadInitial() {
  try {
    const r = await api.transfers.list(1);
    const p = readPage(r);
    const sig = JSON.stringify(p.rows.map((t) => [t.id, t.download_count, t.burned, t.expired]));
    refreshCounts._sig = sig;
    _rows = p.rows; _page = 1; _lastPage = p.lastPage; _total = p.total;
    renderGrid();
  } catch (e) {
    if (!_rows.length) document.getElementById('txGrid').innerHTML = `<div class="col-span-full py-14 text-center text-danger-500 text-sm">Couldn’t load transfers — is the server running?</div>`;
  }
}

async function loadMore(btn) {
  if (_loadingMore || _page >= _lastPage) return;
  _loadingMore = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  try {
    const r = await api.transfers.list(_page + 1);
    const p = readPage(r);
    // De-dupe by id in case a new transfer shifted the pages.
    const known = new Set(_rows.map((t) => t.id));
    _rows = _rows.concat(p.rows.filter((t) => !known.has(t.id)));
    _page += 1; _lastPage = p.lastPage; _total = p.total;
    renderGrid();
  } catch (e) { /* leave current list */ }
  _loadingMore = false;
}

/* Polling refresh: update counts of already-loaded transfers in place (keeps any
   extra pages you loaded), and reset only when a brand-new transfer appears. */
async function refreshCounts() {
  try {
    const r = await api.transfers.list(1);
    const p = readPage(r);
    const sig = JSON.stringify(p.rows.map((t) => [t.id, t.download_count, t.burned, t.expired]));
    if (sig === refreshCounts._sig) return;
    refreshCounts._sig = sig;
    const known = new Set(_rows.map((t) => t.id));
    if (p.rows.some((t) => !known.has(t.id))) { return loadInitial(); }  // new transfer → reset
    const byId = Object.fromEntries(p.rows.map((t) => [t.id, t]));
    _rows = _rows.map((t) => byId[t.id] ? { ...t, download_count: byId[t.id].download_count, burned: byId[t.id].burned, expired: byId[t.id].expired } : t);
    _total = p.total;
    renderGrid();
  } catch (e) { /* keep current */ }
}

/* ---- Realtime (WebSocket) ------------------------------------------------
 * Subscribe each visible transfer to its Reverb channel so a download bumps the
 * count INSTANTLY (no 8s wait). Updates the card in place + the Downloads stat.
 * No-ops when Reverb is off — polling still covers it.
 */
const _subs = {};
function subscribeLive(rows) {
  if (!window.BeamRT || !window.BeamRT.enabled) return;
  const seen = new Set();
  rows.forEach((t) => {
    if (!t.slug) return;
    seen.add(t.slug);
    if (_subs[t.slug]) return;                 // already subscribed
    _subs[t.slug] = window.BeamRT.subscribeTransfer(t.slug, (e) => applyLive(e));
  });
  // Drop subscriptions for transfers no longer shown.
  Object.keys(_subs).forEach((slug) => { if (!seen.has(slug)) { _subs[slug](); delete _subs[slug]; } });
}

function applyLive(e) {
  const card = document.querySelector(`[data-slug="${e.slug}"]`);
  if (card) {
    const c = card.querySelector('[data-count]');
    if (c) { c.textContent = e.download_count; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 600); }
    const b = card.querySelector('[data-badge]');
    if (b) {
      if (e.burned) b.innerHTML = badge('danger', 'Burned');
      else if (e.download_count > 0 && /No views/.test(b.textContent)) b.innerHTML = badge('success', 'Active');
    }
  }
  loadStats();        // refresh the Downloads-this-week headline
}

/* Near-real-time refresh: poll while the tab is visible, and refresh instantly
   when the user returns to the tab — so download counts update without a manual
   reload after a recipient downloads. */
function startPolling() {
  let timer = null;
  const tick = () => { if (document.visibilityState === 'visible') { loadStats(); refreshCounts(); } };
  const start = () => { stop(); timer = setInterval(tick, 8000); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { tick(); start(); } else stop();
  });
  start();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[data-view-all]');
  if (btn) btn.addEventListener('click', () => { _expanded = !_expanded; renderGrid(); });
  // Live search — filters the loaded transfers by title as you type.
  const search = document.querySelector('[data-search]');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { _query = search.value.trim().toLowerCase(); renderGrid(); }, 120);
    });
  }
  loadStats();
  loadInitial();
  startPolling();
});
