@props(['tone' => 'neutral', 'label' => '', 'dot' => true])
@php
    $map = [
        'success' => 'bg-success-50 text-success-700',
        'warning' => 'bg-warning-50 text-warning-700',
        'danger'  => 'bg-danger-50 text-danger-700',
        'brand'   => 'bg-brand-50 text-brand-700',
        'neutral' => 'bg-ink-100 text-ink-600',
        'spark'   => 'bg-spark-500 text-ink-900',
    ];
@endphp
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap {{ $map[$tone] ?? $map['neutral'] }}">
    @if ($dot && $tone !== 'neutral')<span class="w-1.5 h-1.5 rounded-full bg-current"></span>@endif{{ $label }}
</span>
