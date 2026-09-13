<?php
// api/signup.php - New user registration endpoint

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$data = getRequestData();
$fullName = trim($data['fullName'] ?? $data['full_name'] ?? '');
$email = trim($data['email'] ?? $data['suEmail'] ?? '');
$age = isset($data['age']) ? (int)$data['age'] : (isset($data['suAge']) ? (int)$data['suAge'] : null);
$password = $data['password'] ?? $data['suPassword'] ?? '';
$confirmPassword = $data['confirmPassword'] ?? $data['suConfirmPassword'] ?? '';

if (empty($fullName)) {
    jsonResponse(false, 'Full name is required.', null, 400);
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'A valid email address is required.', null, 400);
}

if ($age === null || $age < 1 || $age > 120) {
    jsonResponse(false, 'Please enter a valid age between 1 and 120.', null, 400);
}

if (empty($password) || strlen($password) < 5) {
    jsonResponse(false, 'Password must be at least 5 characters.', null, 400);
}

if ($password !== $confirmPassword) {
    jsonResponse(false, 'Passwords do not match.', null, 400);
}

$db = getDBConnection();

// Check if email already exists
$checkStmt = $db->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
$checkStmt->execute([':email' => $email]);
if ($checkStmt->fetch()) {
    jsonResponse(false, 'An account with this email already exists.', null, 409);
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$insertStmt = $db->prepare(
    "INSERT INTO users (full_name, email, age, password, role, created_at)
     VALUES (:full_name, :email, :age, :password, 'patient', NOW())"
);

$insertStmt->execute([
    ':full_name' => $fullName,
    ':email'     => $email,
    ':age'       => $age,
    ':password'  => $hashedPassword,
]);

$userId = $db->lastInsertId();

jsonResponse(true, 'Account created successfully! Please log in.', [
    'userId' => $userId,
    'email'  => $email,
]);
