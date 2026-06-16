@extends('layouts.app')

@section('title', 'Upgrade')

@php
    $plans = [
        'free'     => ['name' => 'Free',     'monthly' => 0,    'yearly' => 0,    'tagline' => 'For the occasional send',     'popular' => false, 'features' => ['2 GB per transfer', '7-day expiry', 'Email or link sharing', 'Up to 3 transfers at once']],
        'pro'      => ['name' => 'Pro',      'monthly' => 749,  'yearly' => 599,  'tagline' => 'For freelancers & creators',  'popular' => true,  'features' => ['200 GB per transfer', '1-year expiry', 'Branded transfer pages', 'Password + delete-after-download', 'Live download tracking', 'Priority support']],
        'business' => ['name' => 'Business', 'monthly' => 1899, 'yearly' => 1499, 'tagline' => 'For teams & studios',         'popular' => false, 'features' => ['1 TB per transfer', 'Unlimited expiry', 'Team rooms & shared spaces', 'Admin & member roles', 'Custom domain (files.you.com)', 'SSO + audit log']],
    ];
@endphp

@section('content')
{{-- Pricing --}}
<div id="pricingView" class="fade-in max-w-[1040px] mx-auto px-4 sm:px-7 pt-9 pb-16">
    <div class="text-center mb-7">
        <div class="font-display font-bold text-[28px] sm:text-[34px] text-ink-900 tracking-tight">Upgrade your Beam</div>
        <p class="text-ink-400 mt-1.5 mb-5">Send bigger, brand it, keep it longer. Cancel anytime.</p>
        <div class="inline-flex items-center bg-ink-100 rounded-full p-1 mb-1 segctl">
            <button type="button" data-bill="monthly" class="px-4 py-2 rounded-full text-[13px] font-semibold transition-all text-ink-500">Monthly</button>
            <button type="button" data-bill="yearly" class="px-4 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 bg-white text-ink-900 shadow-sm">Yearly <x-badge tone="success" label="Save 20%" :dot="false" /></button>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        @foreach ($plans as $key => $p)
            <div class="relative bg-white border {{ $p['popular'] ? 'border-brand-500 shadow-brand ring-1 ring-brand-500' : 'border-ink-100 shadow-sm' }} rounded-2xl p-6 flex flex-col"
                 data-reveal data-plan="{{ $key }}" data-monthly="{{ $p['monthly'] }}" data-yearly="{{ $p['yearly'] }}">
                @if ($p['popular'])<span class="absolute -top-3 left-1/2 -translate-x-1/2"><x-badge tone="brand" label="Most popular" :dot="false" /></span>@endif
                <div class="font-display font-bold text-xl text-ink-900">{{ $p['name'] }}</div>
                <div class="text-[13px] text-ink-400 mt-0.5 mb-4">{{ $p['tagline'] }}</div>
                <div class="flex items-baseline gap-1 mb-1">
                    <span data-price class="font-display font-bold text-4xl text-ink-900 tracking-tight">{{ $p['yearly'] === 0 ? 'Free' : '₹' . number_format($p['yearly']) }}</span>
                    @if ($p['yearly'] > 0)<span class="text-[13px] text-ink-400">/mo</span>@endif
                </div>
                <div data-note class="text-[12px] text-ink-400 h-5 mb-4">{{ $p['yearly'] > 0 ? 'billed yearly · ₹' . number_format($p['yearly'] * 12) . '/yr' : 'forever' }}</div>
                <button type="button" data-choose="{{ $key }}"
                        class="h-[46px] rounded-full font-semibold text-[15px] transition-colors mb-5 {{ $key === 'free' ? 'bg-ink-100 text-ink-400 cursor-default' : ($p['popular'] ? 'bg-spark-500 hover:bg-spark-600 text-ink-900' : 'bg-ink-900 hover:bg-ink-800 text-white') }}"
                        @if ($key === 'free') disabled @endif>
                    {{ $key === 'free' ? 'Current plan' : 'Choose ' . $p['name'] }}
                </button>
                <div class="flex flex-col gap-2.5">
                    @foreach ($p['features'] as $f)
                        <div class="flex items-start gap-2.5 text-[13px] text-ink-700"><span class="text-success-500 mt-0.5 flex-none"><x-icon name="check" class="w-4 h-4" /></span>{{ $f }}</div>
                    @endforeach
                </div>
            </div>
        @endforeach
    </div>
    <div class="flex items-center justify-center gap-2 mt-8 text-[13px] text-ink-400"><x-icon name="shield" class="w-4 h-4 text-success-500" />Secure checkout · 14-day money-back guarantee · Tax invoice included</div>
