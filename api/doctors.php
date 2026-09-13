<?php
// api/doctors.php - Doctor management CRUD and filtering

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

function getNextDoctorId(PDO $db): string {
    $stmt = $db->query("SELECT id FROM doctors WHERE id LIKE 'D%'");
    $max = 0;
    while ($row = $stmt->fetch()) {
        $num = (int)preg_replace('/\D/', '', $row['id']);
        if ($num > $max) {
            $max = $num;
        }
    }
    return 'D' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

// GET: List doctors with optional search / filter
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $spec   = trim($_GET['spec'] ?? '');
    $id     = trim($_GET['id'] ?? '');

    if (!empty($id)) {
        $stmt = $db->prepare("SELECT id, name, specialization AS spec, phone, email, available_days AS days, available_time AS time, consultation_fee AS fee, status FROM doctors WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();
        if (!$doc) {
            jsonResponse(false, 'Doctor not found.', null, 404);
        }
        jsonResponse(true, 'Doctor found.', $doc);
    }

    $sql = "SELECT id, name, specialization AS spec, phone, email, available_days AS days, available_time AS time, consultation_fee AS fee, status, created_at FROM doctors WHERE 1=1";
    $params = [];

    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    if (!empty($spec)) {
        $sql .= " AND specialization = :spec";
        $params[':spec'] = $spec;
    }

    if (!empty($search)) {
        $sql .= " AND (LOWER(name) LIKE :q OR LOWER(specialization) LIKE :q OR LOWER(id) LIKE :q OR LOWER(email) LIKE :q)";
        $params[':q'] = '%' . strtolower($search) . '%';
    }

    $sql .= " ORDER BY id ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $doctors = $stmt->fetchAll();

    jsonResponse(true, 'Doctors retrieved successfully.', $doctors);
}

// POST: Add new doctor
if ($method === 'POST') {
    $name  = trim($data['name'] ?? '');
    $spec  = trim($data['spec'] ?? $data['specialization'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $email = trim($data['email'] ?? '');
    $days  = trim($data['days'] ?? $data['available_days'] ?? 'Mon-Fri');
    $time  = trim($data['time'] ?? $data['available_time'] ?? '09:00 - 13:00');
    $fee   = isset($data['fee']) ? (float)$data['fee'] : (isset($data['consultation_fee']) ? (float)$data['consultation_fee'] : 500.00);
    $status= trim($data['status'] ?? 'Active');
    $customId = trim($data['id'] ?? '');

    if (empty($name)) {
        jsonResponse(false, 'Doctor name is required.', null, 400);
    }
    if (!str_starts_with($name, 'Dr.')) {
        $name = 'Dr. ' . $name;
    }

    if (empty($spec)) {
        jsonResponse(false, 'Specialization is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Valid email address is required.', null, 400);
    }

    $id = !empty($customId) ? $customId : getNextDoctorId($db);

    $stmt = $db->prepare(
        "INSERT INTO doctors (id, name, specialization, phone, email, available_days, available_time, consultation_fee, status, created_at)
         VALUES (:id, :name, :spec, :phone, :email, :days, :time, :fee, :status, NOW())"
    );

    $stmt->execute([
        ':id'     => $id,
        ':name'   => $name,
        ':spec'   => $spec,
        ':phone'  => $phone,
        ':email'  => $email,
        ':days'   => $days,
        ':time'   => $time,
        ':fee'    => $fee,
        ':status' => $status,
    ]);

    jsonResponse(true, 'Doctor added successfully.', [
        'id'   => $id,
        'name' => $name
    ], 201);
}

// PUT: Edit doctor
if ($method === 'PUT') {
    $id = trim($data['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Doctor ID is required for update.', null, 400);
    }

    $name  = trim($data['name'] ?? '');
    $spec  = trim($data['spec'] ?? $data['specialization'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $email = trim($data['email'] ?? '');
    $days  = trim($data['days'] ?? $data['available_days'] ?? 'Mon-Fri');
    $time  = trim($data['time'] ?? $data['available_time'] ?? '09:00 - 13:00');
    $fee   = isset($data['fee']) ? (float)$data['fee'] : (isset($data['consultation_fee']) ? (float)$data['consultation_fee'] : 500.00);
    $status= trim($data['status'] ?? 'Active');

    if (empty($name)) {
        jsonResponse(false, 'Doctor name is required.', null, 400);
    }
    if (!str_starts_with($name, 'Dr.')) {
        $name = 'Dr. ' . $name;
    }

    if (empty($spec)) {
        jsonResponse(false, 'Specialization is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Valid email address is required.', null, 400);
    }

    $stmt = $db->prepare(
        "UPDATE doctors SET
            name = :name,
            specialization = :spec,
            phone = :phone,
            email = :email,
            available_days = :days,
            available_time = :time,
            consultation_fee = :fee,
            status = :status
         WHERE id = :id"
    );

    $stmt->execute([
        ':name'   => $name,
        ':spec'   => $spec,
        ':phone'  => $phone,
        ':email'  => $email,
        ':days'   => $days,
        ':time'   => $time,
        ':fee'    => $fee,
        ':status' => $status,
        ':id'     => $id,
    ]);

    jsonResponse(true, 'Doctor updated successfully.', [
        'id'   => $id,
        'name' => $name
    ]);
}

// DELETE: Delete doctor
if ($method === 'DELETE') {
    $id = trim($data['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Doctor ID is required for deletion.', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM doctors WHERE id = :id");
    $stmt->execute([':id' => $id]);

    jsonResponse(true, 'Doctor deleted successfully.');
}

jsonResponse(false, 'Method not allowed.', null, 405);
