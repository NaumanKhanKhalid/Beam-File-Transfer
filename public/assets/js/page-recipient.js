/**
 * Recipient page — public download / unlock flow.
 * Demo transfer is seeded server-side; a real /r/{slug} is fetched via
 * api.transfers.get(slug) and unlocked with api.transfers.unlock(slug, code).
 */
import { api, ApiError, toast, ext, KIND, ic, humanSize } from './beam.js';

const card = document.getElementById('rxCard');
const slug = card?.dataset.slug || 'demo';
let t = {};
let unlocked = false;
let burned = false;
let goneInfo = null;   // { icon, title, message, note } when a transfer is burned / expired / missing
const downloaded = new Set();   // indices of files the recipient has saved

/* ---- helpers ------------------------------------------------------------- */
const badge = (label) => `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">${label}</span>`;
function fmtCountdown(ts) {
  let ms = ts - Date.now();
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / 86400000); ms -= d * 86400000;
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}
const initialsOf = (n) => (n || 'Mara Lin').split(' ').map((w) => w[0]).slice(0, 2).join('');

function fileRow(f, i) {
  const done = downloaded.has(i);
  const thumb = (f.kind === 'image' && f.url)
    ? `<div class="w-10 h-10 rounded-lg flex-none bg-ink-100 bg-cover bg-center ring-1 ring-ink-150" style="background-image:url('${f.url}')"></div>`
    : `<div class="w-10 h-10 rounded-lg flex items-center justify-center flex-none text-white font-mono font-bold text-[11px] uppercase" style="background:${KIND[f.kind] || KIND.default}">${ext(f.name)}</div>`;
  return `<div data-row="${i}" class="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-50 transition-all ${done ? 'opacity-55' : ''}">
    ${thumb}
    <div class="flex-1 min-w-0"><div class="text-sm font-medium text-ink-900 truncate">${f.name}</div><div class="font-mono text-[11px] text-ink-400">${f.size}</div></div>
    <div data-row-actions="${i}" class="flex items-center gap-0.5 flex-none">${rowActions(i)}</div>
  </div>`;
}

function rowActions(i) {
  if (downloaded.has(i)) {
    return `<span class="flex items-center gap-1 text-[12px] font-semibold text-success-700 pr-2 whitespace-nowrap">${ic('check', 'w-4 h-4', 2.6)}Saved</span>`;
  }
  return `<button type="button" data-preview="${i}" aria-label="Preview" class="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 transition-colors">${ic('eye', 'w-[18px] h-[18px]')}</button>
      <button type="button" data-dl="${i}" aria-label="Download" class="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 transition-colors">${ic('download', 'w-[17px] h-[17px]')}</button>`;
}

/* ---- views --------------------------------------------------------------- */
function filesView() {
  const initials = initialsOf(t.sender);
  // Branded header band when the sender is on a Pro plan with branding enabled.
  const b = t.brand && (t.brand.name || t.brand.logo) ? t.brand : null;
  const brandBand = b ? `
    <div class="px-[26px] py-4 flex items-center gap-3" style="background:${b.accent || '#4B3AFF'}">
      ${b.logo ? `<img src="${b.logo}" alt="${b.name || 'Brand'}" class="h-7 object-contain">` : `<span class="font-display font-bold text-white text-[17px] tracking-tight">${b.name || 'Your brand'}</span>`}
    </div>` : '';
  return `
    ${brandBand}
    <div class="px-[26px] pt-[26px] pb-5 border-b border-ink-100">
      <div class="flex items-center gap-2.5 mb-4">
        <span class="w-8 h-8 rounded-full text-white font-display font-bold text-xs flex items-center justify-center" style="background:${b?.accent || '#4B3AFF'}">${initials}</span>
        <span class="text-[13px] text-ink-400"><b class="text-ink-900 font-semibold">${t.sender || 'Mara Lin'}</b> sent you ${t.files.length} files<span data-dl-count class="text-success-700 font-semibold"></span></span>
        <span class="ml-auto">${badge('Encrypted')}</span>
      </div>
      <div class="font-display font-bold text-2xl text-ink-900 tracking-tight">${t.title || 'Files for you'}</div>
      ${t.note ? `<p class="text-sm text-ink-700 mt-2 leading-relaxed">${t.note}</p>` : ''}
      ${t.burn ? `<div class="mt-3 flex items-center gap-2 bg-warning-50 text-warning-700 rounded-lg px-3 py-2 text-[12px] font-semibold">${ic('zap', 'w-4 h-4')}Deletes right after you download — save them now.</div>` : ''}
    </div>
    <div class="px-3.5 py-2.5 max-h-[208px] overflow-auto scroll-thin">${t.files.map(fileRow).join('')}</div>
    <div class="px-[26px] pt-5 pb-[26px]">
      <div class="flex items-center justify-between mb-4">
        <span class="font-display font-bold text-xl text-ink-900 whitespace-nowrap">${t.total || ''}</span>
        ${t.expiresAt
          ? `<span class="flex items-center gap-1.5 text-xs text-warning-700 bg-warning-50 px-2.5 py-1 rounded-full font-mono whitespace-nowrap">${ic('clock', 'w-3.5 h-3.5')}<span data-expires="${t.expiresAt}">${fmtCountdown(t.expiresAt)}</span></span>`
          : `<span class="flex items-center gap-1.5 text-xs text-ink-400 font-mono whitespace-nowrap">${ic('clock', 'w-3.5 h-3.5')}Expires ${t.expires || ''}</span>`}
      </div>
      <button type="button" data-download-all class="w-full h-[52px] rounded-full active:translate-y-px text-white font-semibold text-[17px] flex items-center justify-center gap-2 transition hover:brightness-105" style="background:${b?.accent || '#C6FF3D'};${b ? '' : 'color:#0E0F12;'}">${ic('download', 'w-[18px] h-[18px]')}Download all</button>
      <div class="flex items-center justify-center gap-4 mt-3.5">
        <span class="flex items-center gap-2 text-xs text-ink-400">${ic('shield', 'w-3.5 h-3.5 text-success-500')}End-to-end encrypted</span>
        <button type="button" data-show-qr class="flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 px-2.5 py-1 rounded-full transition-colors">${ic('inbox', 'w-3.5 h-3.5')}Show QR</button>
      </div>
      <div data-qr-box class="hidden mt-3 flex flex-col items-center gap-2">
        <div data-qr class="p-3 bg-white rounded-xl ring-1 ring-ink-150"></div>
        <span class="text-[11px] text-ink-400">Scan to open this transfer on another device</span>
      </div>
    </div>`;
}

