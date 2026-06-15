/**
 * Upgrade page — billing toggle, plan selection, and checkout wired to
 * api.subscription.checkout(). Prices live on the server-rendered cards
 * (data-monthly / data-yearly); JS recomputes on toggle.
 */
import { api, ApiError, toast } from './beam.js';

const $ = (s, r = document) => r.querySelector(s);
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const META = {
  free: { name: 'Free', tagline: 'For the occasional send' },
  pro: { name: 'Pro', tagline: 'For freelancers & creators' },
  business: { name: 'Business', tagline: 'For teams & studios' },
};

let billing = 'yearly';
let chosen = null;

function priceOf(plan, cycle) {
  const card = document.querySelector(`[data-plan="${plan}"]`);
  return +(cycle === 'yearly' ? card.dataset.yearly : card.dataset.monthly);
}

function applyBilling() {
  document.querySelectorAll('[data-bill]').forEach((b) => {
    const on = b.dataset.bill === billing;
    const base = 'px-4 py-2 rounded-full text-[13px] font-semibold transition-all';
    if (b.dataset.bill === 'yearly') {
      b.className = base + ' flex items-center gap-2 ' + (on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500');
    } else {
      b.className = base + ' ' + (on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500');
    }
  });
  document.querySelectorAll('[data-plan]').forEach((card) => {
    const price = +(billing === 'yearly' ? card.dataset.yearly : card.dataset.monthly);
    const priceEl = $('[data-price]', card);
    const noteEl = $('[data-note]', card);
    priceEl.textContent = price === 0 ? 'Free' : money(price);
    noteEl.textContent = price > 0
      ? (billing === 'yearly' ? `billed yearly · ${money(price * 12)}/yr` : 'billed monthly')
      : 'forever';
  });
}

function showCheckout(plan) {
  chosen = plan;
  const price = priceOf(plan, billing);
  const sub = billing === 'yearly' ? price * 12 : price;
  const gst = Math.round(sub * 0.18);
  const total = sub + gst;
  const m = META[plan];

  $('[data-sum-name]').textContent = 'Beam ' + m.name;
  $('[data-sum-cycle]').innerHTML = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-spark-500 text-ink-900">${billing === 'yearly' ? 'Yearly' : 'Monthly'}</span>`;
  $('[data-sum-tagline]').textContent = m.tagline;
  $('[data-sum-line]').textContent = `${m.name} (${billing === 'yearly' ? '12 mo' : '1 mo'})`;
  $('[data-sum-sub]').textContent = money(sub);
  $('[data-sum-gst]').textContent = money(gst);
  $('[data-sum-total]').textContent = money(total);
  $('[data-pay-total]').textContent = money(total);

  $('#pricingView').classList.add('hidden');
  $('#checkoutView').classList.remove('hidden');
  window.scrollTo({ top: 0 });
}

function showPricing() {
  chosen = null;
  $('#checkoutView').classList.add('hidden');
  $('#pricingView').classList.remove('hidden');
}

async function pay() {
  const email = $('#coEmail').value.trim();
  const card = $('#coCard').value.replace(/\s/g, '');
  if (!email.includes('@')) { toast('Enter a valid email.', 'danger'); return; }
  if (card.length < 12) { toast('Enter a valid card number (try 4242 4242 4242 4242).', 'danger'); return; }
  if (!api.authenticated) { toast('Log in first to subscribe.', 'brand'); setTimeout(() => location.assign('/login'), 700); return; }

  const btn = $('#payBtn'); btn.disabled = true;
  try {
    // In production: tokenise the card with Razorpay/Stripe and pass that token.
    await api.subscription.checkout(chosen, billing, 'demo_tok_' + Date.now());
    toast(`Welcome to Beam ${META[chosen].name} 🎉 — your plan is active`, 'success');
    setTimeout(() => location.assign('/settings'), 700);
  } catch (e) {
    btn.disabled = false;
    toast(e instanceof ApiError ? e.first : 'Could not reach the API — is the server running?', 'danger');
  }
}

function fmtCard(inp) { let v = inp.value.replace(/\D/g, '').slice(0, 16); inp.value = v.replace(/(.{4})/g, '$1 ').trim(); }
function fmtExp(inp) { let v = inp.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + ' / ' + v.slice(2); inp.value = v; }

document.addEventListener('DOMContentLoaded', () => {
  applyBilling();
  document.querySelectorAll('[data-bill]').forEach((b) => b.addEventListener('click', () => { billing = b.dataset.bill; applyBilling(); }));
  document.querySelectorAll('[data-choose]').forEach((b) => {
    if (b.dataset.choose === 'free') return;
    b.addEventListener('click', () => showCheckout(b.dataset.choose));
  });
  $('[data-back]').addEventListener('click', showPricing);
  $('#payBtn').addEventListener('click', pay);
  $('#coCard').addEventListener('input', (e) => fmtCard(e.target));
  $('#coExp').addEventListener('input', (e) => fmtExp(e.target));
});
