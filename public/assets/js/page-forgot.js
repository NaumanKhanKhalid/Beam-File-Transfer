/**
 * Forgot-password page — collects the account email and requests a reset link
 * via api.auth.forgotPassword(). Always shows a neutral success message (never
 * reveals whether the email exists).
 */
import { api, ApiError, toast } from './beam.js';

const $ = (s) => document.querySelector(s);

async function submit(e) {
  e.preventDefault();
  const email = $('#fpEmail').value.trim();
  if (!email || !email.includes('@')) { toast('Enter a valid email address.', 'danger'); $('#fpEmail').focus(); return; }

  const btn = $('#forgotForm button[type="submit"]');
  const label = $('[data-fp-label]');
  btn.disabled = true; if (label) label.textContent = 'Sending…';
  try {
    await api.auth.forgotPassword(email);
  } catch (err) {
    // Still show the neutral success state — we don't disclose whether the email exists.
    if (err instanceof ApiError && err.status && err.status >= 500) {
      btn.disabled = false; if (label) label.textContent = 'Send reset link';
      toast('Could not send the reset email — try again in a moment.', 'danger');
      return;
    }
  }
  $('[data-fp-sent-email]').textContent = email;
  $('[data-fp-sent]').classList.remove('hidden');
  if (label) label.textContent = 'Reset link sent';
  toast('Reset link sent — check your inbox.', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  if (api.authenticated) { location.assign('/'); return; }
  // Prefill from ?email= (passed from the login page).
  const pre = new URLSearchParams(location.search).get('email');
  if (pre) $('#fpEmail').value = pre;
  $('#forgotForm').addEventListener('submit', submit);
});
