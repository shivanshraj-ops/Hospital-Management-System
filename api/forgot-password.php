<?php
// api/forgot-password.php - Password recovery and reset endpoint

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$data = getRequestData();
$action = trim($data['action'] ?? '');

if (empty($action)) {
    jsonResponse(false, 'Action parameter is required.', null, 400);
}

$db = getDBConnection();

// Ensure password_resets table exists
$db->exec("CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reset_token` (`token`),
  INDEX `idx_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

try {
    // Action 1: Request Password Reset Link (Token-based)
    if ($action === 'request_reset_link') {
        $email = trim($data['email'] ?? '');

        if (empty($email)) {
            jsonResponse(false, 'Email address is required.', null, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(false, 'Please enter a valid email address.', null, 400);
        }

        $stmt = $db->prepare("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(false, 'No account found with that email address.', null, 404);
        }

        // Generate 64-char secure random token
        $token = bin2hex(random_bytes(32));
        // 1 hour expiry (matching "This link will expire in one hour")
        $expiresAt = date('Y-m-d H:i:s', time() + 3600);

        // Remove any existing tokens for this email
        $del = $db->prepare("DELETE FROM password_resets WHERE LOWER(email) = LOWER(:email)");
        $del->execute([':email' => $email]);

        // Insert new token
        $ins = $db->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (:email, :token, :expires_at)");
        $ins->execute([
            ':email'      => $user['email'],
            ':token'      => $token,
            ':expires_at' => $expiresAt
        ]);

        jsonResponse(true, 'Reset link generated successfully.', [
            'token'     => $token,
            'email'     => $user['email'],
            'fullName'  => $user['full_name'],
            'expiresAt' => $expiresAt
        ]);
    }

    // Action 2: Verify Token validity
    if ($action === 'verify_token') {
        $token = trim($data['token'] ?? '');

        if (empty($token)) {
            jsonResponse(false, 'Reset token is required.', null, 400);
        }

        $stmt = $db->prepare("SELECT email, expires_at FROM password_resets WHERE token = :token LIMIT 1");
        $stmt->execute([':token' => $token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            jsonResponse(false, 'This password reset link is invalid or has already been used.', null, 400);
        }

        if (strtotime($reset['expires_at']) < time()) {
            // Expired token: clean up
            $del = $db->prepare("DELETE FROM password_resets WHERE token = :token");
            $del->execute([':token' => $token]);
            jsonResponse(false, 'This password reset link has expired. Please request a new one.', null, 400);
        }

        jsonResponse(true, 'Token is valid.', [
            'email' => $reset['email']
        ]);
    }

    // Action 3: Reset Password using Token
    if ($action === 'reset_with_token') {
        $token = trim($data['token'] ?? '');
        $newPassword = $data['newPassword'] ?? '';

        if (empty($token)) {
            jsonResponse(false, 'Reset token is required.', null, 400);
        }

        if (empty($newPassword) || strlen($newPassword) < 5) {
            jsonResponse(false, 'Password must be at least 5 characters.', null, 400);
        }

        $stmt = $db->prepare("SELECT email, expires_at FROM password_resets WHERE token = :token LIMIT 1");
        $stmt->execute([':token' => $token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            jsonResponse(false, 'This password reset link is invalid or has already been used.', null, 400);
        }

        if (strtotime($reset['expires_at']) < time()) {
            $del = $db->prepare("DELETE FROM password_resets WHERE token = :token");
            $del->execute([':token' => $token]);
            jsonResponse(false, 'This password reset link has expired. Please request a new one.', null, 400);
        }

        $email = $reset['email'];
        $userStmt = $db->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $userStmt->execute([':email' => $email]);
        $user = $userStmt->fetch();

        if (!$user) {
            jsonResponse(false, 'Account not found.', null, 404);
        }

        // Update user password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $upd = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
        $upd->execute([
            ':password' => $hashedPassword,
            ':id'       => $user['id']
        ]);

        // Consume (delete) token so it cannot be reused
        $del = $db->prepare("DELETE FROM password_resets WHERE token = :token");
        $del->execute([':token' => $token]);

        jsonResponse(true, 'Password has been reset successfully. Please log in with your new password.', [
            'email' => $email
        ]);
    }

    // Action 4: Backward-compatible request_otp
    if ($action === 'request_otp') {
        $email = trim($data['email'] ?? '');

        if (empty($email)) {
            jsonResponse(false, 'Email address is required.', null, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(false, 'Please enter a valid email address.', null, 400);
        }

        $stmt = $db->prepare("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(false, 'No account found with that email address.', null, 404);
        }

        jsonResponse(true, 'Account verified. An OTP verification code can now be sent.', [
            'email'    => $user['email'],
            'fullName' => $user['full_name']
        ]);
    }

    // Action 5: Backward-compatible reset_password
    if ($action === 'reset_password') {
        $email = trim($data['email'] ?? '');
        $newPassword = $data['newPassword'] ?? '';

        if (empty($email)) {
            jsonResponse(false, 'Email address is required.', null, 400);
        }

        if (empty($newPassword) || strlen($newPassword) < 5) {
            jsonResponse(false, 'Password must be at least 5 characters.', null, 400);
        }

        $stmt = $db->prepare("SELECT id, email FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(false, 'Account not found for the provided email.', null, 404);
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateStmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
        $updateStmt->execute([
            ':password' => $hashedPassword,
            ':id'       => $user['id']
        ]);

        jsonResponse(true, 'Password has been reset successfully. Please log in with your new password.', [
            'email' => $user['email']
        ]);
    }

    jsonResponse(false, 'Invalid action specified.', null, 400);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
} catch (Exception $e) {
    jsonResponse(false, 'Server error: ' . $e->getMessage(), null, 500);
}
