@extends('layouts.guest')

@section('title', 'Beam Admin')

@php
    $seed = [
        ['name' => 'Mara Lin',   'email' => 'mara@studio.co',    'plan' => 'Pro',      'status' => 'active',   'mrr' => 599,  'since' => 'Jan 2026', 'initials' => 'ML'],
        ['name' => 'Theo Park',  'email' => 'theo@parkfilms.io', 'plan' => 'Business', 'status' => 'active',   'mrr' => 1499, 'since' => 'Nov 2025', 'initials' => 'TP'],
        ['name' => 'Ivy Cole',   'email' => 'ivy@cole.design',   'plan' => 'Pro',      'status' => 'past_due', 'mrr' => 599,  'since' => 'Mar 2026', 'initials' => 'IC'],
        ['name' => 'Sam Reed',   'email' => 'sam@reed.audio',    'plan' => 'Free',     'status' => 'active',   'mrr' => 0,    'since' => 'Feb 2026', 'initials' => 'SR'],
        ['name' => 'Nora Vance', 'email' => 'nora@vance.co',     'plan' => 'Pro',      'status' => 'canceled', 'mrr' => 0,    'since' => 'Dec 2025', 'initials' => 'NV'],
        ['name' => 'Leo Marsh',  'email' => 'leo@marsh.studio',  'plan' => 'Business', 'status' => 'active',   'mrr' => 1499, 'since' => 'Oct 2025', 'initials' => 'LM'],
        ['name' => 'Priya Nair', 'email' => 'priya@nair.in',     'plan' => 'Pro',      'status' => 'active',   'mrr' => 599,  'since' => 'Apr 2026', 'initials' => 'PN'],
    ];
@endphp

@section('content')
<div class="min-h-screen bg-ink-50">
    <header class="bg-ink-900 px-5 sm:px-8 pt-5 pb-20">
        <div class="max-w-[1080px] mx-auto">
            <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-xl bg-spark-500 flex items-center justify-center flex-none"><x-icon name="shield" class="w-[18px] h-[18px] text-ink-900" /></span>
                <div class="leading-tight">
                    <div class="font-display font-bold text-[19px] text-white tracking-tight">Beam Admin</div>
                    <div class="text-[12px] text-ink-400">Subscriptions &amp; plans</div>
                </div>
                <a href="{{ route('send') }}" class="ml-auto hidden sm:flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold transition-colors"><x-icon name="arrowUR" class="w-4 h-4" />Back to app</a>
                <span class="ml-auto sm:ml-3 text-[12px] text-ink-400 whitespace-nowrap">Signed in as <b class="text-ink-200">admin@beam.to</b></span>
            </div>
        </div>
    </header>

    {{-- Pull the content up over the header band for a layered, on-brand look. --}}
    <div class="max-w-[1080px] mx-auto px-4 sm:px-8 -mt-14 pb-10 fade-in">
        <div id="adminMetrics" data-reveal class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>

        <div data-reveal class="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-ink-100">
                <h3 class="font-display font-bold text-lg text-ink-900">Subscribers</h3>
                <button type="button" data-admin-add class="flex items-center gap-2 h-9 px-4 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-[13px] font-semibold whitespace-nowrap transition-colors"><x-icon name="plus" class="w-4 h-4" />Add subscriber</button>
            </div>
            <div class="overflow-x-auto scroll-thin">
                <table class="w-full border-collapse">
                    <thead><tr class="text-left text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 bg-ink-50">
                        <th class="py-2.5 pl-5 pr-3 font-medium">Customer</th><th class="px-3 py-2.5 font-medium">Plan</th><th class="px-3 py-2.5 font-medium">Status</th><th class="px-3 py-2.5 font-medium">MRR</th><th class="px-3 py-2.5 font-medium">Since</th><th class="px-3 pr-5 py-2.5 font-medium text-right">Actions</th>
                    </tr></thead>
                    <tbody id="adminRows"></tbody>
                </table>
            </div>
        </div>

        {{-- Manage plans — pricing & limits, fully editable & DB-backed. --}}
        <div data-reveal class="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden mt-6">
            <div class="flex items-center justify-between px-5 py-4 border-b border-ink-100">
                <div>
                    <h3 class="font-display font-bold text-lg text-ink-900">Plans &amp; pricing</h3>
                    <p class="text-[12px] text-ink-400 mt-0.5">Create and edit plans — changes apply to the upgrade page and quotas.</p>
                </div>
                <button type="button" data-plan-add class="flex items-center gap-2 h-9 px-4 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-[13px] font-semibold whitespace-nowrap transition-colors"><x-icon name="plus" class="w-4 h-4" />Add plan</button>
            </div>
            <div id="adminPlans" class="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
        </div>
    </div>
</div>

<div id="adminModalRoot"></div>

<script type="application/json" id="adminSeed">@json($seed)</script>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-admin.js') }}"></script>
@endpush
