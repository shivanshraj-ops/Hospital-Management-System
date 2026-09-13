<?php
// api/invoices.php - Billing and invoice management

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

function getNextInvoiceId(PDO $db): string {
    $stmt = $db->query("SELECT id FROM invoices WHERE id LIKE 'INV%'");
    $max = 0;
    while ($row = $stmt->fetch()) {
        $num = (int)preg_replace('/\D/', '', $row['id']);
        if ($num > $max) {
            $max = $num;
        }
    }
    return 'INV' . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

// GET: Retrieve invoices with search & filter
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $id     = trim($_GET['id'] ?? '');

    if (!empty($id)) {
        $stmt = $db->prepare("SELECT id, patient_id, appointment_id, invoice_number, invoice_date AS date, patient_name AS patient, consultation_fee AS fee, other_charges AS other, total_amount AS total, status FROM invoices WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $inv = $stmt->fetch();
        if (!$inv) {
            jsonResponse(false, 'Invoice not found.', null, 404);
        }
        jsonResponse(true, 'Invoice found.', $inv);
    }

    $sql = "SELECT id, patient_id, appointment_id, invoice_number, invoice_date AS date, patient_name AS patient, consultation_fee AS fee, other_charges AS other, total_amount AS total, status, created_at FROM invoices WHERE 1=1";
    $params = [];

    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $sql .= " AND (LOWER(id) LIKE :q OR LOWER(patient_name) LIKE :q OR LOWER(invoice_number) LIKE :q)";
        $params[':q'] = '%' . strtolower($search) . '%';
    }

    $sql .= " ORDER BY invoice_date DESC, id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $invoices = $stmt->fetchAll();

    jsonResponse(true, 'Invoices retrieved successfully.', $invoices);
}

// POST: Create invoice
if ($method === 'POST') {
    $patientName = trim($data['patient'] ?? $data['patient_name'] ?? '');
    $date        = trim($data['date'] ?? $data['invoice_date'] ?? date('Y-m-d'));
    $fee         = isset($data['fee']) ? (float)$data['fee'] : (isset($data['consultation_fee']) ? (float)$data['consultation_fee'] : 0.00);
    $other       = isset($data['other']) ? (float)$data['other'] : (isset($data['other_charges']) ? (float)$data['other_charges'] : 0.00);
    $status      = trim($data['status'] ?? 'Pending');
    $customId    = trim($data['id'] ?? '');

    if (empty($patientName)) {
        jsonResponse(false, 'Patient name is required.', null, 400);
    }

    if ($fee < 0 || $other < 0) {
        jsonResponse(false, 'Charges cannot be negative.', null, 400);
    }

    $total = $fee + $other;
    $id = !empty($customId) ? $customId : getNextInvoiceId($db);
    $invNum = $id;

    // Optional link to patient
    $pStmt = $db->prepare("SELECT id FROM patients WHERE LOWER(full_name) = LOWER(:name) LIMIT 1");
    $pStmt->execute([':name' => $patientName]);
    $pRow = $pStmt->fetch();
    $patientId = $pRow ? $pRow['id'] : null;

    $stmt = $db->prepare(
        "INSERT INTO invoices (id, patient_id, invoice_number, invoice_date, patient_name, consultation_fee, other_charges, total_amount, status, created_at)
         VALUES (:id, :patient_id, :invoice_number, :invoice_date, :patient_name, :consultation_fee, :other_charges, :total_amount, :status, NOW())"
    );

    $stmt->execute([
        ':id'               => $id,
        ':patient_id'       => $patientId,
        ':invoice_number'   => $invNum,
        ':invoice_date'     => $date,
        ':patient_name'     => $patientName,
        ':consultation_fee' => $fee,
        ':other_charges'    => $other,
        ':total_amount'     => $total,
        ':status'           => $status,
    ]);

    jsonResponse(true, 'Invoice created successfully.', [
        'id'      => $id,
        'patient' => $patientName,
        'total'   => $total,
        'status'  => $status,
    ], 201);
}

// PUT: Update invoice (or toggle status)
if ($method === 'PUT') {
    $id = trim($data['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Invoice ID is required.', null, 400);
    }

    // Check if toggle status only
    if (isset($data['toggle_status']) || (count($data) === 2 && isset($data['status']))) {
        $status = trim($data['status'] ?? '');
        if (empty($status)) {
            // Read current status and toggle
            $curStmt = $db->prepare("SELECT status FROM invoices WHERE id = :id LIMIT 1");
            $curStmt->execute([':id' => $id]);
            $cur = $curStmt->fetch();
            $status = ($cur && $cur['status'] === 'Paid') ? 'Pending' : 'Paid';
        }

        $stmt = $db->prepare("UPDATE invoices SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $id]);

        jsonResponse(true, "Invoice marked as $status.", ['id' => $id, 'status' => $status]);
    }

    $patientName = trim($data['patient'] ?? $data['patient_name'] ?? '');
    $date        = trim($data['date'] ?? $data['invoice_date'] ?? date('Y-m-d'));
    $fee         = isset($data['fee']) ? (float)$data['fee'] : 0.00;
    $other       = isset($data['other']) ? (float)$data['other'] : 0.00;
    $status      = trim($data['status'] ?? 'Pending');
    $total       = $fee + $other;

    $stmt = $db->prepare(
        "UPDATE invoices SET
            patient_name = :patient_name,
            invoice_date = :invoice_date,
            consultation_fee = :fee,
            other_charges = :other,
            total_amount = :total,
            status = :status
         WHERE id = :id"
    );

    $stmt->execute([
        ':patient_name' => $patientName,
        ':invoice_date' => $date,
        ':fee'          => $fee,
        ':other'        => $other,
        ':total_amount' => $total,
        ':status'       => $status,
        ':id'           => $id,
    ]);

    jsonResponse(true, 'Invoice updated successfully.', [
        'id'      => $id,
        'patient' => $patientName,
        'total'   => $total,
        'status'  => $status,
    ]);
}

// DELETE: Delete invoice
if ($method === 'DELETE') {
    $id = trim($data['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(false, 'Invoice ID is required.', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM invoices WHERE id = :id");
    $stmt->execute([':id' => $id]);

    jsonResponse(true, 'Invoice deleted successfully.');
}

jsonResponse(false, 'Method not allowed.', null, 405);
