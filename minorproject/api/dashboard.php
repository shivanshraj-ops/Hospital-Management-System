<?php
// api/dashboard.php - Real-time dashboard statistics and metrics

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireAuth();
if ($user['role'] !== 'admin' && $user['role'] !== 'staff') {
    jsonResponse(false, 'Forbidden. Administrator privileges required.', null, 403);
}

$db = getDBConnection();

// Total patients
$pStmt = $db->query("SELECT COUNT(*) AS total FROM patients");
$totalPatients = (int)$pStmt->fetch()['total'];

// Total doctors
$dStmt = $db->query("SELECT COUNT(*) AS total FROM doctors");
$totalDoctors = (int)$dStmt->fetch()['total'];

// Today's appointments count
$aStmt = $db->query("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = CURDATE()");
$todayAppointmentsCount = (int)$aStmt->fetch()['total'];

// Total revenue (from Paid invoices, or all invoices)
$rStmt = $db->query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM invoices");
$totalRevenue = (float)$rStmt->fetch()['total'];

// Revenue breakdown by time window (7 Days / 1 Month / 6 Months / 1 Year).
// Single-pass aggregation over paid invoices using conditional SUM (CASE WHEN),
// anchored to the current time (CURDATE()) - equivalent to a SQL-side .reduce().
// This is one query instead of four, so it stays cheap even as invoices grow.
$revStmt = $db->query(
    "SELECT
        COALESCE(SUM(CASE WHEN invoice_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)  THEN total_amount ELSE 0 END), 0) AS rev_7d,
        COALESCE(SUM(CASE WHEN invoice_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN total_amount ELSE 0 END), 0) AS rev_1m,
        COALESCE(SUM(CASE WHEN invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN total_amount ELSE 0 END), 0) AS rev_6m,
        COALESCE(SUM(CASE WHEN invoice_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)  THEN total_amount ELSE 0 END), 0) AS rev_1y
     FROM invoices
     WHERE status = 'Paid'"
);
$revRow = $revStmt->fetch();
$revenueBreakdown = [
    'days7'   => (float)$revRow['rev_7d'],
    'month1'  => (float)$revRow['rev_1m'],
    'months6' => (float)$revRow['rev_6m'],
    'year1'   => (float)$revRow['rev_1y'],
];

// Pending invoices
$pendingStmt = $db->query("SELECT COUNT(*) AS total FROM invoices WHERE status = 'Pending'");
$pendingInvoicesCount = (int)$pendingStmt->fetch()['total'];

// Doctors on leave
$leaveStmt = $db->query("SELECT COUNT(*) AS total FROM doctors WHERE status = 'On Leave'");
$doctorsOnLeaveCount = (int)$leaveStmt->fetch()['total'];

// Recent 5 patients
$recentPStmt = $db->query("SELECT id, full_name AS name, doctor_name AS doctor, status FROM patients ORDER BY created_at DESC, id DESC LIMIT 5");
$recentPatients = $recentPStmt->fetchAll();

// Today's appointments list
$todayApptStmt = $db->query("SELECT id, full_name AS patient, time_slot AS time, status FROM appointments WHERE appointment_date = CURDATE() ORDER BY time_slot ASC LIMIT 10");
$todayAppointments = $todayApptStmt->fetchAll();

// Last 7 days data for charts
$labels = [];
$weeklyAppts = [];
$weeklyRevenue = [];

for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $dayLabel = date('D', strtotime($date));
    $labels[] = $dayLabel;

    // Appointments on this date
    $qAppt = $db->prepare("SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = :dt");
    $qAppt->execute([':dt' => $date]);
    $weeklyAppts[] = (int)$qAppt->fetch()['total'];

    // Revenue on this date
    $qRev = $db->prepare("SELECT COALESCE(SUM(total_amount), 0) AS total FROM invoices WHERE invoice_date = :dt");
    $qRev->execute([':dt' => $date]);
    $weeklyRevenue[] = (float)$qRev->fetch()['total'];
}

jsonResponse(true, 'Dashboard metrics loaded.', [
    'totalPatients'        => $totalPatients,
    'totalDoctors'         => $totalDoctors,
    'todayAppointments'    => $todayAppointmentsCount,
    'totalRevenue'         => $totalRevenue,
    'revenueBreakdown'     => $revenueBreakdown,
    'pendingInvoices'      => $pendingInvoicesCount,
    'doctorsOnLeave'       => $doctorsOnLeaveCount,
    'recentPatients'       => $recentPatients,
    'todayAppointmentsList'=> $todayAppointments,
    'chartLabels'          => $labels,
    'chartAppointments'    => $weeklyAppts,
    'chartRevenue'         => $weeklyRevenue,
]);
