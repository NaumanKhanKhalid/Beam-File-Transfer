@extends('layouts.app')

@section('title', 'Settings')

@section('content')
<div class="fade-in max-w-[920px] mx-auto p-4 sm:p-7 flex flex-col gap-5">

    {{-- Profile --}}
    <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
        <div class="mb-4"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Profile</h3><p class="text-[13px] text-ink-400 mt-0.5">Your name and email on every transfer you send.</p></div>
        <div class="flex items-center gap-4 mb-5">
            <span data-avatar class="w-16 h-16 rounded-full text-white font-display font-bold text-2xl flex items-center justify-center flex-none overflow-hidden bg-cover bg-center" style="background:#4B3AFF"><span data-avatar-initials>G</span></span>
            <div class="flex-1 min-w-0">
                <div data-name-display class="font-display font-bold text-lg text-ink-900">Guest</div>
                <div data-email-display class="text-[13px] text-ink-400">—</div>
                <div data-avatar-actions class="hidden items-center gap-2 mt-2">
                    <button type="button" data-avatar-pick class="h-8 px-3 rounded-full bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[12.5px] font-semibold transition-colors">Upload photo</button>
                    <button type="button" data-avatar-remove class="hidden h-8 px-3 rounded-full text-ink-400 hover:text-danger-500 text-[12.5px] font-semibold transition-colors">Remove</button>
                </div>
            </div>
            <input type="file" id="avatarPick" accept="image/png,image/jpeg,image/webp" class="hidden">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Full name</span><input id="setName" type="text" value="" placeholder="Your name" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
            <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Email</span><input id="setEmail" type="email" value="" placeholder="you@company.com" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
        </div>
        <div class="mt-5 flex items-center gap-3"><button type="button" data-save-profile class="h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold transition-colors">Save changes</button><span data-profile-hint class="text-[12px] text-ink-400"></span></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {{-- Plan (free default; JS swaps to Pro when signed-in user is Pro) --}}
        <div id="planCard" data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm flex flex-col">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div><div class="flex items-center gap-2"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Plan</h3><x-badge tone="neutral" label="Free" :dot="false" /></div>
                <p class="text-[13px] text-ink-400 mt-0.5">Free plan — up to 2 GB per transfer, 7 day expiry.</p></div>
                <x-icon name="crown" class="w-7 h-7 text-ink-300" />
            </div>
            <div class="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white relative overflow-hidden mt-auto">
                <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-spark-500 opacity-20 blur-lg"></div>
                <div class="relative">
                    <div class="font-display font-bold text-xl">Beam Pro — ₹749/mo</div>
                    <p class="text-brand-100 text-sm mt-1">Branded transfer pages, 200 GB sends, password & burn, 1 year expiry.</p>
                    <a href="{{ route('upgrade') }}" class="inline-flex items-center mt-4 h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-bold transition-colors">Upgrade to Pro</a>
                </div>
            </div>
        </div>

        {{-- Storage --}}
        <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm flex flex-col">
            <div class="mb-4"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Storage</h3><p data-storage-sub class="text-[13px] text-ink-400 mt-0.5">Loading…</p></div>
            <div class="h-2.5 bg-ink-100 rounded-full overflow-hidden"><div data-storage-fill class="h-full rounded-full transition-all duration-500" style="width:0%;background:#4B3AFF"></div></div>
            <div class="grid grid-cols-3 gap-3 mt-5">
                @foreach ([['Transfers', 'transfers', 'inbox'], ['Downloads', 'downloads', 'download'], ['Active', 'active', 'check']] as [$k, $key, $icn])
                    <div class="bg-ink-50 border border-ink-100 rounded-xl px-4 py-3 flex flex-col gap-1"><div class="flex items-center gap-1.5 text-ink-400"><x-icon :name="$icn" class="w-4 h-4" /><span class="text-[11px] font-semibold tracking-[.08em] uppercase">{{ $k }}</span></div><div data-stat="{{ $key }}" class="font-display font-bold text-xl text-ink-900">—</div></div>
                @endforeach
            </div>
        </div>
    </div>

    {{-- Appearance --}}
    <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
        <div class="mb-4"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Appearance</h3></div>
        <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center"><x-icon name="sun" data-theme-icon class="w-[18px] h-[18px]" /></div>
                <div><div class="text-sm font-semibold text-ink-900">Dark mode</div><div class="text-xs text-ink-400">Easier on the eyes at night.</div></div></div>
            <button type="button" data-theme-toggle class="switch" data-on="false"><span class="track block w-11 h-[26px] rounded-full bg-ink-200 relative transition-colors duration-200"><span class="thumb absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"></span></span></button>
        </div>
    </div>

    {{-- Branding (locked free state by default; JS swaps to the Pro editor) --}}
    <div id="brandingCard" data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
        <div class="flex items-start justify-between gap-3 mb-4">
            <div><div class="flex items-center gap-2"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Branded transfer pages</h3><x-badge tone="spark" label="Pro" :dot="false" /></div>
            <p class="text-[13px] text-ink-400 mt-0.5">Put your logo and color on the recipient download page.</p></div>
            <x-icon name="palette" class="w-7 h-7 text-ink-300" />
        </div>
        <div class="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
            <div class="w-11 h-11 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-3"><x-icon name="lock" class="w-5 h-5" /></div>
            <div class="font-display font-bold text-ink-900">A Pro feature</div>
            <p class="text-[13px] text-ink-400 mt-1 max-w-sm mx-auto">Upgrade to Beam Pro to add your logo and brand color to every transfer recipients see.</p>
            <a href="{{ route('upgrade') }}" class="inline-flex items-center mt-4 h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-bold transition-colors">Upgrade to Pro</a>
        </div>
    </div>

    {{-- Security + Danger zone: only relevant to signed-in accounts (JS reveals these). --}}
    <div data-account-only class="hidden flex-col gap-5">
        {{-- Change password --}}
        <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
            <div class="mb-4"><h3 class="font-display font-bold text-lg text-ink-900 tracking-tight">Password</h3><p class="text-[13px] text-ink-400 mt-0.5">Change the password you use to sign in.</p></div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Current password</span><input id="curPw" type="password" autocomplete="current-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition"></label>
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">New password</span><input id="newPw" type="password" autocomplete="new-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition"></label>
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Confirm new</span><input id="newPw2" type="password" autocomplete="new-password" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition"></label>
            </div>
            <div class="mt-5 flex items-center gap-3"><button type="button" data-save-password class="h-[42px] px-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold transition-colors">Update password</button><span data-pw-hint class="text-[12px] text-ink-400"></span></div>
        </div>

        {{-- Danger zone --}}
        <div data-reveal class="bg-white border border-danger-200 rounded-2xl p-6 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div><h3 class="font-display font-bold text-lg text-danger-600 tracking-tight">Delete account</h3><p class="text-[13px] text-ink-400 mt-0.5 max-w-md">Permanently delete your account, all your transfers and their files. This cannot be undone.</p></div>
                <x-icon name="zap" class="w-6 h-6 text-danger-500 flex-none" />
            </div>
            {{-- Idle: just the button. Confirm step reveals a password field. --}}
            <div data-del-idle class="mt-4">
                <button type="button" data-del-start class="h-[42px] px-5 rounded-full border border-danger-300 text-danger-600 hover:bg-danger-50 text-sm font-semibold transition-colors">Delete my account…</button>
            </div>
            <div data-del-confirm class="hidden mt-4 rounded-xl border border-danger-200 bg-danger-50 p-4">
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Enter your password to confirm</span><input id="delPw" type="password" autocomplete="current-password" class="w-full sm:w-72 h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-danger-500 focus:ring-[3px] focus:ring-danger-500/30 transition"></label>
                <div class="flex items-center gap-2.5 mt-4">
                    <button type="button" data-del-confirm-btn class="h-[42px] px-5 rounded-full bg-danger-500 hover:bg-danger-600 text-white text-sm font-semibold transition-colors">Permanently delete</button>
                    <button type="button" data-del-cancel class="h-[42px] px-4 rounded-full text-ink-600 hover:bg-ink-100 text-sm font-semibold transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-settings.js') }}"></script>
@endpush
