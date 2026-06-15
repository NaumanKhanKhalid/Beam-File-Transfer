/**
 * Reset-password page — reads ?token & ?email from the emailed link, posts the
 * new password to /api/password/reset, then sends the user to log in.
 */
import { api, ApiError, toast } from './beam.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const token = params.get('token') || '';
const email = params.get('email') || '';

async function submit(e) {
  e.preventDefault();
  const p1 = $('#rpPass').value, p2 = $('#rpPass2').value;
  if (!token || !email) { toast('This reset link is incomplete. Request a new one.', 'danger'); return; }
  if (p1.length < 8) { toast('Password must be at least 8 characters.', 'danger'); return; }
  if (p1 !== p2) { toast('Passwords don’t match.', 'danger'); return; }

  const btn = $('#resetForm button[type="submit"]');
  btn.disabled = true;
  try {
    await api.auth.resetPassword(token, email, p1, p2);
    toast('Password reset — you can log in now.', 'success');
    setTimeout(() => location.assign('/login'), 700);
  } catch (err) {
    btn.disabled = false;
    toast(err instanceof ApiError ? err.first : 'Could not reset password.', 'danger');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (email) $('[data-reset-email]').textContent = email;
  if (!token || !email) toast('This reset link looks invalid. Request a new one from the login page.', 'danger');
  $('#resetForm').addEventListener('submit', submit);
});
