<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->is_admin) {
            // API clients get a 403; browsers are bounced to the app home.
            if ($request->expectsJson()) {
                abort(403, 'Admins only.');
            }
            return redirect('/');
        }

        return $next($request);
    }
}
