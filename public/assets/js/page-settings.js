/**
 * Settings page — hydrates the signed-in user, saves the profile, and (for Pro
 * accounts) swaps in the Pro plan card, storage figures and the branding editor.
 * Branding changes persist via api.profile.branding(); the SAME endpoint React
 * will call.
 */
import { api, ApiError, toast, initialsOf, ic, humanSize } from './beam.js';

const $ = (s, r = document) => r.querySelector(s);
const ACCENTS = ['#4B3AFF', '#18B368', '#F4384F', '#F5A524', '#0E0F12', '#E5476B', '#0FB5C9', '#7C3AED'];
const planLabel = (p) => ({ free: 'Free plan', pro: 'Pro plan', business: 'Business plan' }[p] || 'Free plan');
const GUEST_NAME_KEY = 'beam.guestName';
const guestName = () => (localStorage.getItem(GUEST_NAME_KEY) || '').trim();

let user = null;
const brand = { on: false, name: '', accent: '#4B3AFF', logo: null };

// Cached identity + plan + brand, so a Pro user's unlocked UI paints INSTANTLY on
// refresh instead of flashing the locked "Upgrade to Pro" state while /me loads.
const PROFILE_CACHE = 'beam.cache.profile';
const isProPlan = (p) => ['pro', 'business'].includes(String(p || '').toLowerCase());
// Locked Blade markup, captured on boot so a stale (Pro→Free) cache can revert.
let lockedPlanHtml = '';
let lockedBrandHtml = '';

function readProfileCache() {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE) || 'null'); } catch (e) { return null; }
}
function writeProfileCache() {
  try { localStorage.setItem(PROFILE_CACHE, JSON.stringify({ user, brand })); } catch (e) { /* quota */ }
}

// Swap the Plan + Branding cards between the unlocked Pro editor and the locked
// free state (the original Blade markup).
function applyProState(isPro) {
  if (isPro) { paintProPlan(); mountBranding(); }
  else {
    if (lockedPlanHtml) $('#planCard').innerHTML = lockedPlanHtml;
    if (lockedBrandHtml) $('#brandingCard').innerHTML = lockedBrandHtml;
  }
}

/* ---- Profile ------------------------------------------------------------- */
function paintProfile() {
  const gname = guestName();
  const name = user ? user.name : (gname || 'Guest');
  const email = user ? user.email : (gname ? 'Guest · no account' : '—');
  $('[data-name-display]').textContent = name;
  $('[data-email-display]').textContent = email;
  $('[data-avatar-initials]').textContent = (user || gname) ? (user?.initials || initialsOf(name)) : 'G';
  $('[data-avatar]').style.background = brand.on ? brand.accent : '#4B3AFF';
  $('#setName').value = user ? name : gname;
  $('#setEmail').value = user ? email : '';
  // Guests have no account email; make that clear and steer them to register.
  const emailInp = $('#setEmail');
  const hint = $('[data-profile-hint]');
  if (!user) {
    emailInp.disabled = true;
    emailInp.placeholder = 'Create a free account to set an email';
    emailInp.classList.add('opacity-60', 'cursor-not-allowed');
    if (hint) hint.innerHTML = 'Sending as a guest — <a href="/login?mode=signup" class="text-brand-600 font-semibold hover:underline">create a free account</a> to keep your transfers.';
  } else {
    emailInp.disabled = false;
    emailInp.classList.remove('opacity-60', 'cursor-not-allowed');
    if (hint) hint.textContent = '';
  }
}

async function saveProfile() {
  const name = $('#setName').value.trim();
  // Guests: persist the display name locally (used as sender_name on transfers).
  if (!api.authenticated) {
    if (!name) { toast('Enter your name.', 'danger'); return; }
    localStorage.setItem(GUEST_NAME_KEY, name);
    const fromInput = document.getElementById('fromInput'); if (fromInput) fromInput.value = name;
    paintProfile();
    toast('Name saved', 'success');
    return;
  }
  const email = $('#setEmail').value.trim();
  try {
    const u = await api.profile.update({ name, email });
    const nu = u.data || u;
    user = { name: nu.name, email: nu.email, plan: nu.plan, initials: nu.initials || initialsOf(nu.name) };
    paintProfile();
    writeProfileCache();
    toast('Profile saved', 'success');
  } catch (e) {
    toast(e instanceof ApiError ? e.first : 'Could not reach the API.', 'danger');
  }
}

