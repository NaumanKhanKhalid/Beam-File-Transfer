@extends('layouts.guest')

@section('title', 'Forgot password')

@section('content')
<div class="fade-in min-h-screen bg-ink-900 flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute w-[520px] h-[520px] rounded-full -top-[180px] -left-[120px] blur-[20px] opacity-50" style="background:radial-gradient(circle,#4B3AFF,transparent 68%)"></div>
    <div class="absolute w-[360px] h-[360px] rounded-full -bottom-[140px] -right-[80px] blur-[18px] opacity-20" style="background:radial-gradient(circle,#C6FF3D,transparent 70%)"></div>
    <a href="{{ route('login') }}" class="absolute top-7 left-8">
        <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="h-7"
             onerror="this.outerHTML='<span class=\'font-display font-bold text-white text-xl\'>Beam</span>'">
    </a>

    <form id="forgotForm" class="relative w-[420px] max-w-full bg-white rounded-3xl shadow-xl p-7" novalidate>
        <div class="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4"><x-icon name="lock" class="w-6 h-6" /></div>
        <h2 class="font-display font-bold text-[26px] text-ink-900 tracking-tight text-center">Forgot your password?</h2>
        <p class="text-ink-400 text-sm text-center mt-1.5">Enter your account email and we’ll send you a link to reset it.</p>

        <label class="flex flex-col gap-1.5 mt-6">
            <span class="text-[13px] font-semibold text-ink-900">Email</span>
            <div class="relative flex items-center">
                <span class="absolute left-3.5 text-ink-400"><x-icon name="mail" class="w-4 h-4" /></span>
                <input id="fpEmail" type="email" placeholder="you@company.com" autocomplete="email" class="w-full h-11 pl-10 pr-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
            </div>
        </label>

        <button type="submit" class="w-full h-[52px] mt-5 rounded-full bg-spark-500 hover:bg-spark-600 active:translate-y-px text-ink-900 font-semibold text-[16px] flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
            <x-icon name="mail" class="w-[18px] h-[18px]" /><span data-fp-label>Send reset link</span>
        </button>

        {{-- Success state, revealed after the request succeeds. --}}
        <div data-fp-sent class="hidden mt-5 rounded-xl bg-success-50 border border-success-200 p-4 text-center">
            <div class="w-10 h-10 rounded-full bg-success-500 text-white flex items-center justify-center mx-auto mb-2"><x-icon name="check" class="w-5 h-5" /></div>
            <p class="text-[13.5px] text-ink-700 leading-relaxed">If <b data-fp-sent-email class="text-ink-900">that email</b> is registered, a reset link is on its way. Check your inbox (and spam).</p>
        </div>

        <div class="text-center mt-4">
            <a href="{{ route('login') }}" class="text-[13px] text-ink-500 hover:text-ink-900 font-semibold transition-colors">← Back to log in</a>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-forgot.js') }}"></script>
@endpush
