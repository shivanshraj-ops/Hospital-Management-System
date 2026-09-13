<?php
// api/contacts.php - Contact Us form submission and message storage

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = getRequestData();

// POST: Submit a new contact message
if ($method === 'POST') {
    $name    = trim($data['name'] ?? '');
    $email   = trim($data['email'] ?? '');
    $subject = trim($data['subject'] ?? '');
    $message = trim($data['message'] ?? '');

    if (empty($name)) {
        jsonResponse(false, 'Your name is required.', null, 400);
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'A valid email address is required.', null, 400);
    }

    if (empty($subject)) {
        jsonResponse(false, 'Subject is required.', null, 400);
    }

    if (empty($message)) {
        jsonResponse(false, 'Message is required.', null, 400);
    }

    $stmt = $db->prepare(
        "INSERT INTO contacts (name, email, subject, message, created_at)
         VALUES (:name, :email, :subject, :message, NOW())"
    );

    $stmt->execute([
        ':name'    => $name,
        ':email'   => $email,
        ':subject' => $subject,
        ':message' => $message,
    ]);

    jsonResponse(true, 'Thank you! Your message has been sent to MediCare Hospital. We will contact you shortly.');
}

// GET: View messages (Admin only)
if ($method === 'GET') {
    $stmt = $db->query("SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY created_at DESC");
    $contacts = $stmt->fetchAll();

    jsonResponse(true, 'Contact messages retrieved.', $contacts);
}

jsonResponse(false, 'Method not allowed.', null, 405);
