<?php
// api/session.php - Session check and account profile management

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

// Check session state
if ($method === 'GET') {
    if (!isLoggedIn()) {
        jsonResponse(true, 'No active session.', [
            'loggedIn' => false,
            'user'     => null
        ]);
    }

    $currentUser = getCurrentUser();
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT id, username, full_name, email, age, role, photo, created_at, last_login FROM users WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $currentUser['id']]);
    $freshUser = $stmt->fetch();

    if ($freshUser) {
        $_SESSION['user'] = [
            'id'        => (int)$freshUser['id'],
            'username'  => $freshUser['username'],
            'fullName'  => $freshUser['full_name'],
            'email'     => $freshUser['email'],
            'age'       => $freshUser['age'] !== null ? (int)$freshUser['age'] : null,
            'role'      => $freshUser['role'],
            'photo'     => $freshUser['photo'],
            'createdAt' => $freshUser['created_at'],
            'lastLogin' => $freshUser['last_login'],
        ];
    }

    jsonResponse(true, 'Active session found.', [
        'loggedIn' => true,
        'user'     => $_SESSION['user']
    ]);
}

// Update profile photo or password
if ($method === 'POST' || $method === 'PUT') {
    $user = requireAuth();
    $db = getDBConnection();
    $action = $data['action'] ?? '';

    if ($action === 'change_password') {
        $currentPassword = $data['currentPassword'] ?? $data['cpCurrent'] ?? '';
        $newPassword     = $data['newPassword'] ?? $data['cpNew'] ?? '';
        $confirmPassword = $data['confirmPassword'] ?? $data['cpConfirm'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            jsonResponse(false, 'Current and new passwords are required.', null, 400);
        }

        if (strlen($newPassword) < 5) {
            jsonResponse(false, 'New password must be at least 5 characters.', null, 400);
        }

        if ($newPassword !== $confirmPassword) {
            jsonResponse(false, 'New passwords do not match.', null, 400);
        }

        // Verify current password against database
        $stmt = $db->prepare("SELECT password FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($currentPassword, $row['password'])) {
            jsonResponse(false, 'Current password is incorrect.', null, 400);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $upd = $db->prepare("UPDATE users SET password = :pwd WHERE id = :id");
        $upd->execute([':pwd' => $newHash, ':id' => $user['id']]);

        jsonResponse(true, 'Password updated successfully.');
    }

    if ($action === 'update_photo') {
        $photoData = $data['photo'] ?? '';
        if (empty($photoData)) {
            jsonResponse(false, 'Photo data is required.', null, 400);
        }

        $upd = $db->prepare("UPDATE users SET photo = :photo WHERE id = :id");
        $upd->execute([':photo' => $photoData, ':id' => $user['id']]);
        $_SESSION['user']['photo'] = $photoData;

        jsonResponse(true, 'Profile photo updated successfully.', [
            'photo' => $photoData
        ]);
    }

    jsonResponse(false, 'Invalid action specified.', null, 400);
}

jsonResponse(false, 'Method not allowed.', null, 405);
