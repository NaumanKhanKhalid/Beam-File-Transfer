@props(['active' => 'sender'])
@php
    $tabs = [
        ['key' => 'sender',    'label' => 'Sender app',     'route' => 'send'],
        ['key' => 'recipient', 'label' => 'Recipient page',  'route' => 'recipient.demo'],
        ['key' => 'admin',     'label' => 'Admin',           'route' => 'admin'],
    ];
@endphp
<div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-ink-900 rounded-full p-[5px] shadow-lg">
    @foreach ($tabs as $t)
        @php $on = $active === $t['key']; @endphp
        <a href="{{ route($t['route']) }}"
           class="text-[13px] font-semibold rounded-full px-4 py-2 whitespace-nowrap transition-all {{ $on ? 'bg-spark-500 text-ink-900' : 'text-ink-300 hover:text-ink-100' }}">{{ $t['label'] }}</a>
    @endforeach
</div>