/* ---- Storage + usage (both guests and signed-in users) ------------------- */
async function loadStorage() {
  let used = 0, cap = 2 * 1024 * 1024 * 1024;
  try { const u = await api.usage(); used = u.used ?? 0; cap = u.cap ?? cap; } catch (e) { /* keep defaults */ }
  const pct = cap ? Math.min(100, (used / cap) * 100) : 0;
  const sub = $('[data-storage-sub]');
  const fill = $('[data-storage-fill]');
  if (sub) sub.textContent = `${humanSize(used)} of ${humanSize(cap)} used`;
  if (fill) { fill.style.width = (used === 0 ? 0 : Math.max(pct, 2)) + '%'; fill.style.background = pct >= 100 ? '#F4384F' : (brand.on ? brand.accent : '#4B3AFF'); }

  try {
    const s = await api.transfers.stats();
    const set = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = v; };
    set('transfers', s.total ?? 0);
    set('downloads', s.downloads_week ?? 0);
    set('active', s.active ?? 0);
  } catch (e) {
    ['transfers', 'downloads', 'active'].forEach((k) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = '0'; });
  }
}

/* ---- Pro: plan + storage ------------------------------------------------- */
function paintProPlan() {
  const chips = ['200 GB transfers', 'Branded pages', '1 year expiry', 'Password + burn', 'Priority support']
    .map((f) => `<span class="inline-flex items-center gap-1.5 text-[12px] text-ink-700 bg-ink-50 border border-ink-100 rounded-full px-3 py-1.5">${ic('check', 'w-3.5 h-3.5 text-success-500')}${f}</span>`).join('');
  $('#planCard').innerHTML = `
    <div class="flex items-start justify-between gap-3 mb-4">
      <div><div class="flex items-center gap-2"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Plan</h3><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">Pro</span></div>
      <p class="text-[13px] text-ink-400 mt-0.5">You are on Beam Pro — branded pages, 200 GB transfers, 1 year expiry.</p></div>
      ${ic('crown', 'w-7 h-7 text-spark-600')}
    </div>
    <div class="flex flex-wrap gap-2">${chips}</div>
    <div class="mt-5"><button type="button" data-downgrade class="h-[42px] px-5 rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-sm font-semibold transition-colors">Switch to Free</button></div>`;
  $('[data-downgrade]').addEventListener('click', downgrade);
}

async function downgrade() {
  try { await api.subscription.cancel(); } catch (e) { /* best-effort */ }
  if (user) user.plan = 'free';
  brand.on = false;
  writeProfileCache();   // so the post-reload instant-paint shows Free, not stale Pro
  location.reload();
  toast('Switched to Free plan', 'brand');
}

