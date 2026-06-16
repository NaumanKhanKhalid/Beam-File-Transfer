@props(['active' => 'subscribers'])
@php
    $tabs = [
        ['key' => 'subscribers', 'label' => 'Subscribers', 'route' => 'admin'],
        ['key' => 'plans',       'label' => 'Plans & pricing', 'route' => 'admin.plans'],
    ];
@endphp
<header class="bg-ink-900 px-5 sm:px-8 pt-5 pb-20">
    <div class="max-w-[1080px] mx-auto">
        <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-spark-500 flex items-center justify-center flex-none"><x-icon name="shield" class="w-[18px] h-[18px] text-ink-900" /></span>
            <div class="leading-tight">
                <div class="font-display font-bold text-[19px] text-white tracking-tight">Beam Admin</div>
                <div class="text-[12px] text-ink-400">Subscriptions &amp; plans</div>
            </div>
            <a href="{{ route('send') }}" class="ml-auto hidden sm:flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold transition-colors"><x-icon name="arrowUR" class="w-4 h-4" />Back to app</a>
            <span class="ml-auto sm:ml-3 text-[12px] text-ink-400 whitespace-nowrap truncate max-w-[55%] sm:max-w-none">Signed in as <b class="text-ink-200">admin@beam.to</b></span>
        </div>

        {{-- Tabs --}}
        <div class="flex items-center gap-1 mt-5">
            @foreach ($tabs as $t)
                @php $on = $active === $t['key']; @endphp
                <a href="{{ route($t['route']) }}"
                   class="h-9 px-4 inline-flex items-center rounded-full text-[13px] font-semibold transition-colors {{ $on ? 'bg-white text-ink-900' : 'text-ink-300 hover:bg-white/10' }}">{{ $t['label'] }}</a>
            @endforeach
        </div>
    </div>
</header>
