@extends('layouts.guest')

@section('title', 'Reset password')

@section('content')
<div class="fade-in min-h-screen bg-ink-900 flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute w-[520px] h-[520px] rounded-full -top-[180px] -left-[120px] blur-[20px] opacity-50" style="background:radial-gradient(circle,#4B3AFF,transparent 68%)"></div>
    <div class="absolute w-[360px] h-[360px] rounded-full -bottom-[140px] -right-[80px] blur-[18px] opacity-20" style="background:radial-gradient(circle,#C6FF3D,transparent 70%)"></div>
    <a href="{{ route('login') }}" class="absolute top-7 left-8">
        <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="h-7"
             onerror="this.outerHTML='<span class=\'font-display font-bold text-white text-xl\'>Beam</span>'">
    </a>

    <form id="resetForm" class="relative w-[420px] max-w-full bg-white rounded-3xl shadow-xl p-7" novalidate>
        <h2 class="font-display font-bold text-[26px] text-ink-900 tracking-tight text-center">Choose a new password</h2>
        <p class="text-ink-400 text-sm text-center mt-1.5">Set a new password for <b data-reset-email class="text-ink-700">your account</b>.</p>

        <div class="flex flex-col gap-3 mt-6">
            <label class="flex flex-col gap-1.5">
                <span class="text-[13px] font-semibold text-ink-900">New password</span>
                <input id="rpPass" type="password" placeholder="At least 8 characters" autocomplete="new-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </label>
            <label class="flex flex-col gap-1.5">
                <span class="text-[13px] font-semibold text-ink-900">Confirm new password</span>
                <input id="rpPass2" type="password" placeholder="Re-enter password" autocomplete="new-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </label>
        </div>

        <button type="submit" class="w-full h-[52px] mt-5 rounded-full bg-spark-500 hover:bg-spark-600 active:translate-y-px text-ink-900 font-semibold text-[16px] flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
            <x-icon name="shield" class="w-[18px] h-[18px]" /><span>Reset password</span>
        </button>

        <div class="text-center mt-4">
            <a href="{{ route('login') }}" class="text-[13px] text-ink-500 hover:text-ink-900 font-semibold transition-colors">← Back to log in</a>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-reset.js') }}"></script>
@endpush