function lockView() {
  return `<div class="px-[26px] pt-9 pb-8 text-center">
    <div class="w-[68px] h-[68px] rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-5">${ic('lock', 'w-8 h-8')}</div>
    <h2 class="font-display font-bold text-[22px] text-ink-900 tracking-tight">This transfer is protected</h2>
    <p class="text-sm text-ink-400 mt-1.5"><b class="text-ink-700">${t.sender || 'Mara Lin'}</b> sent you ${t.files.length} files. Enter the access code to open them.</p>
    <div id="codeBoxes" class="flex justify-center gap-2 mt-6">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<div class="codecell w-11 h-14 rounded-xl border-2 border-ink-150 bg-ink-50 flex items-center justify-center font-mono font-bold text-2xl text-ink-900" data-ci="${i}"></div>`).join('')}
    </div>
    <input id="codeInput" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="absolute opacity-0 left-1/2 -translate-x-1/2 w-[280px] h-14 cursor-pointer" style="top:118px">
    <div id="codeErr" class="text-[13px] text-danger-500 font-medium mt-3 h-5"></div>
    <button type="button" data-unlock class="w-full h-[52px] mt-1 rounded-full bg-spark-500 hover:bg-spark-600 active:translate-y-px text-ink-900 font-semibold text-[16px] flex items-center justify-center gap-2 transition">${ic('shield', 'w-[18px] h-[18px]')}Unlock files</button>
    ${t.demo ? `<p class="text-[12px] text-ink-300 mt-4 font-mono">Demo code: <b class="text-brand-600">${t.password}</b></p>` : ''}
  </div>`;
}

function goneView({ icon = 'zap', title, message, note }) {
  return `<div class="px-[26px] pt-10 pb-9 text-center">
    <div class="w-[68px] h-[68px] rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-5">${ic(icon, 'w-8 h-8')}</div>
    <h2 class="font-display font-bold text-[22px] text-ink-900 tracking-tight">${title}</h2>
    <p class="text-sm text-ink-400 mt-2 leading-relaxed">${message}</p>
    ${note ? `<div class="mt-5 flex items-center justify-center gap-2 text-xs text-ink-400">${ic('shield', 'w-3.5 h-3.5 text-success-500')}${note}</div>` : ''}
  </div>`;
}
function burnedView() {
  return goneView({
    icon: 'zap',
    title: 'This transfer is gone',
    message: `${t.sender || 'The sender'} set these files to delete after the first download — so they’re no longer available.`,
    note: 'Securely erased · nothing left on our servers',
  });
}

/* ---- render + wiring ----------------------------------------------------- */
function render() {
  if (goneInfo) { card.innerHTML = goneView(goneInfo); return; }
  const locked = t.password && !unlocked;
  card.innerHTML = burned ? burnedView() : locked ? lockView() : filesView();
  if (burned) return;
  if (locked) wireLock(); else wireFiles();
}

function wireLock() {
  const inp = document.getElementById('codeInput');
  const boxes = document.getElementById('codeBoxes');
  const paint = () => {
    const v = inp.value.replace(/\D/g, '').slice(0, 6); inp.value = v;
    document.querySelectorAll('.codecell').forEach((c, i) => {
      c.textContent = v[i] || '';
      c.classList.toggle('border-brand-500', i === v.length);
      c.classList.toggle('border-ink-150', i !== v.length);
    });
    document.getElementById('codeErr').textContent = '';
    if (v.length === 6) setTimeout(submit, 120);
  };
  async function submit() {
    const v = inp.value;
    if (v.length < 6) { document.getElementById('codeErr').textContent = 'Enter all 6 digits.'; return; }
    let ok = String(v) === String(t.password);
    if (!t.demo) {
      try { const r = await api.transfers.unlock(slug, v); if (r && (r.files || r.data)) { t.files = (r.files || r.data.files).map(mapFile); ok = true; } } catch (e) { ok = false; }
    }
    if (ok) { unlocked = true; render(); toast('Unlocked — files are ready', 'success'); }
    else {
      document.getElementById('codeErr').textContent = 'Incorrect code. Try again.';
      document.querySelectorAll('.codecell').forEach((c) => { c.classList.add('border-danger-500'); c.classList.remove('border-ink-150', 'border-brand-500'); });
      boxes.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 });
      inp.value = '';
    }
  }
  inp.addEventListener('input', paint);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  boxes.addEventListener('click', () => inp.focus());
  card.querySelector('[data-unlock]').addEventListener('click', submit);
  setTimeout(() => inp.focus(), 50);
}

function wireFiles() {
  card.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => downloadOne(+b.dataset.dl)));
  card.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => openPreview(+b.dataset.preview)));
  card.querySelector('[data-download-all]').addEventListener('click', (e) => downloadAll(e.currentTarget));
  card.querySelector('[data-show-qr]')?.addEventListener('click', () => toggleQr());
}

/* ---- Preview lightbox (images + PDFs) ------------------------------------ */
function openPreview(i) {
  const f = t.files[i];
  if (!f || !f.url) { toast('Demo file — send your own from the Sender app to preview.', 'brand'); return; }
  const isImg = f.kind === 'image';
  const isPdf = f.kind === 'pdf' || /\.pdf$/i.test(f.name);
  if (!isImg && !isPdf) { downloadOne(i); return; }   // non-previewable → just download

  const ov = document.createElement('div');
  ov.className = 'beam-lightbox';
  ov.style.cssText = 'position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;background:rgba(11,12,15,.86);backdrop-filter:blur(4px);padding:20px';
  ov.innerHTML = `
    <div class="flex items-center gap-3 text-white pb-3 px-1">
      <span class="text-sm font-semibold truncate flex-1">${f.name}</span>
      <a href="${f.url}" download="${f.name}" class="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-spark-500 text-ink-900 text-[13px] font-semibold">${ic('download', 'w-4 h-4')}Download</a>
      <button type="button" data-close class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">${ic('x', 'w-5 h-5')}</button>
    </div>
    <div class="flex-1 min-h-0 flex items-center justify-center">
      ${isImg
        ? `<img src="${f.url}" alt="${f.name}" style="max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,.5)">`
        : `<iframe src="${f.url}" title="${f.name}" style="width:100%;height:100%;border:0;border-radius:12px;background:#fff"></iframe>`}
    </div>`;
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  document.body.appendChild(ov);
}

/* ---- QR code for the transfer link --------------------------------------- */
function toggleQr() {
  const box = card.querySelector('[data-qr-box]');
  const btn = card.querySelector('[data-show-qr]');
  if (!box) return;
  const showing = !box.classList.contains('hidden');
  if (showing) { box.classList.add('hidden'); if (btn) btn.classList.remove('bg-ink-100'); return; }
  if (!box.dataset.rendered) {
    // Prefer the transfer's short link; fall back to a clean /r/{slug} URL
    // (never the raw location.href, which can be a long signed URL that won't fit a QR).
    const url = t.link || (location.origin + '/r/' + slug);
    const holder = box.querySelector('[data-qr]');
    try { window.BeamQR.render(holder, url, 150); box.dataset.rendered = '1'; }
    catch (e) { holder.textContent = 'QR unavailable'; }
  }
  box.classList.remove('hidden');
  if (btn) btn.classList.add('bg-ink-100');
}

function updateDownloadedCount() {
  const el = card.querySelector('[data-dl-count]');
  if (el) el.textContent = downloaded.size ? `  ·  ${downloaded.size} saved` : '';
}

function markDownloaded(i) {
  downloaded.add(i);
  const row = card.querySelector(`[data-row="${i}"]`);
  if (row) {
    row.classList.add('opacity-55');
    const act = row.querySelector(`[data-row-actions="${i}"]`);
    if (act) act.innerHTML = rowActions(i);
  }
  updateDownloadedCount();
}

function triggerDownload(f) {
  if (!f || !f.url) return false;
  const a = document.createElement('a'); a.href = f.url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
  return true;
}

function downloadOne(i) {
  const f = t.files[i];
  const real = triggerDownload(f);
  markDownloaded(i);
  if (!real) toast('Demo file — send your own from the Sender app to download for real.', 'brand');
}

function downloadAll(btn) {
  // Real transfer → one ZIP from the server (keeps folder structure).
  if (slug && slug !== 'demo' && !t.demo && t.files.length) {
    btn.disabled = true;
    btn.innerHTML = `${ic('download', 'w-[18px] h-[18px]')}Preparing ZIP…`;
    const a = document.createElement('a'); a.href = api.transfers.zipUrl(slug);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => {
      t.files.forEach((_, i) => markDownloaded(i));
      btn.innerHTML = `${ic('check', 'w-[18px] h-[18px]', 2.6)}Downloaded as ZIP`;
      btn.className = 'w-full h-[52px] rounded-full bg-success-500 text-white font-semibold text-[17px] flex items-center justify-center gap-2 transition';
      if (t.burn) setTimeout(() => { burned = true; render(); toast('Files deleted after download 🔥', 'brand'); }, 1200);
      else toast('Downloading as ZIP…', 'success');
    }, 1400);
    return;
  }

  // Demo fallback: stagger individual downloads.
  const idx = t.files.map((_, i) => i).filter((i) => !downloaded.has(i));
  const list = idx.length ? idx : t.files.map((_, i) => i);
  const n = list.length;
  btn.disabled = true;
  btn.className = 'w-full h-[52px] rounded-full bg-spark-500 text-ink-900 font-semibold text-[17px] flex items-center justify-center gap-2 transition';
  let done = 0;
  list.forEach((i, k) => setTimeout(() => {
    downloadOne(i);
    done++;
    if (done < n) {
      btn.innerHTML = `${ic('download', 'w-[18px] h-[18px]')}Saving… ${done}/${n}`;
    } else {
      btn.innerHTML = `${ic('check', 'w-[18px] h-[18px]', 2.6)}All ${n} saved`;
      btn.className = 'w-full h-[52px] rounded-full bg-success-500 text-white font-semibold text-[17px] flex items-center justify-center gap-2 transition';
      if (t.burn) {
        setTimeout(() => { burned = true; render(); toast('Files deleted after download 🔥', 'brand'); }, 900);
      } else {
        toast(idx.length ? `Saved ${n} file${n > 1 ? 's' : ''}` : 'Demo transfer — send your own files to download for real.', idx.length ? 'success' : 'brand');
      }
    }
  }, k * 320));
}

const mapFile = (f) => ({ name: f.name, size: f.size || (f.size_bytes != null ? humanSize(f.size_bytes) : ''), kind: f.kind, url: f.download || f.url });

/* ---- countdown ----------------------------------------------------------- */
setInterval(() => {
  document.querySelectorAll('[data-expires]').forEach((el) => {
    const txt = fmtCountdown(+el.getAttribute('data-expires'));
    el.textContent = txt;
    if (txt === 'Expired') el.classList.add('text-danger-500');
  });
}, 1000);

/* ---- boot ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  try { t = JSON.parse(document.getElementById('rxSeed').textContent); } catch (e) { t = { files: [] }; }

  if (slug && slug !== 'demo') {
    try {
      const r = await api.transfers.get(slug);
      const d = r.data || r;
      t = {
        sender: d.sender_name || d.sender, title: d.title, note: d.message || d.note,
        total: d.total || (d.total_bytes != null ? humanSize(d.total_bytes) : ''),
        expires: d.expires || '', expiresAt: d.expires_at ? Date.parse(d.expires_at) : null,
        password: d.protected || d.password_required || d.locked || false, burn: d.burn || false, demo: false,
        files: (d.files || []).map(mapFile),
      };
    } catch (e) {
      // A real transfer that's gone (burned / expired / removed) must show the
      // "gone" page on refresh — NOT fall back to the demo lock screen.
      if (e instanceof ApiError && e.status === 410) {
        const expired = /expire/i.test(e.first || '');
        goneInfo = expired
          ? { icon: 'clock', title: 'This transfer has expired', message: 'The sender set a time limit and it has passed — these files are no longer available.' }
          : { icon: 'zap', title: 'This transfer is gone', message: 'It was set to delete after the first download, so it’s no longer available.', note: 'Securely erased · nothing left on our servers' };
        render();
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        goneInfo = { icon: 'search', title: 'Transfer not found', message: 'This link is invalid or has been removed. Double-check the URL with whoever sent it.' };
        render();
        return;
      }
      // Network / other error: keep the seed so the page still renders something.
    }
  }
  render();
});
