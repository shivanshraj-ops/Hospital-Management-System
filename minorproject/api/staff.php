<?php
// api/staff.php - Staff management and admin authorization

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

function getNextStaffId(PDO $db): string {
    $stmt = $db->query("SELECT id FROM staff WHERE id LIKE 'S%'");
    $max = 0;
    while ($row = $stmt->fetch()) {
        $num = (int)preg_replace('/\D/', '', $row['id']);
        if ($num > $max) {
            $max = $num;
        }
    }
    return 'S' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

// GET: Retrieve staff with search & filter
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $id     = trim($_GET['id'] ?? '');

    if (!empty($id)) {
        $stmt = $db->prepare("SELECT * FROM staff WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $s = $stmt->fetch();
        if (!$s) {
            jsonResponse(false, 'Staff member not found.', null, 404);
        }
        jsonResponse(true, 'Staff member found.', $s);
    }

    $sql = "SELECT id, name, role, phone, email, username, status, created_at FROM staff WHERE 1=1";
    $params = [];

    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $sql .= " AND (LOWER(name) LIKE :q OR LOWER(role) LIKE :q OR LOWER(phone) LIKE :q OR LOWER(email) LIKE :q OR LOWER(id) LIKE :q)";
        $params[':q'] = '%' . strtolower($search) . '%';
    }

    $sql .= " ORDER BY id ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $staff = $stmt->fetchAll();

    jsonResponse(true, 'Staff retrieved successfully.', $staff);
}

// POST: Add new staff (Admin authorized)
if ($method === 'POST') {
    // Only a logged-in administrator may add staff members.
    if (!isAdmin()) {
        jsonResponse(false, 'Forbidden. Only administrators can add staff members.', null, 403);
    }

    $name     = trim($data['name'] ?? '');
    $role     = trim($data['role'] ?? 'Nurse');
    $phone    = trim($data['phone'] ?? '');
    $email    = trim($data['email'] ?? '');
    $username = trim($data['username'] ?? $data['user'] ?? '');
    $status   = trim($data['status'] ?? 'Active');
    $customId = trim($data['id'] ?? '');

    if (empty($name)) {
        jsonResponse(false, 'Staff name is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Valid email address is required.', null, 400);
    }

    $id = !empty($customId) ? $customId : getNextStaffId($db);

    $stmt = $db->prepare(
        "INSERT INTO staff (id, name, role, phone, email, username, status, created_at)
         VALUES (:id, :name, :role, :phone, :email, :username, :status, NOW())"
    );

    $stmt->execute([
        ':id'       => $id,
        ':name'     => $name,
        ':role'     => $role,
        ':phone'    => $phone,
        ':email'    => $email,
        ':username' => !empty($username) ? $username : null,
        ':status'   => $status,
    ]);

    jsonResponse(true, 'Staff added successfully.', [
        'id'   => $id,
        'name' => $name,
    ], 201);
}

// PUT: Edit staff member
if ($method === 'PUT') {
    // Only a logged-in administrator may edit staff members.
    if (!isAdmin()) {
        jsonResponse(false, 'Forbidden. Only administrators can update staff members.', null, 403);
    }

    $id = trim($data['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Staff ID is required for update.', null, 400);
    }

    $name     = trim($data['name'] ?? '');
    $role     = trim($data['role'] ?? 'Nurse');
    $phone    = trim($data['phone'] ?? '');
    $email    = trim($data['email'] ?? '');
    $username = trim($data['username'] ?? $data['user'] ?? '');
    $status   = trim($data['status'] ?? 'Active');

    if (empty($name)) {
        jsonResponse(false, 'Staff name is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Valid email address is required.', null, 400);
    }

    $stmt = $db->prepare(
        "UPDATE staff SET
            name = :name,
            role = :role,
            phone = :phone,
            email = :email,
            username = :username,
            status = :status
         WHERE id = :id"
    );

    $stmt->execute([
        ':name'     => $name,
        ':role'     => $role,
        ':phone'    => $phone,
        ':email'    => $email,
        ':username' => !empty($username) ? $username : null,
        ':status'   => $status,
        ':id'       => $id,
    ]);

    jsonResponse(true, 'Staff updated successfully.', [
        'id'   => $id,
        'name' => $name
    ]);
}

// DELETE: Delete staff member
if ($method === 'DELETE') {
    // Only a logged-in administrator may delete staff members.
    if (!isAdmin()) {
        jsonResponse(false, 'Forbidden. Only administrators can delete staff members.', null, 403);
    }

    $id = trim($data['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Staff ID is required for deletion.', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM staff WHERE id = :id");
    $stmt->execute([':id' => $id]);

    jsonResponse(true, 'Staff deleted successfully.');
}

jsonResponse(false, 'Method not allowed.', null, 405);
