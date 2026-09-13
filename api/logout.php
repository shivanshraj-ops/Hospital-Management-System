<?php
// api/logout.php - Session destruction endpoint

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/response.php';

// Invalidate stateless signed cookie
clearAuthCookie();

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

jsonResponse(true, 'Logged out successfully.');
