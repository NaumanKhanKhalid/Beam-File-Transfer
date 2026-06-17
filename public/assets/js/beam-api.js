/**
 * Beam API client — framework-agnostic.
 * --------------------------------------------------------------------------
 * Plain ES module. Works in the vanilla-JS app today; import the SAME file
 * in React later (`import { api } from './beam-api.js'`). No dependencies.
 *
 *   import { api } from './beam-api.js';
 *   api.configure({ baseUrl: 'http://127.0.0.1:8000/api' });
 *   const { user } = await api.auth.login('mara@studio.co', 'password');
 *   const transfer = await api.transfers.create({ files, expiry: '7d' });
 *
 * The session lives in an HttpOnly cookie set by the server on login; the
 * client sends it automatically (credentials: 'include') and attaches the
 * CSRF token from the <meta name="csrf-token"> tag. Every method throws
 * `ApiError` on a non-2xx response.
 * --------------------------------------------------------------------------
 */

export function httpErrorMessage(status) {
  switch (status) {
    case 413: return 'Files are too large for the server’s upload limit. Try fewer or smaller files, or raise the server limit.';
    case 419: return 'Your session expired. Refresh the page and try again.';
    case 429: return 'Too many requests — wait a moment and try again.';
    case 500: return 'The server hit an error processing the upload. Check the Laravel log.';
    case 502:
    case 503:
    case 504: return 'The server is unavailable right now. Try again in a moment.';
    case 0:   return 'Network error — is the API running?';
    default:  return `Upload failed (HTTP ${status}).`;
  }
}

export class ApiError extends Error {
  constructor(message, { status, errors, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || null;          // app-level error code, e.g. 'guest_quota_exceeded'
    this.errors = errors || {};        // Laravel field => [messages]
  }
  /** First validation message, handy for toasts. */
  get first() {
    const k = Object.keys(this.errors)[0];
    return k ? this.errors[k][0] : this.message;
  }
}

class BeamApi {
  constructor() {
    this.baseUrl = '/api';
    // Cookie/session auth: the server sets an HttpOnly session cookie on login.
    // The client can't read that cookie, so it learns “am I signed in?” from a
    // server-rendered <meta name="auth-user"> tag (base64 JSON; empty for guests).
    this.user = this._readAuthUser();
    this.csrf = this._meta('csrf-token');
  }

  /** Call once at startup. */
  configure({ baseUrl } = {}) {
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, '');
    return this;
  }

  get authenticated() { return !!this.user; }

  /** Back-compat: callers pass null on logout / 401 to clear the local session. */
  setToken(v) { if (!v) this.user = null; }
  setUser(u)  { this.user = u || null; }

  _meta(name) {
    return (typeof document !== 'undefined' && document.querySelector(`meta[name="${name}"]`)?.content) || '';
  }
  _readAuthUser() {
    const raw = this._meta('auth-user');
    if (!raw) return null;
    try { return JSON.parse(atob(raw)); } catch (e) { return null; }
  }

