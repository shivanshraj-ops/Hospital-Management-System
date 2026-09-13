<?php
// api/appointments.php - Appointment booking, search, status updates, and doctor/patient linking

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

function getNextAppointmentId(PDO $db): string {
    $stmt = $db->query("SELECT id FROM appointments WHERE id LIKE 'A%'");
    $max = 0;
    while ($row = $stmt->fetch()) {
        $num = (int)preg_replace('/\D/', '', $row['id']);
        if ($num > $max) {
            $max = $num;
        }
    }
    return 'A' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

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

// GET: Retrieve appointments with filters
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $date   = trim($_GET['date'] ?? '');
    $today  = isset($_GET['today']) && $_GET['today'] == '1';
    $id     = trim($_GET['id'] ?? '');

    if (!empty($id)) {
        $stmt = $db->prepare("SELECT * FROM appointments WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $appt = $stmt->fetch();
        if (!$appt) {
            jsonResponse(false, 'Appointment not found.', null, 404);
        }
        jsonResponse(true, 'Appointment found.', $appt);
    }

    $sql = "SELECT id, patient_id, doctor_id, full_name AS patient, age, gender, email, problem, doctor_name AS doctor, department AS dept, fee, appointment_date AS date, time_slot AS time, payment_mode AS paymentMode, notes, status, created_at FROM appointments WHERE 1=1";
    $params = [];

    if ($today) {
        $sql .= " AND appointment_date = CURDATE()";
    } elseif (!empty($date)) {
        $sql .= " AND appointment_date = :date";
        $params[':date'] = $date;
    }

    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $sql .= " AND (LOWER(full_name) LIKE :q OR LOWER(doctor_name) LIKE :q OR LOWER(problem) LIKE :q OR LOWER(id) LIKE :q OR LOWER(email) LIKE :q)";
        $params[':q'] = '%' . strtolower($search) . '%';
    }

    $sql .= " ORDER BY appointment_date DESC, time_slot ASC, id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $appointments = $stmt->fetchAll();

    jsonResponse(true, 'Appointments retrieved successfully.', $appointments);
}

