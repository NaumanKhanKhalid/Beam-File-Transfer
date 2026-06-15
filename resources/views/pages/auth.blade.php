@extends('layouts.guest')

@section('title', 'Log in')

@section('content')
<div class="fade-in min-h-screen bg-ink-900 flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute w-[520px] h-[520px] rounded-full -top-[180px] -left-[120px] blur-[20px] opacity-50" style="background:radial-gradient(circle,#4B3AFF,transparent 68%)"></div>
    <div class="absolute w-[360px] h-[360px] rounded-full -bottom-[140px] -right-[80px] blur-[18px] opacity-20" style="background:radial-gradient(circle,#C6FF3D,transparent 70%)"></div>
    <a href="{{ route('send') }}" class="absolute top-7 left-8">
        <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="h-7"
             onerror="this.outerHTML='<span class=\'font-display font-bold text-white text-xl\'>Beam</span>'">
    </a>

    <form id="authForm" class="relative w-[420px] max-w-full bg-white rounded-3xl shadow-xl p-7" novalidate>
        <h2 data-auth-heading class="font-display font-bold text-[26px] text-ink-900 tracking-tight text-center">Welcome back</h2>
        <p data-auth-sub class="text-ink-400 text-sm text-center mt-1.5">Log in to track transfers and rooms.</p>

        <div class="flex gap-1 bg-ink-75 rounded-xl p-1 mt-5 segctl">
            <button type="button" data-auth-tab="login" class="flex-1 h-10 rounded-lg text-sm font-semibold transition-all bg-white text-ink-900 shadow-sm">Log in</button>
            <button type="button" data-auth-tab="signup" class="flex-1 h-10 rounded-lg text-sm font-semibold transition-all text-ink-400 hover:text-ink-700">Sign up</button>
        </div>

        <button type="button" data-google class="w-full h-11 mt-5 rounded-xl border border-ink-200 hover:bg-ink-50 flex items-center justify-center gap-2.5 text-sm font-semibold text-ink-900 transition-colors">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.3-4.9 3.3-8.3z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.2V7.2H2.2a11 11 0 0 0 0 9.8l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.2L5.9 10c.9-2.6 3.3-4.5 6.1-4.5z"/></svg>
            Continue with Google
        </button>
        <div class="flex items-center gap-3 my-4"><span class="h-px bg-ink-100 flex-1"></span><span class="text-[11px] font-semibold text-ink-300 tracking-[.08em] uppercase">or</span><span class="h-px bg-ink-100 flex-1"></span></div>

        <div class="flex flex-col gap-3">
            <label data-name-field class="flex-col gap-1.5 hidden">
                <span class="text-[13px] font-semibold text-ink-900">Full name</span>
                <input id="auName" type="text" placeholder="Mara Lin" autocomplete="name" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </label>
            <label class="flex flex-col gap-1.5">
                <span class="text-[13px] font-semibold text-ink-900">Email</span>
                <input id="auEmail" type="email" placeholder="you@company.com" autocomplete="email" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </label>
            <label class="flex flex-col gap-1.5">
                <span class="text-[13px] font-semibold text-ink-900">Password</span>
                <input id="auPass" type="password" placeholder="••••••••" autocomplete="current-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </label>
        </div>

        <div data-forgot class="text-right mt-2">
            <button type="button" data-forgot-btn class="text-[13px] text-brand-600 font-semibold">Forgot password?</button>
        </div>

        <button type="submit" class="w-full h-[52px] mt-5 rounded-full bg-spark-500 hover:bg-spark-600 active:translate-y-px text-ink-900 font-semibold text-[16px] flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
            <x-icon name="shield" class="w-[18px] h-[18px]" /><span data-submit-label>Log in</span>
        </button>

        <div class="text-center mt-4">
            <a href="{{ route('send') }}" class="text-[13px] text-ink-500 hover:text-ink-900 font-semibold transition-colors">← Continue without an account</a>
            <p class="text-[11px] text-ink-300 mt-2">You can send up to 2&nbsp;GB as a guest — no sign-in needed.</p>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-auth.js') }}"></script>
@endpush
