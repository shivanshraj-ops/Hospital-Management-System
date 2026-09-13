<?php
// config/db.php - Database connection configuration for MediCare HMS

// Support Vercel and production environment variables dynamically
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? ($_SERVER['DB_HOST'] ?? '127.0.0.1'));
$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? ($_SERVER['DB_PORT'] ?? '3306'));
$dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? ($_SERVER['DB_NAME'] ?? 'medicare_hms'));
$dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? ($_SERVER['DB_USER'] ?? 'root'));
$dbPass = getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ($_ENV['DB_PASSWORD'] ?? ($_ENV['DB_PASS'] ?? ($_SERVER['DB_PASSWORD'] ?? ($_SERVER['DB_PASS'] ?? '')))));
$dbCharset = 'utf8mb4';

// Check for connection URI format (e.g. DATABASE_URL, MYSQL_URL)
$databaseUrl = getenv('DATABASE_URL') ?: (getenv('MYSQL_URL') ?: ($_ENV['DATABASE_URL'] ?? ($_ENV['MYSQL_URL'] ?? '')));
if (!empty($databaseUrl)) {
    $parsed = parse_url($databaseUrl);
    if ($parsed && !empty($parsed['host'])) {
        $dbHost = $parsed['host'];
        $dbPort = !empty($parsed['port']) ? (string)$parsed['port'] : '3306';
        $dbUser = !empty($parsed['user']) ? urldecode($parsed['user']) : $dbUser;
        $dbPass = !empty($parsed['pass']) ? urldecode($parsed['pass']) : $dbPass;
        if (!empty($parsed['path'])) {
            $dbName = ltrim($parsed['path'], '/');
        }
    }
}

if (!defined('DB_HOST')) define('DB_HOST', $dbHost);
if (!defined('DB_PORT')) define('DB_PORT', $dbPort);
if (!defined('DB_NAME')) define('DB_NAME', $dbName);
if (!defined('DB_USER')) define('DB_USER', $dbUser);
if (!defined('DB_PASS')) define('DB_PASS', $dbPass);
if (!defined('DB_CHARSET')) define('DB_CHARSET', $dbCharset);

function getDBConnection(bool $throwException = false): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => true,
            PDO::ATTR_TIMEOUT            => 5,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if ($throwException) {
                throw $e;
            }
            if (!headers_sent()) {
                header('Content-Type: application/json; charset=utf-8');
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                http_response_code(500);
            }
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage() . '. Please verify database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).'
            ]);
            exit;
        }
    }

    return $pdo;
}
