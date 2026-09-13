<?php
// includes/response.php - Standardized JSON response helpers

function jsonResponse(bool $success, string $message = '', $data = null, int $statusCode = 200): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        http_response_code($statusCode);
    }

    $response = [
        'success' => $success,
        'message' => $message,
    ];

    if ($data !== null) {
        $response['data'] = $data;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getRequestData(): array {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

    $data = [];

    // Parse JSON request body
    if (stripos($contentType, 'application/json') !== false || in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $data = $parsed;
            }
        }
    }

    // Merge $_POST if available
    if (!empty($_POST) && is_array($_POST)) {
        $data = array_merge($data, $_POST);
    }

    // Merge $_GET for query params
    if (!empty($_GET) && is_array($_GET)) {
        $data = array_merge($_GET, $data);
    }

    return $data;
}
