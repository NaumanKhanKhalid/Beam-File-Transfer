@props(['active' => ''])
@php
    $nav = [
        ['key' => 'send',      'label' => 'Send',      'icon' => 'upload',   'route' => 'send',      'count' => null],
        ['key' => 'transfers', 'label' => 'Transfers', 'icon' => 'inbox',    'route' => 'transfers', 'count' => null],
        ['key' => 'settings',  'label' => 'Settings',  'icon' => 'settings', 'route' => 'settings',  'count' => null],
    ];
@endphp
<aside class="app-sidebar bg-ink-900 flex flex-col p-4 gap-1.5 w-[248px] flex-none">
    <div class="flex items-center gap-2.5 px-2 pt-1.5 pb-4">
        <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="h-[30px]"
             onerror="this.outerHTML='<span class=\'font-display font-bold text-white text-2xl\'>Beam</span>'">
    </div>

    <nav class="flex flex-col gap-0.5">
        @foreach ($nav as $i)
            @php $on = $active === $i['key']; @endphp
            <a href="{{ route($i['route']) }}" data-nav-link
               class="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors {{ $on ? 'bg-brand-500 text-white' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100' }}">
                <x-icon :name="$i['icon']" class="w-[18px] h-[18px]" />
                <span>{{ $i['label'] }}</span>
                {{-- Live transfer count, filled by beam.js from /api/transfers/stats. Hidden until > 0. --}}
                <span data-nav-count="{{ $i['key'] }}" class="ml-auto min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full font-mono text-[11px] font-semibold hidden {{ $on ? 'bg-white/20 text-white' : 'bg-white/10 text-ink-200' }}"></span>
            </a>
        @endforeach
    </nav>

    <div class="flex-1"></div>

    <button type="button" data-theme-toggle
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors w-full">
        <x-icon name="moon" data-theme-icon class="w-[18px] h-[18px]" />
        <span data-theme-label>Dark mode</span>
        <span class="ml-auto switch sw-sm" data-on="false">
            <span class="track block w-9 h-[22px] rounded-full bg-ink-700 relative transition-colors duration-200">
                <span class="thumb absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"></span>
            </span>
        </span>
    </button>

    <div class="bg-ink-800 rounded-xl p-3.5 mt-1">
        <div class="text-xs text-ink-300">Storage</div>
        <div class="h-1.5 bg-ink-700 rounded-full overflow-hidden my-2">
            <div data-storage-bar class="h-full bg-spark-500 rounded-full transition-all duration-300" style="width:0%"></div>
        </div>
        <div data-storage-label class="text-xs text-ink-300"><b class="text-white font-mono">0 B</b> of 2 GB · guest</div>
    </div>

    {{-- Account region: guest by default, hydrated to the signed-in card by JS (api.auth.me) --}}
    <div data-account-region>
        <div class="pt-3 flex flex-col gap-2">
            <a href="{{ route('login') }}" class="w-full h-10 rounded-full bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold transition-colors grid place-items-center">Log in</a>
            <a href="{{ route('login', ['mode' => 'signup']) }}" class="w-full h-10 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-[13px] font-semibold transition-colors grid place-items-center">Create free account</a>
        </div>
    </div>
</aside>
