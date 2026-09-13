<?php
// api/patients.php - Patient management CRUD and filtering

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

function getNextPatientId(PDO $db): string {
    $stmt = $db->query("SELECT id FROM patients WHERE id LIKE 'P%'");
    $max = 0;
    while ($row = $stmt->fetch()) {
        $num = (int)preg_replace('/\D/', '', $row['id']);
        if ($num > $max) {
            $max = $num;
        }
    }
    return 'P' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

// GET: Retrieve patients with search & filter
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $id     = trim($_GET['id'] ?? '');

    if (!empty($id)) {
        $stmt = $db->prepare("SELECT * FROM patients WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $patient = $stmt->fetch();
        if (!$patient) {
            jsonResponse(false, 'Patient not found.', null, 404);
        }
        jsonResponse(true, 'Patient found.', $patient);
    }

    $sql = "SELECT id, full_name AS name, age, gender, dob, phone, email, address, blood, doctor_id, doctor_name AS doctor, notes, status, created_at FROM patients WHERE 1=1";
    $params = [];

    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $sql .= " AND (LOWER(full_name) LIKE :q OR LOWER(phone) LIKE :q OR LOWER(id) LIKE :q OR LOWER(doctor_name) LIKE :q OR LOWER(address) LIKE :q)";
        $params[':q'] = '%' . strtolower($search) . '%';
    }

    $sql .= " ORDER BY created_at DESC, id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $patients = $stmt->fetchAll();

    jsonResponse(true, 'Patients retrieved successfully.', $patients);
}

// POST: Add new patient
if ($method === 'POST') {
    $name    = trim($data['name'] ?? $data['full_name'] ?? '');
    $age     = isset($data['age']) ? (int)$data['age'] : null;
    $gender  = trim($data['gender'] ?? 'Male');
    $dob     = !empty($data['dob']) ? $data['dob'] : null;
    $phone   = trim($data['phone'] ?? '');
    $email   = trim($data['email'] ?? '');
    $address = trim($data['address'] ?? '');
    $blood   = trim($data['blood'] ?? '');
    $doctor  = trim($data['doctor'] ?? $data['doctor_name'] ?? '');
    $notes   = trim($data['notes'] ?? '');
    $status  = trim($data['status'] ?? 'Outpatient');
    $customId= trim($data['id'] ?? '');

    if (empty($name)) {
        jsonResponse(false, 'Patient name is required.', null, 400);
    }

    if ($age === null || $age < 0) {
        jsonResponse(false, 'Valid age is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    $id = !empty($customId) ? $customId : getNextPatientId($db);

    // Look up doctor_id if doctor name provided
    $doctorId = null;
    if (!empty($doctor)) {
        $dStmt = $db->prepare("SELECT id FROM doctors WHERE name = :name LIMIT 1");
        $dStmt->execute([':name' => $doctor]);
        $dRow = $dStmt->fetch();
        if ($dRow) {
            $doctorId = $dRow['id'];
        }
    }

    $stmt = $db->prepare(
        "INSERT INTO patients (id, full_name, age, gender, dob, phone, email, address, blood, doctor_id, doctor_name, notes, status, created_at)
         VALUES (:id, :full_name, :age, :gender, :dob, :phone, :email, :address, :blood, :doctor_id, :doctor_name, :notes, :status, NOW())"
    );

    $stmt->execute([
        ':id'          => $id,
        ':full_name'   => $name,
        ':age'         => $age,
        ':gender'      => $gender,
        ':dob'         => $dob,
        ':phone'       => $phone,
        ':email'       => $email,
        ':address'     => $address,
        ':blood'       => $blood,
        ':doctor_id'   => $doctorId,
        ':doctor_name' => $doctor,
        ':notes'       => $notes,
        ':status'      => $status,
    ]);

    jsonResponse(true, 'Patient added successfully.', [
        'id'   => $id,
        'name' => $name
    ], 201);
}

// PUT: Edit existing patient
if ($method === 'PUT') {
    $id = trim($data['id'] ?? '');

    if (empty($id)) {
        jsonResponse(false, 'Patient ID is required for update.', null, 400);
    }

    $name    = trim($data['name'] ?? $data['full_name'] ?? '');
    $age     = isset($data['age']) ? (int)$data['age'] : null;
    $gender  = trim($data['gender'] ?? 'Male');
    $dob     = !empty($data['dob']) ? $data['dob'] : null;
    $phone   = trim($data['phone'] ?? '');
    $email   = trim($data['email'] ?? '');
    $address = trim($data['address'] ?? '');
    $blood   = trim($data['blood'] ?? '');
    $doctor  = trim($data['doctor'] ?? $data['doctor_name'] ?? '');
    $notes   = trim($data['notes'] ?? '');
    $status  = trim($data['status'] ?? 'Outpatient');

    if (empty($name)) {
        jsonResponse(false, 'Patient name is required.', null, 400);
    }

    if ($age === null || $age < 0) {
        jsonResponse(false, 'Valid age is required.', null, 400);
    }

    if (empty($phone) || !preg_match('/^\d{10}$/', $phone)) {
        jsonResponse(false, 'Valid 10-digit phone number is required.', null, 400);
    }

    $doctorId = null;
    if (!empty($doctor)) {
        $dStmt = $db->prepare("SELECT id FROM doctors WHERE name = :name LIMIT 1");
        $dStmt->execute([':name' => $doctor]);
        $dRow = $dStmt->fetch();
        if ($dRow) {
            $doctorId = $dRow['id'];
        }
    }

    $stmt = $db->prepare(
        "UPDATE patients SET
            full_name = :full_name,
            age = :age,
            gender = :gender,
            dob = :dob,
            phone = :phone,
            email = :email,
            address = :address,
            blood = :blood,
            doctor_id = :doctor_id,
            doctor_name = :doctor_name,
            notes = :notes,
            status = :status
         WHERE id = :id"
    );

    $stmt->execute([
        ':full_name'   => $name,
        ':age'         => $age,
        ':gender'      => $gender,
        ':dob'         => $dob,
        ':phone'       => $phone,
        ':email'       => $email,
        ':address'     => $address,
        ':blood'       => $blood,
        ':doctor_id'   => $doctorId,
        ':doctor_name' => $doctor,
        ':notes'       => $notes,
        ':status'      => $status,
        ':id'          => $id,
    ]);

    jsonResponse(true, 'Patient updated successfully.', [
        'id'   => $id,
        'name' => $name
    ]);
}

// DELETE: Delete patient
if ($method === 'DELETE') {
    $id = trim($data['id'] ?? $_GET['id'] ?? '');

    if (empty($id)) {
        jsonResponse(false, 'Patient ID is required for deletion.', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM patients WHERE id = :id");
    $stmt->execute([':id' => $id]);

    jsonResponse(true, 'Patient deleted successfully.');
}

jsonResponse(false, 'Method not allowed.', null, 405);