/* ---- Pro: branding editor ------------------------------------------------ */
function brandingEditorHtml() {
  const swatches = ACCENTS.map((c) => `<button type="button" data-accent="${c}" class="w-8 h-8 rounded-full transition-transform hover:scale-110 ${brand.accent === c ? 'ring-2 ring-offset-2 ring-ink-900' : ''}" style="background:${c}" aria-label="accent"></button>`).join('');
  return `
    <div class="flex items-start justify-between gap-3 mb-4">
      <div><div class="flex items-center gap-2"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Branded transfer pages</h3><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-spark-500 text-ink-900">Pro</span></div>
      <p class="text-[13px] text-ink-400 mt-0.5">Put your logo and color on the recipient download page.</p></div>
      <button type="button" data-brand-toggle class="switch" data-on="${brand.on}"><span class="track block w-11 h-[26px] rounded-full bg-ink-200 relative transition-colors duration-200"><span class="thumb absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"></span></span></button>
    </div>
    <div class="grid grid-cols-[1fr_260px] gap-6 items-start ${brand.on ? '' : 'opacity-50 pointer-events-none'}">
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Brand name</span><input id="setBrandName" value="${brand.name}" placeholder="Studio Mara" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
        <div><span class="text-[13px] font-semibold text-ink-900 block mb-2">Accent color</span><div class="flex flex-wrap gap-2.5">${swatches}</div></div>
        <div><span class="text-[13px] font-semibold text-ink-900 block mb-2">Logo</span>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl border border-ink-150 bg-ink-50 flex items-center justify-center overflow-hidden flex-none">${brand.logo ? `<img src="${brand.logo}" class="w-full h-full object-contain">` : ic('image', 'w-5 h-5 text-ink-300')}</div>
            <button type="button" data-logo-pick class="h-10 px-4 rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13px] font-semibold transition-colors">Upload logo</button>
            ${brand.logo ? `<button type="button" data-logo-clear class="h-10 px-3 rounded-full text-ink-400 hover:text-danger-500 text-[13px] font-semibold transition-colors">Remove</button>` : ''}
          </div>
        </div>
      </div>
      <div>
        <span class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 block mb-2">Preview</span>
        <div class="rounded-2xl overflow-hidden border border-ink-100 shadow-sm">
          <div class="px-4 py-3 flex items-center gap-2" style="background:${brand.accent}">
            ${brand.logo ? `<img src="${brand.logo}" class="h-5 object-contain">` : `<span data-brand-pv-name class="font-display font-bold text-white text-sm">${brand.name || 'Your brand'}</span>`}
          </div>
          <div class="bg-white p-4">
            <div class="font-display font-bold text-ink-900 text-sm">3 files · 1.6 GB</div>
            <div class="text-[11px] text-ink-400 mt-0.5 font-mono">from ${user ? user.name : 'You'}</div>
            <button class="mt-3 w-full h-9 rounded-full text-white text-[13px] font-semibold" style="background:${brand.accent}">Download all</button>
          </div>
        </div>
        <a href="/recipient" class="mt-3 text-[13px] font-semibold text-brand-600 hover:underline flex items-center gap-1">${ic('eye', 'w-4 h-4')}Open full recipient page</a>
      </div>
    </div>`;
}

function mountBranding() {
  $('#brandingCard').innerHTML = brandingEditorHtml();
  const card = $('#brandingCard');
  card.querySelector('[data-brand-toggle]').addEventListener('click', () => {
    brand.on = !brand.on;
    persistBrand();
    mountBranding();
  });
  card.querySelectorAll('[data-accent]').forEach((b) => b.addEventListener('click', () => { brand.accent = b.dataset.accent; persistBrand(); mountBranding(); $('[data-avatar]').style.background = brand.on ? brand.accent : '#4B3AFF'; }));
  const nameInp = card.querySelector('#setBrandName');
  if (nameInp) {
    nameInp.addEventListener('input', () => { brand.name = nameInp.value; const pv = card.querySelector('[data-brand-pv-name]'); if (pv) pv.textContent = brand.name || 'Your brand'; });
    nameInp.addEventListener('blur', persistBrand);
  }
  card.querySelector('[data-logo-pick]')?.addEventListener('click', () => $('#brandLogoPick').click());
  card.querySelector('[data-logo-clear]')?.addEventListener('click', () => { brand.logo = null; persistBrand(); mountBranding(); });
}

async function persistBrand() {
  writeProfileCache();   // keep the instant-paint cache in sync with toggles/edits
  try { await api.profile.branding({ enabled: brand.on ? 1 : 0, name: brand.name, accent: brand.accent }); } catch (e) { /* best-effort */ }
}

