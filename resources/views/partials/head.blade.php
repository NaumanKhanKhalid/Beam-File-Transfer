<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="{{ csrf_token() }}">
{{-- API base for beam-api.js (same backend React will use). Defaults to /api. --}}
<meta name="api-base" content="{{ config('app.api_base', '/api') }}">
<title>@yield('title', 'Beam') — Send big. Then it's gone.</title>

<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="{{ asset('assets/js/tailwind.config.js') }}"></script>
<link rel="stylesheet" href="{{ asset('assets/css/app.css') }}">
