@props(['id', 'on' => false])
<button type="button" class="switch shrink-0" data-switch="{{ $id }}" data-on="{{ $on ? 'true' : 'false' }}" aria-label="toggle">
    <span class="track block w-11 h-[26px] rounded-full bg-ink-200 relative transition-colors duration-200">
        <span class="thumb absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"></span>
    </span>
</button>
