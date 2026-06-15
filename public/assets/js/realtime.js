/**
 * Beam realtime — thin wrapper over pusher-js talking to Laravel Reverb.
 *
 * Exposes window.BeamRT.subscribeTransfer(slug, cb) → unsubscribe().
 * Safe to call ALWAYS: if Reverb isn't configured (window.BEAM_WS missing) or
 * pusher-js failed to load, it silently no-ops and the pages fall back to
 * polling. No build step — pusher-js is loaded from CDN.
 */
(function () {
  const RT = {
    enabled: false,
    _pusher: null,
    _channels: {},
    subscribeTransfer() { return function () {}; },
  };
  window.BeamRT = RT;

  const cfg = window.BEAM_WS;
  if (!cfg || !cfg.key || typeof window.Pusher === 'undefined') return; // → polling

  try {
    const pusher = new window.Pusher(cfg.key, {
      wsHost: cfg.host,
      wsPort: cfg.port,
      wssPort: cfg.port,
      forceTLS: cfg.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      cluster: 'mt1', // ignored by Reverb but required by the pusher-js constructor
    });
    RT._pusher = pusher;
    RT.enabled = true;

    RT.subscribeTransfer = function (slug, cb) {
      const name = 'transfer.' + slug;
      let ch = RT._channels[name];
      if (!ch) { ch = pusher.subscribe(name); RT._channels[name] = ch; }
      ch.bind('downloaded', cb);
      return function () { ch.unbind('downloaded', cb); };
    };
  } catch (e) {
    RT.enabled = false; // leave the no-op stub in place
  }
})();
