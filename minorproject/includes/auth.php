<?php
// includes/auth.php - Stateless token cookie session and role authorization helpers

require_once __DIR__ . '/response.php';

function isSecureConnection(): bool {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    if (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) return true;
    if (!empty($_SERVER['VERCEL']) || !empty(getenv('VERCEL'))) return true;
    return false;
}

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    ini_set('session.gc_maxlifetime', 604800);
    $isSecure = isSecureConnection();
    session_set_cookie_params([
        'lifetime' => 604800,
        'path'     => '/',
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
}

function getAuthSecret(): string {
    $secret = getenv('AUTH_SECRET') ?: ($_ENV['AUTH_SECRET'] ?? ($_SERVER['AUTH_SECRET'] ?? ''));
    if (empty($secret)) {
        // Stable, persistent application secret for serverless continuity
        $secret = 'medicare_hms_jwt_auth_secret_stable_prod_key_2026';
    }
    return $secret;
}

function createSignedToken(array $user, int $lifetime = 604800): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = [
        'id'        => (int)$user['id'],
        'username'  => $user['username'] ?? '',
        'fullName'  => $user['full_name'] ?? ($user['fullName'] ?? ''),
        'email'     => $user['email'] ?? '',
        'role'      => $user['role'] ?? 'patient',
        'age'       => isset($user['age']) && $user['age'] !== null ? (int)$user['age'] : null,
        'photo'     => $user['photo'] ?? null,
        'createdAt' => $user['created_at'] ?? ($user['createdAt'] ?? date('Y-m-d H:i:s')),
        'lastLogin' => $user['last_login'] ?? ($user['lastLogin'] ?? date('c')),
        'iat'       => time(),
        'exp'       => time() + $lifetime,
    ];

    $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($header)));
    $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $b64Header . '.' . $b64Payload, getAuthSecret(), true);
    $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    return $b64Header . '.' . $b64Payload . '.' . $b64Signature;
}

function verifySignedToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    list($b64Header, $b64Payload, $b64Signature) = $parts;

    $expectedSig = hash_hmac('sha256', $b64Header . '.' . $b64Payload, getAuthSecret(), true);
    $b64ExpectedSig = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSig));

    if (!hash_equals($b64ExpectedSig, $b64Signature)) {
        return null;
    }

    $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $b64Payload));
    if (!$payloadJson) {
        return null;
    }

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload) || empty($payload['id']) || empty($payload['exp'])) {
        return null;
    }

    if ($payload['exp'] < time()) {
        return null; // Token expired
    }

    return $payload;
}

function setAuthCookie(string $token, int $lifetime = 604800): void {
    $isSecure = isSecureConnection();
    if (!headers_sent()) {
        setcookie('medicare_session', $token, [
            'expires'  => time() + $lifetime,
            'path'     => '/',
            'domain'   => '',
            'secure'   => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
    $_COOKIE['medicare_session'] = $token;
}

function clearAuthCookie(): void {
    $isSecure = isSecureConnection();
    if (!headers_sent()) {
        setcookie('medicare_session', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'domain'   => '',
            'secure'   => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
    unset($_COOKIE['medicare_session']);
}

function getCurrentUser(): ?array {
    // Check signed HTTP-only cookie first (serverless source of truth)
    $token = $_COOKIE['medicare_session'] ?? '';
    if (!empty($token)) {
        $user = verifySignedToken($token);
        if ($user !== null) {
            $_SESSION['user'] = $user;
            return $user;
        }
    }

    // Check PHP session fallback if cookie not set but session valid
    if (!empty($_SESSION['user']) && !empty($_SESSION['user']['id'])) {
        return $_SESSION['user'];
    }

    // Strictly unauthenticated
    return null;
}

function isLoggedIn(): bool {
    $user = getCurrentUser();
    return !empty($user) && !empty($user['id']);
}

function isAdmin(): bool {
    $user = getCurrentUser();
    return !empty($user) && (($user['role'] ?? '') === 'admin');
}

function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user || empty($user['id'])) {
        jsonResponse(false, 'Unauthorized. Please login to continue.', null, 401);
    }
    return $user;
}

function requireAdmin(): array {
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') {
        jsonResponse(false, 'Forbidden. Administrator privileges required.', null, 403);
    }
    return $user;
}