  /** Low-level request. `body` may be a plain object (JSON) or FormData. */
  async request(method, path, { body, query, auth = true } = {}) {
    const url = new URL(this.baseUrl + path, location.origin);
    if (query) Object.entries(query).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

    const headers = { Accept: 'application/json' };
    // Same-origin cookie/session auth + CSRF token for state-changing requests.
    if (method !== 'GET' && this.csrf) headers['X-CSRF-TOKEN'] = this.csrf;

    let payload;
    if (body instanceof FormData) {
      payload = body;                                  // browser sets multipart boundary
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, { method, headers, body: payload, credentials: 'include' });
    } catch (e) {
      throw new ApiError('Network error — is the API running?', { status: 0 });
    }

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) this.setToken(null);     // token expired/invalid
      throw new ApiError(data.message || 'Request failed', { status: res.status, errors: data.errors, code: data.code });
    }
    return data;
  }

  get(p, o)    { return this.request('GET', p, o); }
  post(p, b, o){ return this.request('POST', p, { ...o, body: b }); }
  patch(p, b, o){ return this.request('PATCH', p, { ...o, body: b }); }
  put(p, b, o) { return this.request('PUT', p, { ...o, body: b }); }
  del(p, o)    { return this.request('DELETE', p, o); }

  // ---- Auth ---------------------------------------------------------------
  auth = {
    register: async (name, email, password) => {
      const r = await this.post('/register', { name, email, password });
      this.setUser(r.user); return r;
    },
    login: async (email, password) => {
      const r = await this.post('/login', { email, password });
      this.setUser(r.user); return r;
    },
    me: async () => { const r = await this.get('/me'); return (r && r.data) ? r.data : r; },
    logout: async () => { try { await this.post('/logout'); } finally { this.setToken(null); } },
    forgotPassword: (email) => this.post('/password/forgot', { email }, { auth: false }),
    resetPassword: (token, email, password, password_confirmation) =>
      this.post('/password/reset', { token, email, password, password_confirmation }, { auth: false }),
    resendVerification: () => this.post('/email/resend'),
  };

  // ---- Transfers ----------------------------------------------------------
  transfers = {
    list: (page) => this.get('/transfers', page ? { query: { page } } : undefined),

    stats: () => this.get('/transfers/stats'),

    /**
     * Create a transfer. `opts.files` is a FileList or File[].
     * `opts.onProgress(pct)` reports upload progress (0–100).
     */
    create: (opts = {}) => this._upload('/transfers', opts),

    remove: (id) => this.del(`/transfers/${id}`),

    // Public recipient flow (no auth)
    get: (slug) => this.get(`/t/${slug}`, { auth: false }),
    unlock: (slug, password) => this.post(`/t/${slug}/unlock`, { password }, { auth: false }),
    downloadUrl: (slug, fileId) => `${this.baseUrl}/t/${slug}/files/${fileId}`,
    zipUrl: (slug) => `${this.baseUrl}/t/${slug}/zip`,
  };

  // ---- Subscriptions ------------------------------------------------------
  plans = () => this.get('/plans', { auth: false });
  usage = () => this.get('/usage');   // session user if signed in; metered by IP for guests
  subscription = {
    current: () => this.get('/subscription'),
    checkout: (plan, billing_cycle, payment_token) =>
      this.post('/subscription/checkout', { plan, billing_cycle, payment_token }),
    cancel: () => this.del('/subscription'),
  };

  // ---- Profile / branding -------------------------------------------------
  profile = {
    update: (fields) => this.patch('/profile', fields),
    password: (current_password, password, password_confirmation) =>
      this.put('/profile/password', { current_password, password, password_confirmation }),
    deleteAccount: (password) => this.request('DELETE', '/account', { body: { password } }),
    branding: (fields) => {
      // Laravel only parses multipart bodies on POST (not PUT), so we POST with
      // method spoofing — otherwise the brand fields arrive empty and nothing saves.
      const fd = new FormData();
      fd.append('_method', 'PUT');
      Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, v));
      return this.request('POST', '/profile/branding', { body: fd });
    },
  };

  // ---- Admin --------------------------------------------------------------
  admin = {
    subscribers: () => this.get('/admin/subscribers'),
    addSubscriber: (data) => this.post('/admin/subscribers', data),
    updateSubscriber: (id, data) => this.patch(`/admin/subscribers/${id}`, data),
    removeSubscriber: (id) => this.del(`/admin/subscribers/${id}`),
    plans: () => this.get('/admin/plans'),
    createPlan: (data) => this.post('/admin/plans', data),
    updatePlan: (key, data) => this.put(`/admin/plans/${key}`, data),
    deletePlan: (key) => this.del(`/admin/plans/${key}`),
  };

  // ---- internal: multipart upload with progress ---------------------------
  _upload(path, opts = {}) {
    const files = [...(opts.files || [])];
    const total = files.reduce((a, f) => a + f.size, 0);
    // Big or many files → resumable chunked upload (survives flaky networks).
    // Small uploads use a single multipart POST (simpler, one round-trip).
    const CHUNK_THRESHOLD = 40 * 1024 * 1024;   // 40 MB
    if (total > CHUNK_THRESHOLD || files.length > 20) {
      return this._uploadChunked(opts);
    }
    return this._uploadSimple(path, opts);
  }

  _uploadSimple(path, { files = [], title, message, recipients, senderName, expiry, password, burn, notify, branded, onProgress }) {
    const fd = new FormData();
    [...files].forEach((f) => {
      fd.append('files[]', f);
      // Parallel path array preserves folder structure (FormData drops webkitRelativePath).
      fd.append('paths[]', f.relPath || f.webkitRelativePath || f.name);
    });
    if (title)      fd.append('title', title);
    if (message)    fd.append('message', message);
    if (senderName) fd.append('sender_name', senderName);
    if (expiry)     fd.append('expiry', expiry);
    if (password)   fd.append('password', password);
    fd.append('burn', burn ? 1 : 0);
    fd.append('notify', notify ? 1 : 0);
    fd.append('branded', branded ? 1 : 0);
    (recipients || []).forEach((r) => fd.append('recipients[]', r));

    // XHR (not fetch) so we get real upload-progress events.
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.baseUrl + path);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json');
      if (this.csrf) xhr.setRequestHeader('X-CSRF-TOKEN', this.csrf);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText || '{}'); }
        catch (_) {
          // Non-JSON response (e.g. an HTML 413/500 page from the web server,
          // before the request even reaches Laravel). Map common statuses to a
          // clear, user-facing message instead of leaking server internals.
          return reject(new ApiError(httpErrorMessage(xhr.status), { status: xhr.status }));
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data.data || data);
        else reject(new ApiError(data.message || httpErrorMessage(xhr.status), { status: xhr.status, errors: data.errors, code: data.code }));
      };
      xhr.onerror = () => reject(new ApiError('Network error during upload', { status: 0 }));
      xhr.send(fd);
    });
  }

  /**
   * Resumable chunked upload. Each file is streamed in 5 MB chunks under a
   * client-generated upload_id; on a dropped connection we ask the server how
   * much it has (/uploads/status) and resume. Each chunk is retried with
   * backoff. Finally /transfers/commit assembles everything into the transfer.
   */
  async _uploadChunked({ files = [], title, message, recipients, senderName, expiry, password, burn, notify, branded, onProgress }) {
    const list = [...files];
    const CHUNK = 5 * 1024 * 1024;
    const total = list.reduce((a, f) => a + f.size, 0) || 1;
    const uploadId = this._randomId();
    const manifest = [];
    let done = 0;   // bytes confirmed on the server, across all files

    for (let fi = 0; fi < list.length; fi++) {
      const f = list[fi];
      const key = 'f' + fi;
      manifest.push({ key, name: f.relPath || f.webkitRelativePath || f.name });

      // Resume: how much does the server already have for this file?
      let offset = 0;
      try {
        const st = await this.get('/uploads/status', { query: { upload_id: uploadId, key }, auth: false });
        offset = Math.min(st.received || 0, f.size);
      } catch (_) { offset = 0; }
      done += offset;
      if (onProgress) onProgress(Math.min(99, Math.round((done / total) * 100)));

      while (offset < f.size) {
        const end = Math.min(offset + CHUNK, f.size);
        const received = await this._sendChunk(uploadId, key, offset, f.slice(offset, end));
        done += (received - offset);   // server-confirmed bytes
        offset = received;
        if (onProgress) onProgress(Math.min(99, Math.round((done / total) * 100)));
      }
    }

    // Assemble into the real transfer (JSON; same options as a normal upload).
    const result = await this.post('/transfers/commit', {
      upload_id: uploadId,
      files: manifest,
      title, message, sender_name: senderName, expiry, password,
      burn: burn ? 1 : 0, notify: notify ? 1 : 0, branded: branded ? 1 : 0,
      recipients: recipients || [],
    });
    if (onProgress) onProgress(100);
    return result;
  }

  /** Send one chunk with up to 4 retries + backoff; re-syncs offset on 409. */
  async _sendChunk(uploadId, key, offset, blob, attempt = 0) {
    const fd = new FormData();
    fd.append('upload_id', uploadId);
    fd.append('key', key);
    fd.append('offset', offset);
    fd.append('chunk', blob);
    try {
      const res = await fetch(this.baseUrl + '/uploads/chunk', {
        method: 'POST',
        credentials: 'include',
        headers: this.csrf ? { 'X-CSRF-TOKEN': this.csrf, Accept: 'application/json' } : { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && typeof data.received === 'number') return data.received;  // already have it / resync
      if (!res.ok) throw new ApiError(data.message || httpErrorMessage(res.status), { status: res.status, code: data.code });
      return data.received;
    } catch (e) {
      if (attempt >= 4) throw (e instanceof ApiError ? e : new ApiError('Upload stalled — check your connection.', { status: 0 }));
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));   // 0.6s, 1.2s, 2.4s, 4.8s
      return this._sendChunk(uploadId, key, offset, blob, attempt + 1);
    }
  }

  _randomId() {
    if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export const api = new BeamApi();
export default api;
