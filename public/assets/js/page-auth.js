/**
 * Auth page — login / signup tabs wired to the Beam API.
 * Blade renders the card; this toggles modes and submits to
 * api.auth.login / api.auth.register, then redirects to the app.
 */
import { api, ApiError, toast } from './beam.js';

const $ = (s) => document.querySelector(s);

const COPY = {
  login:  { heading: 'Welcome back',         sub: 'Log in to track transfers and rooms.',     submit: 'Log in',          passPh: '••••••••',             passAuto: 'current-password' },
  signup: { heading: 'Create your account',  sub: 'Free forever — 2 GB transfers, no card.',  submit: 'Create account',  passPh: 'At least 8 characters', passAuto: 'new-password' },
};

let mode = 'login';

function setMode(next) {
  mode = next === 'signup' ? 'signup' : 'login';
  const c = COPY[mode];

  document.querySelectorAll('[data-auth-tab]').forEach((b) => {
    const on = b.dataset.authTab === mode;
    b.className = 'flex-1 h-10 rounded-lg text-sm font-semibold transition-all ' +
      (on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700');
  });

  $('[data-auth-heading]').textContent = c.heading;
  $('[data-auth-sub]').textContent = c.sub;
  $('[data-submit-label]').textContent = c.submit;

  const nameField = $('[data-name-field]');
  nameField.classList.toggle('hidden', mode !== 'signup');
  nameField.classList.toggle('flex', mode === 'signup');

  const pass = $('#auPass');
  pass.placeholder = c.passPh;
  pass.setAttribute('autocomplete', c.passAuto);

  $('[data-forgot]').classList.toggle('hidden', mode === 'signup');
}

async function submit(e) {
  e.preventDefault();
  const isSignup = mode === 'signup';
  const name = $('#auName').value.trim();
  const email = $('#auEmail').value.trim();
  const pass = $('#auPass').value;

  if (!email || !email.includes('@')) { toast('Enter a valid email address.', 'danger'); return; }
  if (!pass || pass.length < (isSignup ? 8 : 1)) { toast(isSignup ? 'Password must be at least 8 characters.' : 'Enter your password.', 'danger'); return; }
  if (isSignup && !name) { toast('What should we call you?', 'danger'); return; }

  const btn = $('#authForm button[type="submit"]');
  btn.disabled = true;
  try {
    const r = isSignup ? await api.auth.register(name, email, pass) : await api.auth.login(email, pass);
    const first = (r.user?.name || email).split(' ')[0].split('@')[0];
    toast(isSignup ? `Account created — welcome, ${first}!` : `Welcome back, ${first}!`, 'success');
    setTimeout(() => location.assign('/'), 500);
  } catch (err) {
    btn.disabled = false;
    toast(err instanceof ApiError ? err.first : 'Could not reach the API — is the server running?', 'danger');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Surface an OAuth failure that bounced back as ?google=…
  const gErr = new URLSearchParams(location.search).get('google');
  if (gErr) {
    toast(gErr === 'unconfigured'
      ? 'Google sign-in isn’t set up on the server yet — add your Google keys to .env.'
      : 'Google sign-in didn’t complete. Please try again.', 'danger');
    history.replaceState({}, '', location.pathname);
  }

  // Already signed in? Go to the app.
  if (api.authenticated) { location.assign('/'); return; }

  document.querySelectorAll('[data-auth-tab]').forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.authTab)));
  $('[data-forgot-btn]').addEventListener('click', () => {
    // Carry whatever they've typed in the email field over to the dedicated page.
    const email = $('#auEmail').value.trim();
    location.assign('/forgot-password' + (email ? ('?email=' + encodeURIComponent(email)) : ''));
  });
  $('[data-google]').addEventListener('click', () => { location.assign('/auth/google/redirect'); });
  $('#authForm').addEventListener('submit', submit);

  // Honour ?mode=signup from the sidebar/topbar links.
  setMode(new URLSearchParams(location.search).get('mode') || 'login');
});
