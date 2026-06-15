/**
 * Beam — shared front-end module (loaded on every page).
 * --------------------------------------------------------------------------
 * Wires the SAME api client (beam-api.js) the React app will use later,
 * plus small helpers and the bits of chrome that depend on auth state
 * (sidebar account card, topbar actions, storage meter, theme toggle).
 *
 * Server-rendered Blade owns the static markup; this module hydrates the
 * dynamic, auth-dependent regions after calling the API.
 */
import { api, ApiError } from './beam-api.js';

/* ---- API base from <meta name="api-base"> -------------------------------- */
const apiBase = document.querySelector('meta[name="api-base"]')?.content || '/api';
api.configure({ baseUrl: apiBase });
export { api, ApiError };

/* ---- Helpers (mirror html-app/js/helpers.js) ----------------------------- */
export function humanSize(b) {
  if (b == null) return '';
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
  return (b >= 10 ? Math.round(b) : b.toFixed(1)) + ' ' + u[i];
}
export function kindFromName(n) {
  const e = (n.split('.').pop() || '').toLowerCase();
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(e)) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp'].includes(e)) return 'image';
  if (['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'].includes(e)) return 'audio';
  if (e === 'pdf') return 'pdf';
  if (['doc', 'docx', 'txt', 'rtf', 'pages', 'key', 'ppt', 'pptx', 'xls', 'xlsx', 'csv'].includes(e)) return 'doc';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'zip';
  return 'default';
}
export const ext = (n) => { const e = (n.split('.').pop() || ''); return e.length <= 4 ? e : 'file'; };
export const KIND = { video: '#4B3AFF', image: '#18B368', audio: '#F5A524', pdf: '#F4384F', doc: '#2C20B0', zip: '#6B7280', default: '#2E333C' };
export const initialsOf = (name) => (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'U';

/* ---- Toast --------------------------------------------------------------- */
export function toast(msg, tone = 'spark') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const accent = { spark: '#C6FF3D', success: '#18B368', danger: '#F4384F', brand: '#6E5DFF' }[tone] || '#C6FF3D';
  const el = document.createElement('div');
  el.className = 'pointer-events-auto flex items-center gap-3 bg-ink-900 text-ink-50 rounded-xl px-4 py-3 shadow-lg max-w-[420px]';
  el.innerHTML = `<span class="w-1 self-stretch rounded-full" style="background:${accent}"></span><span class="text-[13px] leading-snug">${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; setTimeout(() => el.remove(), 300); }, 2800);
}

/* ---- Icons (mirror html-app/js/icons.js + trash) ------------------------- */
const P = {
  upload: '<path d="M12 19V6"/><path d="M7 11l5-5 5 5"/><path d="M5 21h14"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  file: '<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  chevronUp: '<path d="M6 15l6-6 6 6"/>',
  zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M21 20a6 6 0 0 0-4-5.6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14l3 7v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z"/>',
  arrowUR: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  download2: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4 7.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a6 6 0 0 0 6-6c0-4.4-4.5-8-10-8z"/>',
  crown: '<path d="M3 7l4 5 5-7 5 7 4-5-2 13H5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  trash: '<path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
};
export function ic(n, cls = 'w-5 h-5', sw = 2) {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
}

/* ---- Theme toggle -------------------------------------------------------- */
const THEME_KEY = 'beam.theme';
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.innerHTML = dark ? P.sun : P.moon; });
  document.querySelectorAll('[data-theme-label]').forEach((el) => { el.textContent = dark ? 'Light mode' : 'Dark mode'; });
  document.querySelectorAll('[data-theme-toggle] .switch, [data-theme-toggle].switch').forEach((el) => el.setAttribute('data-on', dark));
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (localStorage.getItem(THEME_KEY) || 'light') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      toast(next === 'dark' ? 'Dark mode on' : 'Light mode on', 'brand');
    });
  });
}

/* ---- Auth-dependent chrome hydration ------------------------------------- */
const planLabel = (p) => ({ free: 'Free plan', pro: 'Pro plan', business: 'Business plan' }[p] || 'Free plan');

/* ---- Email verification nudge -------------------------------------------- */
// A dismissible bar shown when the signed-in user hasn't confirmed their email.
function maybeShowVerifyBanner(u) {
  if (!u || u.verified) { document.getElementById('verifyBar')?.remove(); return; }
  if (sessionStorage.getItem('beam.verifyDismissed') === '1') return;
  if (document.getElementById('verifyBar')) return;
  const bar = document.createElement('div');
  bar.id = 'verifyBar';
  bar.className = 'flex items-center gap-3 px-4 sm:px-7 py-2.5 bg-warning-50 border-b border-warning-200 text-warning-800 text-[13px]';
  bar.innerHTML = `
    ${ic('mail', 'w-4 h-4 flex-none')}
    <span class="flex-1 min-w-0">Confirm your email to secure your account and get download alerts.</span>
    <button type="button" data-verify-resend class="font-semibold underline whitespace-nowrap hover:text-warning-900">Resend email</button>
    <button type="button" data-verify-dismiss aria-label="Dismiss" class="flex-none opacity-60 hover:opacity-100">${ic('x', 'w-4 h-4')}</button>`;
  const main = document.querySelector('main');
  const topbar = main?.querySelector('header');
  if (topbar && topbar.parentNode) topbar.parentNode.insertBefore(bar, topbar.nextSibling);
  else document.body.prepend(bar);

  bar.querySelector('[data-verify-resend]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try { await api.auth.resendVerification(); toast('Verification email sent — check your inbox.', 'success'); }
    catch (err) { toast('Could not send the email right now.', 'danger'); }
  });
  bar.querySelector('[data-verify-dismiss]').addEventListener('click', () => {
    sessionStorage.setItem('beam.verifyDismissed', '1'); bar.remove();
  });
}

function renderAccount(u) {
  const region = document.querySelector('[data-account-region]');
  if (region) {
    const isPro = ['pro', 'business'].includes(String(u.plan || '').toLowerCase());
    region.innerHTML = `
      <div class="relative">
        <div data-acct-menu class="hidden absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-ink-800 border border-ink-700 shadow-[0_12px_32px_rgba(0,0,0,.45)] overflow-hidden py-1.5 z-20">
          <a href="/settings" class="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-200 hover:bg-white/5 transition-colors">${ic('settings', 'w-[15px] h-[15px] text-ink-400')}Account settings</a>
          ${isPro ? '' : `<a href="/upgrade" class="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-200 hover:bg-white/5 transition-colors">${ic('zap', 'w-[15px] h-[15px] text-spark-500')}Upgrade to Pro</a>`}
          <div class="h-px bg-ink-700 my-1"></div>
          <button type="button" data-logout class="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-danger-400 hover:bg-danger-500/10 transition-colors text-left">${ic('logout', 'w-[15px] h-[15px]')}Log out</button>
        </div>
        <button type="button" data-acct-toggle class="flex items-center gap-2.5 px-2 py-2 w-full text-left rounded-xl hover:bg-white/5 transition-colors group">
          <span class="w-8 h-8 rounded-full bg-brand-500 text-white font-display font-bold text-xs flex items-center justify-center flex-none">${u.initials || initialsOf(u.name)}</span>
          <div class="leading-tight min-w-0 flex-1">
            <div class="text-white text-[13px] font-semibold truncate">${u.name}</div>
            <div class="text-ink-400 text-[11px]">${planLabel(u.plan)}</div>
          </div>
          <span data-acct-chev class="text-ink-500 group-hover:text-ink-200 transition-transform">${ic('chevronUp', 'w-4 h-4')}</span>
        </button>
      </div>`;

    const menu = region.querySelector('[data-acct-menu]');
    const chev = region.querySelector('[data-acct-chev]');
    const closeMenu = () => { menu?.classList.add('hidden'); if (chev) chev.style.transform = ''; };
    region.querySelector('[data-acct-toggle]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('hidden');
      if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
    });
    document.addEventListener('click', (e) => { if (!region.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    region.querySelector('[data-logout]')?.addEventListener('click', async () => {
      try { await api.auth.logout(); } catch (e) { /* ignore */ }
      // Clear cached identity/usage so the next load shows a clean guest state.
      ['beam.cache.account', 'beam.cache.usage', 'beam.cache.nav', 'beam.cache.profile', 'beam.gateChoice'].forEach((k) => localStorage.removeItem(k));
      toast('Logged out.', 'brand');
      setTimeout(() => location.assign('/'), 400);
    });
  }
  const actions = document.querySelector('[data-topbar-actions]');
  if (actions) {
    actions.innerHTML = `<a href="/" class="flex items-center gap-2 h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold whitespace-nowrap transition-colors">${ic('plus', 'w-4 h-4')}New transfer</a>`;
  }
}

async function hydrateAccount() {
  if (!api.authenticated) return;
  // Paint the cached identity instantly so a refresh doesn't flash the guest
  // "Log in / Create account" card before /me resolves.
  try {
    const c = JSON.parse(localStorage.getItem('beam.cache.account') || 'null');
    if (c && c.name) renderAccount(c);
  } catch (e) { /* ignore bad cache */ }
  try {
    const u = await api.auth.me();
    renderAccount(u);
    maybeShowVerifyBanner(u);
    try { localStorage.setItem('beam.cache.account', JSON.stringify({ name: u.name, plan: u.plan, initials: u.initials })); } catch (e) { /* quota */ }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { api.setToken(null); localStorage.removeItem('beam.cache.account'); }
  }
}

/* ---- Storage usage / quota ----------------------------------------------
 * Real used/cap from GET /api/usage so the meter survives refresh and (for
 * guests, metered by IP) incognito. page-send.js adds the bytes currently
 * staged on top via paintStorage(stagedBytes).
 */
export const usageState = { used: 0, cap: 2 * 1024 * 1024 * 1024, scope: 'guest', plan: 'guest', remaining: 2 * 1024 * 1024 * 1024, exceeded: false, loaded: false };

export function paintStorage(stagedBytes = 0) {
  const bar = document.querySelector('[data-storage-bar]');
  const label = document.querySelector('[data-storage-label]');
  const total = usageState.used + stagedBytes;
  const pct = usageState.cap ? Math.min(100, (total / usageState.cap) * 100) : 0;
  if (bar) {
    bar.style.width = (total === 0 ? 0 : Math.max(pct, 1.5)) + '%';
    bar.style.background = pct >= 100 ? '#F4384F' : '#C6FF3D';
  }
  if (label) {
    const suffix = usageState.scope === 'guest' ? ' · guest' : '';
    label.innerHTML = `<b class="text-white font-mono">${humanSize(total) || '0 B'}</b> of ${humanSize(usageState.cap)}${suffix}`;
  }
}

export async function hydrateUsage() {
  // Paint last-known usage instantly from cache so a refresh doesn't flash
  // "0 B" before the API responds. Cache is keyed by auth state so a guest
  // never briefly sees a signed-in user's figures (or vice-versa).
  try {
    const cached = JSON.parse(localStorage.getItem('beam.cache.usage') || 'null');
    if (cached && !!cached.auth === !!api.authenticated) {
      Object.assign(usageState, { used: cached.used, cap: cached.cap, scope: cached.scope, plan: cached.plan, remaining: Math.max(0, cached.cap - cached.used), loaded: true });
      paintStorage();
    }
  } catch (e) { /* ignore bad cache */ }

  try {
    const u = await api.usage();
    Object.assign(usageState, {
      used: u.used ?? 0, cap: u.cap ?? usageState.cap,
      scope: u.scope || (api.authenticated ? 'user' : 'guest'),
      plan: u.plan || usageState.plan, remaining: u.remaining ?? usageState.cap,
      exceeded: !!u.exceeded, loaded: true,
    });
    paintStorage();
    try { localStorage.setItem('beam.cache.usage', JSON.stringify({ used: usageState.used, cap: usageState.cap, scope: usageState.scope, plan: usageState.plan, auth: !!api.authenticated })); } catch (e) { /* quota */ }
    document.dispatchEvent(new CustomEvent('beam:usage', { detail: usageState }));
  } catch (e) { /* keep the static sidebar default */ }
}

/* ---- Welcome gate (first visit) -----------------------------------------
 * On a guest's first arrival to an app page, ask: Log in / Sign up, or
 * continue as a guest (which captures their name). Stored so it shows once.
 */
const GATE_KEY = 'beam.gateChoice';
const GUEST_NAME_KEY = 'beam.guestName';

function closeGate() { document.getElementById('beamGate')?.remove(); }

function showWelcomeGate() {
  const el = document.createElement('div');
  el.id = 'beamGate';
  el.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(11,12,15,.72);backdrop-filter:blur(4px)';
  el.innerHTML = `
    <div class="fade-in" style="width:440px;max-width:100%;background:#16181D;border:1px solid #20242B;border-radius:24px;padding:30px;box-shadow:0 24px 60px rgba(0,0,0,.5)">
      <div class="flex items-center gap-2.5 mb-5">
        <span style="width:34px;height:34px;border-radius:9px;background:#C6FF3D;display:flex;align-items:center;justify-content:center">${ic('arrowUR', 'w-5 h-5', 2.6)}</span>
        <span class="font-display font-bold text-white text-xl">Beam</span>
      </div>
      <div data-gate-step="choose">
        <h2 class="font-display font-bold text-white text-[24px] tracking-tight">Send big. Then it’s gone.</h2>
        <p class="text-ink-300 text-sm mt-1.5 mb-6">Log in to track your transfers and rooms — or keep it quick and send as a guest.</p>
        <div class="flex flex-col gap-2.5">
          <a href="/login" class="h-[52px] rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors">Log in or sign up</a>
          <button type="button" data-gate-guest class="h-[52px] rounded-full bg-white/5 hover:bg-white/10 border border-ink-700 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors">Continue as a guest</button>
        </div>
        <p class="text-[12px] text-ink-500 text-center mt-4">Guests can send up to 2&nbsp;GB — no account needed.</p>
      </div>
      <div data-gate-step="name" class="hidden">
        <h2 class="font-display font-bold text-white text-[24px] tracking-tight">What’s your name?</h2>
        <p class="text-ink-300 text-sm mt-1.5 mb-5">So the people you send files to know who they’re from.</p>
        <input id="beamGateName" type="text" maxlength="80" placeholder="e.g. Mara Lin"
               class="w-full h-12 px-4 rounded-xl border border-ink-700 bg-ink-900 text-[15px] text-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-500">
        <div class="flex gap-2.5 mt-5">
          <button type="button" data-gate-back class="h-12 px-5 rounded-full bg-white/5 hover:bg-white/10 border border-ink-700 text-ink-200 font-semibold text-[15px] transition-colors">Back</button>
          <button type="button" data-gate-save class="flex-1 h-12 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 font-semibold text-[15px] transition-colors">Start sending</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const step = (k) => {
    el.querySelector('[data-gate-step="choose"]').classList.toggle('hidden', k !== 'choose');
    el.querySelector('[data-gate-step="name"]').classList.toggle('hidden', k !== 'name');
    if (k === 'name') setTimeout(() => el.querySelector('#beamGateName')?.focus(), 30);
  };
  const save = () => {
    const name = (el.querySelector('#beamGateName').value || '').trim();
    if (!name) { el.querySelector('#beamGateName').focus(); toast('Enter your name to continue.', 'danger'); return; }
    localStorage.setItem(GUEST_NAME_KEY, name);
    localStorage.setItem(GATE_KEY, 'guest');
    const fromInput = document.getElementById('fromInput');   // sync the Send page field if present
    if (fromInput) fromInput.value = name;
    document.dispatchEvent(new CustomEvent('beam:guest-name', { detail: name }));
    closeGate();
    toast(`Welcome, ${name.split(' ')[0]} 👋`, 'success');
  };

  el.querySelector('[data-gate-guest]').addEventListener('click', () => {
    const existing = localStorage.getItem(GUEST_NAME_KEY) || '';
    el.querySelector('#beamGateName').value = existing;
    step('name');
  });
  el.querySelector('[data-gate-back]').addEventListener('click', () => step('choose'));
  el.querySelector('[data-gate-save]').addEventListener('click', save);
  el.querySelector('#beamGateName').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

function initWelcomeGate() {
  // Coming back from the email-verification link: show a status toast and never
  // pop the welcome gate over it.
  const params = new URLSearchParams(location.search);
  if (params.has('verified')) {
    const ok = params.get('verified') !== '0';
    toast(ok ? 'Email verified — you’re all set ✓' : 'That verification link was invalid or expired.', ok ? 'success' : 'danger');
    localStorage.setItem(GATE_KEY, localStorage.getItem(GATE_KEY) || 'verified');
    // Tidy the URL so a refresh doesn't re-toast.
    history.replaceState({}, '', location.pathname);
    if (ok) return;
  }
  if (api.authenticated) { localStorage.setItem(GATE_KEY, 'user'); return; }   // signed in: no gate
  if (!document.querySelector('[data-account-region]')) return;                 // app pages only
  if (localStorage.getItem(GATE_KEY)) return;                                   // already chose
  showWelcomeGate();
}

/* ---- Sidebar nav counts -------------------------------------------------
 * Live Transfers count from /api/transfers/stats (guest by IP, user by account).
 * Badge stays hidden at 0 so we never show a fake number.
 */
export async function hydrateNavCounts() {
  const el = document.querySelector('[data-nav-count="transfers"]');
  if (!el) return;
  // Show the last-known count instantly (cache, keyed by auth) to avoid the
  // hide→show jump on refresh.
  try {
    const cached = JSON.parse(localStorage.getItem('beam.cache.nav') || 'null');
    if (cached && !!cached.auth === !!api.authenticated && cached.transfers > 0) {
      el.textContent = cached.transfers; el.classList.remove('hidden');
    }
  } catch (e) { /* ignore */ }
  try {
    const s = await api.transfers.stats();
    const n = s.total ?? 0;
    if (n > 0) { el.textContent = n; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
    try { localStorage.setItem('beam.cache.nav', JSON.stringify({ transfers: n, auth: !!api.authenticated })); } catch (e) { /* quota */ }
  } catch (e) { /* keep whatever cache showed */ }
}

/* ---- Scroll reveal -------------------------------------------------------
 * Reveals [data-reveal] elements as they enter the viewport, with a gentle
 * per-batch stagger. Respects reduced-motion (CSS keeps them visible there).
 */
export function initReveal() {
  const els = [...document.querySelectorAll('[data-reveal]')];
  if (!els.length) return;
  const revealAll = () => els.forEach((el) => el.classList.add('revealed'));
  if (!('IntersectionObserver' in window)) { revealAll(); return; }
  let batch = 0, lastT = 0;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const now = performance.now();
      if (now - lastT > 120) batch = 0;        // new wave of elements
      lastT = now;
      entry.target.style.transitionDelay = Math.min(batch, 6) * 70 + 'ms';
      entry.target.classList.add('revealed');
      batch += 1;
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
  // Safety net: never leave content hidden if the observer doesn't fire
  // (background tab, odd viewport, etc.) — force-reveal after a moment.
  setTimeout(revealAll, 1600);
}

/* ---- Mobile nav drawer --------------------------------------------------- */
export function initMobileNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const close = () => document.body.classList.remove('nav-open');
  toggle?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  document.querySelector('[data-nav-close]')?.addEventListener('click', close);
  document.querySelectorAll('[data-nav-link]').forEach((a) => a.addEventListener('click', close));
  // Close on Escape and when resizing back to desktop.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) close(); });
}

/* ---- Boot ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  hydrateAccount();
  hydrateUsage();
  hydrateNavCounts();
  initWelcomeGate();
  initReveal();
  initMobileNav();
});
