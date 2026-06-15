@props(['title' => ''])
<header class="h-[68px] border-b border-ink-100 flex items-center gap-3 px-4 sm:px-7 bg-white flex-none">
    <button type="button" class="nav-burger w-9 h-9 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 transition-colors flex-none" data-nav-toggle aria-label="Menu">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <span class="font-display font-bold text-xl text-ink-900 tracking-tight truncate">{{ $title }}</span>

    <div class="ml-auto hidden sm:flex items-center gap-2 bg-ink-50 border border-ink-150 rounded-full px-3.5 py-2 text-ink-400 w-44 lg:w-60 focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-500/20 transition">
        <x-icon name="search" class="w-4 h-4" />
        <input data-search type="search" placeholder="Search transfers…" class="bg-transparent outline-none text-[13px] text-ink-900 w-full placeholder:text-ink-300">
    </div>

    {{-- Right actions: guest by default, JS swaps to "New transfer" when signed in --}}
    <div data-topbar-actions class="flex items-center gap-2 sm:ml-0 ml-auto">
        <a href="{{ route('login') }}" class="h-[42px] px-4 grid place-items-center rounded-full text-ink-700 hover:bg-ink-100 text-sm font-semibold whitespace-nowrap transition-colors">Log in</a>
        <a href="{{ route('login', ['mode' => 'signup']) }}" class="flex items-center gap-2 h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold whitespace-nowrap transition-colors">
            <x-icon name="plus" class="w-4 h-4" />Sign up free
        </a>
    </div>
</header>