</div>

{{-- Checkout (hidden until a paid plan is chosen) --}}
@php $safepayOn = config('safepay.enabled'); @endphp
<div id="checkoutView" data-safepay="{{ $safepayOn ? '1' : '0' }}" class="fade-in max-w-[860px] mx-auto px-4 sm:px-7 pt-9 pb-16 hidden">
    <button type="button" data-back class="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-900 mb-5 transition-colors whitespace-nowrap"><span class="rotate-180"><x-icon name="chevR" class="w-4 h-4" /></span>Back to plans</button>
    <div class="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6 items-start">
        <div class="bg-white border border-ink-100 rounded-2xl p-6 shadow-sm">
            <h3 class="font-display font-bold text-lg text-ink-900 mb-4">Payment details</h3>
            <div class="flex flex-col gap-3.5">
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Email</span>
                    <input id="coEmail" type="email" placeholder="you@company.com" class="h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
              <div data-card-fields class="flex flex-col gap-3.5">
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Name on card</span>
                    <input id="coName" placeholder="Mara Lin" class="h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
                <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Card number</span>
                    <div class="relative flex items-center"><span class="absolute left-3.5 text-ink-400"><x-icon name="lock" class="w-4 h-4" /></span>
                        <input id="coCard" inputmode="numeric" placeholder="4242 4242 4242 4242" class="w-full h-11 pl-10 pr-3.5 rounded-xl border border-ink-200 text-[15px] font-mono text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></div></label>
                <div class="grid grid-cols-2 gap-3.5">
                    <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">Expiry</span>
                        <input id="coExp" placeholder="MM / YY" class="h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] font-mono text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
                    <label class="flex flex-col gap-1.5"><span class="text-[13px] font-semibold text-ink-900">CVC</span>
                        <input id="coCvc" inputmode="numeric" maxlength="4" placeholder="123" class="h-11 px-3.5 rounded-xl border border-ink-200 text-[15px] font-mono text-ink-900 bg-white outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/30 transition placeholder:text-ink-300"></label>
                </div>
              </div>
              <div data-safepay-note class="hidden items-start gap-2.5 rounded-xl bg-brand-50 border border-brand-100 p-3.5 text-[13px] text-ink-600">
                <span class="text-brand-500 flex-none mt-0.5"><x-icon name="shield" class="w-4 h-4" /></span>
                <span>You’ll pay securely below with <b class="text-ink-900">Card, JazzCash, or Easypaisa</b> — without leaving this page.</span>
              </div>
              <div id="safepayMount" class="hidden mt-1 min-h-[120px]"></div>
            </div>
            <button type="button" id="payBtn" class="mt-5 w-full h-[52px] rounded-full bg-spark-500 hover:bg-spark-600 active:translate-y-px text-ink-900 font-semibold text-[16px] flex items-center justify-center gap-2 transition"><x-icon name="shield" class="w-[18px] h-[18px]" /><span data-pay-label>Pay</span> <span data-pay-total>Rs 0</span></button>
            <p data-pay-note class="text-[12px] text-ink-400 text-center mt-3">@if ($safepayOn) Secure payment via Safepay (Card / JazzCash / Easypaisa). @else Demo checkout — no real card is charged. Use 4242 4242 4242 4242. @endif</p>
        </div>
        <div class="bg-ink-900 rounded-2xl p-6 text-white">
            <div class="text-[11px] font-semibold tracking-[.08em] uppercase text-ink-400 mb-3">Order summary</div>
            <div class="flex items-center justify-between gap-2 mb-1"><span class="font-display font-bold text-lg whitespace-nowrap" data-sum-name>Beam Pro</span><span data-sum-cycle></span></div>
            <p class="text-[13px] text-ink-400 mb-4" data-sum-tagline></p>
            <div class="flex flex-col gap-2 text-[14px] border-t border-ink-700 pt-4">
                <div class="flex justify-between text-ink-300"><span data-sum-line></span><span class="font-mono text-white" data-sum-sub></span></div>
                <div class="flex justify-between text-ink-300">Tax 18%<span class="font-mono text-white" data-sum-gst></span></div>
                <div class="flex justify-between font-display font-bold text-lg pt-2 border-t border-ink-700 mt-1">Total<span data-sum-total></span></div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script type="module" src="{{ asset('assets/js/page-upgrade.js') }}"></script>
@endpush
