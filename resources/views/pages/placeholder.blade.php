@extends('layouts.app')

@section('title', $title ?? 'Beam')

@section('content')
<div class="fade-in max-w-[980px] mx-auto px-7 pt-8 pb-14">
    <div class="bg-white border border-ink-100 rounded-2xl p-10 shadow-sm text-center">
        <div class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4">
            <x-icon name="inbox" class="w-7 h-7" />
        </div>
        <h2 class="font-display font-bold text-2xl text-ink-900 tracking-tight">{{ $heading ?? 'Coming soon' }}</h2>
        <p class="text-ink-400 mt-2 max-w-md mx-auto">This screen is being ported to Blade next. The layout, sidebar, topbar and API wiring are already in place — content lands here.</p>
    </div>
</div>
@endsection
