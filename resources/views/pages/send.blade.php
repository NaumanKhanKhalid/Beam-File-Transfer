@extends('layouts.app')

@section('title', 'Send files')

@section('content')
<div class="fade-in max-w-[980px] mx-auto px-4 sm:px-7 pt-6 pb-8 grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-5 lg:gap-7 items-start">

    {{-- Files / dropzone --}}
    <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-[22px] shadow-sm min-w-0">
        <p class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 mb-2">Files</p>

        <div id="dz" class="dz relative border-2 border-dashed border-ink-200 rounded-2xl bg-white flex flex-col items-center justify-center text-center gap-2.5 py-9 px-8 cursor-pointer transition hover:border-brand-300 hover:bg-brand-50">
            <div class="dz-ring w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center transition">
                <x-icon name="upload" :sw="2.2" class="w-[30px] h-[30px] text-white" />
            </div>
            <div data-dz-title class="font-display font-bold text-xl text-ink-900 tracking-tight">Drop files to send</div>
            <div class="text-sm text-ink-400">or <b class="text-brand-600 font-semibold">browse</b> — files or a whole folder, up to 2&nbsp;GB free</div>
        </div>

        {{-- Trust row — quiet reassurance under the dropzone. --}}
        <div class="grid grid-cols-3 gap-2 mt-4">
            @foreach ([['shield', 'success', 'Secure', 'Encrypted'], ['zap', 'brand', 'Fast', 'High-speed'], ['lock', 'spark', 'Private', 'Yours only']] as [$icn, $tone, $title, $sub])
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-none
                        @if ($tone === 'success') bg-success-50 text-success-600
                        @elseif ($tone === 'brand') bg-brand-50 text-brand-500
                        @else bg-spark-500/20 text-spark-600 @endif">
                        <x-icon :name="$icn" class="w-[17px] h-[17px]" />
                    </span>
                    <div class="min-w-0 leading-tight">
                        <div class="text-[13px] font-semibold text-ink-900 truncate">{{ $title }}</div>
                        <div class="text-[11px] text-ink-400 truncate">{{ $sub }}</div>
                    </div>
                </div>
            @endforeach
        </div>

        {{-- File list (hydrated by page-send.js). Empty state shown until files are added. --}}
        <div id="fileList" class="mt-3.5 flex flex-col gap-1 max-h-[230px] overflow-auto scroll-thin"></div>
        <div id="fileEmpty" class="mt-3.5 text-center py-3 text-[13px] text-ink-400">
            No files yet — drop them above or <button type="button" data-pick class="text-brand-600 font-semibold">browse</button>.
        </div>

        <div class="flex items-center justify-between gap-2 mt-3.5 pt-3.5 border-t border-ink-100">
            <span class="font-mono text-xs text-ink-400 min-w-0 truncate">Total <b id="fileTotal" class="text-ink-900">0 files · 0 B</b></span>
            <div class="flex items-center gap-1.5 flex-none">
                <button type="button" data-pick-folder class="flex items-center gap-1.5 h-[34px] px-3 rounded-full text-ink-700 hover:bg-ink-100 text-[13px] font-semibold transition-colors whitespace-nowrap">
                    <x-icon name="folder" class="w-4 h-4" />Add folder
                </button>
                <button type="button" data-pick class="flex items-center gap-1.5 h-[34px] px-3 rounded-full text-ink-700 hover:bg-ink-100 text-[13px] font-semibold transition-colors whitespace-nowrap">
                    <x-icon name="plus" class="w-4 h-4" />Add files
                </button>
            </div>
        </div>
    </div>

    {{-- Deliver-to panel (idle). The "sending" progress panel is swapped in by JS. --}}
    <div data-reveal class="bg-white border border-ink-100 rounded-2xl p-[22px] shadow-sm min-w-0">
        <div id="deliverPanel">
            {{-- Send-mode toggle: email the recipients, or just generate a shareable link. --}}
            <div class="flex gap-1 p-1 bg-ink-50 rounded-xl mb-4" id="modeToggle">
                @foreach ([['email', 'mail', 'Send email'], ['link', 'link', 'Create link']] as [$m, $icn, $label])
                    <button type="button" data-mode="{{ $m }}"
                            class="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-semibold transition-all {{ $m === 'email' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700' }}">
                        <x-icon :name="$icn" class="w-4 h-4" />{{ $label }}
                    </button>
                @endforeach
            </div>
            <div class="flex flex-col gap-3">
                {{-- Your name — shown to guests only (signed-in users send under their account name). --}}
                <label id="fromField" class="hidden flex-col gap-1.5">
                    <span class="text-[13px] font-semibold text-ink-900">Your name</span>
                    <div class="relative flex items-center">
                        <span class="absolute left-3.5 text-ink-400"><x-icon name="user" class="w-4 h-4" /></span>
                        <input id="fromInput" type="text" maxlength="80" placeholder="So recipients know who sent it" class="w-full h-11 pl-10 pr-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
                    </div>
                </label>
                <label id="emailField" class="flex flex-col gap-1.5">
                    <span class="text-[13px] font-semibold text-ink-900">Email recipients</span>
                    <div class="relative flex items-center">
                        <span class="absolute left-3.5 text-ink-400"><x-icon name="mail" class="w-4 h-4" /></span>
                        <input id="emailInput" placeholder="mara@studio.co, theo@…" class="w-full h-11 pl-10 pr-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
                    </div>
                </label>
                <label class="flex flex-col gap-1.5">
                    <span class="text-[13px] font-semibold text-ink-900">Message</span>
                    <input id="msgInput" placeholder="Final cuts for review 🎬" class="w-full h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300">
                </label>
            </div>

            <p class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 mb-2 mt-5">Expires after</p>
            <div class="flex flex-wrap gap-2" id="expiryGroup">
                @foreach ([['1d', '1 day', 'free'], ['3d', '3 days', 'free'], ['7d', '7 days', 'free'], ['30d', '30 days', 'pro'], ['1y', '1 year', 'pro'], ['forever', 'Forever', 'pro']] as [$v, $label, $tier])
                    <button type="button" data-expiry="{{ $v }}" data-tier="{{ $tier }}"
                            class="expiry-chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[13px] font-medium transition-all {{ $v === '7d' ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-150 text-ink-700 hover:border-ink-300' }}">{{ $label }}<span data-pro-tag class="hidden text-[10px] font-bold tracking-wide text-spark-600">PRO</span></button>
                @endforeach
            </div>

            <p class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 mb-2 mt-5">Protection</p>
            <div>
                @foreach ([['lock', 'Password protect', 'Recipients enter a code', 'pw', false], ['zap', 'Delete after download', 'Burn after reading', 'burn', false], ['bell', 'Notify on download', 'Email me each time', 'notify', true]] as [$icon, $t, $s, $id, $on])
                    <div class="flex items-center justify-between gap-3 py-3.5 border-b border-ink-100 last:border-0">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center flex-none"><x-icon :name="$icon" class="w-[18px] h-[18px]" /></div>
                            <div class="min-w-0">
                                <div class="text-sm font-semibold text-ink-900 leading-tight whitespace-nowrap">{{ $t }}</div>
                                <div class="text-xs text-ink-400 leading-tight mt-0.5">{{ $s }}</div>
                            </div>
                        </div>
                        <x-toggle :id="$id" :on="$on" />
                    </div>
                    @if ($id === 'pw')
                        {{-- Access code, revealed when Password protect is on. Editable; share this with the recipient. --}}
                        <div id="pwField" class="hidden -mt-1 mb-1.5 pr-1">
                            <div class="flex items-center gap-2">
                                <input id="pwInput" inputmode="text" maxlength="64" placeholder="Access code"
                                       class="flex-1 h-10 px-3.5 rounded-xl border border-ink-200 text-[15px] font-mono tracking-wide text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300 placeholder:font-body placeholder:tracking-normal">
                                <button type="button" id="pwRegen" title="Generate a new code" class="h-10 px-3 rounded-xl border border-ink-200 hover:bg-ink-50 text-ink-600 text-[13px] font-semibold transition-colors whitespace-nowrap">New code</button>
                            </div>
                            <p class="text-[11px] text-ink-400 mt-1.5">Share this code with your recipient — they’ll need it to open the files.</p>
                        </div>
                    @endif
                @endforeach
            </div>

            <button type="button" id="sendBtn" disabled
                    class="mt-5 w-full h-[52px] rounded-full font-semibold text-[17px] flex items-center justify-center gap-2 transition bg-ink-100 text-ink-400 cursor-not-allowed">
                <x-icon name="shield" class="w-[18px] h-[18px]" /><span id="sendBtnLabel">Add files to send</span>
            </button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-send.js') }}"></script>
@endpush