/* ---- Account security: change password + delete account ------------------ */
function initAccountSecurity() {
  const region = $('[data-account-only]');
  if (region) { region.classList.remove('hidden'); region.classList.add('flex'); }   // signed-in only

  // Change password
  $('[data-save-password]')?.addEventListener('click', async () => {
    const cur = $('#curPw').value, n1 = $('#newPw').value, n2 = $('#newPw2').value;
    const hint = $('[data-pw-hint]');
    if (!cur || !n1) { toast('Fill in your current and new password.', 'danger'); return; }
    if (n1.length < 8) { toast('New password must be at least 8 characters.', 'danger'); return; }
    if (n1 !== n2) { toast('New passwords don’t match.', 'danger'); return; }
    try {
      await api.profile.password(cur, n1, n2);
      $('#curPw').value = $('#newPw').value = $('#newPw2').value = '';
      if (hint) hint.textContent = 'Updated just now';
      toast('Password updated', 'success');
    } catch (e) {
      toast(e instanceof ApiError ? e.first : 'Could not update password.', 'danger');
    }
  });

  // Delete account (two-step: reveal password confirm, then delete)
  const idle = $('[data-del-idle]'), confirm = $('[data-del-confirm]');
  $('[data-del-start]')?.addEventListener('click', () => { idle?.classList.add('hidden'); confirm?.classList.remove('hidden'); $('#delPw')?.focus(); });
  $('[data-del-cancel]')?.addEventListener('click', () => { confirm?.classList.add('hidden'); idle?.classList.remove('hidden'); if ($('#delPw')) $('#delPw').value = ''; });
  $('[data-del-confirm-btn]')?.addEventListener('click', async (e) => {
    const pw = $('#delPw')?.value || '';
    if (!pw) { toast('Enter your password to confirm.', 'danger'); return; }
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      await api.profile.deleteAccount(pw);
      // Wipe local session + cached identity, then land on a clean guest home.
      api.setToken(null);
      ['beam.cache.account', 'beam.cache.usage', 'beam.cache.nav', 'beam.cache.profile', 'beam.gateChoice'].forEach((k) => localStorage.removeItem(k));
      toast('Account deleted.', 'brand');
      setTimeout(() => location.assign('/'), 700);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Permanently delete';
      toast(err instanceof ApiError ? err.first : 'Could not delete account.', 'danger');
    }
  });
}

/* ---- Boot ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  $('[data-save-profile]').addEventListener('click', saveProfile);
  // Returning from Safepay checkout (callback redirected here).
  const q = new URLSearchParams(location.search);
  if (q.has('subscribed')) { toast('Payment confirmed — your plan is active 🎉', 'success'); history.replaceState({}, '', location.pathname); }
  // Remember the locked free-state markup before any swap, so we can revert.
  lockedPlanHtml = $('#planCard')?.innerHTML || '';
  lockedBrandHtml = $('#brandingCard')?.innerHTML || '';

  // Logo upload (input lives in the app layout)
  $('#brandLogoPick')?.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    brand.logo = URL.createObjectURL(f);
    mountBranding();
    try { const u = await api.profile.branding({ enabled: 1, name: brand.name, accent: brand.accent, logo: f }); const nu = u.data || u; if (nu.brand?.logo) brand.logo = nu.brand.logo; mountBranding(); writeProfileCache(); toast('Logo updated', 'success'); } catch (err) { /* keep local preview */ }
    e.target.value = '';
  });

  if (!api.authenticated) { paintProfile(); loadStorage(); return; }

  initAccountSecurity();   // reveal + wire password change / account delete (signed-in only)

  // 1) Paint instantly from cache (no flicker): if the last visit knew this user
  //    was Pro, show the unlocked UI right away.
  const cached = readProfileCache();
  if (cached && cached.user) {
    user = cached.user;
    if (cached.brand) Object.assign(brand, cached.brand);
    paintProfile();
    applyProState(isProPlan(user.plan));
  }

  // 2) Refresh from the server, then reconcile (covers upgrades/downgrades).
  try {
    const u = await api.auth.me();
    user = { name: u.name, email: u.email, plan: u.plan, initials: u.initials || initialsOf(u.name) };
    if (u.brand) Object.assign(brand, { on: !!u.brand.enabled, name: u.brand.name || '', accent: u.brand.accent || '#4B3AFF', logo: u.brand.logo || null });
    paintProfile();
    loadStorage();
    applyProState(isProPlan(u.plan));
    writeProfileCache();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { api.setToken(null); localStorage.removeItem(PROFILE_CACHE); }
    if (!cached) { paintProfile(); }
    loadStorage();
  }
});
