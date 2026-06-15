{{-- Shared module — API config, helpers, theme, auth-dependent chrome. --}}
<script type="module" src="{{ asset('assets/js/beam.js') }}"></script>

{{-- Realtime (Laravel Reverb via pusher-js). Loaded only when broadcasting is
     on; realtime.js itself no-ops safely if Reverb is unreachable. --}}
@if (config('broadcasting.default') === 'reverb')
    <script>
        window.BEAM_WS = {
            key: @json(config('broadcasting.connections.reverb.key')),
            host: @json(config('broadcasting.connections.reverb.options.host') ?: '127.0.0.1'),
            port: {{ (int) config('broadcasting.connections.reverb.options.port', 8080) }},
            scheme: @json(config('broadcasting.connections.reverb.options.scheme', 'http')),
        };
    </script>
    <script src="https://js.pusher.com/8.4.0/pusher.min.js"></script>
@endif
<script src="{{ asset('assets/js/realtime.js') }}"></script>
