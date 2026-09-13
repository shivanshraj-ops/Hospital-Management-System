<?php
// includes/auth.php - Session and role authorization helpers

if (session_status() === PHP_SESSION_NONE) {
    // 7-day session lifetime
    ini_set('session.gc_maxlifetime', 604800);
    session_set_cookie_params([
        'lifetime' => 604800,
        'path'     => '/',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

require_once __DIR__ . '/response.php';

function getCurrentUser(): ?array {
    return $_SESSION['user'] ?? null;
}

function isLoggedIn(): bool {
    return !empty($_SESSION['user']) && !empty($_SESSION['user']['id']);
}

function isAdmin(): bool {
    return isLoggedIn() && (($_SESSION['user']['role'] ?? '') === 'admin');
}

function requireAuth(): array {
    if (!isLoggedIn()) {
        jsonResponse(false, 'Unauthorized. Please login to continue.', null, 401);
    }
    return $_SESSION['user'];
}

function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        jsonResponse(false, 'Forbidden. Administrator privileges required.', null, 403);
    }
    return $user;
}
