@extends('layouts.guest')

@section('title', 'Beam')

@section('content')
<div class="fade-in min-h-screen bg-ink-900 flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute w-[520px] h-[520px] rounded-full -top-[180px] -left-[120px] blur-[20px] opacity-50" style="background:radial-gradient(circle,#4B3AFF,transparent 68%)"></div>
    <div class="absolute w-[360px] h-[360px] rounded-full -bottom-[140px] -right-[80px] blur-[18px] opacity-20" style="background:radial-gradient(circle,#C6FF3D,transparent 70%)"></div>
    <img src="{{ asset('assets/img/beam-wordmark-dark.svg') }}" alt="Beam" class="absolute top-7 left-8 h-7"
         onerror="this.outerHTML='<span class=\'absolute top-7 left-8 font-display font-bold text-white text-xl\'>Beam</span>'">
    <div class="relative w-[420px] max-w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <h2 class="font-display font-bold text-[26px] text-ink-900 tracking-tight">{{ $heading ?? 'Beam' }}</h2>
        <p class="text-ink-400 text-sm mt-2">This screen is being ported to Blade next. Layout and API wiring are in place.</p>
        <a href="{{ route('send') }}" class="inline-flex items-center justify-center h-11 px-6 mt-5 rounded-full bg-spark-500 hover:bg-spark-600 text-ink-900 text-sm font-semibold transition-colors">Back to Send</a>
    </div>
</div>
@endsection
