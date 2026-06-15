@extends('layouts.app')

@section('title', 'Transfers')

@section('content')
<div class="fade-in max-w-[1100px] mx-auto p-4 sm:p-7">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div data-reveal class="bg-white border border-ink-100 rounded-xl px-5 py-[18px]"><div class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400">Active transfers</div><div data-stat="active" class="font-display font-bold text-3xl text-ink-900 tracking-tight mt-1.5">—</div></div>
        <div data-reveal class="bg-white border border-ink-100 rounded-xl px-5 py-[18px]"><div class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400">Downloads this week</div><div data-stat="downloads" class="font-display font-bold text-3xl text-ink-900 tracking-tight mt-1.5">—</div></div>
        <div data-reveal class="bg-white border border-ink-100 rounded-xl px-5 py-[18px]"><div class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400">Data sent</div><div data-stat="data" class="font-display font-bold text-3xl text-ink-900 tracking-tight mt-1.5">—</div></div>
    </div>

    <div data-reveal class="bg-ink-900 rounded-2xl px-6 sm:px-7 py-6 sm:py-[26px] flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-6 overflow-hidden relative">
        <div class="absolute -right-5 -top-5 w-40 h-40 rounded-full bg-brand-500 opacity-25 blur-lg"></div>
        <div class="flex-1 relative"><h3 class="text-white font-display font-bold text-[20px] sm:text-[22px] tracking-tight">Send something big.</h3><p class="text-ink-300 text-sm mt-1">Drag in up to 200 GB. Encrypted end-to-end, gone when you say so.</p></div>
        <a href="{{ route('send') }}" class="flex items-center justify-center gap-2 h-[48px] sm:h-[52px] px-7 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 font-semibold text-[16px] sm:text-[17px] whitespace-nowrap transition-colors relative">
            <x-icon name="upload" class="w-[18px] h-[18px]" />New transfer
        </a>
    </div>

    <div class="flex items-center justify-between mb-3.5">
        <h3 class="font-display font-bold text-lg text-ink-900">Recent transfers</h3>
        <button type="button" data-view-all class="hidden items-center gap-2 h-[34px] px-3.5 rounded-full text-ink-700 hover:bg-ink-100 text-[13px] font-semibold whitespace-nowrap transition-colors"><span data-view-all-label>View all</span> <x-icon name="chevR" data-view-all-icon class="w-[15px] h-[15px] transition-transform" /></button>
    </div>

    {{-- Cards are rendered from the API (signed-in by account, guest by IP) by page-transfers.js. --}}
    <div id="txGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="col-span-full py-14 text-center text-ink-400 text-sm">Loading your transfers…</div>
    </div>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-transfers.js') }}"></script>
@endpush
