@extends('layouts.guest')

@section('title', 'Beam Admin — Plans')

@section('content')
<div id="adminAccessCheck" class="fixed inset-0 z-[90] flex items-center justify-center bg-ink-50">
    <div class="flex items-center gap-2.5 text-ink-400 text-sm font-semibold"><span class="w-4 h-4 rounded-full border-2 border-ink-200 border-t-ink-500 animate-spin"></span>Checking access…</div>
</div>
<div data-admin-content style="visibility:hidden" class="min-h-screen bg-ink-50">
    <x-admin-header active="plans" />

    <div class="max-w-[1080px] mx-auto px-4 sm:px-8 -mt-14 pb-10 fade-in">
        <div data-reveal class="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden">
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

@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-admin-plans.js') }}"></script>
@endpush
