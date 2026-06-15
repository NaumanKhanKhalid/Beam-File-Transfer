<!DOCTYPE html>
<html lang="en">
<head>
@include('partials.head')
@stack('head')
</head>
<body class="bg-ink-50 text-ink-700 antialiased min-h-screen">

<main class="min-h-screen flex flex-col">
    @yield('content')
</main>

<x-toasts />

@include('partials.scripts')
@stack('scripts')
</body>
</html>