// POST: Book a new appointment
if ($method === 'POST') {
    $name     = trim($data['patient'] ?? $data['full_name'] ?? $data['name'] ?? '');
    $age      = isset($data['age']) ? (int)$data['age'] : null;
    $gender   = trim($data['gender'] ?? 'Male');
    $email    = trim($data['email'] ?? '');
    $problem  = trim($data['problem'] ?? '');
    $doctor   = trim($data['doctor'] ?? $data['doctor_name'] ?? '');
    $slot     = trim($data['time'] ?? $data['time_slot'] ?? '');
    $date     = trim($data['date'] ?? $data['appointment_date'] ?? date('Y-m-d'));
    $payMode  = trim($data['paymentMode'] ?? $data['payment_mode'] ?? 'Cash Only');
    $notes    = trim($data['notes'] ?? $problem);
    $customId = trim($data['id'] ?? '');

    if (empty($name)) {
        jsonResponse(false, 'Patient name is required.', null, 400);
    }

    if ($age === null || $age <= 0) {
        jsonResponse(false, 'Valid age is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Valid email address is required.', null, 400);
    }

    if (empty($problem)) {
        jsonResponse(false, 'Problem / symptom is required.', null, 400);
    }

    if (empty($doctor)) {
        jsonResponse(false, 'Doctor is required.', null, 400);
    }

    if (empty($slot)) {
        jsonResponse(false, 'Time slot is required.', null, 400);
    }

    if (empty($date)) {
        jsonResponse(false, 'Appointment date is required.', null, 400);
    }

    // Link doctor
    $dStmt = $db->prepare("SELECT id, specialization, consultation_fee FROM doctors WHERE name = :name LIMIT 1");
    $dStmt->execute([':name' => $doctor]);
    $doc = $dStmt->fetch();

    $doctorId = $doc['id'] ?? null;
    $dept = $doc['specialization'] ?? 'General';
    $fee = isset($data['fee']) ? (float)$data['fee'] : (float)($doc['consultation_fee'] ?? 600.00);

    // Link or create patient
    $pStmt = $db->prepare("SELECT id FROM patients WHERE LOWER(email) = LOWER(:email) OR LOWER(full_name) = LOWER(:name) LIMIT 1");
    $pStmt->execute([':email' => $email, ':name' => $name]);
    $patientRow = $pStmt->fetch();

    if ($patientRow) {
        $patientId = $patientRow['id'];
    } else {
        $patientId = getNextPatientId($db);
        $insP = $db->prepare(
            "INSERT INTO patients (id, full_name, age, gender, email, doctor_id, doctor_name, notes, status, created_at)
             VALUES (:id, :name, :age, :gender, :email, :doc_id, :doc_name, :notes, 'Outpatient', NOW())"
        );
        $insP->execute([
            ':id'       => $patientId,
            ':name'     => $name,
            ':age'      => $age,
            ':gender'   => $gender,
            ':email'    => $email,
            ':doc_id'   => $doctorId,
            ':doc_name' => $doctor,
            ':notes'    => $problem,
        ]);
    }

    $id = !empty($customId) ? $customId : getNextAppointmentId($db);

    $stmt = $db->prepare(
        "INSERT INTO appointments (id, patient_id, doctor_id, full_name, age, gender, email, problem, doctor_name, department, fee, appointment_date, time_slot, payment_mode, notes, status, created_at)
         VALUES (:id, :patient_id, :doctor_id, :full_name, :age, :gender, :email, :problem, :doctor_name, :department, :fee, :appointment_date, :time_slot, :payment_mode, :notes, 'Scheduled', NOW())"
    );

    $stmt->execute([
        ':id'               => $id,
        ':patient_id'       => $patientId,
        ':doctor_id'        => $doctorId,
        ':full_name'        => $name,
        ':age'              => $age,
        ':gender'           => $gender,
        ':email'            => $email,
        ':problem'          => $problem,
        ':doctor_name'      => $doctor,
        ':department'       => $dept,
        ':fee'              => $fee,
        ':appointment_date' => $date,
        ':time_slot'        => $slot,
        ':payment_mode'     => $payMode,
        ':notes'            => $notes,
    ]);

    $record = [
        'id'          => $id,
        'patient_id'  => $patientId,
        'doctor_id'   => $doctorId,
        'patient'     => $name,
        'age'         => $age,
        'gender'      => $gender,
        'email'       => $email,
        'problem'     => $problem,
        'doctor'      => $doctor,
        'dept'        => $dept,
        'fee'         => $fee,
        'date'        => $date,
        'time'        => $slot,
        'paymentMode' => $payMode,
        'notes'       => $notes,
        'status'      => 'Scheduled'
    ];

    jsonResponse(true, 'Appointment booked successfully.', $record, 201);
}

// PUT: Update appointment (status, notes, etc.)
if ($method === 'PUT') {
    $id = trim($data['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Appointment ID is required.', null, 400);
    }

    $status = trim($data['status'] ?? '');
    $notes  = isset($data['notes']) ? trim($data['notes']) : null;

    $fields = [];
    $params = [':id' => $id];

    if (!empty($status)) {
        $fields[] = "status = :status";
        $params[':status'] = $status;
    }
    if ($notes !== null) {
        $fields[] = "notes = :notes";
        $params[':notes'] = $notes;
    }

    if (empty($fields)) {
        jsonResponse(false, 'No fields specified for update.', null, 400);
    }

    $sql = "UPDATE appointments SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(true, 'Appointment updated successfully.', ['id' => $id, 'status' => $status]);
}

// DELETE: Cancel or delete appointment
if ($method === 'DELETE') {
    $id = trim($data['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Appointment ID is required.', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM appointments WHERE id = :id");
    $stmt->execute([':id' => $id]);

    jsonResponse(true, 'Appointment cancelled/deleted successfully.');
}

jsonResponse(false, 'Method not allowed.', null, 405);
