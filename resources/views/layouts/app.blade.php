<!DOCTYPE html>
<html lang="en">
<head>
@include('partials.head')
@stack('head')
</head>
<body class="bg-ink-50 text-ink-700 antialiased">

<div class="h-screen flex">
    <div class="nav-overlay" data-nav-close></div>
    <x-sidebar :active="$active ?? ''" />

    <main class="flex-1 flex flex-col min-w-0">
        <x-topbar :title="$title ?? ''" />
        <div class="flex-1 overflow-auto scroll-thin">
            @yield('content')
        </div>
    </main>
</div>

{{-- Hidden file inputs reused across screens --}}
<input type="file" multiple id="filepick" class="hidden">
<input type="file" multiple webkitdirectory id="folderpick" class="hidden">
<input type="file" accept="image/*" id="brandLogoPick" class="hidden">

<x-toasts />

@include('partials.scripts')
@stack('scripts')
</body>
</html>
