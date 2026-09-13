<?php
// api/login.php - User authentication endpoint

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$data = getRequestData();
$identifier = trim($data['username'] ?? $data['email'] ?? $data['identifier'] ?? '');
$password = $data['password'] ?? '';

if (empty($identifier)) {
    jsonResponse(false, 'Username or email is required.', null, 400);
}

if (empty($password)) {
    jsonResponse(false, 'Password is required.', null, 400);
}

$db = getDBConnection();
$stmt = $db->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(:u) OR LOWER(email) = LOWER(:e) LIMIT 1");
$stmt->execute([':u' => $identifier, ':e' => $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(false, 'Invalid credentials. Please check your username/email and password.', null, 401);
}

// Update last login timestamp
$updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
$updateStmt->execute([':id' => $user['id']]);

$now = date('c');

// Store in PHP session
$_SESSION['user'] = [
    'id'         => (int)$user['id'],
    'username'   => $user['username'],
    'fullName'   => $user['full_name'],
    'email'      => $user['email'],
    'age'        => $user['age'] !== null ? (int)$user['age'] : null,
    'role'       => $user['role'],
    'photo'      => $user['photo'],
    'createdAt'  => $user['created_at'],
    'lastLogin'  => $now,
];

jsonResponse(true, 'Welcome back, ' . $user['full_name'] . '!', [
    'user' => $_SESSION['user']
]);
