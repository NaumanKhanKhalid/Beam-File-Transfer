@extends('layouts.guest')

@section('title', 'Beam Admin — Subscribers')

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
<div id="adminAccessCheck" class="fixed inset-0 z-[90] flex items-center justify-center bg-ink-50">
    <div class="flex items-center gap-2.5 text-ink-400 text-sm font-semibold"><span class="w-4 h-4 rounded-full border-2 border-ink-200 border-t-ink-500 animate-spin"></span>Checking access…</div>
</div>
<div data-admin-content style="visibility:hidden" class="min-h-screen bg-ink-50">
    <x-admin-header active="subscribers" />

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
                        <th class="py-2.5 pl-5 pr-3 font-medium">Customer</th><th class="px-3 py-2.5 font-medium">Plan</th><th class="px-3 py-2.5 font-medium">Status</th><th class="px-3 py-2.5 font-medium">MRR</th><th class="px-3 py-2.5 font-medium hidden lg:table-cell">Since</th><th class="px-3 pr-5 py-2.5 font-medium text-right">Actions</th>
                    </tr></thead>
                    <tbody id="adminRows"></tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<div id="adminModalRoot"></div>

<script type="application/json" id="adminSeed">@json($seed)</script>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-admin.js') }}"></script>
@endpush
