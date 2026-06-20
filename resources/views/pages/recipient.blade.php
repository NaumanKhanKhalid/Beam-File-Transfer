@extends('layouts.guest')

@section('title', 'Beam — files for you')

@php
    $demo = [
        'sender' => 'Mara Lin',
        'title' => 'Q3 Brand Refresh',
        'note' => 'Final cuts for review 🎬 — shout if the color grade looks off on your screen.',
        'total' => '1.6 GB',
        'expires' => 'in 6 days',
        'expiresAt' => (time() + 6 * 86400 + 4 * 3600) * 1000,
        'link' => 'beam.to/r/4k2-9zq-mara',
        'password' => '482091',
        'demo' => true,
        'burn' => false,
        'files' => [
            ['name' => 'Q3-keynote-final.mov', 'size' => '1.4 GB', 'kind' => 'video'],
            ['name' => 'cover-art.png',         'size' => '4.2 MB', 'kind' => 'image'],
            ['name' => 'creative-brief.pdf',    'size' => '240 KB', 'kind' => 'pdf'],
        ],
    ];
    $transfer = $transfer ?? $demo;
    $slug = $slug ?? 'demo';
@endphp

@section('content')
<style>
    @keyframes codeCaretBlink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
    /* Blinking caret on the active (next-to-fill) code cell. */
    .code-caret::after { content: ''; display: inline-block; width: 2px; height: 26px; background: #4B3AFF; animation: codeCaretBlink 1.05s steps(1) infinite; }
</style>
<div class="fade-in min-h-screen bg-ink-900 flex items-center justify-center p-4 sm:p-10 relative overflow-hidden">
    <div class="absolute w-[520px] h-[520px] rounded-full -top-[180px] -left-[120px] blur-[20px] opacity-50" style="background:radial-gradient(circle,#4B3AFF,transparent 68%)"></div>
    <div class="absolute w-[360px] h-[360px] rounded-full -bottom-[140px] -right-[80px] blur-[18px] opacity-20" style="background:radial-gradient(circle,#C6FF3D,transparent 70%)"></div>
    <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="absolute top-7 left-8 h-7"
         onerror="this.outerHTML='<span class=\'absolute top-7 left-8 font-display font-bold text-white text-xl\'>Beam</span>'">

    <div id="rxCard" class="relative w-[420px] max-w-full bg-white rounded-3xl shadow-xl overflow-hidden" data-slug="{{ $slug }}"></div>
</div>

<script type="application/json" id="rxSeed">@json($transfer)</script>
@endsection

@push('scripts')
<script src="{{ asset('assets/js/qrcode.js') }}"></script>
<script type="module" src="{{ asset('assets/js/page-recipient.js') }}"></script>
@endpush
